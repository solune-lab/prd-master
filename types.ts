
export enum PRDMode {
  VIBE = 'Vibe',
  PRO = 'Pro'
}

export enum Language {
  EN = 'en',
  ZH_TW = 'zh-TW',
  ZH_CN = 'zh-CN',
  JA = 'ja',
  KO = 'ko',
  FR = 'fr',
  DE = 'de',
  IT = 'it',
  ES = 'es',
  PT = 'pt',
  RU = 'ru',
  AR = 'ar'
}

export enum UserTier {
  FREE = 'free',
  STARTER = 'starter',
  PRO = 'pro',
  ELITE = 'elite'
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface HistoryItem {
  id: string;
  title: string;
  timestamp: number;
  content: string;
  mode: PRDMode;
  language: Language;
  isUnlocked?: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  picture: string | null;
  tier: UserTier;
  totalRounds: number;
  remainingDownloads: number;
  invitationCode: string;
  referredBy?: string;
  balanceCredits: number;
  subscriptionEnd?: number;
  isTrialActive?: boolean;
  trialEndDate?: number;
  deviceFingerprint: string;
}

export interface CreditTransaction {
  id: string;
  type: 'reward' | 'consumption' | 'purchase';
  amount: number;
  timestamp: number;
  description: string;
}
