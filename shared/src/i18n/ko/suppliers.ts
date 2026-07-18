import type { TranslationStrings } from '../types';

const suppliers: TranslationStrings = {
  'suppliers.title': '공급업체',
  'suppliers.subtitle': '그룹이 거래하는 모든 업체 — 영수증 스캔으로 자동 생성되고 모든 여행에 걸쳐 기록됩니다.',
  'suppliers.searchPlaceholder': '공급업체 검색…',
  'suppliers.add': '공급업체 추가',
  'suppliers.empty': '아직 공급업체가 없습니다',
  'suppliers.emptyHint':
    '아무 여행에서나 영수증을 스캔하면 판매처가 자동으로 여기에 등록됩니다 — 직접 추가할 수도 있습니다.',
  'suppliers.noResults': '"{query}"와 일치하는 공급업체가 없습니다',
  'suppliers.events': '여행 {count}회',
  'suppliers.event': '여행 1회',
  'suppliers.expenses': '지출 {count}건',
  'suppliers.expense': '지출 1건',
  'suppliers.venues': '장소 {count}곳',
  'suppliers.lastInteraction': '최근: {date}',
  'suppliers.neverUsed': '아직 거래 내역이 없습니다',
  'suppliers.fromReceipt': '영수증 스캔에서 생성됨',

  'suppliers.info.title': '공급업체 작동 방식',
  'suppliers.info.body':
    '영수증을 스캔할 때마다 판매처를 읽어 여기에 정리합니다 — 업체당 하나의 항목으로 모든 여행에서 공유됩니다. Google Places가 주소, 전화, 웹사이트를 채우고 AI가 짧은 메모를 작성합니다. 모든 내용은 수정할 수 있으며, 공급업체에 고정된 지출이 지출 이력을 쌓아 갑니다.',

  'suppliers.detail.contact': '연락처',
  'suppliers.detail.phone': '전화',
  'suppliers.detail.email': '이메일',
  'suppliers.detail.website': '웹사이트',
  'suppliers.detail.address': '주소',
  'suppliers.detail.category': '카테고리',
  'suppliers.detail.categoryPlaceholder': '예: 케이터링, 음향·조명 대여, 철물점',
  'suppliers.detail.aiSummary': 'AI 메모',
  'suppliers.detail.notes': '메모',
  'suppliers.detail.notesPlaceholder': '담당자, 단가, 계좌번호, 문의할 사람…',
  'suppliers.detail.spend': '여행별 지출',
  'suppliers.detail.interactions': '거래 내역',
  'suppliers.detail.venuesTitle': '장소',
  'suppliers.detail.noInteractions': '이 공급업체와의 기록이 아직 없습니다.',
  'suppliers.detail.enrich': '정보 보강',
  'suppliers.detail.enriching': '보강 중…',
  'suppliers.detail.enriched': '정보가 갱신되었습니다',
  'suppliers.detail.save': '저장',
  'suppliers.detail.saved': '공급업체가 저장되었습니다',
  'suppliers.detail.delete': '공급업체 삭제',
  'suppliers.detail.deleteTitle': '공급업체 삭제',
  'suppliers.detail.deleteBody':
    '{name}을(를) 목록에서 제거합니다. 이를 가리키던 지출과 장소는 남지만 연결은 사라집니다. 이 작업은 되돌릴 수 없습니다.',
  'suppliers.detail.deleted': '공급업체가 삭제되었습니다',
  'suppliers.namePlaceholder': '업체명',
  'suppliers.createError': '공급업체를 만들지 못했습니다',
  'suppliers.saveError': '공급업체를 저장하지 못했습니다',

  'costs.supplier': '공급업체',
  'costs.noSupplier': '공급업체 없음',
  'costs.autoLinked': '{name} 일치 — 장소와 공급업체가 연결되었습니다',
  'costs.autoLinkedSupplier': '공급업체 {name} 일치',
};

export default suppliers;
