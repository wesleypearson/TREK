import type { TranslationStrings } from '../types';

const capture: TranslationStrings = {
  'capture.title': 'Capture',
  'capture.subtitle':
    'Záznam ze senzorů založený na souhlasu — vyberte přesně, co se má zaznamenávat, spusťte relaci a každý vzorek skončí ve vlastní analytice týmu.',

  'capture.info.title': 'Co Capture zaznamenává',
  'capture.info.body':
    'Nic se nezaznamenává, dokud nezapnete senzor a nespustíte relaci. Poloha ukládá GPS stopu (jedna poloha každých pár sekund). Pohyb ukládá jednu hodnotu špičkového zrychlení za sekundu — nikdy surový datový proud. Baterie a síť zaznamenávají úroveň nabití, nabíjení a změny připojení. Viditelnost obrazovky si všímá, kdy aplikace přejde na pozadí. Vše se odesílá do vlastní self-hosted instance PostHog vašeho týmu — žádná třetí strana to nikdy neuvidí.',

  'capture.sensors.location': 'Stopa polohy',
  'capture.sensors.locationHint': 'Přesné GPS polohy, nejvýše jedna každých 5 sekund',
  'capture.sensors.motion': 'Pohyb',
  'capture.sensors.motionHint': 'Špičkové zrychlení za sekundu — souhrnná hodnota, ne surový datový proud',
  'capture.sensors.battery': 'Baterie',
  'capture.sensors.batteryHint': 'Úroveň nabití a stav nabíjení, při změně a každou minutu',
  'capture.sensors.network': 'Síť',
  'capture.sensors.networkHint': 'Typ připojení a odhad rychlosti, při změně a každou minutu',
  'capture.sensors.visibility': 'Viditelnost obrazovky',
  'capture.sensors.visibilityHint': 'Když aplikace přejde na pozadí nebo se vrátí',

  'capture.start': 'Spustit záznam',
  'capture.stop': 'Zastavit záznam',
  'capture.selectSensor': 'Pro spuštění zapněte alespoň jeden senzor',
  'capture.recording': 'Nahrává se',
  'capture.session': 'Relace',

  'capture.elapsed': 'Uplynulo',
  'capture.samples': 'Vzorky',
  'capture.lastFix': 'Poslední poloha',
  'capture.noFix': 'Zatím žádná poloha',

  'capture.foregroundWarning':
    'Capture běží jen, dokud je aplikace otevřená a na obrazovce — přepnutí na jinou aplikaci nebo vypnutí obrazovky záznam pozastaví (mezery ukáže senzor viditelnosti).',

  'capture.summaryTitle': 'Souhrn relace',
  'capture.summaryDuration': 'Doba trvání',
  'capture.summaryTotal': 'Celkem vzorků',

  'capture.permissionDenied': 'Oprávnění zamítnuto',
  'capture.notSupported': 'Na tomto zařízení není podporováno',
};

export default capture;
