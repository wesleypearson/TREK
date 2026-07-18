import type { TranslationStrings } from '../types';

const report: TranslationStrings = {
  'report.title': 'Report di produzione',
  'report.range.24h': 'Ultime 24h',
  'report.range.48h': 'Ultime 48h',
  'report.range.7d': 'Ultimi 7 giorni',
  'report.changes': 'Modifiche agli orari',
  'report.changesEmpty': 'Nessuna modifica agli orari in questo intervallo.',
  'report.files': 'File caricati',
  'report.filesEmpty': 'Nessun file caricato in questo intervallo.',
  'report.shiftHours': 'Ore di turno',
  'report.shiftsEmpty': 'Nessun turno in questo intervallo.',
  'report.upcoming': 'Prossime 48 ore',
  'report.upcomingEmpty': 'Niente in programma nelle prossime 48 ore.',
  'report.by': 'di {name}',
  'report.onShift': 'in turno adesso',
  'report.share': 'Condividi in chat',
  'report.shared': "Report condiviso nella chat dell'evento",
  'report.loadFailed': 'Impossibile caricare il report.',
  'report.retry': 'Riprova',
  'report.info.title': 'Informazioni sui report di produzione',
  'report.info.body':
    "Il riepilogo SM/PM di questo evento: ogni modifica agli orari (cosa è cambiato, orario vecchio e nuovo, chi l'ha modificato), i file caricati, le ore di turno di ogni membro e tutto ciò che ha un orario nelle prossime 48 ore. Scegli un intervallo, poi «Condividi in chat» pubblica un riepilogo compatto nella chat dell'evento per tutta la crew.",
};

export default report;
