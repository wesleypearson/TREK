import type { TranslationStrings } from '../types';

const shifts: TranslationStrings = {
  'shifts.tab': '근무',
  'shifts.title': '근무',
  'shifts.signOn': '출근',
  'shifts.signOff': '퇴근',
  'shifts.onShiftNow': '현재 근무 중',
  'shifts.nobodyOn': '근무 중인 사람이 없습니다',
  'shifts.history': '기록',
  'shifts.totals': '멤버별 시간',
  'shifts.hours': '{h}시간 {m}분',
  'shifts.locationNote':
    '위치는 출근 시 한 번, 퇴근 시 한 번만 기록되며 그 사이에는 절대 추적되지 않습니다. 거부하면 위치 없이 출근 처리됩니다.',
  'shifts.locationDenied': '위치를 사용할 수 없음 — 위치 없이 기록되었습니다',
  'shifts.alreadyOn': '이미 근무 중입니다',
  'shifts.info.title': '근무 기능 안내',
  'shifts.info.body':
    '크루의 출퇴근 기록계입니다. 일을 시작할 때 출근하고 끝나면 퇴근하세요 — 시계는 모두에게 실시간으로 표시되고, 명단에는 지금 누가 근무 중인지 보이며, 합계 카드는 각 멤버의 시간을 집계합니다. 출근과 퇴근 시 각각 한 번씩 선택적으로 위치를 기록하며(그 사이에는 아무것도 없음), 모든 출근과 퇴근은 이벤트 채팅에 공지됩니다.',
  'shifts.elapsed': '근무 중',
  'shifts.signedOnAt': '{time} 출근',
  'shifts.signedOffSummary': '{start} – {end} · {duration}',
  'shifts.empty': '아직 근무 기록이 없습니다 — 출근해서 시계를 시작하세요.',
};

export default shifts;
