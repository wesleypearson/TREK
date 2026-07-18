import type { TranslationStrings } from '../types';

const shifts: TranslationStrings = {
  'shifts.tab': 'Shifts',
  'shifts.title': 'Shifts',
  'shifts.signOn': 'Sign on',
  'shifts.signOff': 'Sign off',
  'shifts.onShiftNow': 'On shift now',
  'shifts.nobodyOn': 'Nobody is on shift',
  'shifts.history': 'History',
  'shifts.totals': 'Hours per member',
  'shifts.hours': '{h}h {m}m',
  'shifts.locationNote':
    'Your location is captured once at sign-on and once at sign-off — never tracked in between. Denying it just signs you on without a position.',
  'shifts.locationDenied': 'Location unavailable — signed without a position',
  'shifts.alreadyOn': 'Already on shift',
  'shifts.info.title': 'How Shifts works',
  'shifts.info.body':
    'The crew timeclock. Sign on when you start working and off when you stop — the clock ticks live for everyone, the roster shows who is on right now, and the totals card adds up each member’s hours. One optional location fix is taken at each end (nothing in between), and every sign-on and sign-off is announced in the event chat.',
  'shifts.elapsed': 'On shift',
  'shifts.signedOnAt': 'Signed on {time}',
  'shifts.signedOffSummary': '{start} – {end} · {duration}',
  'shifts.empty': 'No shifts yet — sign on to start the clock.',
};

export default shifts;
