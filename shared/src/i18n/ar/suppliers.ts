import type { TranslationStrings } from '../types';

const suppliers: TranslationStrings = {
  'suppliers.title': 'الموردون',
  'suppliers.subtitle':
    'كل الشركات التي تتعامل معها المجموعة — تُنشأ تلقائيًا من مسح الإيصالات وتُتابع عبر كل الرحلات.',
  'suppliers.searchPlaceholder': 'البحث عن موردين…',
  'suppliers.add': 'إضافة مورد',
  'suppliers.empty': 'لا يوجد موردون بعد',
  'suppliers.emptyHint': 'امسح إيصالًا في أي رحلة وسيظهر التاجر هنا تلقائيًا — أو أضف موردًا يدويًا.',
  'suppliers.noResults': 'لا يوجد موردون يطابقون "{query}"',
  'suppliers.events': '{count} رحلات',
  'suppliers.event': 'رحلة واحدة',
  'suppliers.expenses': '{count} مصروفات',
  'suppliers.expense': 'مصروف واحد',
  'suppliers.venues': '{count} أماكن',
  'suppliers.lastInteraction': 'آخر تعامل: {date}',
  'suppliers.neverUsed': 'لا تعاملات بعد',
  'suppliers.fromReceipt': 'من مسح إيصال',

  'suppliers.info.title': 'كيف يعمل الموردون',
  'suppliers.info.body':
    'كل عملية مسح للإيصال تقرأ اسم التاجر من الوثيقة وتحفظه هنا — إدخال واحد لكل شركة، مشترك بين كل الرحلات. يكمل Google Places العنوان والهاتف والموقع الإلكتروني؛ ويكتب الذكاء الاصطناعي ملاحظة قصيرة. يبقى كل شيء قابلًا للتعديل، والمصروفات المثبتة على مورد تبني سجل إنفاقه.',

  'suppliers.detail.contact': 'جهة الاتصال',
  'suppliers.detail.phone': 'الهاتف',
  'suppliers.detail.email': 'البريد الإلكتروني',
  'suppliers.detail.website': 'الموقع الإلكتروني',
  'suppliers.detail.address': 'العنوان',
  'suppliers.detail.category': 'الفئة',
  'suppliers.detail.categoryPlaceholder': 'مثال: تموين، تأجير معدات صوت وصورة، أدوات',
  'suppliers.detail.aiSummary': 'ملاحظات الذكاء الاصطناعي',
  'suppliers.detail.notes': 'ملاحظات',
  'suppliers.detail.notesPlaceholder': 'جهات الاتصال، الأسعار، أرقام الحسابات، عمن تسأل…',
  'suppliers.detail.spend': 'الإنفاق حسب الرحلة',
  'suppliers.detail.interactions': 'التعاملات',
  'suppliers.detail.venuesTitle': 'الأماكن',
  'suppliers.detail.noInteractions': 'لم يُسجل شيء مع هذا المورد بعد.',
  'suppliers.detail.enrich': 'إثراء',
  'suppliers.detail.enriching': 'جارٍ الإثراء…',
  'suppliers.detail.enriched': 'تم تحديث التفاصيل',
  'suppliers.detail.save': 'حفظ',
  'suppliers.detail.saved': 'تم حفظ المورد',
  'suppliers.detail.delete': 'حذف المورد',
  'suppliers.detail.deleteTitle': 'حذف المورد',
  'suppliers.detail.deleteBody':
    'سيؤدي هذا إلى إزالة {name} من الدليل. تبقى المصروفات والأماكن التي كانت تشير إليه، لكنها تفقد الارتباط. لا يمكن التراجع عن هذا الإجراء.',
  'suppliers.detail.deleted': 'تم حذف المورد',
  'suppliers.namePlaceholder': 'اسم الشركة',
  'suppliers.createError': 'تعذر إنشاء المورد',
  'suppliers.saveError': 'تعذر حفظ المورد',

  'costs.supplier': 'المورد',
  'costs.noSupplier': 'بدون مورد',
  'costs.autoLinked': 'تمت مطابقة {name} — تم ربط المكان والمورد',
  'costs.autoLinkedSupplier': 'تمت مطابقة المورد {name}',
};

export default suppliers;
