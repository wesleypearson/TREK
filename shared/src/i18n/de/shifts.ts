import type { TranslationStrings } from '../types';

const shifts: TranslationStrings = {
  'shifts.tab': 'Schichten',
  'shifts.title': 'Schichten',
  'shifts.signOn': 'Einstempeln',
  'shifts.signOff': 'Ausstempeln',
  'shifts.onShiftNow': 'Jetzt auf Schicht',
  'shifts.nobodyOn': 'Niemand ist auf Schicht',
  'shifts.history': 'Verlauf',
  'shifts.totals': 'Stunden pro Mitglied',
  'shifts.hours': '{h}h {m}m',
  'shifts.locationNote':
    'Dein Standort wird einmal beim Einstempeln und einmal beim Ausstempeln erfasst — dazwischen wird nie getrackt. Lehnst du es ab, wirst du einfach ohne Position eingestempelt.',
  'shifts.locationDenied': 'Standort nicht verfügbar — ohne Position eingestempelt',
  'shifts.alreadyOn': 'Bereits auf Schicht',
  'shifts.info.title': 'So funktionieren Schichten',
  'shifts.info.body':
    'Die Stempeluhr der Crew. Stempel dich ein, wenn du anfängst zu arbeiten, und aus, wenn du aufhörst — die Uhr läuft live für alle, die Liste zeigt, wer gerade auf Schicht ist, und die Stundenkarte summiert die Stunden jedes Mitglieds. An beiden Enden wird optional einmal der Standort erfasst (nichts dazwischen), und jedes Ein- und Ausstempeln wird im Event-Chat angekündigt.',
  'shifts.elapsed': 'Auf Schicht',
  'shifts.signedOnAt': 'Eingestempelt um {time}',
  'shifts.signedOffSummary': '{start} – {end} · {duration}',
  'shifts.empty': 'Noch keine Schichten — stemple dich ein, um die Uhr zu starten.',
};

export default shifts;
