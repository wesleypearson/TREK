import type { TranslationStrings } from '../types';

const shifts: TranslationStrings = {
  'shifts.tab': 'المناوبات',
  'shifts.title': 'المناوبات',
  'shifts.signOn': 'بدء المناوبة',
  'shifts.signOff': 'إنهاء المناوبة',
  'shifts.onShiftNow': 'في مناوبة الآن',
  'shifts.nobodyOn': 'لا أحد في مناوبة حالياً',
  'shifts.history': 'السجل',
  'shifts.totals': 'الساعات لكل عضو',
  'shifts.hours': '{h}س {m}د',
  'shifts.locationNote':
    'يُسجَّل موقعك مرة عند بدء المناوبة ومرة عند إنهائها — ولا يُتتبع أبداً بينهما. إذا رفضت، تبدأ المناوبة ببساطة دون موقع.',
  'shifts.locationDenied': 'الموقع غير متاح — بدأت المناوبة دون موقع',
  'shifts.alreadyOn': 'أنت في مناوبة بالفعل',
  'shifts.info.title': 'كيف تعمل المناوبات',
  'shifts.info.body':
    'ساعة دوام الفريق. ابدأ المناوبة عندما تبدأ العمل وأنهِها عندما تتوقف — تعمل الساعة مباشرةً للجميع، وتعرض القائمة من هو في مناوبة الآن، وتجمع بطاقة الإجماليات ساعات كل عضو. يُسجَّل موقع اختياري واحد عند كل طرف (لا شيء بينهما)، ويُعلَن عن كل بدء وإنهاء مناوبة في دردشة الفعالية.',
  'shifts.elapsed': 'في المناوبة',
  'shifts.signedOnAt': 'في المناوبة منذ {time}',
  'shifts.signedOffSummary': '{start} – {end} · {duration}',
  'shifts.empty': 'لا مناوبات بعد — ابدأ المناوبة لتشغيل الساعة.',
};

export default shifts;
