import type { TranslationStrings } from '../types';

const shifts: TranslationStrings = {
  'shifts.tab': 'Services',
  'shifts.title': 'Services',
  'shifts.signOn': 'Prendre le service',
  'shifts.signOff': 'Fin de service',
  'shifts.onShiftNow': 'En service actuellement',
  'shifts.nobodyOn': "Personne n'est en service",
  'shifts.history': 'Historique',
  'shifts.totals': 'Heures par membre',
  'shifts.hours': '{h}h {m}m',
  'shifts.locationNote':
    'Votre position est relevée une fois à la prise de service et une fois à la fin — jamais suivie entre les deux. Si vous refusez, vous prenez simplement le service sans position.',
  'shifts.locationDenied': 'Position indisponible — service pris sans position',
  'shifts.alreadyOn': 'Déjà en service',
  'shifts.info.title': 'Comment fonctionnent les services',
  'shifts.info.body':
    "La pointeuse de l'équipe. Prenez votre service quand vous commencez à travailler et terminez-le quand vous arrêtez — l'horloge tourne en direct pour tout le monde, la liste montre qui est en service en ce moment, et la carte des totaux additionne les heures de chaque membre. Une position optionnelle est relevée à chaque extrémité (rien entre les deux), et chaque prise et fin de service est annoncée dans le chat de l'événement.",
  'shifts.elapsed': 'En service',
  'shifts.signedOnAt': 'Service pris à {time}',
  'shifts.signedOffSummary': '{start} – {end} · {duration}',
  'shifts.empty': "Aucun service pour l'instant — prenez votre service pour lancer l'horloge.",
};

export default shifts;
