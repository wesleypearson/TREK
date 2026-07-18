import type { TranslationStrings } from '../types';

const capture: TranslationStrings = {
  'capture.title': '采集',
  'capture.subtitle':
    '以同意为先的传感器记录 — 精确选择要记录的内容，开始一次会话，每条样本都会进入团队自己的分析系统。',

  'capture.info.title': '采集会记录什么',
  'capture.info.body':
    '在您打开某个传感器并开始会话之前，不会记录任何内容。位置会保留一条 GPS 轨迹（每隔几秒一个定位点）。运动每秒仅存储一个峰值加速度 — 绝不存储原始数据流。电池和网络会记录电量、充电及连接变化。屏幕可见性会记下应用何时进入后台。所有数据都发送到团队自托管的 PostHog 实例 — 任何第三方都不会看到。',

  'capture.sensors.location': '位置轨迹',
  'capture.sensors.locationHint': '高精度 GPS 定位点，最多每 5 秒一个',
  'capture.sensors.motion': '运动',
  'capture.sensors.motionHint': '每秒峰值加速度 — 聚合值，而非原始数据流',
  'capture.sensors.battery': '电池',
  'capture.sensors.batteryHint': '电量和充电状态，变化时及每分钟记录一次',
  'capture.sensors.network': '网络',
  'capture.sensors.networkHint': '连接类型和速度估计，变化时及每分钟记录一次',
  'capture.sensors.visibility': '屏幕可见性',
  'capture.sensors.visibilityHint': '应用进入后台或回到前台时',

  'capture.start': '开始采集',
  'capture.stop': '停止采集',
  'capture.selectSensor': '至少打开一个传感器才能开始',
  'capture.recording': '记录中',
  'capture.session': '会话',

  'capture.elapsed': '已用时间',
  'capture.samples': '样本',
  'capture.lastFix': '最近定位',
  'capture.noFix': '尚无定位',

  'capture.foregroundWarning':
    '采集仅在应用打开且显示在屏幕上时运行 — 切换应用或熄屏会暂停记录（可见性传感器会显示这些空档）。',

  'capture.summaryTitle': '会话摘要',
  'capture.summaryDuration': '时长',
  'capture.summaryTotal': '样本总数',

  'capture.permissionDenied': '权限被拒绝',
  'capture.notSupported': '此设备不支持',
};

export default capture;
