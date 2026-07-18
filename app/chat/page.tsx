'use client';

import { useChat } from '@ai-sdk/react';
import { useState, useRef, useEffect } from 'react';

export default function Chat() {
  const [dots, setDots] = useState('');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { messages, sendMessage } = useChat();

  
  const chatContainerRef = useRef<HTMLDivElement>(null);

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
  }, [messages, dots]);

  // 3. LOGICA DI CONTROLLO: Controlliamo se l'IA sta pensando ma non ha ancora scritto nulla
  const lastMessage = messages.at(-1);
  console.log("lastMessage",lastMessage);
  // Verifica se l'ultimo messaggio è dell'assistente e se contiene del testo reale
  const hasStartedTyping = lastMessage?.role === 'assistant' && 
    lastMessage.parts.some(part => part.type === 'text' && part.text.trim().length > 0);

    console.log("hasStartedTyping",hasStartedTyping)
    console.log("isLoading",isLoading)

  // Mostriamo i puntini se l'SDK sta caricando, ma l'IA non ha ancora iniziato a inviare testo
  const isAiThinking = isLoading && !hasStartedTyping;
  console.log("isAiThinking",isAiThinking)

  return (
    <>
      <div 
        ref={chatContainerRef}
        className="chat-container flex flex-col w-full max-w-md mx-auto stretch overflow-y-auto max-h-[70vh] pr-2 mt-12 scroll-smooth"
      >
        {/* Render della cronologia dei messaggi filtrando i messaggi dell'IA ancora vuoti */}
        {messages.map(message => {
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
                    return <div className="font-semibold inline" key={`${message.id}-${i}`}>{part.text}</div>;
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
