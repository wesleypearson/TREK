import type { TranslationStrings } from '../types';

const capture: TranslationStrings = {
  'capture.title': 'Capture',
  'capture.subtitle':
    'Consent-first sensor recording — pick exactly what to record, start a session, and every sample lands in the crew’s own analytics.',

  'capture.info.title': 'What Capture records',
  'capture.info.body':
    'Nothing is recorded until you switch a sensor on and start a session. Location keeps a GPS trail (one fix every few seconds). Motion stores one peak-acceleration value per second — never the raw stream. Battery and network log level, charging and connection changes. Screen visibility notes when the app goes to the background. Everything is sent to the crew’s own self-hosted PostHog instance — no third party ever sees it.',

  'capture.sensors.location': 'Location trail',
  'capture.sensors.locationHint': 'High-accuracy GPS fixes, at most one every 5 seconds',
  'capture.sensors.motion': 'Motion',
  'capture.sensors.motionHint': 'Peak acceleration per second — an aggregate, not the raw stream',
  'capture.sensors.battery': 'Battery',
  'capture.sensors.batteryHint': 'Charge level and charging state, on change and every minute',
  'capture.sensors.network': 'Network',
  'capture.sensors.networkHint': 'Connection type and speed estimate, on change and every minute',
  'capture.sensors.visibility': 'Screen visibility',
  'capture.sensors.visibilityHint': 'When the app moves to the background or comes back',

  'capture.start': 'Start capture',
  'capture.stop': 'Stop capture',
  'capture.selectSensor': 'Switch on at least one sensor to start',
  'capture.recording': 'Recording',
  'capture.session': 'Session',

  'capture.elapsed': 'Elapsed',
  'capture.samples': 'Samples',
  'capture.lastFix': 'Last fix',
  'capture.noFix': 'No fix yet',

  'capture.foregroundWarning':
    'Capture only runs while the app is open and on screen — switching apps or turning the screen off pauses recording (the visibility sensor will show the gaps).',

  'capture.summaryTitle': 'Session summary',
  'capture.summaryDuration': 'Duration',
  'capture.summaryTotal': 'Total samples',

  'capture.permissionDenied': 'Permission denied',
  'capture.notSupported': 'Not supported on this device',
};

export default capture;
