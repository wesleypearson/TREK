import type { TranslationStrings } from '../types';

const shifts: TranslationStrings = {
  'shifts.tab': 'Turni',
  'shifts.title': 'Turni',
  'shifts.signOn': 'Inizia il turno',
  'shifts.signOff': 'Termina il turno',
  'shifts.onShiftNow': 'In turno adesso',
  'shifts.nobodyOn': 'Nessuno è in turno',
  'shifts.history': 'Cronologia',
  'shifts.totals': 'Ore per membro',
  'shifts.hours': '{h}h {m}m',
  'shifts.locationNote':
    "La tua posizione viene rilevata una volta all'inizio e una volta alla fine del turno — mai tracciata nel mezzo. Se la neghi, inizi semplicemente il turno senza posizione.",
  'shifts.locationDenied': 'Posizione non disponibile — turno iniziato senza posizione',
  'shifts.alreadyOn': 'Sei già in turno',
  'shifts.info.title': 'Come funzionano i turni',
  'shifts.info.body':
    "Il timbracartellino della crew. Inizia il turno quando cominci a lavorare e terminalo quando smetti — l'orologio scorre in diretta per tutti, l'elenco mostra chi è in turno in questo momento e la scheda dei totali somma le ore di ogni membro. A ciascun estremo viene rilevata una posizione opzionale (nulla nel mezzo), e ogni inizio e fine turno viene annunciato nella chat dell'evento.",
  'shifts.elapsed': 'In turno',
  'shifts.signedOnAt': 'In turno dalle {time}',
  'shifts.signedOffSummary': '{start} – {end} · {duration}',
  'shifts.empty': "Ancora nessun turno — inizia il turno per far partire l'orologio.",
};

export default shifts;
