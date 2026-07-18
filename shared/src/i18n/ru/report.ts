import type { TranslationStrings } from '../types';

const report: TranslationStrings = {
  'report.title': 'Производственный отчёт',
  'report.range.24h': 'Последние 24 ч',
  'report.range.48h': 'Последние 48 ч',
  'report.range.7d': 'Последние 7 дней',
  'report.changes': 'Изменения расписания',
  'report.changesEmpty': 'В этом периоде нет изменений расписания.',
  'report.files': 'Загруженные файлы',
  'report.filesEmpty': 'В этом периоде файлы не загружались.',
  'report.shiftHours': 'Часы смен',
  'report.shiftsEmpty': 'В этом периоде нет смен.',
  'report.upcoming': 'Ближайшие 48 часов',
  'report.upcomingEmpty': 'В ближайшие 48 часов ничего не запланировано.',
  'report.by': 'от {name}',
  'report.onShift': 'сейчас на смене',
  'report.share': 'Поделиться в чат',
  'report.shared': 'Отчёт отправлен в чат события',
  'report.loadFailed': 'Не удалось загрузить отчёт.',
  'report.retry': 'Повторить',
  'report.info.title': 'О производственных отчётах',
  'report.info.body':
    'Сводка SM/PM по этому событию: каждое изменение расписания (что сдвинулось, старое и новое время, кто изменил), загруженные файлы, часы смен каждого участника и всё, у чего есть время, в ближайшие 48 часов. Выберите период — «Поделиться в чат» опубликует компактную сводку в чате события для всей команды.',
};

export default report;
