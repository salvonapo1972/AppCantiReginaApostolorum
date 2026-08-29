
import { ingestDocuments } from '../app/lib/ingestDocuments'; // Assicurati che il percorso sia corretto

// 1. Funzione di Utility per dividere il testo estratto in blocchi (Chunking)
function splitTextIntoChunks(text: string, chunkSize = 1000): string[] {
  // Sostituisce spazi multipli e a capo continui con uno spazio singolo
  const cleanSpaceText = text.replace(/\s+/g, ' ').trim();
  const words = cleanSpaceText.split(' ');
  const chunks: string[] = [];
  let currentChunk: string[] = [];

  for (const word of words) {
    currentChunk.push(word);
    // Quando raggiungiamo la dimensione desiderata del blocco (es. 1000 caratteri)
    if (currentChunk.join(' ').length >= chunkSize) {
      chunks.push(currentChunk.join(' '));
      currentChunk = [];
    }
  }
  
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '));
  }
  return chunks;
}

// 2. Funzione Principale
async function main(knowledgeid: string,url: string) {
  
  try {
    // 1. Scarica il codice HTML della pagina di myLPG
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
      },
    });

    if (!response.ok) {
      throw new Error(`Errore nella richiesta: ${response.status}`);
    }

    const text = await response.text();
  // Inserisci qui il percorso assoluto o relativo del tuo file PDF
    
    const testoCompleto = Array.isArray(text) 
    ? text.join('\n') 
    : text;

  console.log(`Testo estratto con successo! Lunghezza: ${testoCompleto.length} caratteri`);

  // 3. Ora puoi usare .trim() in sicurezza perché 'testoCompleto' è una stringa al 100%
  if (testoCompleto.trim().length === 0) {
    console.warn("Il testo estratto è vuoto.");
    return;
  }
    console.log(`Testo estratto con successo! Lunghezza: ${text.length} caratteri`);


    const frammenti = splitTextIntoChunks(testoCompleto);
    await ingestDocuments(frammenti,knowledgeid);

  } catch (error) {
    console.error("Errore durante l'estrazione html:", error);
  }
}

// Avvia lo script
const args = process.argv.slice(2);
const knowledgeidInput = args[0];
const nomefileInput = args[1];
main(knowledgeidInput,nomefileInput).catch(console.error);
