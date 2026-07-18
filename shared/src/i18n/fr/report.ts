import type { TranslationStrings } from '../types';

const report: TranslationStrings = {
  'report.title': 'Rapport de production',
  'report.range.24h': 'Dernières 24h',
  'report.range.48h': 'Dernières 48h',
  'report.range.7d': '7 derniers jours',
  'report.changes': "Changements d'horaires",
  'report.changesEmpty': "Aucun changement d'horaire sur cette période.",
  'report.files': 'Fichiers chargés',
  'report.filesEmpty': 'Aucun fichier chargé sur cette période.',
  'report.shiftHours': 'Heures de service',
  'report.shiftsEmpty': 'Aucun service sur cette période.',
  'report.upcoming': 'Prochaines 48 heures',
  'report.upcomingEmpty': 'Rien de prévu dans les prochaines 48 heures.',
  'report.by': 'par {name}',
  'report.onShift': 'en service actuellement',
  'report.share': 'Partager dans le chat',
  'report.shared': "Rapport partagé dans le chat de l'événement",
  'report.loadFailed': 'Impossible de charger le rapport.',
  'report.retry': 'Réessayer',
  'report.info.title': 'À propos des rapports de production',
  'report.info.body':
    "Le condensé SM/PM pour cet événement : chaque changement d'horaire (ce qui a bougé, ancien et nouvel horaire, qui l'a modifié), les fichiers chargés, les heures de service de chaque membre et tout ce qui a un horaire dans les prochaines 48 heures. Choisissez une période, puis « Partager dans le chat » publie un résumé compact dans le chat de l'événement pour toute l'équipe.",
};

export default report;
