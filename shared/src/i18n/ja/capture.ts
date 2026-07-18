import type { TranslationStrings } from '../types';

const capture: TranslationStrings = {
  'capture.title': 'キャプチャ',
  'capture.subtitle':
    '同意を前提としたセンサー記録 — 記録する項目を選んでセッションを開始すると、すべてのサンプルがグループ自身の分析基盤に送られます。',

  'capture.info.title': 'キャプチャが記録する内容',
  'capture.info.body':
    'センサーをオンにしてセッションを開始するまで、何も記録されません。位置情報はGPSの軌跡を保存します（数秒ごとに1回の測位）。モーションは1秒ごとの最大加速度のみを保存し、生データのストリームは一切保存しません。バッテリーとネットワークは、残量・充電状態・接続の変化を記録します。画面の表示状態は、アプリがバックグラウンドに移った時点を記録します。すべてのデータはグループ自身がセルフホストするPostHogインスタンスに送信され、第三者が見ることは一切ありません。',

  'capture.sensors.location': '位置情報の軌跡',
  'capture.sensors.locationHint': '高精度のGPS測位。最短で5秒に1回',
  'capture.sensors.motion': 'モーション',
  'capture.sensors.motionHint': '1秒ごとの最大加速度 — 集計値のみで、生データのストリームは含みません',
  'capture.sensors.battery': 'バッテリー',
  'capture.sensors.batteryHint': '残量と充電状態。変化時と1分ごとに記録',
  'capture.sensors.network': 'ネットワーク',
  'capture.sensors.networkHint': '接続の種類と推定速度。変化時と1分ごとに記録',
  'capture.sensors.visibility': '画面の表示状態',
  'capture.sensors.visibilityHint': 'アプリがバックグラウンドに移ったときと戻ったとき',

  'capture.start': 'キャプチャを開始',
  'capture.stop': 'キャプチャを停止',
  'capture.selectSensor': '開始するには、少なくとも1つのセンサーをオンにしてください',
  'capture.recording': '記録中',
  'capture.session': 'セッション',

  'capture.elapsed': '経過時間',
  'capture.samples': 'サンプル数',
  'capture.lastFix': '最終測位',
  'capture.noFix': 'まだ測位がありません',

  'capture.foregroundWarning':
    'キャプチャはアプリが開かれ画面に表示されている間だけ動作します。他のアプリに切り替えたり画面をオフにしたりすると記録は一時停止します（その間の空白は表示状態センサーに残ります）。',

  'capture.summaryTitle': 'セッションの概要',
  'capture.summaryDuration': '記録時間',
  'capture.summaryTotal': '合計サンプル数',

  'capture.permissionDenied': '権限が拒否されました',
  'capture.notSupported': 'このデバイスではサポートされていません',
};

export default capture;
