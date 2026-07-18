import type { TranslationStrings } from '../types';

const shifts: TranslationStrings = {
  'shifts.tab': 'Směny',
  'shifts.title': 'Směny',
  'shifts.signOn': 'Nastoupit na směnu',
  'shifts.signOff': 'Ukončit směnu',
  'shifts.onShiftNow': 'Právě na směně',
  'shifts.nobodyOn': 'Nikdo není na směně',
  'shifts.history': 'Historie',
  'shifts.totals': 'Hodiny podle člena',
  'shifts.hours': '{h} h {m} min',
  'shifts.locationNote':
    'Vaše poloha se zaznamená jednou při nástupu na směnu a jednou při jejím ukončení — mezitím se nikdy nesleduje. Pokud ji odmítnete, prostě nastoupíte bez pozice.',
  'shifts.locationDenied': 'Poloha nedostupná — nástup bez pozice',
  'shifts.alreadyOn': 'Už jste na směně',
  'shifts.info.title': 'Jak směny fungují',
  'shifts.info.body':
    'Píchačky pro crew. Nastupte na směnu, když začnete pracovat, a ukončete ji, když skončíte — hodiny běží živě pro všechny, přehled ukazuje, kdo je právě na směně, a karta součtů sčítá hodiny každého člena. Na obou koncích se volitelně jednou zaznamená poloha (nic mezitím) a každý nástup i ukončení směny se oznámí v chatu události.',
  'shifts.elapsed': 'Na směně',
  'shifts.signedOnAt': 'Na směně od {time}',
  'shifts.signedOffSummary': '{start} – {end} · {duration}',
  'shifts.empty': 'Zatím žádné směny — nastupte na směnu a spusťte hodiny.',
};

export default shifts;
