import type { TranslationStrings } from '../types';

const shifts: TranslationStrings = {
  'shifts.tab': '班次',
  'shifts.title': '班次',
  'shifts.signOn': '上班',
  'shifts.signOff': '下班',
  'shifts.onShiftNow': '当前在班',
  'shifts.nobodyOn': '目前没有人在班',
  'shifts.history': '历史记录',
  'shifts.totals': '每位成员的工时',
  'shifts.hours': '{h}小时{m}分',
  'shifts.locationNote': '您的位置仅在上班和下班时各记录一次——中间绝不追踪。若拒绝授权，只是在没有位置的情况下上班。',
  'shifts.locationDenied': '位置不可用——已在无位置的情况下记录',
  'shifts.alreadyOn': '已在班上',
  'shifts.info.title': '班次功能说明',
  'shifts.info.body':
    '团队的打卡钟。开始工作时上班打卡，结束时下班打卡——时钟对所有人实时走动，名单显示当前谁在班上，工时卡片汇总每位成员的工时。上下班时各选择性记录一次位置（中间没有任何记录），每次上班和下班都会在活动聊天中通知。',
  'shifts.elapsed': '在班',
  'shifts.signedOnAt': '{time} 上班',
  'shifts.signedOffSummary': '{start} – {end} · {duration}',
  'shifts.empty': '还没有班次——上班打卡即可启动时钟。',
};

export default shifts;
