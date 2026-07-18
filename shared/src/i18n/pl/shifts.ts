import type { TranslationStrings } from '../types';

const shifts: TranslationStrings = {
  'shifts.tab': 'Zmiany',
  'shifts.title': 'Zmiany',
  'shifts.signOn': 'Rozpocznij zmianę',
  'shifts.signOff': 'Zakończ zmianę',
  'shifts.onShiftNow': 'Teraz na zmianie',
  'shifts.nobodyOn': 'Nikt nie jest na zmianie',
  'shifts.history': 'Historia',
  'shifts.totals': 'Godziny według członka',
  'shifts.hours': '{h} godz. {m} min',
  'shifts.locationNote':
    'Twoja lokalizacja jest zapisywana raz przy rozpoczęciu i raz przy zakończeniu zmiany — nigdy nie jest śledzona pomiędzy. Jeśli odmówisz, po prostu rozpoczniesz zmianę bez pozycji.',
  'shifts.locationDenied': 'Lokalizacja niedostępna — zapisano bez pozycji',
  'shifts.alreadyOn': 'Już jesteś na zmianie',
  'shifts.info.title': 'Jak działają zmiany',
  'shifts.info.body':
    'Zegar pracy ekipy. Rozpocznij zmianę, gdy zaczynasz pracę, i zakończ ją, gdy kończysz — zegar tyka na żywo dla wszystkich, lista pokazuje, kto jest teraz na zmianie, a karta sum zlicza godziny każdego członka. Na obu końcach zapisywana jest opcjonalnie jedna pozycja (nic pomiędzy), a każde rozpoczęcie i zakończenie zmiany jest ogłaszane na czacie wydarzenia.',
  'shifts.elapsed': 'Na zmianie',
  'shifts.signedOnAt': 'Na zmianie od {time}',
  'shifts.signedOffSummary': '{start} – {end} · {duration}',
  'shifts.empty': 'Brak zmian — rozpocznij zmianę, aby uruchomić zegar.',
};

export default shifts;
