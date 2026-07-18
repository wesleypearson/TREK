import type { TranslationStrings } from '../types';

const shifts: TranslationStrings = {
  'shifts.tab': 'Ca làm việc',
  'shifts.title': 'Ca làm việc',
  'shifts.signOn': 'Vào ca',
  'shifts.signOff': 'Tan ca',
  'shifts.onShiftNow': 'Đang trong ca',
  'shifts.nobodyOn': 'Không có ai đang trong ca',
  'shifts.history': 'Lịch sử',
  'shifts.totals': 'Số giờ theo thành viên',
  'shifts.hours': '{h}g {m}p',
  'shifts.locationNote':
    'Vị trí của bạn được ghi lại một lần khi vào ca và một lần khi tan ca — không bao giờ bị theo dõi ở giữa. Nếu từ chối, bạn vẫn vào ca bình thường nhưng không có vị trí.',
  'shifts.locationDenied': 'Vị trí không khả dụng — đã vào ca không có vị trí',
  'shifts.alreadyOn': 'Bạn đang trong ca rồi',
  'shifts.info.title': 'Ca làm việc hoạt động thế nào',
  'shifts.info.body':
    'Đồng hồ chấm công của ê-kíp. Vào ca khi bạn bắt đầu làm việc và tan ca khi bạn dừng — đồng hồ chạy trực tiếp cho mọi người, danh sách hiển thị ai đang trong ca lúc này, và thẻ tổng cộng dồn số giờ của từng thành viên. Một vị trí tùy chọn được ghi ở mỗi đầu ca (không có gì ở giữa), và mỗi lần vào ca hay tan ca đều được thông báo trong cuộc trò chuyện của sự kiện.',
  'shifts.elapsed': 'Trong ca',
  'shifts.signedOnAt': 'Vào ca lúc {time}',
  'shifts.signedOffSummary': '{start} – {end} · {duration}',
  'shifts.empty': 'Chưa có ca nào — vào ca để bắt đầu đồng hồ.',
};

export default shifts;
