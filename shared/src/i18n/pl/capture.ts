import type { TranslationStrings } from '../types';

const capture: TranslationStrings = {
  'capture.title': 'Capture',
  'capture.subtitle':
    'Rejestrowanie czujników wyłącznie za zgodą — wybierz dokładnie, co nagrywać, rozpocznij sesję, a każda próbka trafi do własnej analityki grupy.',

  'capture.info.title': 'Co rejestruje Capture',
  'capture.info.body':
    'Nic nie jest rejestrowane, dopóki nie włączysz czujnika i nie rozpoczniesz sesji. Lokalizacja zapisuje ślad GPS (jeden pomiar co kilka sekund). Ruch zapisuje jedną wartość szczytowego przyspieszenia na sekundę — nigdy surowy strumień danych. Bateria i sieć rejestrują poziom, ładowanie oraz zmiany połączenia. Widoczność ekranu odnotowuje, kiedy aplikacja przechodzi w tło. Wszystko trafia do własnej, samodzielnie hostowanej instancji PostHog grupy — żadna strona trzecia nigdy tego nie zobaczy.',

  'capture.sensors.location': 'Ślad lokalizacji',
  'capture.sensors.locationHint': 'Dokładne pomiary GPS, najwyżej jeden co 5 sekund',
  'capture.sensors.motion': 'Ruch',
  'capture.sensors.motionHint': 'Szczytowe przyspieszenie na sekundę — wartość zbiorcza, nie surowy strumień',
  'capture.sensors.battery': 'Bateria',
  'capture.sensors.batteryHint': 'Poziom naładowania i stan ładowania, przy zmianie i co minutę',
  'capture.sensors.network': 'Sieć',
  'capture.sensors.networkHint': 'Rodzaj połączenia i szacowana prędkość, przy zmianie i co minutę',
  'capture.sensors.visibility': 'Widoczność ekranu',
  'capture.sensors.visibilityHint': 'Kiedy aplikacja przechodzi w tło lub wraca na ekran',

  'capture.start': 'Rozpocznij rejestrowanie',
  'capture.stop': 'Zatrzymaj rejestrowanie',
  'capture.selectSensor': 'Włącz co najmniej jeden czujnik, aby rozpocząć',
  'capture.recording': 'Nagrywanie',
  'capture.session': 'Sesja',

  'capture.elapsed': 'Upłynęło',
  'capture.samples': 'Próbki',
  'capture.lastFix': 'Ostatni pomiar',
  'capture.noFix': 'Jeszcze brak pomiaru',

  'capture.foregroundWarning':
    'Capture działa tylko wtedy, gdy aplikacja jest otwarta i widoczna na ekranie — przełączenie aplikacji lub wyłączenie ekranu wstrzymuje rejestrowanie (czujnik widoczności pokaże przerwy).',

  'capture.summaryTitle': 'Podsumowanie sesji',
  'capture.summaryDuration': 'Czas trwania',
  'capture.summaryTotal': 'Łączna liczba próbek',

  'capture.permissionDenied': 'Odmowa uprawnień',
  'capture.notSupported': 'Nieobsługiwane na tym urządzeniu',
};

export default capture;
