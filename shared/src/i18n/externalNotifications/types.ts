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
  | 'schedule_change'
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

export type NotificationEventKey = CoreNotificationEventKey;

export type NotificationEventTexts = Record<CoreNotificationEventKey, EventTextFn>;

export interface NotificationLocale {
  email: EmailStrings;
  events: NotificationEventTexts;
  passwordReset: PasswordResetStrings;
}
