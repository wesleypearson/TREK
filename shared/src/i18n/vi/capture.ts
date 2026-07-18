import type { TranslationStrings } from '../types';

const capture: TranslationStrings = {
  'capture.title': 'Capture',
  'capture.subtitle':
    'Ghi dữ liệu cảm biến trên cơ sở đồng ý — chọn chính xác những gì cần ghi, bắt đầu một phiên, và mọi mẫu dữ liệu đều được lưu vào hệ thống phân tích riêng của đội ngũ.',

  'capture.info.title': 'Capture ghi lại những gì',
  'capture.info.body':
    'Không có gì được ghi cho đến khi bạn bật một cảm biến và bắt đầu phiên. Vị trí lưu một dấu vết GPS (một điểm định vị mỗi vài giây). Chuyển động lưu một giá trị gia tốc đỉnh mỗi giây — không bao giờ là luồng dữ liệu thô. Pin và mạng ghi lại mức pin, trạng thái sạc và thay đổi kết nối. Hiển thị màn hình ghi nhận khi ứng dụng chuyển xuống nền. Mọi thứ được gửi đến phiên bản PostHog tự lưu trữ của đội ngũ — không bên thứ ba nào thấy được.',

  'capture.sensors.location': 'Dấu vết vị trí',
  'capture.sensors.locationHint': 'Điểm định vị GPS độ chính xác cao, tối đa một điểm mỗi 5 giây',
  'capture.sensors.motion': 'Chuyển động',
  'capture.sensors.motionHint': 'Gia tốc đỉnh mỗi giây — giá trị tổng hợp, không phải luồng thô',
  'capture.sensors.battery': 'Pin',
  'capture.sensors.batteryHint': 'Mức pin và trạng thái sạc, khi thay đổi và mỗi phút',
  'capture.sensors.network': 'Mạng',
  'capture.sensors.networkHint': 'Loại kết nối và tốc độ ước tính, khi thay đổi và mỗi phút',
  'capture.sensors.visibility': 'Hiển thị màn hình',
  'capture.sensors.visibilityHint': 'Khi ứng dụng chuyển xuống nền hoặc quay lại',

  'capture.start': 'Bắt đầu ghi',
  'capture.stop': 'Dừng ghi',
  'capture.selectSensor': 'Bật ít nhất một cảm biến để bắt đầu',
  'capture.recording': 'Đang ghi',
  'capture.session': 'Phiên',

  'capture.elapsed': 'Đã trôi qua',
  'capture.samples': 'Mẫu dữ liệu',
  'capture.lastFix': 'Điểm định vị gần nhất',
  'capture.noFix': 'Chưa có điểm định vị',

  'capture.foregroundWarning':
    'Capture chỉ chạy khi ứng dụng đang mở và hiển thị trên màn hình — chuyển ứng dụng hoặc tắt màn hình sẽ tạm dừng ghi (cảm biến hiển thị sẽ cho thấy các khoảng trống).',

  'capture.summaryTitle': 'Tóm tắt phiên',
  'capture.summaryDuration': 'Thời lượng',
  'capture.summaryTotal': 'Tổng số mẫu',

  'capture.permissionDenied': 'Quyền bị từ chối',
  'capture.notSupported': 'Không được hỗ trợ trên thiết bị này',
};

export default capture;
