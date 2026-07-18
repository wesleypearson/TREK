import type { TranslationStrings } from '../types';

const suppliers: TranslationStrings = {
  'suppliers.title': 'Dostawcy',
  'suppliers.subtitle':
    'Wszystkie firmy, z którymi grupa ma do czynienia — budowane automatycznie ze skanów paragonów i śledzone we wszystkich podróżach.',
  'suppliers.searchPlaceholder': 'Szukaj dostawców…',
  'suppliers.add': 'Dodaj dostawcę',
  'suppliers.empty': 'Brak dostawców',
  'suppliers.emptyHint':
    'Zeskanuj paragon w dowolnej podróży, a sprzedawca trafi tu automatycznie — albo dodaj dostawcę ręcznie.',
  'suppliers.noResults': 'Żaden dostawca nie pasuje do "{query}"',
  'suppliers.events': 'Podróży: {count}',
  'suppliers.event': '1 podróż',
  'suppliers.expenses': 'Wydatków: {count}',
  'suppliers.expense': '1 wydatek',
  'suppliers.venues': 'Miejsc: {count}',
  'suppliers.lastInteraction': 'Ostatnio: {date}',
  'suppliers.neverUsed': 'Brak interakcji',
  'suppliers.fromReceipt': 'Ze skanu paragonu',

  'suppliers.info.title': 'Jak działają dostawcy',
  'suppliers.info.body':
    'Każdy skan paragonu odczytuje sprzedawcę z dokumentu i zapisuje go tutaj — jeden wpis na firmę, wspólny dla wszystkich podróży. Google Places uzupełnia adres, telefon i stronę; AI pisze krótką notatkę. Wszystko można edytować, a wydatki przypięte do dostawcy budują jego historię wydatków.',

  'suppliers.detail.contact': 'Kontakt',
  'suppliers.detail.phone': 'Telefon',
  'suppliers.detail.email': 'E-mail',
  'suppliers.detail.website': 'Strona internetowa',
  'suppliers.detail.address': 'Adres',
  'suppliers.detail.category': 'Kategoria',
  'suppliers.detail.categoryPlaceholder': 'np. catering, wynajem sprzętu AV, sklep budowlany',
  'suppliers.detail.aiSummary': 'Notatki AI',
  'suppliers.detail.notes': 'Notatki',
  'suppliers.detail.notesPlaceholder': 'Kontakty, stawki, numery kont, o kogo pytać…',
  'suppliers.detail.spend': 'Wydatki według podróży',
  'suppliers.detail.interactions': 'Interakcje',
  'suppliers.detail.venuesTitle': 'Miejsca',
  'suppliers.detail.noInteractions': 'Z tym dostawcą nic jeszcze nie zarejestrowano.',
  'suppliers.detail.enrich': 'Uzupełnij dane',
  'suppliers.detail.enriching': 'Uzupełnianie…',
  'suppliers.detail.enriched': 'Dane odświeżone',
  'suppliers.detail.save': 'Zapisz',
  'suppliers.detail.saved': 'Dostawca zapisany',
  'suppliers.detail.delete': 'Usuń dostawcę',
  'suppliers.detail.deleteTitle': 'Usuń dostawcę',
  'suppliers.detail.deleteBody':
    'To usunie {name} z katalogu. Wydatki i miejsca, które na niego wskazywały, zostaną, ale stracą powiązanie. Tego nie można cofnąć.',
  'suppliers.detail.deleted': 'Dostawca usunięty',
  'suppliers.namePlaceholder': 'Nazwa firmy',
  'suppliers.createError': 'Nie udało się utworzyć dostawcy',
  'suppliers.saveError': 'Nie udało się zapisać dostawcy',

  'costs.supplier': 'Dostawca',
  'costs.noSupplier': 'Brak dostawcy',
  'costs.autoLinked': 'Dopasowano {name} — miejsce i dostawca powiązani',
  'costs.autoLinkedSupplier': 'Dopasowano dostawcę {name}',
};

export default suppliers;
