'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useRef, useEffect } from 'react';
import { Streamdown } from 'streamdown';
import dynamic from 'next/dynamic';

// 1. SPOSTATO FUORI per evitare re-import continui
const ParkingMap = dynamic(() => import('../components/parking-map'), {
  ssr: false,
  loading: () => <p className="h-80 flex items-center justify-center bg-gray-100 rounded-lg">Caricamento mappa...</p>
});

export default function Chat() {
  const [coords, setCoords] = useState({ lat: 0, lng: 0 });
  const [dots, setDots] = useState('');
  const [input, setInput] = useState('');

  // 2. RECUPERO DELLE COORDINATE (Eseguito in sicurezza lato Client)
  useEffect(() => {
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => console.error("Errore geolocalizzazione:", error),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  // 3. CONFIGURAZIONE USECHAT
  const { messages, sendMessage, status,addToolOutput } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat', 
      prepareSendMessagesRequest: ({ id, messages, trigger, requestMetadata }) => {
        return {
          body: {
            id,
            messages,
            trigger,
            ...(requestMetadata as any || {}),
          },
        };
      },
    }),
  });
 const isLoading = status === 'streaming' || status === 'submitted';
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // 4. ANIMAZIONE DEI PUNTINI
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

  // 5. AUTO-SCROLL
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const isAtBottom = (container.scrollHeight - container.clientHeight - container.scrollTop) <= 50;

    if (isAtBottom) {
      container.scrollTop = container.scrollHeight;
    }
    
    if (messages.length > 0) {
      console.log("--- CRONOLOGIA MESSAGGI AGGIORNATA ---");
      console.log(JSON.stringify(messages, null, 2));
    }
  }, [messages, dots]);

  // 6. LOGICA DI CONTROLLO DEL PENSIERO
  const lastMessage = messages.at(-1);
  const hasStartedTyping = lastMessage?.role === 'assistant' && 
    lastMessage.parts.some(part => part.type === 'text' && part.text.trim().length > 0);

  const isAiThinking = isLoading && !hasStartedTyping && typeof lastMessage !== "undefined";

  return (
    <>
      <div 
        ref={chatContainerRef}
        className="chat-container flex flex-col w-full max-w-md mx-auto stretch overflow-y-auto max-h-[70vh] pr-2 mt-12 scroll-smooth"
      >
        {messages.map(message => {
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
                  
                  case 'tool-getUserLocation':
                    return (
                      <div key={`${message.id}-${i}`} className="w-full mt-2">
                        <p className="text-xs text-gray-500 mb-1">gps</p>
                      </div>
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
                  default:
                    return null;
                }
              })}
            </div>
          );
        })}

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
            if (!input.trim()) return;

            console.log("Inviando coordinate al server:", coords);
            
            sendMessage(
              { text: input,          
                metadata: { coordinates: coords }
              }
               
            );
            
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
            onChange={e => setInput(e.currentTarget.value)}
          />
        </form>
      </div>
    </>
  );
}

