'use client';

import { useChat } from '@ai-sdk/react';
import { useState, useRef, useEffect } from 'react';
import { Streamdown } from 'streamdown';
import dynamic from 'next/dynamic';
import { lastAssistantMessageIsCompleteWithToolCalls } from 'ai';

export default function Chat() {
  const [dots, setDots] = useState('');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
if (typeof window !== 'undefined') {
          alert("Il modello sta richiedendo il GPS!");
        }
  const { messages, sendMessage, addToolOutput } = useChat({
  sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  
  async onToolCall({ toolCall }) {
    console.log("📢 Tool intercettato:", toolCall.toolName);
    
    if (toolCall.toolName === 'getUserLocation') {
      

      // 1. Mostriamo l'alert per capire se siamo entrati nell'if (comodo su smartphone)
      alert('Richiesta GPS in corso...');

      let gpsResult;

      // 2. Controlliamo se il browser del telefono supporta il GPS
      if (!navigator.geolocation) {
        gpsResult = { error: 'Geolocalizzazione non supportata dal browser.' };
      } else {
        try {
          // 3. Avviamo la richiesta GPS asincrona avvolta in una Promise
          gpsResult = await new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                resolve({
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  accuracy: position.coords.accuracy,
                });
              },
              (error) => {
                resolve({ error: `Permesso negato o errore GPS: ${error.message}` });
              },
              { enableHighAccuracy: true, timeout: 10000 }
            );
          });
        } catch (e) {
          gpsResult = { error: 'Errore generico durante il recupero delle coordinate.' };
        }
      }

      console.log("✅ Risultato GPS ottenuto:", gpsResult);
      alert('GPS ottenuto: ' + JSON.stringify(gpsResult)); // Debug visibile su smartphone

      // 4. Inviamo REALMENTE il risultato all'SDK (Ora viene eseguito correttamente!)
      addToolOutput({
        tool: toolCall.toolName,
        toolCallId: toolCall.toolCallId,
        output: gpsResult, // Passiamo l'oggetto con le coordinate o l'errore
      });
    }
  } // Chiusura corretta di onToolCall
}); // Chiusura corretta di useChat


  
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const ParkingMap = dynamic(() => import('../components/parking-map'), {
    ssr: false,
    loading: () => <p className="h-80 flex items-center justify-center bg-gray-100 rounded-lg">Caricamento mappa...</p>
 });


 

  // 1. Animazione stabile dei puntini
  useEffect(() => {
    if (!isLoading) {
      setDots('');
      return;
    }

    const interval = setInterval(() => {
      setDots((prev) => (prev === '...' ? '' : prev + '.'));
    }, 400);

    return () => clearInterval(interval);
  }, [isLoading]);

  // 2. Controllo dello scorrimento automatico
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const isAtBottom = (container.scrollHeight - container.clientHeight - container.scrollTop) <= 50;

    if (isAtBottom) {
      container.scrollTop = container.scrollHeight;
    }
    if (messages.length > 0) {
    console.log("--- CRONOLOGIA MESSAGGI AGGIORNATA ---");
    console.log(JSON.stringify(messages, null, 2)); // Stringify mostra la struttura completa senza nodi nascosti
  }
  }, [messages, dots]);

  // 3. LOGICA DI CONTROLLO: Controlliamo se l'IA sta pensando ma non ha ancora scritto nulla
  const lastMessage = messages.at(-1);
  console.log("lastMessage",lastMessage);
  // Verifica se l'ultimo messaggio è dell'assistente e se contiene del testo reale
  const hasStartedTyping =  lastMessage?.role === 'assistant' && 
    lastMessage.parts.some(part => part.type === 'text' && part.text.trim().length > 0);

  //console.log("hasStartedTyping",hasStartedTyping)
  //console.log("isLoading",isLoading)

  // Mostriamo i puntini se l'SDK sta caricando, ma l'IA non ha ancora iniziato a inviare testo
  const isAiThinking = isLoading && !hasStartedTyping && typeof lastMessage!=="undefined";
  //console.log("isAiThinking",isAiThinking)

  return (
    <>
      <div 
        ref={chatContainerRef}
        className="chat-container flex flex-col w-full max-w-md mx-auto stretch overflow-y-auto max-h-[70vh] pr-2 mt-12 scroll-smooth"
      >
        {/* Render della cronologia dei messaggi filtrando i messaggi dell'IA ancora vuoti */}
        {messages.map(message => {
          console.log("message",message.parts);
          // Evita di renderizzare un blocco vuoto per l'IA se non ha ancora testo pronto
          const isAiEmpty = message.role === 'assistant' && 
            !message.parts.some(part => part.type === 'text' && part.text.trim().length > 0);
            
          if (isAiEmpty) return null;

          return (
            <div key={message.id} className="whitespace-pre-wrap mb-4">
              <span className="font-bold">
                {message.role === 'user' ? 'User: ' : 'AI: ' }
              </span>
              {message.parts.map((part, i) => {
                 
                switch (part.type) {
                 
                  case 'text':
                    return message.role === 'assistant' ? (
                      <div key={`${message.id}-${i}`} className="prose dark:prose-invert max-w-none">
                        <Streamdown>{part.text}</Streamdown>
                      </div>
                    ) : (
                       <div className="font-semibold inline" key={`${message.id}-${i}`}>{part.text}</div>
                 
                    );
                  
                  case 'tool-call': {
                    const toolOutput = (part as { output?: { center?: unknown; locations?: unknown } }).output;
                    const center = toolOutput?.center;
                    const locations = toolOutput?.locations;

                    if (!center || !locations) {
                      return null;
                    }

                    return (
                      <div key={`${message.id}-${i}`} className="w-full mt-2">
                        <p className="text-xs text-gray-500 mb-1">Mappa dei parcheggi trovati:</p>
                        <ParkingMap center={center as never} locations={locations as never} />
                      </div>
                    );
                  }
                  case 'tool-weather':
                  case 'tool-convertFahrenheitToCelsius':
                    return (
                      <pre key={`${message.id}-${i}`}>
                       {/* Strumenti */}
                      </pre>
                    );
                  default:
                    return null;
                }
              })}
            </div>
          );
        })}

        {/* COMPONENTE PUNTINI: Compare ora in modo stabile finché l'IA non genera la prima parola */}
        {isAiThinking && (
          <div className="whitespace-pre-wrap mb-4 italic text-zinc-500">
            <span className="font-bold not-italic text-black dark:text-white">AI: </span>
            Sto pensando{dots}
          </div>
        )}
      </div>
    
      <div className="flex flex-col w-full max-w-md py-12 mx-auto stretch">
        <form
          onSubmit={e => {
            e.preventDefault();
            sendMessage({ text: input });
            setInput('');
            
            setTimeout(() => {
              if (chatContainerRef.current) {
                chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
              }
            }, 50);
          }}
        >
          <input
            className="text-black font-semibold bg-white fixed dark:bg-zinc-900 bottom-0 w-full max-w-md p-2 mb-8 border border-zinc-300 dark:border-zinc-800 rounded shadow-xl"
            value={input}
            placeholder="Chiedimi qualcosa..."
            onChange={e =>{ setInput(e.currentTarget.value);setIsLoading(true)}}
          />
        </form>
      </div>
    </>
  );
}
