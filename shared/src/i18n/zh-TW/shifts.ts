import type { TranslationStrings } from '../types';

const shifts: TranslationStrings = {
  'shifts.tab': '班次',
  'shifts.title': '班次',
  'shifts.signOn': '上班',
  'shifts.signOff': '下班',
  'shifts.onShiftNow': '目前值班中',
  'shifts.nobodyOn': '目前沒有人值班',
  'shifts.history': '歷史記錄',
  'shifts.totals': '每位成員的工時',
  'shifts.hours': '{h}小時{m}分',
  'shifts.locationNote': '你的位置只會在上班與下班時各記錄一次——中間絕不追蹤。若拒絕授權，只是在沒有位置的情況下上班。',
  'shifts.locationDenied': '位置無法取得——已在沒有位置的情況下記錄',
  'shifts.alreadyOn': '已在值班中',
  'shifts.info.title': '班次功能說明',
  'shifts.info.body':
    '劇組的打卡鐘。開始工作時打卡上班，結束時打卡下班——時鐘對所有人即時走動，名單顯示目前誰在值班，總計卡片會加總每位成員的工時。上下班時各可選擇記錄一次位置（中間完全沒有），每次上班與下班都會在活動聊天室公告。',
  'shifts.elapsed': '值班中',
  'shifts.signedOnAt': '{time} 上班',
  'shifts.signedOffSummary': '{start} – {end} · {duration}',
  'shifts.empty': '還沒有班次——打卡上班即可啟動時鐘。',
};

export default shifts;
