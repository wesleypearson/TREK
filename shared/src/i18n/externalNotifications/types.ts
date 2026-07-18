export interface EmailStrings {
  footer: string;
  manage: string;
  openTrek: string;
}

export interface EventText {
  title: string;
  body: string;
}

export type EventTextFn = (params: Record<string, string>) => EventText;

export interface PasswordResetStrings {
  subject: string;
  greeting: string;
  body: string;
  ctaIntro: string;
  expiry: string;
  ignore: string;
}

/** Events every locale has translations for. */
export type CoreNotificationEventKey =
  | 'trip_invite'
  | 'booking_change'
  | 'trip_reminder'
  | 'todo_due'
  | 'vacay_invite'
  | 'collection_invite'
  | 'photos_shared'
  | 'collab_message'
  | 'packing_tagged'
  | 'version_available'
  | 'synology_session_cleared'
  | 'plugin_notification';

/**
 * Events added since the last full translation pass: en carries them, other
 * locales MAY until the translators catch up (the server's getEventText falls
 * back to en for a missing key). Promote to CoreNotificationEventKey once all
 * locales have the entry.
 */
export type PendingNotificationEventKey = 'schedule_change';

export type NotificationEventKey = CoreNotificationEventKey | PendingNotificationEventKey;

export type NotificationEventTexts =
  Record<CoreNotificationEventKey, EventTextFn> & Partial<Record<PendingNotificationEventKey, EventTextFn>>;

export interface NotificationLocale {
  email: EmailStrings;
  events: NotificationEventTexts;
  passwordReset: PasswordResetStrings;
}
