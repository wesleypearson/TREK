import type { TranslationStrings } from '../types';

const suppliers: TranslationStrings = {
  'suppliers.title': 'Leverantörer',
  'suppliers.subtitle':
    'Alla företag som gruppen har att göra med — byggs automatiskt från kvittoskanningar och följs över alla resor.',
  'suppliers.searchPlaceholder': 'Sök leverantörer…',
  'suppliers.add': 'Lägg till leverantör',
  'suppliers.empty': 'Inga leverantörer ännu',
  'suppliers.emptyHint':
    'Skanna ett kvitto på valfri resa så hamnar handlaren här automatiskt — eller lägg till en för hand.',
  'suppliers.noResults': 'Inga leverantörer matchar "{query}"',
  'suppliers.events': '{count} resor',
  'suppliers.event': '1 resa',
  'suppliers.expenses': '{count} utgifter',
  'suppliers.expense': '1 utgift',
  'suppliers.venues': '{count} platser',
  'suppliers.lastInteraction': 'Senast: {date}',
  'suppliers.neverUsed': 'Inga interaktioner ännu',
  'suppliers.fromReceipt': 'Från en kvittoskanning',

  'suppliers.info.title': 'Så fungerar leverantörer',
  'suppliers.info.body':
    'Varje kvittoskanning läser av handlaren från kvittot och sparar den här — en post per företag, delad över alla resor. Google Places fyller i adress, telefon och webbplats; AI:n skriver en kort anteckning. Allt går att redigera, och utgifter som fästs vid en leverantör bygger upp dess utgiftshistorik.',

  'suppliers.detail.contact': 'Kontakt',
  'suppliers.detail.phone': 'Telefon',
  'suppliers.detail.email': 'E-post',
  'suppliers.detail.website': 'Webbplats',
  'suppliers.detail.address': 'Adress',
  'suppliers.detail.category': 'Kategori',
  'suppliers.detail.categoryPlaceholder': 't.ex. catering, AV-uthyrning, järnhandel',
  'suppliers.detail.aiSummary': 'AI-anteckningar',
  'suppliers.detail.notes': 'Anteckningar',
  'suppliers.detail.notesPlaceholder': 'Kontakter, priser, kundnummer, vem du ska fråga efter…',
  'suppliers.detail.spend': 'Utgifter per resa',
  'suppliers.detail.interactions': 'Interaktioner',
  'suppliers.detail.venuesTitle': 'Platser',
  'suppliers.detail.noInteractions': 'Inget registrerat med den här leverantören ännu.',
  'suppliers.detail.enrich': 'Berika',
  'suppliers.detail.enriching': 'Berikar…',
  'suppliers.detail.enriched': 'Uppgifter uppdaterade',
  'suppliers.detail.save': 'Spara',
  'suppliers.detail.saved': 'Leverantör sparad',
  'suppliers.detail.delete': 'Radera leverantör',
  'suppliers.detail.deleteTitle': 'Radera leverantör',
  'suppliers.detail.deleteBody':
    'Detta tar bort {name} ur registret. Utgifter och platser som pekade på den finns kvar men förlorar kopplingen. Det går inte att ångra.',
  'suppliers.detail.deleted': 'Leverantör raderad',
  'suppliers.namePlaceholder': 'Företagsnamn',
  'suppliers.createError': 'Det gick inte att skapa leverantören',
  'suppliers.saveError': 'Det gick inte att spara leverantören',

  'costs.supplier': 'Leverantör',
  'costs.noSupplier': 'Ingen leverantör',
  'costs.autoLinked': '{name} matchad — plats och leverantör kopplade',
  'costs.autoLinkedSupplier': 'Leverantör {name} matchad',
};

export default suppliers;
