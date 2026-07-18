import type { TranslationStrings } from '../types';

const capture: TranslationStrings = {
  'capture.title': 'Capture',
  'capture.subtitle':
    'Запис сенсорів лише за вашою згодою — оберіть, що саме записувати, розпочніть сесію, і кожен зразок потрапить у власну аналітику команди.',

  'capture.info.title': 'Що записує Capture',
  'capture.info.body':
    'Ніщо не записується, доки ви не ввімкнете сенсор і не розпочнете сесію. Локація зберігає GPS-трек (одна точка раз на кілька секунд). Рух зберігає одне пікове значення прискорення на секунду — ніколи не сирий потік. Батарея та мережа фіксують рівень заряду, заряджання та зміни з’єднання. Видимість екрана відзначає, коли додаток переходить у фоновий режим. Усе надсилається на власний самостійно розгорнутий екземпляр PostHog команди — треті сторони цього ніколи не бачать.',

  'capture.sensors.location': 'Трек локації',
  'capture.sensors.locationHint': 'Високоточні GPS-точки, не частіше однієї раз на 5 секунд',
  'capture.sensors.motion': 'Рух',
  'capture.sensors.motionHint': 'Пікове прискорення за секунду — агреговане значення, а не сирий потік',
  'capture.sensors.battery': 'Батарея',
  'capture.sensors.batteryHint': 'Рівень заряду та стан заряджання — при зміні та щохвилини',
  'capture.sensors.network': 'Мережа',
  'capture.sensors.networkHint': 'Тип з’єднання та оцінка швидкості — при зміні та щохвилини',
  'capture.sensors.visibility': 'Видимість екрана',
  'capture.sensors.visibilityHint': 'Коли додаток переходить у фоновий режим або повертається',

  'capture.start': 'Почати запис',
  'capture.stop': 'Зупинити запис',
  'capture.selectSensor': 'Увімкніть принаймні один сенсор, щоб почати',
  'capture.recording': 'Йде запис',
  'capture.session': 'Сесія',

  'capture.elapsed': 'Минуло',
  'capture.samples': 'Зразки',
  'capture.lastFix': 'Остання точка',
  'capture.noFix': 'Ще немає точок',

  'capture.foregroundWarning':
    'Capture працює лише тоді, коли додаток відкритий і на екрані — перемикання додатків або вимкнення екрана призупиняє запис (сенсор видимості покаже проміжки).',

  'capture.summaryTitle': 'Підсумок сесії',
  'capture.summaryDuration': 'Тривалість',
  'capture.summaryTotal': 'Усього зразків',

  'capture.permissionDenied': 'У дозволі відмовлено',
  'capture.notSupported': 'Не підтримується на цьому пристрої',
};

export default capture;
