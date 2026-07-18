import type { TranslationStrings } from '../types';

const capture: TranslationStrings = {
  'capture.title': 'Capture',
  'capture.subtitle':
    'Perekaman sensor yang mengutamakan persetujuan — pilih persis apa yang direkam, mulai sesi, dan setiap sampel masuk ke analitik milik tim sendiri.',

  'capture.info.title': 'Apa yang direkam Capture',
  'capture.info.body':
    'Tidak ada yang direkam sampai kamu mengaktifkan sensor dan memulai sesi. Lokasi menyimpan jejak GPS (satu titik setiap beberapa detik). Gerakan menyimpan satu nilai akselerasi puncak per detik — tidak pernah aliran mentahnya. Baterai dan jaringan mencatat level, pengisian daya, dan perubahan koneksi. Visibilitas layar mencatat saat aplikasi berpindah ke latar belakang. Semuanya dikirim ke instans PostHog self-hosted milik tim sendiri — tidak pernah dilihat pihak ketiga.',

  'capture.sensors.location': 'Jejak lokasi',
  'capture.sensors.locationHint': 'Titik GPS akurasi tinggi, maksimal satu setiap 5 detik',
  'capture.sensors.motion': 'Gerakan',
  'capture.sensors.motionHint': 'Akselerasi puncak per detik — nilai agregat, bukan aliran mentah',
  'capture.sensors.battery': 'Baterai',
  'capture.sensors.batteryHint': 'Level dan status pengisian daya, saat berubah dan setiap menit',
  'capture.sensors.network': 'Jaringan',
  'capture.sensors.networkHint': 'Jenis koneksi dan perkiraan kecepatan, saat berubah dan setiap menit',
  'capture.sensors.visibility': 'Visibilitas layar',
  'capture.sensors.visibilityHint': 'Saat aplikasi berpindah ke latar belakang atau kembali',

  'capture.start': 'Mulai perekaman',
  'capture.stop': 'Hentikan perekaman',
  'capture.selectSensor': 'Aktifkan minimal satu sensor untuk memulai',
  'capture.recording': 'Merekam',
  'capture.session': 'Sesi',

  'capture.elapsed': 'Waktu berjalan',
  'capture.samples': 'Sampel',
  'capture.lastFix': 'Titik terakhir',
  'capture.noFix': 'Belum ada titik',

  'capture.foregroundWarning':
    'Capture hanya berjalan saat aplikasi terbuka dan tampil di layar — berpindah aplikasi atau mematikan layar akan menjeda perekaman (sensor visibilitas akan menunjukkan jedanya).',

  'capture.summaryTitle': 'Ringkasan sesi',
  'capture.summaryDuration': 'Durasi',
  'capture.summaryTotal': 'Total sampel',

  'capture.permissionDenied': 'Izin ditolak',
  'capture.notSupported': 'Tidak didukung di perangkat ini',
};

export default capture;
