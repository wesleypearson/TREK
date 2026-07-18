import type { TranslationStrings } from '../types';

const capture: TranslationStrings = {
  'capture.title': 'Capture',
  'capture.subtitle':
    'Sensor-Aufzeichnung nur mit Einwilligung — wähle genau aus, was aufgezeichnet wird, starte eine Session, und jeder Messwert landet in der eigenen Analytics der Crew.',

  'capture.info.title': 'Was Capture aufzeichnet',
  'capture.info.body':
    'Nichts wird aufgezeichnet, bevor du nicht einen Sensor einschaltest und eine Session startest. Standort speichert eine GPS-Spur (ein Fix alle paar Sekunden). Bewegung speichert einen Spitzenbeschleunigungswert pro Sekunde — nie den Rohdatenstrom. Akku und Netzwerk protokollieren Ladestand, Ladevorgang und Verbindungswechsel. Bildschirmsichtbarkeit vermerkt, wenn die App in den Hintergrund geht. Alles wird an die selbst gehostete PostHog-Instanz der Crew gesendet — kein Dritter bekommt es je zu sehen.',

  'capture.sensors.location': 'Standortspur',
  'capture.sensors.locationHint': 'Hochgenaue GPS-Fixes, höchstens einer alle 5 Sekunden',
  'capture.sensors.motion': 'Bewegung',
  'capture.sensors.motionHint': 'Spitzenbeschleunigung pro Sekunde — ein aggregierter Wert, nicht der Rohdatenstrom',
  'capture.sensors.battery': 'Akku',
  'capture.sensors.batteryHint': 'Ladestand und Ladezustand, bei Änderung und jede Minute',
  'capture.sensors.network': 'Netzwerk',
  'capture.sensors.networkHint': 'Verbindungstyp und geschätzte Geschwindigkeit, bei Änderung und jede Minute',
  'capture.sensors.visibility': 'Bildschirmsichtbarkeit',
  'capture.sensors.visibilityHint': 'Wenn die App in den Hintergrund wechselt oder zurückkommt',

  'capture.start': 'Aufzeichnung starten',
  'capture.stop': 'Aufzeichnung stoppen',
  'capture.selectSensor': 'Schalte mindestens einen Sensor ein, um zu starten',
  'capture.recording': 'Aufzeichnung läuft',
  'capture.session': 'Session',

  'capture.elapsed': 'Verstrichen',
  'capture.samples': 'Messwerte',
  'capture.lastFix': 'Letzter Fix',
  'capture.noFix': 'Noch kein Fix',

  'capture.foregroundWarning':
    'Capture läuft nur, solange die App geöffnet und auf dem Bildschirm ist — App-Wechsel oder Ausschalten des Bildschirms pausiert die Aufzeichnung (der Sichtbarkeitssensor zeigt die Lücken).',

  'capture.summaryTitle': 'Session-Zusammenfassung',
  'capture.summaryDuration': 'Dauer',
  'capture.summaryTotal': 'Messwerte gesamt',

  'capture.permissionDenied': 'Berechtigung verweigert',
  'capture.notSupported': 'Auf diesem Gerät nicht unterstützt',
};

export default capture;
