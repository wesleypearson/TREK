import type { TranslationStrings } from '../types';

const shifts: TranslationStrings = {
  'shifts.tab': 'Turnos',
  'shifts.title': 'Turnos',
  'shifts.signOn': 'Fichar entrada',
  'shifts.signOff': 'Fichar salida',
  'shifts.onShiftNow': 'De turno ahora',
  'shifts.nobodyOn': 'Nadie está de turno',
  'shifts.history': 'Historial',
  'shifts.totals': 'Horas por miembro',
  'shifts.hours': '{h}h {m}m',
  'shifts.locationNote':
    'Tu ubicación se registra una vez al fichar la entrada y otra al fichar la salida — nunca se rastrea entre medias. Si la deniegas, simplemente fichas sin posición.',
  'shifts.locationDenied': 'Ubicación no disponible — fichado sin posición',
  'shifts.alreadyOn': 'Ya estás de turno',
  'shifts.info.title': 'Cómo funcionan los turnos',
  'shifts.info.body':
    'El reloj de fichaje del equipo. Ficha la entrada cuando empieces a trabajar y la salida cuando termines — el reloj corre en directo para todos, la lista muestra quién está de turno ahora mismo y la tarjeta de totales suma las horas de cada miembro. Se toma una posición opcional en cada extremo (nada entre medias), y cada fichaje de entrada y salida se anuncia en el chat del evento.',
  'shifts.elapsed': 'De turno',
  'shifts.signedOnAt': 'Entrada fichada a las {time}',
  'shifts.signedOffSummary': '{start} – {end} · {duration}',
  'shifts.empty': 'Aún no hay turnos — ficha la entrada para poner en marcha el reloj.',
};

export default shifts;
