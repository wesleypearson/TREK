import type { TranslationStrings } from '../types';

const capture: TranslationStrings = {
  'capture.title': 'Capture',
  'capture.subtitle':
    'Samtyckesbaserad sensorinspelning — välj exakt vad som ska spelas in, starta en session, och varje mätvärde hamnar i teamets egen analys.',

  'capture.info.title': 'Vad Capture spelar in',
  'capture.info.body':
    'Inget spelas in förrän du slår på en sensor och startar en session. Plats sparar ett GPS-spår (en position med några sekunders mellanrum). Rörelse lagrar ett toppaccelerationsvärde per sekund — aldrig den råa strömmen. Batteri och nätverk loggar nivå, laddning och anslutningsändringar. Skärmsynlighet noterar när appen hamnar i bakgrunden. Allt skickas till teamets egen självhostade PostHog-instans — ingen tredje part ser det någonsin.',

  'capture.sensors.location': 'Platsspår',
  'capture.sensors.locationHint': 'GPS-positioner med hög noggrannhet, högst en var 5:e sekund',
  'capture.sensors.motion': 'Rörelse',
  'capture.sensors.motionHint': 'Toppacceleration per sekund — ett aggregat, inte den råa strömmen',
  'capture.sensors.battery': 'Batteri',
  'capture.sensors.batteryHint': 'Laddningsnivå och laddningsstatus, vid ändring och varje minut',
  'capture.sensors.network': 'Nätverk',
  'capture.sensors.networkHint': 'Anslutningstyp och hastighetsuppskattning, vid ändring och varje minut',
  'capture.sensors.visibility': 'Skärmsynlighet',
  'capture.sensors.visibilityHint': 'När appen hamnar i bakgrunden eller kommer tillbaka',

  'capture.start': 'Starta inspelning',
  'capture.stop': 'Stoppa inspelning',
  'capture.selectSensor': 'Slå på minst en sensor för att starta',
  'capture.recording': 'Spelar in',
  'capture.session': 'Session',

  'capture.elapsed': 'Förfluten tid',
  'capture.samples': 'Mätvärden',
  'capture.lastFix': 'Senaste position',
  'capture.noFix': 'Ingen position ännu',

  'capture.foregroundWarning':
    'Capture körs bara medan appen är öppen och på skärmen — byter du app eller släcker skärmen pausas inspelningen (synlighetssensorn visar luckorna).',

  'capture.summaryTitle': 'Sessionssammanfattning',
  'capture.summaryDuration': 'Längd',
  'capture.summaryTotal': 'Totalt antal mätvärden',

  'capture.permissionDenied': 'Behörighet nekad',
  'capture.notSupported': 'Stöds inte på den här enheten',
};

export default capture;
