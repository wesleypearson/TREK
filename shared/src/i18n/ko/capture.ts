import type { TranslationStrings } from '../types';

const capture: TranslationStrings = {
  'capture.title': '캡처',
  'capture.subtitle':
    '동의를 우선으로 하는 센서 기록 — 기록할 항목을 직접 고르고 세션을 시작하면, 모든 샘플이 그룹 자체의 분석 서버에만 저장됩니다.',

  'capture.info.title': '캡처가 기록하는 내용',
  'capture.info.body':
    '센서를 켜고 세션을 시작하기 전에는 아무것도 기록되지 않습니다. 위치는 GPS 이동 경로를 남깁니다(몇 초에 한 번씩 측위). 모션은 초당 최대 가속도 값 하나만 저장하며, 원시 데이터 스트림은 절대 저장하지 않습니다. 배터리와 네트워크는 잔량, 충전 상태, 연결 변화를 기록합니다. 화면 표시 상태는 앱이 백그라운드로 전환된 시점을 기록합니다. 모든 데이터는 그룹이 직접 호스팅하는 PostHog 인스턴스로만 전송되며, 제3자는 절대 볼 수 없습니다.',

  'capture.sensors.location': '위치 이동 경로',
  'capture.sensors.locationHint': '고정밀 GPS 측위, 최대 5초에 한 번',
  'capture.sensors.motion': '모션',
  'capture.sensors.motionHint': '초당 최대 가속도 — 원시 스트림이 아닌 집계 값',
  'capture.sensors.battery': '배터리',
  'capture.sensors.batteryHint': '잔량과 충전 상태, 변화 시 및 1분마다 기록',
  'capture.sensors.network': '네트워크',
  'capture.sensors.networkHint': '연결 유형과 예상 속도, 변화 시 및 1분마다 기록',
  'capture.sensors.visibility': '화면 표시 상태',
  'capture.sensors.visibilityHint': '앱이 백그라운드로 가거나 다시 돌아올 때',

  'capture.start': '캡처 시작',
  'capture.stop': '캡처 중지',
  'capture.selectSensor': '시작하려면 센서를 하나 이상 켜세요',
  'capture.recording': '기록 중',
  'capture.session': '세션',

  'capture.elapsed': '경과 시간',
  'capture.samples': '샘플 수',
  'capture.lastFix': '마지막 측위',
  'capture.noFix': '아직 측위가 없습니다',

  'capture.foregroundWarning':
    '캡처는 앱이 열려 있고 화면에 표시되는 동안에만 동작합니다. 다른 앱으로 전환하거나 화면을 끄면 기록이 일시 중지됩니다(그 공백은 화면 표시 센서에 남습니다).',

  'capture.summaryTitle': '세션 요약',
  'capture.summaryDuration': '기록 시간',
  'capture.summaryTotal': '총 샘플 수',

  'capture.permissionDenied': '권한이 거부되었습니다',
  'capture.notSupported': '이 기기에서는 지원되지 않습니다',
};

export default capture;
