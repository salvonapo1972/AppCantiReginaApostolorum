

import {
  streamText,
  UIMessage,
  convertToModelMessages,
  tool,
  isStepCount,
  createUIMessageStreamResponse,
  toUIMessageStream,
  embed,
} from 'ai';
import fs from 'fs/promises';
import { date, z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { getWeather } from "../../lib/weather";
import { getCoordinates } from "../../lib/cities";
import { getTimezone } from '@/app/lib/timezones';
import { db } from '@/app/lib/db';
import { getGplStations} from '@/app/lib/gplstations';


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

// Funzioni di utilità per gestire le date
const calcolaGiorni = (i: string, f: string) =>
  Math.ceil((new Date(f).getTime() - new Date(i).getTime()) / (1000 * 60 * 60 * 24));

const trovaMetaData = (i: string, f: string) => {
  const metaTime = new Date(i).getTime() + (new Date(f).getTime() - new Date(i).getTime()) / 2;
  return new Date(metaTime).toISOString().split('T')[0];
};

function convertTime(date: string | Date, timeZone: string): string {
  return new Date(date).toLocaleString("it-IT", {
    timeZone,
    dateStyle: "full",
    timeStyle: "medium"
  });
}
const fileContent = await fs.readFile(process.cwd() + '/app/elenco_canti.md', 'utf8');
export async function POST(req: Request) {

  const { messages, coordinates } = await req.json();

  //console.log("Coordinate da metadati:", messages);
  const today = new Date()

//  console.log('coord', coordinates);
  const systemPrompt = `Oggi è ${today} e l'utente si trova a: latitudine ${coordinates.lat} e longitudine ${coordinates.lng}. Per le domande usa solo il tool canticoro e se non conosci la risposta devi rispondere gentilmente che non lo sai.`;

  const result = streamText({
    //  model: openai('gpt-5-mini'),
    model: openai('gpt-5.6-luna'),
    messages: await convertToModelMessages(messages),
    system: systemPrompt,
    stopWhen: isStepCount(20),
    experimental_telemetry: {
      isEnabled: false,
      recordInputs: false,
      recordOutputs: false
    },
    tools: {
      canticoro: tool({
        description: `
      Usa SEMPRE questo strumento quando l'utente chiede:
      - elenco dei canti del coro
      - informazioni su un canto
      - testi o titoli dei canti disponibili
      - suggerimenti di canti per una messa domenicale
      - scaletta dei canti per una celebrazione

      Il database dei canti disponibili è contenuto nel file fornito dal tool.
      Non inventare canti: prima richiama questo strumento.
      `,
        inputSchema: z.object({
          canto: z.string().describe(
            'Nome del canto richiesto o richiesta della scaletta liturgica'
          ),
        }),
        execute: async () => {
          console.log("canticoro");
          const response = fileContent;

          return {
            response
          };

        },
      }),
      
    },
  });

  return result.toUIMessageStreamResponse();
}
