import type { TranslationStrings } from '../types';

const shifts: TranslationStrings = {
  'shifts.tab': 'Műszakok',
  'shifts.title': 'Műszakok',
  'shifts.signOn': 'Műszak kezdése',
  'shifts.signOff': 'Műszak befejezése',
  'shifts.onShiftNow': 'Most műszakban',
  'shifts.nobodyOn': 'Senki sincs műszakban',
  'shifts.history': 'Előzmények',
  'shifts.totals': 'Órák tagonként',
  'shifts.hours': '{h}ó {m}p',
  'shifts.locationNote':
    'A helyzetedet egyszer rögzítjük a műszak kezdetén és egyszer a végén — közben soha nem követünk. Ha megtagadod, egyszerűen pozíció nélkül kezded a műszakot.',
  'shifts.locationDenied': 'Helyzet nem elérhető — pozíció nélkül rögzítve',
  'shifts.alreadyOn': 'Már műszakban vagy',
  'shifts.info.title': 'Így működnek a műszakok',
  'shifts.info.body':
    'A stáb blokkolóórája. Kezdd el a műszakot, amikor munkába állsz, és fejezd be, amikor végzel — az óra élőben ketyeg mindenkinek, a lista mutatja, ki van éppen műszakban, az összesítő kártya pedig összeadja minden tag óráit. Mindkét végén opcionálisan egyszer rögzítjük a pozíciót (közben semmit), és minden műszakkezdés és -befejezés bekerül az esemény chatjébe.',
  'shifts.elapsed': 'Műszakban',
  'shifts.signedOnAt': 'Műszakban {time} óta',
  'shifts.signedOffSummary': '{start} – {end} · {duration}',
  'shifts.empty': 'Még nincs műszak — kezdj műszakot az óra indításához.',
};

export default shifts;
