import type { TranslationStrings } from '../types';

const capture: TranslationStrings = {
  'capture.title': 'Captura',
  'capture.subtitle':
    'Registro de sensores con el consentimiento por delante — elige exactamente qué registrar, inicia una sesión y cada muestra acaba en la analítica propia del equipo.',

  'capture.info.title': 'Qué registra Captura',
  'capture.info.body':
    'No se registra nada hasta que actives un sensor e inicies una sesión. Ubicación guarda un rastro GPS (una posición cada pocos segundos). Movimiento almacena un valor de aceleración máxima por segundo — nunca el flujo en bruto. Batería y red registran el nivel, la carga y los cambios de conexión. Visibilidad de pantalla anota cuándo la app pasa a segundo plano. Todo se envía a la instancia de PostHog autoalojada del propio equipo — ningún tercero lo ve jamás.',

  'capture.sensors.location': 'Rastro de ubicación',
  'capture.sensors.locationHint': 'Posiciones GPS de alta precisión, como máximo una cada 5 segundos',
  'capture.sensors.motion': 'Movimiento',
  'capture.sensors.motionHint': 'Aceleración máxima por segundo — un agregado, no el flujo en bruto',
  'capture.sensors.battery': 'Batería',
  'capture.sensors.batteryHint': 'Nivel y estado de carga, al cambiar y cada minuto',
  'capture.sensors.network': 'Red',
  'capture.sensors.networkHint': 'Tipo de conexión y velocidad estimada, al cambiar y cada minuto',
  'capture.sensors.visibility': 'Visibilidad de pantalla',
  'capture.sensors.visibilityHint': 'Cuándo la app pasa a segundo plano o vuelve',

  'capture.start': 'Iniciar captura',
  'capture.stop': 'Detener captura',
  'capture.selectSensor': 'Activa al menos un sensor para empezar',
  'capture.recording': 'Grabando',
  'capture.session': 'Sesión',

  'capture.elapsed': 'Transcurrido',
  'capture.samples': 'Muestras',
  'capture.lastFix': 'Última posición',
  'capture.noFix': 'Aún sin posición',

  'capture.foregroundWarning':
    'La captura solo funciona mientras la app está abierta y en pantalla — cambiar de app o apagar la pantalla pausa el registro (el sensor de visibilidad mostrará los huecos).',

  'capture.summaryTitle': 'Resumen de la sesión',
  'capture.summaryDuration': 'Duración',
  'capture.summaryTotal': 'Muestras totales',

  'capture.permissionDenied': 'Permiso denegado',
  'capture.notSupported': 'No compatible con este dispositivo',
};

export default capture;
