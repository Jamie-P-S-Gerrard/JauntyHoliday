export type UserId = string;
export type GroupId = string;
export type TripId  = string;

export interface User {
  id: UserId;
  name: string;
  initials: string;
  email?: string;
  avatarKey: 'c' | 'j' | 'm' | 'r' | 'f' | 's' | 'ai';
}

export type TripStatus = 'Active' | 'Planning' | 'Idea';

export interface TripSummary {
  id: TripId;
  dest: string;
  when: string;
  status: TripStatus;
  tint: string;
  ready: boolean;
}

export type GroupVibe = 'cozy' | 'adventure' | 'romantic' | 'city' | 'beach';
export type GroupPace = 'chill' | 'balanced' | 'packed';
export type GroupBudgetLevel = 'shoestring' | 'comfortable' | 'treat';

export interface GroupPrefs {
  vibe?: GroupVibe;
  pace?: GroupPace;
  budget?: GroupBudgetLevel;
  interests: string[];
  notes?: string;
}

export interface Group {
  id: GroupId;
  name: string;
  members: UserId[];
  invited: string[];
  inviteCode: string;
  tint: string;
  trips: TripSummary[];
  prefs: GroupPrefs;
}

export interface Trip {
  place: string;
  tagline: string;
  dates: { label: string; year: number; nights: number };
  countdown: number;
  hero: { label: string; tint: string };
}

export interface DateOption {
  id: string;
  range: string;
  sub: string;
  note?: string;
  weather?: string;
  proposedBy: UserId;
  votes: UserId[];
}

export type DiscoverCat = 'stay' | 'eat' | 'see' | 'culture';
export type DiscoverKind = 'stay' | 'eat' | 'activity';

export interface DiscoverCard {
  id: string;
  cat: DiscoverCat;
  kind: DiscoverKind;
  title: string;
  area: string;
  price: number;
  per: string;
  duration?: string;
  rating?: number;
  tint: string;
  label: string;
  why: string;
}

export interface CultureCard {
  id: string;
  title: string;
  area: string;
  intro: string;
  tips: Array<{ do: boolean; t: string }>;
}

export interface DiscoverData {
  cards: DiscoverCard[];
  culture: CultureCard;
  filters: string[];
  prompts: string[];
}

export type ItineraryItemCat = 'travel' | 'stay' | 'food' | 'beach' | 'activity';

export interface ItineraryItem {
  id: string;
  t: string;
  title: string;
  place: string;
  cat: ItineraryItemCat;
  who: UserId;
  likes: number;
  liked: boolean;
  comments: number;
}

export interface Day {
  n: number;
  date: string;
  title: string;
  area: string;
  items: ItineraryItem[];
}

export type SideTripType = 'solo' | 'open';

export interface SideTrip {
  id: string;
  title: string;
  host: UserId;
  when: string;
  place: string;
  type: SideTripType;
  going: UserId[];
  cap?: number;
  note?: string;
}

export interface PackingItem {
  id: string;
  item: string;
  who: UserId;
  done: boolean;
}

export interface PackingList {
  id: string;
  name: string;
  items: PackingItem[];
}

export type BookingStatus = 'booked' | 'pending' | 'todo';

export interface Booking {
  id: string;
  title: string;
  meta: string;
  cost?: number;
  status: BookingStatus;
  who: UserId | null;
  ref?: string;
  from?: 'email';
  files: string[];
}

export interface BudgetCat {
  name: string;
  spent: number;
  color: string;
}

export interface Budget {
  total: number;
  spent: number;
  currency: string;
  cats: BudgetCat[];
  importEmail: string;
  bookings: Booking[];
}

export interface FeedEvent {
  id: string;
  who: UserId;
  action: 'added' | 'booked' | 'commented';
  what: string;
  to?: string;
  when: string;
  react?: number;
}

export type BudgetView = 'split' | 'joint';
export type PlanTab = 'itinerary' | 'sidetrips' | 'packing';
export type AppTab = 'home' | 'dates' | 'discover' | 'plan' | 'budget';
export type AppStage = 'login' | 'groups' | 'group' | 'setup' | 'trip';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  cardIds?: string[];
  culture?: boolean;
}
