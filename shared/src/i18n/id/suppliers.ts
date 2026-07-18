import type { TranslationStrings } from '../types';

const suppliers: TranslationStrings = {
  'suppliers.title': 'Pemasok',
  'suppliers.subtitle':
    'Semua usaha yang berurusan dengan grup — dibuat otomatis dari pemindaian struk dan dilacak di semua perjalanan.',
  'suppliers.searchPlaceholder': 'Cari pemasok…',
  'suppliers.add': 'Tambah pemasok',
  'suppliers.empty': 'Belum ada pemasok',
  'suppliers.emptyHint':
    'Pindai struk di perjalanan mana pun dan penjualnya otomatis masuk ke sini — atau tambahkan secara manual.',
  'suppliers.noResults': 'Tidak ada pemasok yang cocok dengan "{query}"',
  'suppliers.events': '{count} perjalanan',
  'suppliers.event': '1 perjalanan',
  'suppliers.expenses': '{count} pengeluaran',
  'suppliers.expense': '1 pengeluaran',
  'suppliers.venues': '{count} tempat',
  'suppliers.lastInteraction': 'Terakhir: {date}',
  'suppliers.neverUsed': 'Belum ada interaksi',
  'suppliers.fromReceipt': 'Dari pemindaian struk',

  'suppliers.info.title': 'Cara kerja pemasok',
  'suppliers.info.body':
    'Setiap pemindaian struk membaca nama penjual dari struk dan menyimpannya di sini — satu entri per usaha, dibagikan ke semua perjalanan. Google Places mengisi alamat, telepon, dan situs web; AI menulis catatan singkat. Semuanya tetap dapat diedit, dan pengeluaran yang disematkan ke pemasok membangun riwayat belanjanya.',

  'suppliers.detail.contact': 'Kontak',
  'suppliers.detail.phone': 'Telepon',
  'suppliers.detail.email': 'Email',
  'suppliers.detail.website': 'Situs web',
  'suppliers.detail.address': 'Alamat',
  'suppliers.detail.category': 'Kategori',
  'suppliers.detail.categoryPlaceholder': 'mis. katering, sewa alat AV, toko perkakas',
  'suppliers.detail.aiSummary': 'Catatan AI',
  'suppliers.detail.notes': 'Catatan',
  'suppliers.detail.notesPlaceholder': 'Kontak, tarif, nomor akun, siapa yang dihubungi…',
  'suppliers.detail.spend': 'Pengeluaran per perjalanan',
  'suppliers.detail.interactions': 'Interaksi',
  'suppliers.detail.venuesTitle': 'Tempat',
  'suppliers.detail.noInteractions': 'Belum ada catatan dengan pemasok ini.',
  'suppliers.detail.enrich': 'Perkaya',
  'suppliers.detail.enriching': 'Memperkaya…',
  'suppliers.detail.enriched': 'Detail diperbarui',
  'suppliers.detail.save': 'Simpan',
  'suppliers.detail.saved': 'Pemasok disimpan',
  'suppliers.detail.delete': 'Hapus pemasok',
  'suppliers.detail.deleteTitle': 'Hapus pemasok',
  'suppliers.detail.deleteBody':
    'Ini menghapus {name} dari daftar. Pengeluaran dan tempat yang menunjuk ke pemasok ini tetap ada, tetapi kehilangan tautannya. Tindakan ini tidak dapat dibatalkan.',
  'suppliers.detail.deleted': 'Pemasok dihapus',
  'suppliers.namePlaceholder': 'Nama usaha',
  'suppliers.createError': 'Tidak dapat membuat pemasok',
  'suppliers.saveError': 'Tidak dapat menyimpan pemasok',

  'costs.supplier': 'Pemasok',
  'costs.noSupplier': 'Tanpa pemasok',
  'costs.autoLinked': 'Cocok dengan {name} — tempat dan pemasok ditautkan',
  'costs.autoLinkedSupplier': 'Cocok dengan pemasok {name}',
};

export default suppliers;
