

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
import { getData } from '../../../../../Gatsby/GatsbyPresentation/.cache/page-ssr/index';

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

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const fileContent = await fs.readFile(process.cwd() + '/app/elenco_canti.md', 'utf8');
 //const fileContent = RemoteFile();
// console.log("fileContent",fileContent)
  const today = new Date();
 
  const result = streamText({
    model: openai('gpt-4o-mini'),
    messages: await convertToModelMessages(messages),
    system: `Oggi è ${today}. Tu sei un assistente virtuale.Usa questo contesto per rispondere: ${fileContent}`,
    stopWhen: isStepCount(5),
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
      
          const locationCity = await getCoordinates(location);
          const weather = await getWeather(locationCity.latitude, locationCity.longitude);
         const temperature = weather.current.temperature_2m;
          return {
            locationCity,
            temperature,
          };
        },
      }),
      convertFahrenheitToCelsius: tool({
        description: 'Convert a temperature in fahrenheit to celsius',
        inputSchema: z.object({
          temperature: z
            .number()
            .describe('The temperature in fahrenheit to convert'),
        }),
        execute: async ({ temperature }) => {
          const celsius = Math.round((temperature - 32) * (5 / 9));
          return {
            celsius,
          };
        },
      }),
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}