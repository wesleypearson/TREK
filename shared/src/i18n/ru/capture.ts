import type { TranslationStrings } from '../types';

const capture: TranslationStrings = {
  'capture.title': 'Capture',
  'capture.subtitle':
    'Запись датчиков только с вашего согласия — выберите, что именно записывать, начните сессию, и каждый замер попадёт в собственную аналитику группы.',

  'capture.info.title': 'Что записывает Capture',
  'capture.info.body':
    'Ничего не записывается, пока вы не включите датчик и не начнёте сессию. Геопозиция сохраняет GPS-трек (одна точка раз в несколько секунд). Движение сохраняет одно пиковое значение ускорения в секунду — никогда не сырой поток данных. Батарея и сеть фиксируют уровень заряда, зарядку и смену подключения. Видимость экрана отмечает, когда приложение уходит в фон. Всё отправляется в собственный self-hosted-экземпляр PostHog группы — третьи стороны этого никогда не увидят.',

  'capture.sensors.location': 'Трек перемещений',
  'capture.sensors.locationHint': 'Точные GPS-координаты, не чаще одного замера в 5 секунд',
  'capture.sensors.motion': 'Движение',
  'capture.sensors.motionHint': 'Пиковое ускорение за секунду — сводное значение, а не сырой поток',
  'capture.sensors.battery': 'Батарея',
  'capture.sensors.batteryHint': 'Уровень заряда и статус зарядки — при изменении и раз в минуту',
  'capture.sensors.network': 'Сеть',
  'capture.sensors.networkHint': 'Тип подключения и оценка скорости — при изменении и раз в минуту',
  'capture.sensors.visibility': 'Видимость экрана',
  'capture.sensors.visibilityHint': 'Когда приложение уходит в фон или возвращается',

  'capture.start': 'Начать запись',
  'capture.stop': 'Остановить запись',
  'capture.selectSensor': 'Чтобы начать, включите хотя бы один датчик',
  'capture.recording': 'Идёт запись',
  'capture.session': 'Сессия',

  'capture.elapsed': 'Прошло',
  'capture.samples': 'Замеры',
  'capture.lastFix': 'Последний замер',
  'capture.noFix': 'Замеров пока нет',

  'capture.foregroundWarning':
    'Capture работает, только пока приложение открыто и на экране — при переключении на другое приложение или выключении экрана запись приостанавливается (пропуски будут видны по датчику видимости экрана).',

  'capture.summaryTitle': 'Итоги сессии',
  'capture.summaryDuration': 'Длительность',
  'capture.summaryTotal': 'Всего замеров',

  'capture.permissionDenied': 'Доступ запрещён',
  'capture.notSupported': 'Не поддерживается на этом устройстве',
};

export default capture;
