import type { TranslationStrings } from '../types';

const suppliers: TranslationStrings = {
  'suppliers.title': 'サプライヤー',
  'suppliers.subtitle':
    'グループが取引するすべての事業者 — レシートのスキャンから自動で作成され、すべての旅行にわたって記録されます。',
  'suppliers.searchPlaceholder': 'サプライヤーを検索…',
  'suppliers.add': 'サプライヤーを追加',
  'suppliers.empty': 'サプライヤーはまだありません',
  'suppliers.emptyHint':
    'どの旅行でもレシートをスキャンすると、店舗が自動でここに登録されます — 手動で追加することもできます。',
  'suppliers.noResults': '「{query}」に一致するサプライヤーはありません',
  'suppliers.events': '{count}件の旅行',
  'suppliers.event': '1件の旅行',
  'suppliers.expenses': '{count}件の支出',
  'suppliers.expense': '1件の支出',
  'suppliers.venues': '{count}件の会場',
  'suppliers.lastInteraction': '最終: {date}',
  'suppliers.neverUsed': 'まだ取引はありません',
  'suppliers.fromReceipt': 'レシートのスキャンから',

  'suppliers.info.title': 'サプライヤーの仕組み',
  'suppliers.info.body':
    'レシートをスキャンするたびに店舗名を読み取り、ここに登録します — 事業者ごとに1件で、すべての旅行で共有されます。Google Placesが住所・電話・ウェブサイトを補完し、AIが短いメモを書きます。すべて編集でき、サプライヤーに紐づけた支出がその支出履歴になります。',

  'suppliers.detail.contact': '連絡先',
  'suppliers.detail.phone': '電話',
  'suppliers.detail.email': 'メール',
  'suppliers.detail.website': 'ウェブサイト',
  'suppliers.detail.address': '住所',
  'suppliers.detail.category': 'カテゴリ',
  'suppliers.detail.categoryPlaceholder': '例: ケータリング、音響・照明レンタル、金物店',
  'suppliers.detail.aiSummary': 'AIメモ',
  'suppliers.detail.notes': 'メモ',
  'suppliers.detail.notesPlaceholder': '担当者、料金、口座番号、問い合わせ先など…',
  'suppliers.detail.spend': '旅行別の支出',
  'suppliers.detail.interactions': '取引履歴',
  'suppliers.detail.venuesTitle': '会場',
  'suppliers.detail.noInteractions': 'このサプライヤーとの記録はまだありません。',
  'suppliers.detail.enrich': '情報を補完',
  'suppliers.detail.enriching': '補完中…',
  'suppliers.detail.enriched': '情報を更新しました',
  'suppliers.detail.save': '保存',
  'suppliers.detail.saved': 'サプライヤーを保存しました',
  'suppliers.detail.delete': 'サプライヤーを削除',
  'suppliers.detail.deleteTitle': 'サプライヤーを削除',
  'suppliers.detail.deleteBody':
    '{name}を一覧から削除します。紐づいていた支出と会場は残りますが、リンクは失われます。この操作は取り消せません。',
  'suppliers.detail.deleted': 'サプライヤーを削除しました',
  'suppliers.namePlaceholder': '事業者名',
  'suppliers.createError': 'サプライヤーを作成できませんでした',
  'suppliers.saveError': 'サプライヤーを保存できませんでした',

  'costs.supplier': 'サプライヤー',
  'costs.noSupplier': 'サプライヤーなし',
  'costs.autoLinked': '{name}に一致 — 会場とサプライヤーをリンクしました',
  'costs.autoLinkedSupplier': 'サプライヤー{name}に一致しました',
};

export default suppliers;
