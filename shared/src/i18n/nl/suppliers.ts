import type { TranslationStrings } from '../types';

const suppliers: TranslationStrings = {
  'suppliers.title': 'Leveranciers',
  'suppliers.subtitle':
    'Elk bedrijf waar de groep mee te maken heeft — automatisch opgebouwd uit bonscans en gevolgd over alle reizen.',
  'suppliers.searchPlaceholder': 'Leveranciers zoeken…',
  'suppliers.add': 'Leverancier toevoegen',
  'suppliers.empty': 'Nog geen leveranciers',
  'suppliers.emptyHint':
    'Scan op een willekeurige reis een bon en de winkel belandt hier automatisch — of voeg er een met de hand toe.',
  'suppliers.noResults': 'Geen leveranciers gevonden voor "{query}"',
  'suppliers.events': '{count} reizen',
  'suppliers.event': '1 reis',
  'suppliers.expenses': '{count} uitgaven',
  'suppliers.expense': '1 uitgave',
  'suppliers.venues': '{count} locaties',
  'suppliers.lastInteraction': 'Laatste: {date}',
  'suppliers.neverUsed': 'Nog geen interacties',
  'suppliers.fromReceipt': 'Uit een bonscan',

  'suppliers.info.title': 'Zo werken leveranciers',
  'suppliers.info.body':
    'Elke bonscan leest de winkel van de bon en zet die hier neer — één vermelding per bedrijf, gedeeld over alle reizen. Google Places vult adres, telefoon en website in; de AI schrijft een korte notitie. Alles blijft bewerkbaar, en uitgaven die aan een leverancier zijn gekoppeld bouwen zijn uitgavenhistorie op.',

  'suppliers.detail.contact': 'Contact',
  'suppliers.detail.phone': 'Telefoon',
  'suppliers.detail.email': 'E-mail',
  'suppliers.detail.website': 'Website',
  'suppliers.detail.address': 'Adres',
  'suppliers.detail.category': 'Categorie',
  'suppliers.detail.categoryPlaceholder': 'bijv. catering, AV-verhuur, bouwmarkt',
  'suppliers.detail.aiSummary': 'AI-notities',
  'suppliers.detail.notes': 'Notities',
  'suppliers.detail.notesPlaceholder': 'Contacten, tarieven, klantnummers, naar wie je vraagt…',
  'suppliers.detail.spend': 'Uitgaven per reis',
  'suppliers.detail.interactions': 'Interacties',
  'suppliers.detail.venuesTitle': 'Locaties',
  'suppliers.detail.noInteractions': 'Nog niets vastgelegd met deze leverancier.',
  'suppliers.detail.enrich': 'Verrijken',
  'suppliers.detail.enriching': 'Verrijken…',
  'suppliers.detail.enriched': 'Gegevens bijgewerkt',
  'suppliers.detail.save': 'Opslaan',
  'suppliers.detail.saved': 'Leverancier opgeslagen',
  'suppliers.detail.delete': 'Leverancier verwijderen',
  'suppliers.detail.deleteTitle': 'Leverancier verwijderen',
  'suppliers.detail.deleteBody':
    'Dit verwijdert {name} uit het overzicht. Uitgaven en locaties die ernaar verwezen blijven bestaan, maar verliezen de koppeling. Dit kan niet ongedaan worden gemaakt.',
  'suppliers.detail.deleted': 'Leverancier verwijderd',
  'suppliers.namePlaceholder': 'Bedrijfsnaam',
  'suppliers.createError': 'Kon leverancier niet aanmaken',
  'suppliers.saveError': 'Kon leverancier niet opslaan',

  'costs.supplier': 'Leverancier',
  'costs.noSupplier': 'Geen leverancier',
  'costs.autoLinked': '{name} herkend — locatie en leverancier gekoppeld',
  'costs.autoLinkedSupplier': 'Leverancier {name} herkend',
};

export default suppliers;
