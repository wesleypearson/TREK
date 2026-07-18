import type { TranslationStrings } from '../types';

const capture: TranslationStrings = {
  'capture.title': 'Cattura',
  'capture.subtitle':
    'Registrazione dei sensori basata sul consenso — scegli esattamente cosa registrare, avvia una sessione e ogni campione finisce nelle statistiche del gruppo stesso.',

  'capture.info.title': 'Cosa registra Cattura',
  'capture.info.body':
    'Non viene registrato nulla finché non attivi un sensore e avvii una sessione. La posizione conserva una traccia GPS (un rilevamento ogni pochi secondi). Il movimento salva un valore di accelerazione di picco al secondo — mai il flusso grezzo. Batteria e rete registrano livello, ricarica e cambi di connessione. La visibilità dello schermo annota quando l’app passa in background. Tutto viene inviato all’istanza PostHog self-hosted del gruppo — nessuna terza parte lo vede mai.',

  'capture.sensors.location': 'Traccia di posizione',
  'capture.sensors.locationHint': 'Rilevamenti GPS ad alta precisione, al massimo uno ogni 5 secondi',
  'capture.sensors.motion': 'Movimento',
  'capture.sensors.motionHint': 'Accelerazione di picco al secondo — un dato aggregato, non il flusso grezzo',
  'capture.sensors.battery': 'Batteria',
  'capture.sensors.batteryHint': 'Livello e stato di ricarica, a ogni variazione e ogni minuto',
  'capture.sensors.network': 'Rete',
  'capture.sensors.networkHint': 'Tipo di connessione e velocità stimata, a ogni variazione e ogni minuto',
  'capture.sensors.visibility': 'Visibilità dello schermo',
  'capture.sensors.visibilityHint': 'Quando l’app passa in background o torna in primo piano',

  'capture.start': 'Avvia cattura',
  'capture.stop': 'Interrompi cattura',
  'capture.selectSensor': 'Attiva almeno un sensore per iniziare',
  'capture.recording': 'Registrazione in corso',
  'capture.session': 'Sessione',

  'capture.elapsed': 'Trascorso',
  'capture.samples': 'Campioni',
  'capture.lastFix': 'Ultimo rilevamento',
  'capture.noFix': 'Ancora nessun rilevamento',

  'capture.foregroundWarning':
    'La cattura è attiva solo mentre l’app è aperta e sullo schermo — cambiare app o spegnere lo schermo mette in pausa la registrazione (il sensore di visibilità mostrerà le interruzioni).',

  'capture.summaryTitle': 'Riepilogo della sessione',
  'capture.summaryDuration': 'Durata',
  'capture.summaryTotal': 'Campioni totali',

  'capture.permissionDenied': 'Autorizzazione negata',
  'capture.notSupported': 'Non supportato su questo dispositivo',
};

export default capture;
