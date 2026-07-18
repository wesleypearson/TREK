import type { TranslationStrings } from '../types';

const suppliers: TranslationStrings = {
  'suppliers.title': '供應商',
  'suppliers.subtitle': '團隊往來的所有商家 — 由收據掃描自動建立，並跨所有旅程持續追蹤。',
  'suppliers.searchPlaceholder': '搜尋供應商…',
  'suppliers.add': '新增供應商',
  'suppliers.empty': '尚無供應商',
  'suppliers.emptyHint': '在任一旅程掃描收據，商家就會自動出現在這裡 — 也可以手動新增。',
  'suppliers.noResults': '沒有符合「{query}」的供應商',
  'suppliers.events': '{count} 次旅程',
  'suppliers.event': '1 次旅程',
  'suppliers.expenses': '{count} 筆支出',
  'suppliers.expense': '1 筆支出',
  'suppliers.venues': '{count} 個場地',
  'suppliers.lastInteraction': '最近：{date}',
  'suppliers.neverUsed': '尚無往來紀錄',
  'suppliers.fromReceipt': '來自收據掃描',

  'suppliers.info.title': '供應商的運作方式',
  'suppliers.info.body':
    '每次掃描收據都會從單據讀取商家並歸檔到這裡 — 每家商家一筆紀錄，在所有旅程間共用。Google Places 會補齊地址、電話和網站；AI 會寫一段簡短備註。一切皆可編輯，釘選到供應商的支出會累積成它的消費紀錄。',

  'suppliers.detail.contact': '聯絡方式',
  'suppliers.detail.phone': '電話',
  'suppliers.detail.email': '電子郵件',
  'suppliers.detail.website': '網站',
  'suppliers.detail.address': '地址',
  'suppliers.detail.category': '類別',
  'suppliers.detail.categoryPlaceholder': '例如：外燴、影音設備租賃、五金',
  'suppliers.detail.aiSummary': 'AI 備註',
  'suppliers.detail.notes': '備註',
  'suppliers.detail.notesPlaceholder': '聯絡人、價格、帳號、找誰接洽…',
  'suppliers.detail.spend': '依旅程統計支出',
  'suppliers.detail.interactions': '往來紀錄',
  'suppliers.detail.venuesTitle': '場地',
  'suppliers.detail.noInteractions': '與這家供應商尚無任何紀錄。',
  'suppliers.detail.enrich': '補齊資訊',
  'suppliers.detail.enriching': '補齊中…',
  'suppliers.detail.enriched': '資訊已重新整理',
  'suppliers.detail.save': '儲存',
  'suppliers.detail.saved': '供應商已儲存',
  'suppliers.detail.delete': '刪除供應商',
  'suppliers.detail.deleteTitle': '刪除供應商',
  'suppliers.detail.deleteBody':
    '這會將「{name}」從名錄中移除。指向它的支出與場地會保留，但會失去關聯。此操作無法復原。',
  'suppliers.detail.deleted': '供應商已刪除',
  'suppliers.namePlaceholder': '商家名稱',
  'suppliers.createError': '無法建立供應商',
  'suppliers.saveError': '無法儲存供應商',

  'costs.supplier': '供應商',
  'costs.noSupplier': '無供應商',
  'costs.autoLinked': '已比對到「{name}」— 場地與供應商已連結',
  'costs.autoLinkedSupplier': '已比對到供應商「{name}」',
};

export default suppliers;
