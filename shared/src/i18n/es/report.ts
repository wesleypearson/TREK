import type { TranslationStrings } from '../types';

const report: TranslationStrings = {
  'report.title': 'Informe de producción',
  'report.range.24h': 'Últimas 24h',
  'report.range.48h': 'Últimas 48h',
  'report.range.7d': 'Últimos 7 días',
  'report.changes': 'Cambios de horario',
  'report.changesEmpty': 'No hay cambios de horario en este periodo.',
  'report.files': 'Archivos cargados',
  'report.filesEmpty': 'No se cargaron archivos en este periodo.',
  'report.shiftHours': 'Horas de turno',
  'report.shiftsEmpty': 'No hay turnos en este periodo.',
  'report.upcoming': 'Próximas 48 horas',
  'report.upcomingEmpty': 'Nada programado en las próximas 48 horas.',
  'report.by': 'por {name}',
  'report.onShift': 'de turno ahora',
  'report.share': 'Compartir al chat',
  'report.shared': 'Informe compartido en el chat del evento',
  'report.loadFailed': 'No se pudo cargar el informe.',
  'report.retry': 'Reintentar',
  'report.info.title': 'Acerca de los informes de producción',
  'report.info.body':
    'El resumen SM/PM de este evento: cada cambio de horario (qué se movió, hora anterior y nueva, quién lo cambió), los archivos cargados, las horas de turno de cada miembro y todo lo que tenga hora en las próximas 48 horas. Elige un periodo y «Compartir al chat» publica un resumen compacto en el chat del evento para todo el equipo.',
};

export default report;
