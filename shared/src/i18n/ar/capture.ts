import type { TranslationStrings } from '../types';

const capture: TranslationStrings = {
  'capture.title': 'الالتقاط',
  'capture.subtitle':
    'تسجيل لبيانات المستشعرات قائم على الموافقة أولًا — اختر بدقة ما تريد تسجيله، وابدأ جلسة، وستصل كل عينة إلى أداة التحليلات الخاصة بالفريق نفسه.',

  'capture.info.title': 'ما الذي يسجّله الالتقاط',
  'capture.info.body':
    'لا يُسجَّل أي شيء حتى تُفعّل مستشعرًا وتبدأ جلسة. الموقع يحتفظ بمسار GPS (تحديد موقع كل بضع ثوانٍ). الحركة تخزّن قيمة واحدة لذروة التسارع في الثانية — وليس تدفق البيانات الخام أبدًا. البطارية والشبكة تسجّلان مستوى الشحن وحالة الشحن وتغيّرات الاتصال. ظهور الشاشة يدوّن متى ينتقل التطبيق إلى الخلفية. يُرسَل كل شيء إلى نسخة PostHog المُستضافة ذاتيًا الخاصة بالفريق — ولا يطّلع عليه أي طرف خارجي أبدًا.',

  'capture.sensors.location': 'مسار الموقع',
  'capture.sensors.locationHint': 'تحديدات موقع GPS عالية الدقة، بحد أقصى واحدة كل 5 ثوانٍ',
  'capture.sensors.motion': 'الحركة',
  'capture.sensors.motionHint': 'ذروة التسارع في الثانية — قيمة مجمّعة وليست التدفق الخام',
  'capture.sensors.battery': 'البطارية',
  'capture.sensors.batteryHint': 'مستوى الشحن وحالة الشحن، عند التغيّر وكل دقيقة',
  'capture.sensors.network': 'الشبكة',
  'capture.sensors.networkHint': 'نوع الاتصال وتقدير السرعة، عند التغيّر وكل دقيقة',
  'capture.sensors.visibility': 'ظهور الشاشة',
  'capture.sensors.visibilityHint': 'عندما ينتقل التطبيق إلى الخلفية أو يعود',

  'capture.start': 'بدء الالتقاط',
  'capture.stop': 'إيقاف الالتقاط',
  'capture.selectSensor': 'فعّل مستشعرًا واحدًا على الأقل للبدء',
  'capture.recording': 'جارٍ التسجيل',
  'capture.session': 'الجلسة',

  'capture.elapsed': 'الوقت المنقضي',
  'capture.samples': 'العينات',
  'capture.lastFix': 'آخر تحديد للموقع',
  'capture.noFix': 'لا يوجد تحديد للموقع بعد',

  'capture.foregroundWarning':
    'يعمل الالتقاط فقط ما دام التطبيق مفتوحًا وظاهرًا على الشاشة — التبديل بين التطبيقات أو إطفاء الشاشة يوقف التسجيل مؤقتًا (وسيُظهر مستشعر ظهور الشاشة الفجوات).',

  'capture.summaryTitle': 'ملخص الجلسة',
  'capture.summaryDuration': 'المدة',
  'capture.summaryTotal': 'إجمالي العينات',

  'capture.permissionDenied': 'تم رفض الإذن',
  'capture.notSupported': 'غير مدعوم على هذا الجهاز',
};

export default capture;
