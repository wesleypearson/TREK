import type { TranslationStrings } from '../types';

const suppliers: TranslationStrings = {
  'suppliers.title': 'Nhà cung cấp',
  'suppliers.subtitle':
    'Mọi doanh nghiệp mà nhóm giao dịch — được tạo tự động từ việc quét hóa đơn và theo dõi qua mọi chuyến đi.',
  'suppliers.searchPlaceholder': 'Tìm nhà cung cấp…',
  'suppliers.add': 'Thêm nhà cung cấp',
  'suppliers.empty': 'Chưa có nhà cung cấp',
  'suppliers.emptyHint':
    'Quét hóa đơn trong bất kỳ chuyến đi nào, người bán sẽ tự động xuất hiện ở đây — hoặc thêm thủ công.',
  'suppliers.noResults': 'Không có nhà cung cấp nào khớp với "{query}"',
  'suppliers.events': '{count} chuyến đi',
  'suppliers.event': '1 chuyến đi',
  'suppliers.expenses': '{count} khoản chi',
  'suppliers.expense': '1 khoản chi',
  'suppliers.venues': '{count} địa điểm',
  'suppliers.lastInteraction': 'Gần nhất: {date}',
  'suppliers.neverUsed': 'Chưa có giao dịch',
  'suppliers.fromReceipt': 'Từ hóa đơn đã quét',

  'suppliers.info.title': 'Nhà cung cấp hoạt động thế nào',
  'suppliers.info.body':
    'Mỗi lần quét hóa đơn sẽ đọc tên người bán trên chứng từ và lưu vào đây — mỗi doanh nghiệp một mục, dùng chung cho mọi chuyến đi. Google Places điền địa chỉ, điện thoại và trang web; AI viết một ghi chú ngắn. Mọi thứ đều chỉnh sửa được, và các khoản chi được ghim vào nhà cung cấp sẽ tạo nên lịch sử chi tiêu của nó.',

  'suppliers.detail.contact': 'Liên hệ',
  'suppliers.detail.phone': 'Điện thoại',
  'suppliers.detail.email': 'Email',
  'suppliers.detail.website': 'Trang web',
  'suppliers.detail.address': 'Địa chỉ',
  'suppliers.detail.category': 'Danh mục',
  'suppliers.detail.categoryPlaceholder': 'VD: dịch vụ ăn uống, thuê thiết bị AV, kim khí',
  'suppliers.detail.aiSummary': 'Ghi chú AI',
  'suppliers.detail.notes': 'Ghi chú',
  'suppliers.detail.notesPlaceholder': 'Đầu mối liên hệ, giá cả, số tài khoản, cần gặp ai…',
  'suppliers.detail.spend': 'Chi tiêu theo chuyến đi',
  'suppliers.detail.interactions': 'Giao dịch',
  'suppliers.detail.venuesTitle': 'Địa điểm',
  'suppliers.detail.noInteractions': 'Chưa ghi nhận gì với nhà cung cấp này.',
  'suppliers.detail.enrich': 'Bổ sung',
  'suppliers.detail.enriching': 'Đang bổ sung…',
  'suppliers.detail.enriched': 'Đã làm mới thông tin',
  'suppliers.detail.save': 'Lưu',
  'suppliers.detail.saved': 'Đã lưu nhà cung cấp',
  'suppliers.detail.delete': 'Xóa nhà cung cấp',
  'suppliers.detail.deleteTitle': 'Xóa nhà cung cấp',
  'suppliers.detail.deleteBody':
    'Thao tác này xóa {name} khỏi danh bạ. Các khoản chi và địa điểm từng trỏ tới nó vẫn còn nhưng mất liên kết. Không thể hoàn tác.',
  'suppliers.detail.deleted': 'Đã xóa nhà cung cấp',
  'suppliers.namePlaceholder': 'Tên doanh nghiệp',
  'suppliers.createError': 'Không thể tạo nhà cung cấp',
  'suppliers.saveError': 'Không thể lưu nhà cung cấp',

  'costs.supplier': 'Nhà cung cấp',
  'costs.noSupplier': 'Không có nhà cung cấp',
  'costs.autoLinked': 'Đã khớp {name} — địa điểm và nhà cung cấp được liên kết',
  'costs.autoLinkedSupplier': 'Đã khớp nhà cung cấp {name}',
};

export default suppliers;
