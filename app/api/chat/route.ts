

import {
  streamText,
  UIMessage,
  convertToModelMessages,
  tool,
  isStepCount,
  createUIMessageStreamResponse,
  toUIMessageStream,
} from 'ai';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { getWeather } from "../../lib/weather";
import { getCoordinates } from "../../lib/cities";

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  
  const result = streamText({
    model: openai('gpt-5.6'),
    messages: await convertToModelMessages(messages),
    stopWhen: isStepCount(5),
    tools: {
      weather: tool({
        description: 'Get the weather in a location (fahrenheit)',
        inputSchema: z.object({
          location: z.string().describe('The location to get the weather for'),
        }),
        execute: async ({ location }) => {
        //  console.log('resp1');
          const locationCity = await getCoordinates(location);
          const weather = await getWeather(locationCity.latitude, locationCity.longitude);
          //const data = Response.json(weather);
       //   console.log("weather",weather)
       // const temperature = Math.round(Math.random() * (90 - 32) + 32);
         const temperature = weather.current.temperature_2m;
          return {
            location,
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