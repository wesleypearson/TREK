import type { TranslationStrings } from '../types';

const suppliers: TranslationStrings = {
  'suppliers.title': 'Постачальники',
  'suppliers.subtitle':
    'Усі компанії, з якими має справу група — записи створюються автоматично зі сканів чеків і відстежуються в усіх поїздках.',
  'suppliers.searchPlaceholder': 'Пошук постачальників…',
  'suppliers.add': 'Додати постачальника',
  'suppliers.empty': 'Постачальників ще немає',
  'suppliers.emptyHint':
    "Відскануйте чек у будь-якій поїздці — продавець з'явиться тут автоматично. Або додайте постачальника вручну.",
  'suppliers.noResults': 'Немає постачальників за запитом «{query}»',
  'suppliers.events': '{count} поїздок',
  'suppliers.event': '1 поїздка',
  'suppliers.expenses': '{count} витрат',
  'suppliers.expense': '1 витрата',
  'suppliers.venues': '{count} місць',
  'suppliers.lastInteraction': 'Останнє: {date}',
  'suppliers.neverUsed': 'Взаємодій ще немає',
  'suppliers.fromReceipt': 'Зі скану чека',

  'suppliers.info.title': 'Як працюють постачальники',
  'suppliers.info.body':
    'Кожен скан чека зчитує продавця з документа й зберігає його тут — один запис на компанію, спільний для всіх поїздок. Google Places підставляє адресу, телефон і сайт; ШІ пише коротку нотатку. Усе можна редагувати, а витрати, закріплені за постачальником, складають його історію витрат.',

  'suppliers.detail.contact': 'Контакт',
  'suppliers.detail.phone': 'Телефон',
  'suppliers.detail.email': 'Ел. пошта',
  'suppliers.detail.website': 'Сайт',
  'suppliers.detail.address': 'Адреса',
  'suppliers.detail.category': 'Категорія',
  'suppliers.detail.categoryPlaceholder': 'напр. кейтеринг, оренда техніки, будматеріали',
  'suppliers.detail.aiSummary': 'Нотатки ШІ',
  'suppliers.detail.notes': 'Нотатки',
  'suppliers.detail.notesPlaceholder': 'Контакти, тарифи, номери рахунків, до кого звертатися…',
  'suppliers.detail.spend': 'Витрати за поїздками',
  'suppliers.detail.interactions': 'Взаємодії',
  'suppliers.detail.venuesTitle': 'Місця',
  'suppliers.detail.noInteractions': 'Із цим постачальником ще нічого не записано.',
  'suppliers.detail.enrich': 'Доповнити',
  'suppliers.detail.enriching': 'Доповнюємо…',
  'suppliers.detail.enriched': 'Дані оновлено',
  'suppliers.detail.save': 'Зберегти',
  'suppliers.detail.saved': 'Постачальника збережено',
  'suppliers.detail.delete': 'Видалити постачальника',
  'suppliers.detail.deleteTitle': 'Видалити постачальника',
  'suppliers.detail.deleteBody':
    "Це видалить {name} з довідника. Витрати й місця, що на нього посилалися, залишаться, але втратять зв'язок. Цю дію неможливо скасувати.",
  'suppliers.detail.deleted': 'Постачальника видалено',
  'suppliers.namePlaceholder': 'Назва компанії',
  'suppliers.createError': 'Не вдалося створити постачальника',
  'suppliers.saveError': 'Не вдалося зберегти постачальника',

  'costs.supplier': 'Постачальник',
  'costs.noSupplier': 'Без постачальника',
  'costs.autoLinked': "Знайдено збіг: {name} — місце й постачальника пов'язано",
  'costs.autoLinkedSupplier': 'Знайдено постачальника {name}',
};

export default suppliers;
