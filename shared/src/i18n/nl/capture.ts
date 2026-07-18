import type { TranslationStrings } from '../types';

const capture: TranslationStrings = {
  'capture.title': 'Capture',
  'capture.subtitle':
    'Sensoropnames alleen met jouw toestemming — kies precies wat je wilt vastleggen, start een sessie en elke meting komt terecht in de eigen analytics van de groep.',

  'capture.info.title': 'Wat Capture vastlegt',
  'capture.info.body':
    'Er wordt niets vastgelegd totdat je een sensor inschakelt en een sessie start. Locatie houdt een GPS-spoor bij (één positie per paar seconden). Beweging bewaart één piekversnellingswaarde per seconde — nooit de ruwe datastroom. Batterij en netwerk loggen niveau, oplaadstatus en verbindingswijzigingen. Schermzichtbaarheid noteert wanneer de app naar de achtergrond gaat. Alles gaat naar de eigen self-hosted PostHog-instantie van de groep — geen enkele derde partij krijgt het ooit te zien.',

  'capture.sensors.location': 'Locatiespoor',
  'capture.sensors.locationHint': 'Nauwkeurige GPS-posities, hooguit één per 5 seconden',
  'capture.sensors.motion': 'Beweging',
  'capture.sensors.motionHint': 'Piekversnelling per seconde — een totaalwaarde, niet de ruwe datastroom',
  'capture.sensors.battery': 'Batterij',
  'capture.sensors.batteryHint': 'Batterijniveau en oplaadstatus, bij wijziging en elke minuut',
  'capture.sensors.network': 'Netwerk',
  'capture.sensors.networkHint': 'Verbindingstype en geschatte snelheid, bij wijziging en elke minuut',
  'capture.sensors.visibility': 'Schermzichtbaarheid',
  'capture.sensors.visibilityHint': 'Wanneer de app naar de achtergrond gaat of terugkomt',

  'capture.start': 'Capture starten',
  'capture.stop': 'Capture stoppen',
  'capture.selectSensor': 'Schakel minstens één sensor in om te starten',
  'capture.recording': 'Aan het opnemen',
  'capture.session': 'Sessie',

  'capture.elapsed': 'Verstreken',
  'capture.samples': 'Metingen',
  'capture.lastFix': 'Laatste positie',
  'capture.noFix': 'Nog geen positie',

  'capture.foregroundWarning':
    'Capture werkt alleen terwijl de app open en op het scherm zichtbaar is — van app wisselen of het scherm uitzetten pauzeert de opname (de zichtbaarheidssensor laat de gaten zien).',

  'capture.summaryTitle': 'Sessieoverzicht',
  'capture.summaryDuration': 'Duur',
  'capture.summaryTotal': 'Totaal aantal metingen',

  'capture.permissionDenied': 'Toestemming geweigerd',
  'capture.notSupported': 'Niet ondersteund op dit apparaat',
};

export default capture;
