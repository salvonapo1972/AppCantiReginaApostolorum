'use client';

import { useChat } from '@ai-sdk/react';
import { useState, useRef, useEffect } from 'react';

export default function Chat() {
  const [input, setInput] = useState('');
  const { messages, sendMessage } = useChat();
  
  // 1. Riferimento al contenitore della chat
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // 2. Effetto che controlla lo scorrimento ogni volta che arrivano nuovi messaggi o token
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    // Rileva se l'utente è vicino al fondo (tolleranza di 50px per sicurezza con lo streaming veloce)
    const isAtBottom = (container.scrollHeight - container.clientHeight - container.scrollTop) <= 50;

    // Se l'utente era già in fondo, mantieni lo scorrimento automatico verso il basso
    if (isAtBottom) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]); // Si attiva ogni volta che l'IA aggiunge un nuovo pezzetto di testo

  return (
    <>
      {/* 3. Aggiunte classi Tailwind per limitare l'altezza e attivare la scrollbar */}
      <div 
        ref={chatContainerRef}
        className="chat-container flex flex-col w-full max-w-md mx-auto stretch overflow-y-auto max-h-[70vh] pr-2 mt-12 scroll-smooth"
      >
        {messages.map(message => (
          <div key={message.id} className="whitespace-pre-wrap mb-4">
            <span className="font-bold">
              {message.role === 'user' ? 'User: ' : 'AI: '}
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
        ))}
      </div>
    
      <div className="flex flex-col w-full max-w-md py-12 mx-auto stretch">
        <form
          onSubmit={e => {
            e.preventDefault();
            sendMessage({ text: input });
            setInput('');
            
            // Forza lo scorrimento sul fondo all'invio del messaggio dell'utente
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
