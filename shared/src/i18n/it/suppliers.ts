import type { TranslationStrings } from '../types';

const suppliers: TranslationStrings = {
  'suppliers.title': 'Fornitori',
  'suppliers.subtitle':
    'Tutte le attività con cui il gruppo ha a che fare — create automaticamente dagli scontrini scansionati e seguite su tutti i viaggi.',
  'suppliers.searchPlaceholder': 'Cerca fornitori…',
  'suppliers.add': 'Aggiungi fornitore',
  'suppliers.empty': 'Ancora nessun fornitore',
  'suppliers.emptyHint':
    "Scansiona uno scontrino in un viaggio qualsiasi e l'esercente arriva qui automaticamente — oppure aggiungine uno a mano.",
  'suppliers.noResults': 'Nessun fornitore corrisponde a "{query}"',
  'suppliers.events': '{count} viaggi',
  'suppliers.event': '1 viaggio',
  'suppliers.expenses': '{count} spese',
  'suppliers.expense': '1 spesa',
  'suppliers.venues': '{count} luoghi',
  'suppliers.lastInteraction': 'Ultima: {date}',
  'suppliers.neverUsed': 'Ancora nessuna interazione',
  'suppliers.fromReceipt': 'Da uno scontrino scansionato',

  'suppliers.info.title': 'Come funzionano i fornitori',
  'suppliers.info.body':
    "Ogni scansione di scontrino legge l'esercente dal documento e lo archivia qui — una voce per attività, condivisa tra tutti i viaggi. Google Places completa indirizzo, telefono e sito web; l'IA scrive una breve nota. Tutto resta modificabile, e le spese fissate a un fornitore ne costruiscono lo storico di spesa.",

  'suppliers.detail.contact': 'Contatto',
  'suppliers.detail.phone': 'Telefono',
  'suppliers.detail.email': 'Email',
  'suppliers.detail.website': 'Sito web',
  'suppliers.detail.address': 'Indirizzo',
  'suppliers.detail.category': 'Categoria',
  'suppliers.detail.categoryPlaceholder': 'es. catering, noleggio AV, ferramenta',
  'suppliers.detail.aiSummary': 'Note IA',
  'suppliers.detail.notes': 'Note',
  'suppliers.detail.notesPlaceholder': 'Contatti, tariffe, numeri di conto, a chi rivolgersi…',
  'suppliers.detail.spend': 'Spesa per viaggio',
  'suppliers.detail.interactions': 'Interazioni',
  'suppliers.detail.venuesTitle': 'Luoghi',
  'suppliers.detail.noInteractions': 'Ancora nulla di registrato con questo fornitore.',
  'suppliers.detail.enrich': 'Arricchisci',
  'suppliers.detail.enriching': 'Arricchimento…',
  'suppliers.detail.enriched': 'Dettagli aggiornati',
  'suppliers.detail.save': 'Salva',
  'suppliers.detail.saved': 'Fornitore salvato',
  'suppliers.detail.delete': 'Elimina fornitore',
  'suppliers.detail.deleteTitle': 'Elimina fornitore',
  'suppliers.detail.deleteBody':
    "Questa operazione rimuove {name} dall'elenco. Le spese e i luoghi che vi facevano riferimento restano, ma perdono il collegamento. Non può essere annullata.",
  'suppliers.detail.deleted': 'Fornitore eliminato',
  'suppliers.namePlaceholder': "Nome dell'attività",
  'suppliers.createError': 'Impossibile creare il fornitore',
  'suppliers.saveError': 'Impossibile salvare il fornitore',

  'costs.supplier': 'Fornitore',
  'costs.noSupplier': 'Nessun fornitore',
  'costs.autoLinked': '{name} riconosciuto — luogo e fornitore collegati',
  'costs.autoLinkedSupplier': 'Fornitore {name} riconosciuto',
};

export default suppliers;
