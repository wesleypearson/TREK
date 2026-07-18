import type { TranslationStrings } from '../types';

const suppliers: TranslationStrings = {
  'suppliers.title': 'Suppliers',
  'suppliers.subtitle':
    'Every business the crew deals with — built automatically from receipt scans, tracked across every event.',
  'suppliers.searchPlaceholder': 'Search suppliers…',
  'suppliers.add': 'Add supplier',
  'suppliers.empty': 'No suppliers yet',
  'suppliers.emptyHint': 'Scan a receipt on any event and the vendor lands here automatically — or add one by hand.',
  'suppliers.noResults': 'No suppliers match "{query}"',
  'suppliers.events': '{count} events',
  'suppliers.event': '1 event',
  'suppliers.expenses': '{count} expenses',
  'suppliers.expense': '1 expense',
  'suppliers.venues': '{count} venues',
  'suppliers.lastInteraction': 'Last: {date}',
  'suppliers.neverUsed': 'No interactions yet',
  'suppliers.fromReceipt': 'From a receipt scan',

  'suppliers.info.title': 'How suppliers work',
  'suppliers.info.body':
    'Every receipt scan reads the merchant off the docket and files it here — one entry per business, shared across all events. Google Places fills in the address, phone and website; the AI writes a short note. Everything stays editable, and expenses pinned to a supplier build its spend history.',

  'suppliers.detail.contact': 'Contact',
  'suppliers.detail.phone': 'Phone',
  'suppliers.detail.email': 'Email',
  'suppliers.detail.website': 'Website',
  'suppliers.detail.address': 'Address',
  'suppliers.detail.category': 'Category',
  'suppliers.detail.categoryPlaceholder': 'e.g. Catering, AV hire, Hardware',
  'suppliers.detail.aiSummary': 'AI notes',
  'suppliers.detail.notes': 'Notes',
  'suppliers.detail.notesPlaceholder': 'Contacts, rates, account numbers, who to ask for…',
  'suppliers.detail.spend': 'Spend by event',
  'suppliers.detail.interactions': 'Interactions',
  'suppliers.detail.venuesTitle': 'Venues',
  'suppliers.detail.noInteractions': 'Nothing recorded with this supplier yet.',
  'suppliers.detail.enrich': 'Enrich',
  'suppliers.detail.enriching': 'Enriching…',
  'suppliers.detail.enriched': 'Details refreshed',
  'suppliers.detail.save': 'Save',
  'suppliers.detail.saved': 'Supplier saved',
  'suppliers.detail.delete': 'Delete supplier',
  'suppliers.detail.deleteTitle': 'Delete supplier',
  'suppliers.detail.deleteBody':
    'This removes {name} from the book. Expenses and venues that pointed at it stay, but lose the link. This cannot be undone.',
  'suppliers.detail.deleted': 'Supplier deleted',
  'suppliers.namePlaceholder': 'Business name',
  'suppliers.createError': 'Could not create supplier',
  'suppliers.saveError': 'Could not save supplier',

  'costs.supplier': 'Supplier',
  'costs.noSupplier': 'No supplier',
  'costs.autoLinked': 'Matched {name} — venue and supplier linked',
  'costs.autoLinkedSupplier': 'Matched supplier {name}',
};

export default suppliers;
