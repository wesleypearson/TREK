import type { TranslationStrings } from '../types';

const suppliers: TranslationStrings = {
  'suppliers.title': 'Beszállítók',
  'suppliers.subtitle':
    'Minden cég, amellyel a csoport kapcsolatban áll — automatikusan épül a blokkok beolvasásából, és minden utazásban követhető.',
  'suppliers.searchPlaceholder': 'Beszállítók keresése…',
  'suppliers.add': 'Beszállító hozzáadása',
  'suppliers.empty': 'Még nincsenek beszállítók',
  'suppliers.emptyHint':
    'Olvass be egy blokkot bármelyik utazásban, és a kereskedő automatikusan ide kerül — vagy add hozzá kézzel.',
  'suppliers.noResults': 'Egyetlen beszállító sem felel meg ennek: „{query}”',
  'suppliers.events': '{count} utazás',
  'suppliers.event': '1 utazás',
  'suppliers.expenses': '{count} költség',
  'suppliers.expense': '1 költség',
  'suppliers.venues': '{count} helyszín',
  'suppliers.lastInteraction': 'Utoljára: {date}',
  'suppliers.neverUsed': 'Még nincs interakció',
  'suppliers.fromReceipt': 'Blokk beolvasásából',

  'suppliers.info.title': 'Így működnek a beszállítók',
  'suppliers.info.body':
    'Minden blokkbeolvasás kiolvassa a kereskedőt a bizonylatról, és ide menti — cégenként egy bejegyzés, az összes utazás között megosztva. A Google Places kitölti a címet, a telefonszámot és a webhelyet; az AI rövid jegyzetet ír. Minden szerkeszthető marad, és a beszállítóhoz tűzött költségek felépítik a költéstörténetét.',

  'suppliers.detail.contact': 'Kapcsolat',
  'suppliers.detail.phone': 'Telefon',
  'suppliers.detail.email': 'E-mail',
  'suppliers.detail.website': 'Webhely',
  'suppliers.detail.address': 'Cím',
  'suppliers.detail.category': 'Kategória',
  'suppliers.detail.categoryPlaceholder': 'pl. catering, technikabérlés, barkácsbolt',
  'suppliers.detail.aiSummary': 'AI-jegyzetek',
  'suppliers.detail.notes': 'Jegyzetek',
  'suppliers.detail.notesPlaceholder': 'Kapcsolatok, árak, ügyfélszámok, kit keress…',
  'suppliers.detail.spend': 'Költés utazásonként',
  'suppliers.detail.interactions': 'Interakciók',
  'suppliers.detail.venuesTitle': 'Helyszínek',
  'suppliers.detail.noInteractions': 'Ezzel a beszállítóval még nincs rögzítve semmi.',
  'suppliers.detail.enrich': 'Kiegészítés',
  'suppliers.detail.enriching': 'Kiegészítés folyamatban…',
  'suppliers.detail.enriched': 'Adatok frissítve',
  'suppliers.detail.save': 'Mentés',
  'suppliers.detail.saved': 'Beszállító mentve',
  'suppliers.detail.delete': 'Beszállító törlése',
  'suppliers.detail.deleteTitle': 'Beszállító törlése',
  'suppliers.detail.deleteBody':
    'Ez eltávolítja {name} bejegyzését a listából. A rá mutató költségek és helyszínek megmaradnak, de elveszítik a kapcsolatot. A művelet nem vonható vissza.',
  'suppliers.detail.deleted': 'Beszállító törölve',
  'suppliers.namePlaceholder': 'Cégnév',
  'suppliers.createError': 'Nem sikerült létrehozni a beszállítót',
  'suppliers.saveError': 'Nem sikerült menteni a beszállítót',

  'costs.supplier': 'Beszállító',
  'costs.noSupplier': 'Nincs beszállító',
  'costs.autoLinked': '{name} felismerve — helyszín és beszállító összekapcsolva',
  'costs.autoLinkedSupplier': '{name} beszállító felismerve',
};

export default suppliers;
