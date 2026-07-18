import type { TranslationStrings } from '../types';

const report: TranslationStrings = {
  'report.title': 'Produktionsrapport',
  'report.range.24h': 'Senaste 24h',
  'report.range.48h': 'Senaste 48h',
  'report.range.7d': 'Senaste 7 dagarna',
  'report.changes': 'Tidsändringar',
  'report.changesEmpty': 'Inga tidsändringar under perioden.',
  'report.files': 'Laddade filer',
  'report.filesEmpty': 'Inga filer laddades under perioden.',
  'report.shiftHours': 'Passtimmar',
  'report.shiftsEmpty': 'Inga pass under perioden.',
  'report.upcoming': 'Kommande 48 timmar',
  'report.upcomingEmpty': 'Inget schemalagt de kommande 48 timmarna.',
  'report.by': 'av {name}',
  'report.onShift': 'på pass just nu',
  'report.share': 'Dela till chatten',
  'report.shared': 'Rapporten delades i eventchatten',
  'report.loadFailed': 'Det gick inte att ladda rapporten.',
  'report.retry': 'Försök igen',
  'report.info.title': 'Om produktionsrapporter',
  'report.info.body':
    'SM/PM-sammanfattningen för det här eventet: varje tidsändring (vad som flyttades, gammal och ny tid, vem som ändrade), de laddade filerna, varje medlems passtimmar och allt med en tid under de kommande 48 timmarna. Välj en period — Dela till chatten publicerar sedan en kompakt sammanfattning i eventchatten för hela crewet.',
};

export default report;
