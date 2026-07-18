import type { TranslationStrings } from '../types';

const capture: TranslationStrings = {
  'capture.title': 'Capture',
  'capture.subtitle':
    'Enregistrement de capteurs fondé sur le consentement — choisissez exactement quoi enregistrer, démarrez une session, et chaque échantillon atterrit dans l’outil d’analyse propre à l’équipe.',

  'capture.info.title': 'Ce que Capture enregistre',
  'capture.info.body':
    'Rien n’est enregistré tant que vous n’activez pas un capteur et ne démarrez pas une session. La localisation conserve une trace GPS (un relevé toutes les quelques secondes). Le mouvement stocke une valeur d’accélération maximale par seconde — jamais le flux brut. La batterie et le réseau consignent le niveau, la charge et les changements de connexion. La visibilité de l’écran note quand l’app passe en arrière-plan. Tout est envoyé vers l’instance PostHog auto-hébergée de l’équipe — aucun tiers n’y a jamais accès.',

  'capture.sensors.location': 'Trace de localisation',
  'capture.sensors.locationHint': 'Relevés GPS haute précision, au plus un toutes les 5 secondes',
  'capture.sensors.motion': 'Mouvement',
  'capture.sensors.motionHint': 'Accélération maximale par seconde — un agrégat, pas le flux brut',
  'capture.sensors.battery': 'Batterie',
  'capture.sensors.batteryHint': 'Niveau et état de charge, à chaque changement et toutes les minutes',
  'capture.sensors.network': 'Réseau',
  'capture.sensors.networkHint': 'Type de connexion et débit estimé, à chaque changement et toutes les minutes',
  'capture.sensors.visibility': 'Visibilité de l’écran',
  'capture.sensors.visibilityHint': 'Quand l’app passe en arrière-plan ou revient',

  'capture.start': 'Démarrer la capture',
  'capture.stop': 'Arrêter la capture',
  'capture.selectSensor': 'Activez au moins un capteur pour démarrer',
  'capture.recording': 'Enregistrement',
  'capture.session': 'Session',

  'capture.elapsed': 'Écoulé',
  'capture.samples': 'Échantillons',
  'capture.lastFix': 'Dernier relevé',
  'capture.noFix': 'Aucun relevé pour l’instant',

  'capture.foregroundWarning':
    'Capture ne fonctionne que lorsque l’app est ouverte et à l’écran — changer d’app ou éteindre l’écran met l’enregistrement en pause (le capteur de visibilité montrera les interruptions).',

  'capture.summaryTitle': 'Résumé de la session',
  'capture.summaryDuration': 'Durée',
  'capture.summaryTotal': 'Échantillons au total',

  'capture.permissionDenied': 'Autorisation refusée',
  'capture.notSupported': 'Non pris en charge sur cet appareil',
};

export default capture;
