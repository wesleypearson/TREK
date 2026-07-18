import type { TranslationStrings } from '../types';

const shifts: TranslationStrings = {
  'shifts.tab': 'Shift',
  'shifts.title': 'Shift',
  'shifts.signOn': 'Mulai shift',
  'shifts.signOff': 'Akhiri shift',
  'shifts.onShiftNow': 'Sedang shift sekarang',
  'shifts.nobodyOn': 'Tidak ada yang sedang shift',
  'shifts.history': 'Riwayat',
  'shifts.totals': 'Jam per anggota',
  'shifts.hours': '{h}j {m}m',
  'shifts.locationNote':
    'Lokasimu direkam satu kali saat mulai shift dan satu kali saat mengakhirinya — tidak pernah dilacak di antaranya. Jika kamu menolak, kamu tetap mulai shift tanpa posisi.',
  'shifts.locationDenied': 'Lokasi tidak tersedia — shift dimulai tanpa posisi',
  'shifts.alreadyOn': 'Sudah dalam shift',
  'shifts.info.title': 'Cara kerja Shift',
  'shifts.info.body':
    'Mesin absen kru. Mulai shift saat kamu mulai bekerja dan akhiri saat berhenti — jam berjalan langsung untuk semua orang, daftar menunjukkan siapa yang sedang shift saat ini, dan kartu total menjumlahkan jam setiap anggota. Satu posisi opsional direkam di tiap ujung (tidak ada di antaranya), dan setiap mulai dan akhir shift diumumkan di obrolan acara.',
  'shifts.elapsed': 'Dalam shift',
  'shifts.signedOnAt': 'Mulai shift {time}',
  'shifts.signedOffSummary': '{start} – {end} · {duration}',
  'shifts.empty': 'Belum ada shift — mulai shift untuk menjalankan jam.',
};

export default shifts;
