import type { TranslationStrings } from '../types';

const capture: TranslationStrings = {
  'capture.title': 'Capture',
  'capture.subtitle':
    'Onay öncelikli sensör kaydı — neyin kaydedileceğini tam olarak seçin, bir oturum başlatın; her örnek ekibin kendi analiz sistemine kaydedilir.',

  'capture.info.title': 'Capture neleri kaydeder',
  'capture.info.body':
    'Bir sensörü açıp oturum başlatana kadar hiçbir şey kaydedilmez. Konum bir GPS izi tutar (birkaç saniyede bir konum). Hareket, saniye başına tek bir tepe ivme değeri saklar — asla ham veri akışını değil. Pil ve ağ; seviye, şarj ve bağlantı değişikliklerini günlüğe kaydeder. Ekran görünürlüğü, uygulamanın arka plana geçtiği anları not eder. Her şey ekibin kendi barındırdığı PostHog örneğine gönderilir — üçüncü taraflar bunları asla görmez.',

  'capture.sensors.location': 'Konum izi',
  'capture.sensors.locationHint': 'Yüksek doğruluklu GPS konumları, en fazla 5 saniyede bir',
  'capture.sensors.motion': 'Hareket',
  'capture.sensors.motionHint': 'Saniye başına tepe ivme — ham akış değil, toplu bir değer',
  'capture.sensors.battery': 'Pil',
  'capture.sensors.batteryHint': 'Şarj seviyesi ve şarj durumu; değişimde ve her dakika',
  'capture.sensors.network': 'Ağ',
  'capture.sensors.networkHint': 'Bağlantı türü ve hız tahmini; değişimde ve her dakika',
  'capture.sensors.visibility': 'Ekran görünürlüğü',
  'capture.sensors.visibilityHint': 'Uygulama arka plana geçtiğinde veya geri döndüğünde',

  'capture.start': 'Kaydı başlat',
  'capture.stop': 'Kaydı durdur',
  'capture.selectSensor': 'Başlamak için en az bir sensörü açın',
  'capture.recording': 'Kaydediliyor',
  'capture.session': 'Oturum',

  'capture.elapsed': 'Geçen süre',
  'capture.samples': 'Örnekler',
  'capture.lastFix': 'Son konum',
  'capture.noFix': 'Henüz konum yok',

  'capture.foregroundWarning':
    'Capture yalnızca uygulama açık ve ekrandayken çalışır — uygulama değiştirmek veya ekranı kapatmak kaydı duraklatır (görünürlük sensörü boşlukları gösterir).',

  'capture.summaryTitle': 'Oturum özeti',
  'capture.summaryDuration': 'Süre',
  'capture.summaryTotal': 'Toplam örnek',

  'capture.permissionDenied': 'İzin reddedildi',
  'capture.notSupported': 'Bu cihazda desteklenmiyor',
};

export default capture;
