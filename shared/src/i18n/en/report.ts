import type { TranslationStrings } from '../types';

const report: TranslationStrings = {
  'report.title': 'Production report',
  'report.range.24h': 'Last 24h',
  'report.range.48h': 'Last 48h',
  'report.range.7d': 'Last 7 days',
  'report.changes': 'Schedule changes',
  'report.changesEmpty': 'No schedule changes in this range.',
  'report.files': 'Files loaded',
  'report.filesEmpty': 'No files loaded in this range.',
  'report.shiftHours': 'Shift hours',
  'report.shiftsEmpty': 'No shifts in this range.',
  'report.upcoming': 'Next 48 hours',
  'report.upcomingEmpty': 'Nothing scheduled in the next 48 hours.',
  'report.by': 'by {name}',
  'report.onShift': 'on shift now',
  'report.share': 'Share to chat',
  'report.shared': 'Report shared to the event chat',
  'report.loadFailed': 'Couldn’t load the report.',
  'report.retry': 'Try again',
  'report.info.title': 'About production reports',
  'report.info.body':
    'The SM/PM digest for this event: every schedule change (what moved, old and new time, who changed it), the files loaded, each member’s shift hours and everything with a time on it in the next 48 hours. Pick a range, then Share to chat posts a compact summary into the event chat for the whole crew.',
};

export default report;
