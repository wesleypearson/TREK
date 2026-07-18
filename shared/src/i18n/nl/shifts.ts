import type { TranslationStrings } from '../types';

const shifts: TranslationStrings = {
  'shifts.tab': 'Diensten',
  'shifts.title': 'Diensten',
  'shifts.signOn': 'Inklokken',
  'shifts.signOff': 'Uitklokken',
  'shifts.onShiftNow': 'Nu ingeklokt',
  'shifts.nobodyOn': 'Niemand is ingeklokt',
  'shifts.history': 'Geschiedenis',
  'shifts.totals': 'Uren per lid',
  'shifts.hours': '{h}u {m}m',
  'shifts.locationNote':
    'Je locatie wordt één keer vastgelegd bij het inklokken en één keer bij het uitklokken — tussendoor wordt nooit gevolgd. Weiger je dit, dan klok je gewoon in zonder positie.',
  'shifts.locationDenied': 'Locatie niet beschikbaar — ingeklokt zonder positie',
  'shifts.alreadyOn': 'Al ingeklokt',
  'shifts.info.title': 'Zo werken diensten',
  'shifts.info.body':
    'De prikklok van de crew. Klok in wanneer je begint met werken en uit wanneer je stopt — de klok tikt live voor iedereen, de lijst toont wie er nu ingeklokt is en de totalenkaart telt de uren van elk lid op. Aan beide uiteinden wordt optioneel één locatie vastgelegd (niets ertussenin), en elk in- en uitklokken wordt aangekondigd in de eventchat.',
  'shifts.elapsed': 'Ingeklokt',
  'shifts.signedOnAt': 'Ingeklokt om {time}',
  'shifts.signedOffSummary': '{start} – {end} · {duration}',
  'shifts.empty': 'Nog geen diensten — klok in om de klok te starten.',
};

export default shifts;
