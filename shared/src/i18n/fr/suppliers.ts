import type { TranslationStrings } from '../types';

const suppliers: TranslationStrings = {
  'suppliers.title': 'Fournisseurs',
  'suppliers.subtitle':
    'Toutes les entreprises avec lesquelles le groupe travaille — ajoutées automatiquement à partir des scans de reçus et suivies sur tous les voyages.',
  'suppliers.searchPlaceholder': 'Rechercher des fournisseurs…',
  'suppliers.add': 'Ajouter un fournisseur',
  'suppliers.empty': 'Aucun fournisseur pour le moment',
  'suppliers.emptyHint':
    "Scannez un reçu sur n'importe quel voyage et le commerçant arrive ici automatiquement — ou ajoutez-en un à la main.",
  'suppliers.noResults': 'Aucun fournisseur ne correspond à « {query} »',
  'suppliers.events': '{count} voyages',
  'suppliers.event': '1 voyage',
  'suppliers.expenses': '{count} dépenses',
  'suppliers.expense': '1 dépense',
  'suppliers.venues': '{count} lieux',
  'suppliers.lastInteraction': 'Dernière : {date}',
  'suppliers.neverUsed': 'Aucune interaction pour le moment',
  'suppliers.fromReceipt': "Issu d'un scan de reçu",

  'suppliers.info.title': 'Comment fonctionnent les fournisseurs',
  'suppliers.info.body':
    "Chaque scan de reçu lit le commerçant sur le ticket et le classe ici — une entrée par entreprise, partagée entre tous les voyages. Google Places renseigne l'adresse, le téléphone et le site web ; l'IA rédige une courte note. Tout reste modifiable, et les dépenses épinglées à un fournisseur construisent son historique de dépenses.",

  'suppliers.detail.contact': 'Contact',
  'suppliers.detail.phone': 'Téléphone',
  'suppliers.detail.email': 'E-mail',
  'suppliers.detail.website': 'Site web',
  'suppliers.detail.address': 'Adresse',
  'suppliers.detail.category': 'Catégorie',
  'suppliers.detail.categoryPlaceholder': 'ex. traiteur, location AV, quincaillerie',
  'suppliers.detail.aiSummary': 'Notes IA',
  'suppliers.detail.notes': 'Notes',
  'suppliers.detail.notesPlaceholder': 'Contacts, tarifs, numéros de compte, qui demander…',
  'suppliers.detail.spend': 'Dépenses par voyage',
  'suppliers.detail.interactions': 'Interactions',
  'suppliers.detail.venuesTitle': 'Lieux',
  'suppliers.detail.noInteractions': "Rien d'enregistré avec ce fournisseur pour le moment.",
  'suppliers.detail.enrich': 'Enrichir',
  'suppliers.detail.enriching': 'Enrichissement…',
  'suppliers.detail.enriched': 'Détails actualisés',
  'suppliers.detail.save': 'Enregistrer',
  'suppliers.detail.saved': 'Fournisseur enregistré',
  'suppliers.detail.delete': 'Supprimer le fournisseur',
  'suppliers.detail.deleteTitle': 'Supprimer le fournisseur',
  'suppliers.detail.deleteBody':
    "Cette action retire {name} de l'annuaire. Les dépenses et les lieux qui y étaient liés sont conservés, mais perdent le lien. Elle ne peut pas être annulée.",
  'suppliers.detail.deleted': 'Fournisseur supprimé',
  'suppliers.namePlaceholder': "Nom de l'entreprise",
  'suppliers.createError': 'Impossible de créer le fournisseur',
  'suppliers.saveError': "Impossible d'enregistrer le fournisseur",

  'costs.supplier': 'Fournisseur',
  'costs.noSupplier': 'Aucun fournisseur',
  'costs.autoLinked': '{name} reconnu — lieu et fournisseur liés',
  'costs.autoLinkedSupplier': 'Fournisseur {name} reconnu',
};

export default suppliers;
