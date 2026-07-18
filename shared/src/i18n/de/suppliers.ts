import type { TranslationStrings } from '../types';

const suppliers: TranslationStrings = {
  'suppliers.title': 'Lieferanten',
  'suppliers.subtitle':
    'Alle Firmen, mit denen die Gruppe zu tun hat — automatisch aus Beleg-Scans aufgebaut und über alle Reisen hinweg im Blick.',
  'suppliers.searchPlaceholder': 'Lieferanten suchen…',
  'suppliers.add': 'Lieferant hinzufügen',
  'suppliers.empty': 'Noch keine Lieferanten',
  'suppliers.emptyHint':
    'Scanne auf einer beliebigen Reise einen Beleg, und der Händler landet automatisch hier — oder füge einen von Hand hinzu.',
  'suppliers.noResults': 'Keine Lieferanten passen zu "{query}"',
  'suppliers.events': '{count} Reisen',
  'suppliers.event': '1 Reise',
  'suppliers.expenses': '{count} Ausgaben',
  'suppliers.expense': '1 Ausgabe',
  'suppliers.venues': '{count} Veranstaltungsorte',
  'suppliers.lastInteraction': 'Zuletzt: {date}',
  'suppliers.neverUsed': 'Noch keine Interaktionen',
  'suppliers.fromReceipt': 'Aus einem Beleg-Scan',

  'suppliers.info.title': 'So funktionieren Lieferanten',
  'suppliers.info.body':
    'Jeder Beleg-Scan liest den Händler vom Beleg und legt ihn hier ab — ein Eintrag pro Firma, geteilt über alle Reisen. Google Places ergänzt Adresse, Telefon und Website; die KI schreibt eine kurze Notiz. Alles bleibt bearbeitbar, und an einen Lieferanten geheftete Ausgaben bauen seine Ausgabenhistorie auf.',

  'suppliers.detail.contact': 'Kontakt',
  'suppliers.detail.phone': 'Telefon',
  'suppliers.detail.email': 'E-Mail',
  'suppliers.detail.website': 'Website',
  'suppliers.detail.address': 'Adresse',
  'suppliers.detail.category': 'Kategorie',
  'suppliers.detail.categoryPlaceholder': 'z. B. Catering, Technikverleih, Baumarkt',
  'suppliers.detail.aiSummary': 'KI-Notizen',
  'suppliers.detail.notes': 'Notizen',
  'suppliers.detail.notesPlaceholder': 'Kontakte, Preise, Kundennummern, Ansprechpartner…',
  'suppliers.detail.spend': 'Ausgaben pro Reise',
  'suppliers.detail.interactions': 'Interaktionen',
  'suppliers.detail.venuesTitle': 'Veranstaltungsorte',
  'suppliers.detail.noInteractions': 'Mit diesem Lieferanten ist noch nichts erfasst.',
  'suppliers.detail.enrich': 'Anreichern',
  'suppliers.detail.enriching': 'Wird angereichert…',
  'suppliers.detail.enriched': 'Details aktualisiert',
  'suppliers.detail.save': 'Speichern',
  'suppliers.detail.saved': 'Lieferant gespeichert',
  'suppliers.detail.delete': 'Lieferant löschen',
  'suppliers.detail.deleteTitle': 'Lieferant löschen',
  'suppliers.detail.deleteBody':
    'Das entfernt {name} aus dem Verzeichnis. Ausgaben und Veranstaltungsorte, die darauf verwiesen, bleiben erhalten, verlieren aber die Verknüpfung. Das lässt sich nicht rückgängig machen.',
  'suppliers.detail.deleted': 'Lieferant gelöscht',
  'suppliers.namePlaceholder': 'Firmenname',
  'suppliers.createError': 'Lieferant konnte nicht erstellt werden',
  'suppliers.saveError': 'Lieferant konnte nicht gespeichert werden',

  'costs.supplier': 'Lieferant',
  'costs.noSupplier': 'Kein Lieferant',
  'costs.autoLinked': '{name} erkannt — Veranstaltungsort und Lieferant verknüpft',
  'costs.autoLinkedSupplier': 'Lieferant {name} erkannt',
};

export default suppliers;
