import type { TranslationStrings } from '../types';

const shifts: TranslationStrings = {
  'shifts.tab': 'Pass',
  'shifts.title': 'Arbetspass',
  'shifts.signOn': 'Stämpla in',
  'shifts.signOff': 'Stämpla ut',
  'shifts.onShiftNow': 'På pass just nu',
  'shifts.nobodyOn': 'Ingen är på pass',
  'shifts.history': 'Historik',
  'shifts.totals': 'Timmar per medlem',
  'shifts.hours': '{h}h {m}m',
  'shifts.locationNote':
    'Din plats registreras en gång vid instämpling och en gång vid utstämpling — aldrig däremellan. Nekar du stämplas du bara in utan position.',
  'shifts.locationDenied': 'Plats otillgänglig — instämplad utan position',
  'shifts.alreadyOn': 'Redan på pass',
  'shifts.info.title': 'Så fungerar pass',
  'shifts.info.body':
    'Crewets stämpelklocka. Stämpla in när du börjar jobba och ut när du slutar — klockan tickar live för alla, listan visar vem som är på pass just nu och totalkortet summerar varje medlems timmar. En valfri platsregistrering görs i vardera änden (inget däremellan), och varje in- och utstämpling meddelas i eventchatten.',
  'shifts.elapsed': 'På pass',
  'shifts.signedOnAt': 'Instämplad {time}',
  'shifts.signedOffSummary': '{start} – {end} · {duration}',
  'shifts.empty': 'Inga pass ännu — stämpla in för att starta klockan.',
};

export default shifts;
