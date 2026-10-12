# Changelog

Tutte le modifiche importanti a questo progetto saranno documentate in questo file.

## [2026-10-12]
### Changed
- Modificati e aggiornati i canti nell'applicazione.
- Eseguito il merge del branch 'AppNextjs' per sincronizzare le modifiche remote.

## [2026-10-11]
### Fixed
- Corretta la formattazione dei titoli (`heading`) nel file `README.md`.

## [2026-09-06]
### Removed
- Eliminati dall'applicazione tutti i tool secondari, mantenendo esclusivamente lo strumento dedicato al coro.

## [2026-08-30]
### Added
- Aggiunto l'elenco delle stazioni GPL e aggiornato il logging per il tracciamento delle query.
### Removed
- Rimossa la vecchia funzione `getLpgStationsTool` dalle API della chat.
- Rinominata la funzione `searchCompanyKnowledge` in `searchGplStation`.
- Ripuliti e commentati i `console.log` di debug rimasti nei file `route.ts` e `gplstations.ts`.

## [2026-08-29]
### Added
- Implementato e caricato l'elenco iniziale delle stazioni GPL.

## [2026-08-27]
### Removed
- Rimossi e commentati diversi `console.log` di debug (risposte delle rotte e nomi stazioni) in `gplstations.ts` e nella rotta della chat.

## [2026-08-26]
### Changed
- Aggiornato il selettore HTML (da `h3` a `span` per il nome stazione) e ottimizzati i selettori per i container in `gplstations.ts`.
- Impostato il tempo di revalidazione della cache a `0` secondi per forzare l'aggiornamento dei dati in tempo reale.
### Added
- Aggiunti log temporanei del codice HTML per il debug dello scraping.
- Aggiunto il tracciamento delle risposte della funzione `getGplStations` nelle rotte.

## [2026-08-23]
### Changed
- Aggiornato l'elenco dei canti in formato Markdown (`.md`).

## [2026-08-16]
### Added
- Aggiunta la geolocalizzazione (posizione GPS e relativo indirizzo) nell'app *Canti Regina Apostolorum*.
### Changed
- Ottimizzate le descrizioni dei tool dedicati alla conversione delle città in coordinate e recupero indirizzi.
- Eseguito il refactoring della funzione `POST` nella rotta della chat per migliorarne la leggibilità, rimuovendo codice commentato.
