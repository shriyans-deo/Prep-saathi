// Design tokens matching the PrepSaathi deck
export const COLORS = {
  navy: '#0B1F3A',
  blue: '#2563EB',
  sky: '#60A5FA',
  orange: '#F97316',
  grey: '#94A3B8',
  bg: '#F8FAFC',
} as const;

// Exam options
export const EXAMS = [
  'SSC CGL',
  'SSC CHSL',
  'IBPS PO',
  'IBPS Clerk',
  'UPSC CSE',
  'UPSC CAPF',
  'RRB NTPC',
] as const;

// City tiers
export const CITY_TIERS = [
  { value: 'metro', label: 'Metro (Delhi, Mumbai, etc.)' },
  { value: 'tier2', label: 'Tier 2 City' },
  { value: 'small_town', label: 'Small Town / Rural' },
] as const;

// AI task types
export const AI_TASKS = {
  DAILY_PLAN: 'daily_plan',
  QUIZ_FEEDBACK: 'quiz_feedback',
  DOC_SUGGEST: 'doc_suggest',
  WEEKLY_SUMMARY: 'weekly_summary',
} as const;

// Mastery thresholds
export const MASTERY = {
  WEAK_THRESHOLD: 40,
  LEARNING_THRESHOLD: 70,
  WEAK_SEED: 30,
  DEFAULT_SEED: 60,
} as const;

// Navigation items in spec order
export const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { path: '/plan', label: "Today's Plan", icon: 'CalendarCheck' },
  { path: '/library', label: 'Library', icon: 'BookOpen' },
  { path: '/quiz', label: 'Quiz', icon: 'Brain' },
  { path: '/proof', label: 'Proof', icon: 'Camera' },
  { path: '/squad', label: 'Squad', icon: 'Users' },
  { path: '/progress', label: 'Progress', icon: 'TrendingUp' },
] as const;
