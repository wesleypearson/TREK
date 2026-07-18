import type { TranslationStrings } from '../types';

const shifts: TranslationStrings = {
  'shifts.tab': 'Vardiyalar',
  'shifts.title': 'Vardiyalar',
  'shifts.signOn': 'Vardiyaya başla',
  'shifts.signOff': 'Vardiyayı bitir',
  'shifts.onShiftNow': 'Şu an vardiyada',
  'shifts.nobodyOn': 'Şu an kimse vardiyada değil',
  'shifts.history': 'Geçmiş',
  'shifts.totals': 'Üye başına saat',
  'shifts.hours': '{h}s {m}dk',
  'shifts.locationNote':
    'Konumunuz vardiyaya başlarken bir kez ve bitirirken bir kez kaydedilir — arada asla izlenmez. Reddederseniz yalnızca konumsuz olarak vardiyaya başlarsınız.',
  'shifts.locationDenied': 'Konum alınamadı — konumsuz kaydedildi',
  'shifts.alreadyOn': 'Zaten vardiyadasınız',
  'shifts.info.title': 'Vardiyalar nasıl çalışır',
  'shifts.info.body':
    'Ekibin puantaj saati. Çalışmaya başladığınızda vardiyaya başlayın, bıraktığınızda bitirin — saat herkes için canlı işler, liste şu an kimin vardiyada olduğunu gösterir ve toplamlar kartı her üyenin saatlerini toplar. Her iki uçta isteğe bağlı birer konum alınır (arada hiçbir şey yok) ve her vardiya başlangıcı ile bitişi etkinlik sohbetinde duyurulur.',
  'shifts.elapsed': 'Vardiyada',
  'shifts.signedOnAt': '{time} itibarıyla vardiyada',
  'shifts.signedOffSummary': '{start} – {end} · {duration}',
  'shifts.empty': 'Henüz vardiya yok — saati başlatmak için vardiyaya başlayın.',
};

export default shifts;
