

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
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { getWeather } from "../../lib/weather";
import { getCoordinates } from "../../lib/cities";


import { tavily } from '@tavily/core';

// Inizializza il client usando la tua chiave API di Tavily
const client = tavily({ 
  apiKey: process.env.TAVILY_API_KEY
});

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const fileContent = await fs.readFile(process.cwd() + '/app/elenco_canti.md', 'utf8');
 //const fileContent = RemoteFile();
// console.log("fileContent",fileContent)
  const today = new Date();
  const result = streamText({
    model: openai('gpt-5.6'),
    messages: await convertToModelMessages(messages),
    system: `Usa questo contesto per rispondere: ${fileContent + today.toLocaleDateString('it-IT')}`,
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
      time: tool({
        description: 'Get the real time',
        inputSchema: z.object({
          location: z.string().describe('now time'),
        }),
        execute: async () => {
        const options: Intl.DateTimeFormatOptions = {
          hour: '2-digit',
          minute: '2-digit',
        };
        const time = new Date().toLocaleTimeString('it-IT', { ...options, timeZone: 'Europe/Rome' });
         console.log("time",time);
          return {
            time
          };
        },
      }),
      weather: tool({
        description: 'Get the weather in a location (fahrenheit)',
        inputSchema: z.object({
          location: z.string().describe('The location to get the weather for'),
        }),
        execute: async ({ location }) => {
          console.log("passo temp");
        //  console.log('resp1');
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