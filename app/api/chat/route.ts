

import {
  streamText,
  UIMessage,
  convertToModelMessages,
  tool,
  isStepCount,
  createUIMessageStreamResponse,
  toUIMessageStream,
} from 'ai';
import fs from 'fs/promises';
import { date, z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { createOpenRouter  } from '@openrouter/ai-sdk-provider';
import { getWeather } from "../../lib/weather";
import { getCoordinates } from "../../lib/cities";
import { getTimezone } from '@/app/lib/timezones';


import { tavily } from '@tavily/core';
import { getEarthQuakes } from '@/app/lib/earthquake';
import { getFarmacieTurno } from '@/app/lib/farmacieturno';

// Inizializza il client usando la tua chiave API di Tavily
const client = tavily({ 
  apiKey: process.env.TAVILY_API_KEY
});

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

function formatTime(time: number | string): string {
  return new Date(time).toISOString();
}

function convertTime(date: string | Date, timeZone: string): string {
    return new Date(date).toLocaleString("it-IT", {
        timeZone,
        dateStyle: "full",
        timeStyle: "medium"
    });
}
const fileContent = await fs.readFile(process.cwd() + '/app/elenco_canti.md', 'utf8');
export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
 
 //const fileContent = RemoteFile();
// console.log("fileContent",fileContent)
  const today = new Date();
 
  const result = streamText({
   // model: openai('gpt-4o-mini'),
    model: openai('gpt-5-mini'),
    messages: await convertToModelMessages(messages),
    system: `Oggi è ${today}. Tu sei un assistente virtuale.Usa questo contesto per rispondere: ${fileContent}`,
    stopWhen: isStepCount(10),
    tools: {
      searchWeb: tool({
        description: 'Cerca sul web informazioni in tempo reale, notizie recenti o dati aggiornati.',
        inputSchema: z.object({
          query: z.string().describe('La query di ricerca ottimizzata per i motori di ricerca'),
        }),
        execute: async ({ query }) => {
          // 1. Chiamata all'SDK di Tavily
            const response = await client.search(query, {
              searchDepth: "advanced",
              includeAnswer: false // Disattivalo temporaneamente per pulire l'input
            });

            // 2. CORREZIONE CRUCIALE: Mappa i dati eliminando ogni campo 'undefined' o complesso.
            // Restituisci SOLO un array di oggetti puliti con proprietà testuali semplici.
            const cleanResults = (response.results || []).map((r: any) => ({
              title: r.title || 'Nessun titolo',
              url: r.url || '',
              content: r.content || ''
            }));

            // Restituiamo una stringa JSON o un oggetto super-semplificato
            return {
              results: cleanResults
            };
          
        },
      }),
      ottieniCoordinate: tool({
        description: 'Converte un indirizzo, monumento o città in coordinate geografiche (latitudine e longitudine).',
        inputSchema: z.object({
          luogo: z.string().describe('Il nome del luogo o indirizzo fornito dall\'utente (es. "Colosseo, Roma" o "Piazza Duomo, Milano")'),
        }),
        execute: async ({ luogo }) => {
          console.log("ottieniCoordinate");
          const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(luogo)}`;

          const response = await fetch(url, {
            headers: {
              'User-Agent': 'MioChatbotParcheggiNextJS/1.0',
              'Accept-Language': 'it',
            },
          });
          const data = (await response.json()) as Array<{
            lat: string;
            lon: string;
            display_name: string;
          }>;

          if (!Array.isArray(data) || data.length === 0) {
            return { error: 'Luogo non trovato' };
          }

          return {
            latitude: Number.parseFloat(data[0].lat),
            longitude: Number.parseFloat(data[0].lon),
            displayName: data[0].display_name,
          };
        },
      }),
      cercaParcheggi: tool({
        description: 'Cerca i parcheggi in una determinata area geografica usando le coordinate lat/lon.',
        inputSchema: z.object({
          latitude: z.number().describe('La latitudine del centro di ricerca'),
          longitude: z.number().describe('La longitudine del centro di ricerca'),
          radius: z.number().optional().describe('Il raggio di ricerca in metri (es. 1000)'),
        }),
        execute: async ({
          latitude,
          longitude,
          radius = 1000,
        }) => {
          // Query Overpass QL per estrarre nodi e macro-aree parcheggio (amenity=parking)
          console.log("Parcheggi")
          const overpassQuery = `
            [out:json][timeout:25];
            (
              node["amenity"="parking"](around:${radius},${latitude},${longitude});
              way["amenity"="parking"](around:${radius},${latitude},${longitude});
            );
            out center;
          `;

          const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;
        //  console.log("url",url);
          const response = await fetch("https://overpass-api.de/api/interpreter", {
            method: "POST",
            headers: {
              // IMPORTANTE: Dice al server che stai inviando i parametri corretti
              "Content-Type": "application/x-www-form-urlencoded",
              
              // OBBLIGATORIO: Identifica il tuo bot. Sostituisci con informazioni reali per evitare ban permanenti
              "User-Agent": "MioChatbotNextJS/1.0",
              
              // Opzionale ma consigliato per i server Overpass
              "Accept": "application/json"
            },
            // La query va formattata come parametro 'data=' dentro il corpo della POST
            body: `data=${encodeURIComponent(overpassQuery)}`
          });
          if (!response.ok) {
  const errorText = await response.text();
  console.error(`Errore Overpass (${response.status}):`, errorText);
  throw new Error(`Il server Overpass ha risposto con codice ${response.status}`);
}
          const data = await response.json();

          // Mappiamo i risultati in un formato pulito per la mappa
          const locations = (data.elements || [])
            .map((el: any) => ({
              id: el.id,
              lat: el.lat ?? el.center?.lat,
              lon: el.lon ?? el.center?.lon,
              name: el.tags?.name || 'Parcheggio Generico',
              type: el.tags?.parking || 'In strada / Struttura',
            }))
            .filter((el: any) => el.lat && el.lon);
          console.log("locations",locations);
          return { locations, center: [latitude, longitude] };
        },
      }),
      farmacie: tool({
        description: 'Get farmacie di turno di Roma ',
        inputSchema: z.object({
          query: z.string().describe("Get farmacie o farmacia  di turno di Roma"),
          date:z.string().describe("data"),
        }),
        execute: async ({ query,date }) => {
          console.log("query", query);
          console.log("date",date)
          const data = new Date(date);
          console.log("today.toISOString()",data.toISOString().slice(0, 10))
          const farmacie = await getFarmacieTurno(data.toISOString().slice(0, 10));
     // console.log("farmacie",farmacie)
          return {
            farmacie,
          };
        }
      }),
      time: tool({
        description: 'Get the real time and day and month and year',
        inputSchema: z.object({
          city: z.string().describe("Nome della città (es. Tokyo)"),
          country: z.string().optional().describe("Paese opzionale"),
        }),
        execute: async ({city}) => {
          const locationCity = await getCoordinates(city);
          const timeZone = await getTimezone(locationCity.latitude,locationCity.longitude)
          const now = new Intl.DateTimeFormat("it-IT", {
            timeZone: timeZone.timezone,
            dateStyle: "full",
            timeStyle: "medium",
          }).format(new Date());

          return {
            now,
          };
        }
      }),
      earthquakes: tool({
        description: 'Elenco Terremoti in Italia e nel mondo degli ultimi giorni con magnitudo maggiore di 3',
        inputSchema: z.object({
          earthquakes: z.string().describe("Elenco Terremoti in Italia e nel mondo degli ultimi giorni con magnitudo maggiore di 3"),
        }),
        execute: async () => {
          console.log('passo earthquake');
          const startTime = new Date();
          startTime.setDate(startTime.getDate() - 7);

          const formattedTime = startTime.toISOString().split('.')[0].slice(0,10);
          console.log("starttime",formattedTime)
          const earthquakeResponses = await Promise.all([
            getEarthQuakes(`https://webservices.ingv.it/fdsnws/event/1/query?format=geojson&starttime=${formattedTime}&orderby=time&minmagnitude=3`),
            getEarthQuakes('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson'),
          ]);

          const mergedFeatures = earthquakeResponses.reduce((all: any[], response: any) => {
            return all.concat(response.earthquakes?.features || []);
          }, []);

          const simplifiedEarthquakes = mergedFeatures.sort((a: any, b: any) => (b.properties.mag ?? -Infinity) - (a.properties.mag ?? -Infinity)).map((f: any) => ({
            place: f.properties.place,
            magnitude: f.properties.mag,
            time: formatTime(f.properties.time),
            depth: f.properties.depth,
          }));
//console.log("simplifiedEarthquakes",simplifiedEarthquakes)
          return {
            earthquakes: simplifiedEarthquakes,
          };
        },
      }),
      weather: tool({
        description: 'Get the weather in a location (fahrenheit)',
        inputSchema: z.object({
          location: z.string().describe('The location to get the weather for'),
        }),
        execute: async ({ location }) => {
          console.log("calcolo temperatura");
          const locationCity = await getCoordinates(location);
          const weather = await getWeather(locationCity.latitude, locationCity.longitude);
          const temperature = weather.current.temperature_2m;
          const apparent_temperature = weather.current.apparent_temperature;
          const timeZone = await getTimezone(locationCity.latitude,locationCity.longitude);
          console.log("weather.current.time",weather.current.time);
          const time = new Intl.DateTimeFormat("it-IT", {
            timeZone: timeZone.timezone,
            dateStyle: "full",
            timeStyle: "medium",
          }).format(new Date());
         
            console.log("time",time);
         // console.log("apparent_temperature",apparent_temperature);
          return {
            locationCity,
            temperature,
            apparent_temperature,
            time,
          };
        },
      }),
    },
  });

  return createUIMessageStreamResponse({
  stream: toUIMessageStream(result),
});
}
