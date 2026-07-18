import type { TranslationStrings } from '../types';

const report: TranslationStrings = {
  'report.title': 'プロダクションレポート',
  'report.range.24h': '過去24時間',
  'report.range.48h': '過去48時間',
  'report.range.7d': '過去7日間',
  'report.changes': 'スケジュール変更',
  'report.changesEmpty': 'この期間にスケジュール変更はありません。',
  'report.files': '読み込まれたファイル',
  'report.filesEmpty': 'この期間に読み込まれたファイルはありません。',
  'report.shiftHours': 'シフト時間',
  'report.shiftsEmpty': 'この期間にシフトはありません。',
  'report.upcoming': '今後48時間',
  'report.upcomingEmpty': '今後48時間に予定はありません。',
  'report.by': '{name}による',
  'report.onShift': '現在勤務中',
  'report.share': 'チャットで共有',
  'report.shared': 'レポートをイベントのチャットに共有しました',
  'report.loadFailed': 'レポートを読み込めませんでした。',
  'report.retry': '再試行',
  'report.info.title': 'プロダクションレポートについて',
  'report.info.body':
    'このイベントのSM/PM向けダイジェストです。すべてのスケジュール変更（何が動いたか、変更前後の時間、変更した人）、読み込まれたファイル、各メンバーのシフト時間、そして今後48時間に時間が設定されているすべての項目をまとめます。期間を選んで「チャットで共有」を押すと、コンパクトな概要がイベントのチャットに投稿され、クルー全員に届きます。',
};

export default report;
