import type { TranslationStrings } from '../types';

const shifts: TranslationStrings = {
  'shifts.tab': 'シフト',
  'shifts.title': 'シフト',
  'shifts.signOn': '出勤',
  'shifts.signOff': '退勤',
  'shifts.onShiftNow': '現在勤務中',
  'shifts.nobodyOn': '勤務中のメンバーはいません',
  'shifts.history': '履歴',
  'shifts.totals': 'メンバーごとの時間',
  'shifts.hours': '{h}時間{m}分',
  'shifts.locationNote':
    '位置情報は出勤時と退勤時に一度ずつ記録されます — その間に追跡されることはありません。拒否しても、位置なしでそのまま出勤できます。',
  'shifts.locationDenied': '位置情報を取得できません — 位置なしで記録しました',
  'shifts.alreadyOn': 'すでに勤務中です',
  'shifts.info.title': 'シフトの仕組み',
  'shifts.info.body':
    'クルーのタイムレコーダーです。働き始めたら出勤、終わったら退勤を打刻します — 時計は全員にライブで進み、名簿には今誰が勤務中かが表示され、合計カードは各メンバーの時間を集計します。出勤時と退勤時にそれぞれ一度だけ任意で位置を記録し（その間は何もしません）、出勤・退勤はイベントのチャットで通知されます。',
  'shifts.elapsed': '勤務中',
  'shifts.signedOnAt': '{time}に出勤',
  'shifts.signedOffSummary': '{start} – {end} · {duration}',
  'shifts.empty': 'まだシフトがありません — 出勤して時計を始めましょう。',
};

export default shifts;
