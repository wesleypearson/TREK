import type { TranslationStrings } from '../types';

const suppliers: TranslationStrings = {
  'suppliers.title': 'Dodavatelé',
  'suppliers.subtitle':
    'Všechny podniky, se kterými skupina jedná — sestavuje se automaticky ze skenů účtenek a sleduje napříč všemi cestami.',
  'suppliers.searchPlaceholder': 'Hledat dodavatele…',
  'suppliers.add': 'Přidat dodavatele',
  'suppliers.empty': 'Zatím žádní dodavatelé',
  'suppliers.emptyHint':
    'Naskenujte účtenku na kterékoli cestě a obchodník se sem přidá automaticky — nebo přidejte dodavatele ručně.',
  'suppliers.noResults': 'Žádný dodavatel neodpovídá „{query}”',
  'suppliers.events': '{count} cest',
  'suppliers.event': '1 cesta',
  'suppliers.expenses': '{count} výdajů',
  'suppliers.expense': '1 výdaj',
  'suppliers.venues': '{count} míst',
  'suppliers.lastInteraction': 'Naposledy: {date}',
  'suppliers.neverUsed': 'Zatím žádné interakce',
  'suppliers.fromReceipt': 'Ze skenu účtenky',

  'suppliers.info.title': 'Jak dodavatelé fungují',
  'suppliers.info.body':
    'Každý sken účtenky přečte obchodníka z dokladu a uloží ho sem — jeden záznam na podnik, sdílený napříč všemi cestami. Google Places doplní adresu, telefon a web; AI napíše krátkou poznámku. Vše zůstává upravitelné a výdaje připnuté k dodavateli budují jeho historii útrat.',

  'suppliers.detail.contact': 'Kontakt',
  'suppliers.detail.phone': 'Telefon',
  'suppliers.detail.email': 'E-mail',
  'suppliers.detail.website': 'Web',
  'suppliers.detail.address': 'Adresa',
  'suppliers.detail.category': 'Kategorie',
  'suppliers.detail.categoryPlaceholder': 'např. catering, půjčovna AV techniky, železářství',
  'suppliers.detail.aiSummary': 'Poznámky AI',
  'suppliers.detail.notes': 'Poznámky',
  'suppliers.detail.notesPlaceholder': 'Kontakty, ceny, čísla účtů, na koho se ptát…',
  'suppliers.detail.spend': 'Výdaje podle cesty',
  'suppliers.detail.interactions': 'Interakce',
  'suppliers.detail.venuesTitle': 'Místa',
  'suppliers.detail.noInteractions': 'S tímto dodavatelem zatím není nic zaznamenáno.',
  'suppliers.detail.enrich': 'Doplnit údaje',
  'suppliers.detail.enriching': 'Doplňování…',
  'suppliers.detail.enriched': 'Údaje aktualizovány',
  'suppliers.detail.save': 'Uložit',
  'suppliers.detail.saved': 'Dodavatel uložen',
  'suppliers.detail.delete': 'Smazat dodavatele',
  'suppliers.detail.deleteTitle': 'Smazat dodavatele',
  'suppliers.detail.deleteBody':
    'Tímto odstraníte {name} z adresáře. Výdaje a místa, které na něj odkazovaly, zůstanou, ale ztratí propojení. Tuto akci nelze vrátit zpět.',
  'suppliers.detail.deleted': 'Dodavatel smazán',
  'suppliers.namePlaceholder': 'Název podniku',
  'suppliers.createError': 'Dodavatele se nepodařilo vytvořit',
  'suppliers.saveError': 'Dodavatele se nepodařilo uložit',

  'costs.supplier': 'Dodavatel',
  'costs.noSupplier': 'Bez dodavatele',
  'costs.autoLinked': 'Rozpoznáno {name} — místo a dodavatel propojeni',
  'costs.autoLinkedSupplier': 'Rozpoznán dodavatel {name}',
};

export default suppliers;
