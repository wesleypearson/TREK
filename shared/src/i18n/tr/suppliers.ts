import type { TranslationStrings } from '../types';

const suppliers: TranslationStrings = {
  'suppliers.title': 'Tedarikçiler',
  'suppliers.subtitle':
    'Grubun alışveriş yaptığı tüm işletmeler — fiş taramalarından otomatik oluşturulur ve tüm seyahatlerde izlenir.',
  'suppliers.searchPlaceholder': 'Tedarikçi ara…',
  'suppliers.add': 'Tedarikçi ekle',
  'suppliers.empty': 'Henüz tedarikçi yok',
  'suppliers.emptyHint':
    'Herhangi bir seyahatte fiş tarayın, satıcı otomatik olarak buraya düşer — ya da elle ekleyin.',
  'suppliers.noResults': '"{query}" ile eşleşen tedarikçi yok',
  'suppliers.events': '{count} seyahat',
  'suppliers.event': '1 seyahat',
  'suppliers.expenses': '{count} harcama',
  'suppliers.expense': '1 harcama',
  'suppliers.venues': '{count} mekan',
  'suppliers.lastInteraction': 'Son: {date}',
  'suppliers.neverUsed': 'Henüz etkileşim yok',
  'suppliers.fromReceipt': 'Fiş taramasından',

  'suppliers.info.title': 'Tedarikçiler nasıl çalışır',
  'suppliers.info.body':
    'Her fiş taraması satıcıyı fişten okur ve buraya kaydeder — işletme başına tek kayıt, tüm seyahatlerde ortak. Google Places adresi, telefonu ve web sitesini doldurur; yapay zeka kısa bir not yazar. Her şey düzenlenebilir kalır ve bir tedarikçiye sabitlenen harcamalar onun harcama geçmişini oluşturur.',

  'suppliers.detail.contact': 'İletişim',
  'suppliers.detail.phone': 'Telefon',
  'suppliers.detail.email': 'E-posta',
  'suppliers.detail.website': 'Web sitesi',
  'suppliers.detail.address': 'Adres',
  'suppliers.detail.category': 'Kategori',
  'suppliers.detail.categoryPlaceholder': 'örn. catering, ses-ışık kiralama, nalbur',
  'suppliers.detail.aiSummary': 'Yapay zeka notları',
  'suppliers.detail.notes': 'Notlar',
  'suppliers.detail.notesPlaceholder': 'Kişiler, fiyatlar, hesap numaraları, kimi soracağınız…',
  'suppliers.detail.spend': 'Seyahate göre harcama',
  'suppliers.detail.interactions': 'Etkileşimler',
  'suppliers.detail.venuesTitle': 'Mekanlar',
  'suppliers.detail.noInteractions': 'Bu tedarikçiyle henüz bir kayıt yok.',
  'suppliers.detail.enrich': 'Zenginleştir',
  'suppliers.detail.enriching': 'Zenginleştiriliyor…',
  'suppliers.detail.enriched': 'Bilgiler güncellendi',
  'suppliers.detail.save': 'Kaydet',
  'suppliers.detail.saved': 'Tedarikçi kaydedildi',
  'suppliers.detail.delete': 'Tedarikçiyi sil',
  'suppliers.detail.deleteTitle': 'Tedarikçiyi sil',
  'suppliers.detail.deleteBody':
    'Bu işlem {name} kaydını rehberden kaldırır. Ona işaret eden harcamalar ve mekanlar kalır ama bağlantıyı kaybeder. Bu işlem geri alınamaz.',
  'suppliers.detail.deleted': 'Tedarikçi silindi',
  'suppliers.namePlaceholder': 'İşletme adı',
  'suppliers.createError': 'Tedarikçi oluşturulamadı',
  'suppliers.saveError': 'Tedarikçi kaydedilemedi',

  'costs.supplier': 'Tedarikçi',
  'costs.noSupplier': 'Tedarikçi yok',
  'costs.autoLinked': '{name} eşleşti — mekan ve tedarikçi bağlandı',
  'costs.autoLinkedSupplier': 'Tedarikçi {name} eşleşti',
};

export default suppliers;
