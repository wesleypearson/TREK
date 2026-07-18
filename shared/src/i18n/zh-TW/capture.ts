import type { TranslationStrings } from '../types';

const capture: TranslationStrings = {
  'capture.title': '擷取',
  'capture.subtitle':
    '以同意為先的感測器記錄 — 精確選擇要記錄的內容，開始一個工作階段，每筆樣本都會進入團隊自己的分析系統。',

  'capture.info.title': '擷取會記錄什麼',
  'capture.info.body':
    '在您開啟某個感測器並開始工作階段之前，不會記錄任何內容。位置會保留一條 GPS 軌跡（每隔幾秒一個定位點）。運動每秒僅儲存一個峰值加速度 — 絕不儲存原始串流。電池和網路會記錄電量、充電及連線變化。螢幕可見性會記下應用程式何時進入背景。所有資料都會傳送到團隊自行架設的 PostHog 執行個體 — 任何第三方都不會看到。',

  'capture.sensors.location': '位置軌跡',
  'capture.sensors.locationHint': '高精度 GPS 定位點，最多每 5 秒一個',
  'capture.sensors.motion': '運動',
  'capture.sensors.motionHint': '每秒峰值加速度 — 彙總值，而非原始串流',
  'capture.sensors.battery': '電池',
  'capture.sensors.batteryHint': '電量與充電狀態，變化時及每分鐘記錄一次',
  'capture.sensors.network': '網路',
  'capture.sensors.networkHint': '連線類型與速度估計，變化時及每分鐘記錄一次',
  'capture.sensors.visibility': '螢幕可見性',
  'capture.sensors.visibilityHint': '應用程式進入背景或回到前景時',

  'capture.start': '開始擷取',
  'capture.stop': '停止擷取',
  'capture.selectSensor': '至少開啟一個感測器才能開始',
  'capture.recording': '記錄中',
  'capture.session': '工作階段',

  'capture.elapsed': '經過時間',
  'capture.samples': '樣本',
  'capture.lastFix': '最近定位',
  'capture.noFix': '尚無定位',

  'capture.foregroundWarning':
    '擷取僅在應用程式開啟且顯示於螢幕上時執行 — 切換應用程式或關閉螢幕會暫停記錄（可見性感測器會顯示這些空檔）。',

  'capture.summaryTitle': '工作階段摘要',
  'capture.summaryDuration': '時長',
  'capture.summaryTotal': '樣本總數',

  'capture.permissionDenied': '權限遭拒',
  'capture.notSupported': '此裝置不支援',
};

export default capture;
