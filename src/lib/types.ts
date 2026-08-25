export type CustodySide = "a" | "b";
export type MemberRole = "owner" | "parent" | "guardian" | "viewer";
export type PatternKind =
  | "alternating_weeks"
  | "iso_week_parity"
  | "week_2_2_3"
  | "custom_weekly"
  | "fixed_parent";

export type EventKind =
  | "school_trip"
  | "parent_meeting"
  | "photo_session"
  | "excursion"
  | "medical"
  | "birthday"
  | "holiday"
  | "other";

export type ExpenseCategory =
  | "alimony"
  | "activities"
  | "clothing"
  | "fun"
  | "school"
  | "health"
  | "food"
  | "travel"
  | "other";

export type NotificationStatus = "pending" | "sent" | "failed" | "cancelled";

export interface Family {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  created_by: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  phone: string | null;
  color: string;
  telegram_chat_id: string | null;
  telegram_link_code: string | null;
  locale: string;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string;
  role: MemberRole;
  custody_side: CustodySide | null;
  display_name: string | null;
  color: string | null;
  created_at: string;
  profile?: Profile | null;
}

/** Člen s dopočítanými zobrazovacími hodnotami — používá se napříč UI. */
export interface MemberView {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  role: MemberRole;
  side: CustodySide | null;
  color: string;
  avatarUrl: string | null;
  hasTelegram: boolean;
}

export interface FamilyInvite {
  id: string;
  family_id: string;
  email: string;
  role: MemberRole;
  custody_side: CustodySide | null;
  token: string;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
}

export interface Child {
  id: string;
  family_id: string;
  name: string;
  birth_date: string | null;
  color: string;
  avatar_url: string | null;
  school: string | null;
  class_name: string | null;
  notes: string | null;
  archived: boolean;
}

export interface CustodyPattern {
  id: string;
  family_id: string;
  child_id: string | null;
  kind: PatternKind;
  starts_on: string;
  ends_on: string | null;
  anchor_date: string;
  anchor_side: CustodySide;
  weekly_map: string | null;
  fixed_side: CustodySide | null;
  handover_dow: number;
  handover_time: string;
  note: string | null;
}

export interface CustodyOverride {
  id: string;
  family_id: string;
  child_id: string | null;
  day: string;
  side: CustodySide;
  reason: string | null;
}

export interface Activity {
  id: string;
  family_id: string;
  child_id: string;
  name: string;
  location: string | null;
  address: string | null;
  day_of_week: number;
  starts_at: string;
  ends_at: string;
  season_start: string;
  season_end: string | null;
  price: number | null;
  price_period: string | null;
  contact: string | null;
  color: string;
  notes: string | null;
  active: boolean;
}

export interface ActivityOccurrence {
  id: string;
  family_id: string;
  activity_id: string;
  day: string;
  cancelled: boolean;
  starts_at: string | null;
  ends_at: string | null;
  driver_there: string | null;
  driver_back: string | null;
  note: string | null;
}

export interface FamilyEvent {
  id: string;
  family_id: string;
  child_id: string | null;
  kind: EventKind;
  title: string;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  notes: string | null;
  responsible: string | null;
  reminders: number[];
  created_by: string | null;
}

export interface Expense {
  id: string;
  family_id: string;
  child_id: string | null;
  category: ExpenseCategory;
  title: string;
  amount: number;
  currency: string;
  spent_on: string;
  paid_by: string | null;
  split_percent: number;
  settled: boolean;
  activity_id: string | null;
  event_id: string | null;
  note: string | null;
  created_at: string;
  receipts?: Receipt[];
}

export interface Receipt {
  id: string;
  family_id: string;
  expense_id: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
}

export interface GoogleAccount {
  user_id: string;
  google_email: string | null;
  calendar_id: string;
  sync_custody: boolean;
  sync_activities: boolean;
  sync_events: boolean;
  last_sync_at: string | null;
  last_sync_error: string | null;
}

/** Kontext přihlášeného uživatele — načítá se v layoutu aplikace. */
export interface SessionContext {
  userId: string;
  profile: Profile;
  family: Family;
  members: MemberView[];
  children: Child[];
  myMembership: FamilyMember;
  allFamilies: { id: string; name: string }[];
}
