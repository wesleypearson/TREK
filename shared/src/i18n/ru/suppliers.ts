import type { TranslationStrings } from '../types';

const suppliers: TranslationStrings = {
  'suppliers.title': 'Поставщики',
  'suppliers.subtitle':
    'Все компании, с которыми имеет дело группа — записи создаются автоматически из сканов чеков и отслеживаются во всех поездках.',
  'suppliers.searchPlaceholder': 'Поиск поставщиков…',
  'suppliers.add': 'Добавить поставщика',
  'suppliers.empty': 'Поставщиков пока нет',
  'suppliers.emptyHint':
    'Отсканируйте чек в любой поездке — продавец появится здесь автоматически. Или добавьте поставщика вручную.',
  'suppliers.noResults': 'Нет поставщиков по запросу «{query}»',
  'suppliers.events': '{count} поездок',
  'suppliers.event': '1 поездка',
  'suppliers.expenses': '{count} расходов',
  'suppliers.expense': '1 расход',
  'suppliers.venues': '{count} мест',
  'suppliers.lastInteraction': 'Последнее: {date}',
  'suppliers.neverUsed': 'Взаимодействий пока нет',
  'suppliers.fromReceipt': 'Из скана чека',

  'suppliers.info.title': 'Как работают поставщики',
  'suppliers.info.body':
    'Каждый скан чека считывает продавца с документа и сохраняет его здесь — одна запись на компанию, общая для всех поездок. Google Places подставляет адрес, телефон и сайт; ИИ пишет короткую заметку. Всё можно редактировать, а расходы, привязанные к поставщику, складываются в его историю трат.',

  'suppliers.detail.contact': 'Контакт',
  'suppliers.detail.phone': 'Телефон',
  'suppliers.detail.email': 'Эл. почта',
  'suppliers.detail.website': 'Сайт',
  'suppliers.detail.address': 'Адрес',
  'suppliers.detail.category': 'Категория',
  'suppliers.detail.categoryPlaceholder': 'напр. кейтеринг, аренда техники, стройматериалы',
  'suppliers.detail.aiSummary': 'Заметки ИИ',
  'suppliers.detail.notes': 'Заметки',
  'suppliers.detail.notesPlaceholder': 'Контакты, тарифы, номера счетов, к кому обращаться…',
  'suppliers.detail.spend': 'Расходы по поездкам',
  'suppliers.detail.interactions': 'Взаимодействия',
  'suppliers.detail.venuesTitle': 'Места',
  'suppliers.detail.noInteractions': 'С этим поставщиком пока ничего не записано.',
  'suppliers.detail.enrich': 'Дополнить',
  'suppliers.detail.enriching': 'Дополняем…',
  'suppliers.detail.enriched': 'Данные обновлены',
  'suppliers.detail.save': 'Сохранить',
  'suppliers.detail.saved': 'Поставщик сохранён',
  'suppliers.detail.delete': 'Удалить поставщика',
  'suppliers.detail.deleteTitle': 'Удалить поставщика',
  'suppliers.detail.deleteBody':
    'Это удалит {name} из справочника. Расходы и места, которые на него ссылались, останутся, но потеряют связь. Отменить это действие невозможно.',
  'suppliers.detail.deleted': 'Поставщик удалён',
  'suppliers.namePlaceholder': 'Название компании',
  'suppliers.createError': 'Не удалось создать поставщика',
  'suppliers.saveError': 'Не удалось сохранить поставщика',

  'costs.supplier': 'Поставщик',
  'costs.noSupplier': 'Без поставщика',
  'costs.autoLinked': 'Найдено совпадение: {name} — место и поставщик связаны',
  'costs.autoLinkedSupplier': 'Найден поставщик {name}',
};

export default suppliers;
