import type { TranslationStrings } from '../types';

const suppliers: TranslationStrings = {
  'suppliers.title': '供应商',
  'suppliers.subtitle': '团队打交道的所有商家 — 从小票扫描自动建立，并在所有旅行中持续跟踪。',
  'suppliers.searchPlaceholder': '搜索供应商…',
  'suppliers.add': '添加供应商',
  'suppliers.empty': '暂无供应商',
  'suppliers.emptyHint': '在任意旅行中扫描小票，商家会自动出现在这里 — 也可以手动添加。',
  'suppliers.noResults': '没有与「{query}」匹配的供应商',
  'suppliers.events': '{count} 次旅行',
  'suppliers.event': '1 次旅行',
  'suppliers.expenses': '{count} 笔支出',
  'suppliers.expense': '1 笔支出',
  'suppliers.venues': '{count} 个场地',
  'suppliers.lastInteraction': '最近：{date}',
  'suppliers.neverUsed': '暂无往来记录',
  'suppliers.fromReceipt': '来自小票扫描',

  'suppliers.info.title': '供应商如何运作',
  'suppliers.info.body':
    '每次扫描小票都会从票据上读取商家并归档到这里 — 每家商家一条记录，在所有旅行间共享。Google Places 会补全地址、电话和网站；AI 会写一段简短备注。一切都可编辑，钉选到供应商的支出会累积成它的消费记录。',

  'suppliers.detail.contact': '联系方式',
  'suppliers.detail.phone': '电话',
  'suppliers.detail.email': '邮箱',
  'suppliers.detail.website': '网站',
  'suppliers.detail.address': '地址',
  'suppliers.detail.category': '类别',
  'suppliers.detail.categoryPlaceholder': '例如：餐饮、音视频设备租赁、五金',
  'suppliers.detail.aiSummary': 'AI 备注',
  'suppliers.detail.notes': '备注',
  'suppliers.detail.notesPlaceholder': '联系人、价格、账号、找谁对接…',
  'suppliers.detail.spend': '按旅行统计支出',
  'suppliers.detail.interactions': '往来记录',
  'suppliers.detail.venuesTitle': '场地',
  'suppliers.detail.noInteractions': '与该供应商暂无任何记录。',
  'suppliers.detail.enrich': '补全信息',
  'suppliers.detail.enriching': '补全中…',
  'suppliers.detail.enriched': '信息已刷新',
  'suppliers.detail.save': '保存',
  'suppliers.detail.saved': '供应商已保存',
  'suppliers.detail.delete': '删除供应商',
  'suppliers.detail.deleteTitle': '删除供应商',
  'suppliers.detail.deleteBody':
    '这会将「{name}」从名录中移除。指向它的支出和场地会保留，但会失去关联。此操作无法撤销。',
  'suppliers.detail.deleted': '供应商已删除',
  'suppliers.namePlaceholder': '商家名称',
  'suppliers.createError': '无法创建供应商',
  'suppliers.saveError': '无法保存供应商',

  'costs.supplier': '供应商',
  'costs.noSupplier': '无供应商',
  'costs.autoLinked': '已匹配「{name}」— 场地和供应商已关联',
  'costs.autoLinkedSupplier': '已匹配供应商「{name}」',
};

export default suppliers;
