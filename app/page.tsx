
'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ClientPRDService, ServiceError } from '@/services/clientService';
import { PRDMode, ChatMessage, HistoryItem, Language, UserTier, UserProfile } from '@/types';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { LIMITS, PRICING } from '@/constants';
import { createClient } from '@/lib/supabase';
import { getFingerprint, isDisposableEmail } from '@/lib/anti-abuse';
import { Turnstile } from '@/components/Turnstile';
import { apiUrl } from '@/lib/api';
import '@/i18n';
import Link from 'next/link';

// --- Auth Components ---
const AuthModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserProfile) => void;
  initialMode: 'login' | 'register';
}> = ({ isOpen, onClose, onAuthSuccess, initialMode }) => {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileError, setTurnstileError] = useState(false);
  const turnstileResetRef = useRef<(() => void) | null>(null);
  const { t } = useTranslation();
  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setMagicLinkSent(false);
      setEmail('');
      // Auto-populate referral code from URL ?ref= param on modal open
      const urlRef = new URLSearchParams(window.location.search).get('ref');
      setReferralCode(urlRef ? urlRef.trim().toUpperCase() : '');
      // Reset Turnstile widget on modal open
      setTurnstileToken(null);
      setTurnstileError(false);
      turnstileResetRef.current?.();
    }
  }, [isOpen, initialMode]);

  /** Verify Turnstile token with our backend before any auth action */
  const verifyTurnstile = async (token: string): Promise<boolean> => {
    try {
      const res = await fetch(apiUrl('/api/verify-turnstile'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      return data.success === true;
    } catch {
      return false;
    }
  };

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    if (!turnstileToken) {
      alert('Please complete the security check below.');
      return;
    }
    setIsLoading(true);
    try {
      const verified = await verifyTurnstile(turnstileToken);
      if (!verified) {
        setTurnstileError(true);
        turnstileResetRef.current?.();
        setTurnstileToken(null);
        throw new Error('Security verification failed. Please try again.');
      }

      // Store referral code before redirect so it survives page navigation
      if (referralCode.trim()) {
        sessionStorage.setItem('prd_pending_referral', referralCode.trim().toUpperCase());
      }

      const fingerprint = await getFingerprint();

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${process.env.NEXT_PUBLIC_BASE_PATH || '/prd-master'}/auth/callback`,
          skipBrowserRedirect: true,
        }
      });

      if (error) throw error;

      if (data.url) {
        window.location.href = data.url;
      }

    } catch (error: any) {
      console.error('Login exception:', error);
      alert(error.message);
      setIsLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      alert('Please enter your email.');
      return;
    }
    if (!turnstileToken) {
      alert('Please complete the security check below.');
      return;
    }
    setIsLoading(true);
    try {
      if (isDisposableEmail(email)) {
        throw new Error('Temporary email addresses are not allowed.');
      }

      const verified = await verifyTurnstile(turnstileToken);
      if (!verified) {
        setTurnstileError(true);
        turnstileResetRef.current?.();
        setTurnstileToken(null);
        throw new Error('Security verification failed. Please try again.');
      }

      // Store referral code before sending magic link
      if (referralCode.trim()) {
        sessionStorage.setItem('prd_pending_referral', referralCode.trim().toUpperCase());
      }

      const fingerprint = await getFingerprint();

      // Magic link must use implicit flow so the email contains a token (not a PKCE code).
      // PKCE stores the verifier in localStorage of the sending browser; when the user opens
      // the email in a new tab or email client, localStorage is empty → PKCE error.
      const { createBrowserClient } = await import('@supabase/ssr')
      const implicitClient = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { flowType: 'implicit' } }
      )

      const { error } = await implicitClient.auth.signInWithOtp({
        email,
        options: {
          data: {
            fingerprint: fingerprint
          },
          emailRedirectTo: `${window.location.origin}${process.env.NEXT_PUBLIC_BASE_PATH || '/prd-master'}/auth/callback`
        }
      });

      if (error) throw error;
      setMagicLinkSent(true);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl relative animate-in zoom-in-95 duration-300">
        <button onClick={onClose} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors text-xl">✕</button>

        <div className="mb-6">
          <h2 className="text-2xl font-black mb-1 text-white">{t('login')}</h2>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">PRD Master Architecture</p>
        </div>

        {/* Referral Code — top of form, optional */}
        {!magicLinkSent && (
          <div className="mb-6">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">
              🎁 Referral Code <span className="text-slate-600 normal-case font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={referralCode}
              onChange={e => setReferralCode(e.target.value.toUpperCase())}
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm text-white font-mono tracking-widest uppercase placeholder:normal-case placeholder:tracking-normal placeholder:font-sans"
              placeholder="Enter invite code..."
              maxLength={20}
            />
            {referralCode.trim() && (
              <p className="text-indigo-400 text-[10px] mt-1.5 px-1 font-medium">✓ Code will be applied after login</p>
            )}
          </div>
        )}

        {magicLinkSent ? (
          <div className="text-center py-6 animate-in fade-in duration-300">
            <div className="w-16 h-16 bg-indigo-600/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
              <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-white font-bold text-lg mb-2">Check your inbox</h3>
            <p className="text-slate-400 text-sm mb-3">We sent a magic link to <span className="text-indigo-400 font-bold">{email}</span>. Click the link to sign in.</p>
            
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 mb-6 mx-auto">
              <p className="text-amber-400/90 text-[11px] font-medium flex items-start text-left gap-2.5">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <span>If you don't see the email in your inbox, please <strong>check your spam or junk folder</strong> as it might have been filtered there.</span>
              </p>
            </div>

            <button onClick={() => { setMagicLinkSent(false); setEmail(''); }} className="text-slate-500 hover:text-white text-xs transition-colors">
              ← Use a different email
            </button>
          </div>
        ) : (
          <>
            {/* Google Login */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading || !turnstileToken}
              className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold py-3.5 rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-3 mb-4 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {t('loginGoogle')}
            </button>

            {/* Divider */}
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
              <div className="relative flex justify-center text-[10px] uppercase font-black text-slate-600 tracking-widest"><span className="bg-slate-900 px-3">Or</span></div>
            </div>

            {/* Magic Link Login */}
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">Email</label>
                <input
                  type="email"
                  value={email} onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleMagicLink(); }}
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm text-white"
                  placeholder="name@example.com"
                />
              </div>

              {/* Cloudflare Turnstile Anti-Bot Widget */}
              <div className="pt-1">
                <Turnstile
                  onVerify={(token) => { setTurnstileToken(token); setTurnstileError(false); }}
                  onExpire={() => setTurnstileToken(null)}
                  onError={() => { setTurnstileToken(null); setTurnstileError(true); }}
                  resetRef={turnstileResetRef}
                />
                {turnstileError && (
                  <p className="text-red-400 text-[10px] text-center mt-1 font-medium">⚠ Verification failed. Please try again.</p>
                )}
              </div>

              <button
                type="button"
                onClick={handleMagicLink}
                disabled={isLoading || !turnstileToken || !email}
                className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700/50 hover:border-indigo-500/50 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                )}
                Continue with Magic Link
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// --- Main App ---
export default function Page() {
  const { t, i18n } = useTranslation();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [viewMode, setViewMode] = useState<'chat' | 'doc'>('chat');
  const [finalPRD, setFinalPRD] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sessionRoundCount, setSessionRoundCount] = useState(0);
  const [paywallTab, setPaywallTab] = useState<'starter' | 'pro' | 'proAnnual' | 'elite'>('elite');
  const [showRoundWarning, setShowRoundWarning] = useState(false);

  const [chatTurnstileToken, setChatTurnstileToken] = useState<string | null>(null);
  const [chatTurnstileError, setChatTurnstileError] = useState(false);
  const chatTurnstileResetRef = useRef<(() => void) | null>(null);

  const [user, setUser] = useState<UserProfile | null>(() => {
    // Hydrate from localStorage immediately to avoid login flash on refresh
    // Note: history/finalPRD are loaded separately after auth is confirmed to prevent cross-user leakage
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('prd_v2_user');
        return saved ? JSON.parse(saved) : null;
      } catch { return null; }
    }
    return null;
  });

  // Single-document unlock via credit (free users only, resets on new PRD generation)
  const [creditUnlocked, setCreditUnlocked] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Derived: isUnlocked is computed from user.tier OR credit usage — NOT scattered state
  // This eliminates the root cause of paywall disappearing (13+ scattered setIsUnlocked calls)
  const isUnlocked = useMemo(() => {
    if (!user) return false;
    if (user.tier !== UserTier.FREE) return true;
    return creditUnlocked;
  }, [user, creditUnlocked]);

  // Paywall modal: only shows after user scrolls to the bottom of preview content
  const [paywallVisible, setPaywallVisible] = useState(false);
  const canShowPaywall = viewMode === 'doc' && !!finalPRD && !isUnlocked && !!user;

  // Reset paywall visibility when conditions change
  useEffect(() => {
    if (!canShowPaywall) setPaywallVisible(false);
  }, [canShowPaywall]);

  // Helper: get user-scoped localStorage key
  const getUserScopedKey = (userId: string, key: string) => `${key}_uid_${userId}`;

  // Helper: load user-scoped history and finalPRD from localStorage
  const loadUserData = (userId: string) => {
    try {
      const historyKey = getUserScopedKey(userId, 'prd_v2_history');
      const prdKey = getUserScopedKey(userId, 'prd_v2_finalPRD');
      const savedHistory = localStorage.getItem(historyKey);
      const savedPRD = localStorage.getItem(prdKey);
      setHistory(savedHistory ? JSON.parse(savedHistory) : []);
      setFinalPRD(savedPRD || null);
    } catch {
      setHistory([]);
      setFinalPRD(null);
    }
  };

  // Helper: clear all history-related state and storage for the current user
  const clearUserData = (userId?: string) => {
    setHistory([]);
    setFinalPRD(null);
    setViewMode('chat');
    // Clear user-scoped keys
    if (userId) {
      localStorage.removeItem(getUserScopedKey(userId, 'prd_v2_history'));
      localStorage.removeItem(getUserScopedKey(userId, 'prd_v2_finalPRD'));
    }
    // Also clear legacy unscoped keys
    localStorage.removeItem('prd_v2_history');
    localStorage.removeItem('prd_v2_finalPRD');
  };
  const [authModal, setAuthModal] = useState<{ open: boolean; mode: 'login' | 'register' }>({ open: false, mode: 'login' });
  const [mounted, setMounted] = useState(false);

  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const prdService = useMemo(() => new ClientPRDService(), []);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const docContainerRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const MAX_RECORDING_SECONDS = 180;

  useEffect(() => {
    setMounted(true);
    // Set initial sidebar state based on window width after mount
    setSidebarOpen(window.innerWidth >= 1024);

    if (!localStorage.getItem('prd_device_fingerprint')) {
      localStorage.setItem('prd_device_fingerprint', Math.random().toString(36).substring(2));
    }

    // If user was hydrated from localStorage on mount, load their scoped history/finalPRD
    // This restores data on page refresh without leaking to other users
    const savedUser = localStorage.getItem('prd_v2_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        if (parsedUser?.id) {
          loadUserData(parsedUser.id);
        }
      } catch { /* ignore parse errors */ }
    }

    document.documentElement.dir = i18n.language === Language.AR ? 'rtl' : 'ltr';

    // Supabase Auth Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event, 'Session:', !!session);
      if (session?.user) {
        console.log('Session user ID:', session.user.id);
        // Fetch profile from DB (with timeout to avoid hanging on RLS-blocked queries)
        console.log('Fetching profile...');
        let profile: any = null;
        let profileError: any = null;
        try {
          const result = await Promise.race([
            supabase.from('profiles').select('*').eq('id', session.user.id).single(),
            new Promise<{ data: null; error: { message: string } }>((resolve) =>
              setTimeout(() => resolve({ data: null, error: { message: 'Profile query timeout' } }), 5000)
            ),
          ]);
          profile = result.data;
          profileError = result.error;
        } catch (err) {
          profileError = err;
        }
        console.log('Profile result:', !!profile, !!profileError);

        // Use API route to get profile (auto-creates if missing, generates invitation_code)
        let profileData = profile;
        if (profileError || !profile) {
          console.warn('Profile not found via client, fetching via API (will auto-create)...');
          try {
            profileData = await prdService.getProfile(session.access_token);
          } catch (err) {
            console.error('Failed to fetch/create profile via API:', err);
          }
        }

        if (profileData) {
          console.log('Profile loaded:', profileData.email, 'invitation_code:', profileData.invitation_code);
          // Race condition guard: if user just paid (optimistic tier set), don't downgrade
          // until the Stripe webhook confirms the tier in the DB.
          const tierPriority: Record<string, number> = { 'free': 0, 'starter': 1, 'pro': 2, 'elite': 3 };
          const optimisticTier = sessionStorage.getItem('prd_optimistic_tier');
          const dbTier = (profileData.tier || UserTier.FREE) as string;
          const resolvedTier = (optimisticTier && (tierPriority[optimisticTier] ?? 0) > (tierPriority[dbTier] ?? 0))
            ? optimisticTier as UserTier
            : dbTier as UserTier;
          const userData: UserProfile = {
            id: profileData.id,
            name: profileData.full_name || session.user.user_metadata.full_name || session.user.email?.split('@')[0] || 'User',
            email: session.user.email || '',
            picture: session.user.user_metadata.avatar_url,
            tier: resolvedTier,
            totalRounds: profileData.total_rounds || 0,
            remainingDownloads: profileData.remaining_downloads || 0,
            invitationCode: profileData.invitation_code || '',
            balanceCredits: profileData.balance_credits || 0,
            deviceFingerprint: profileData.fingerprint
          };
          setUser(userData);
          localStorage.setItem('prd_v2_user', JSON.stringify(userData));
          // Load this user's history and finalPRD (scoped by user ID)
          loadUserData(userData.id);

          // --- Referral Binding (Post-Auth) ---
          // Only attempt on SIGNED_IN to avoid duplicate calls on page reload (INITIAL_SESSION)
          if (event === 'SIGNED_IN') {
            const pendingReferral = sessionStorage.getItem('prd_pending_referral');
            if (pendingReferral && !profileData.referred_by) {
              sessionStorage.removeItem('prd_pending_referral');
              try {
                const fingerprint = await getFingerprint();
                const res = await fetch(apiUrl('/api/referral/apply'), {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                  },
                  body: JSON.stringify({ code: pendingReferral, fingerprint }),
                });
                if (res.ok) {
                  // Refresh remaining_downloads in local user state
                  const updated = await res.json();
                  if (updated?.remainingDownloads !== undefined) {
                    setUser(prev => prev ? { ...prev, remainingDownloads: updated.remainingDownloads } : prev);
                  } else {
                    // Re-fetch profile to get updated credits
                    try {
                      const freshProfile = await prdService.getProfile(session.access_token);
                      if (freshProfile) {
                        setUser(prev => prev ? { ...prev, remainingDownloads: freshProfile.remaining_downloads || 0 } : prev);
                      }
                    } catch { /* non-critical */ }
                  }
                } else {
                  const errData = await res.json().catch(() => ({}));
                  console.warn('Referral apply failed:', errData?.error);
                }
              } catch (err) {
                console.error('Referral binding error:', err);
              }
            }
          }

        } else {
          console.warn('Could not load or create profile');
          const fallbackUser: UserProfile = {
            id: session.user.id,
            name: session.user.user_metadata.full_name || session.user.email?.split('@')[0] || 'User',
            email: session.user.email || '',
            picture: session.user.user_metadata.avatar_url,
            tier: UserTier.FREE,
            totalRounds: 0,
            remainingDownloads: 0,
            invitationCode: '',
            balanceCredits: 0,
            deviceFingerprint: ''
          };
          setUser(fallbackUser);
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('SIGNED_OUT event, clearing user and history');
        setUser(null);
        localStorage.removeItem('prd_v2_user');
        // Clear all history-related state — do NOT persist across sessions
        setHistory([]);
        setFinalPRD(null);
        setMessages([]);
        setViewMode('chat');
        setSessionRoundCount(0);
        // Clear legacy unscoped keys
        localStorage.removeItem('prd_v2_history');
        localStorage.removeItem('prd_v2_finalPRD');
      }
      // INITIAL_SESSION with null session = Supabase still loading; keep localStorage user
    });

    return () => subscription.unsubscribe();
  }, [i18n.language]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  // Handle Stripe checkout success redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutStatus = params.get('checkout');
    const tier = params.get('tier');

    if (checkoutStatus === 'success' && tier) {
      // IMMEDIATELY restore PRD view from localStorage — don't wait for poll
      // The user just paid, they want to see their PRD content right away
      const savedUser = localStorage.getItem('prd_v2_user');
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          if (parsedUser?.id) {
            // Optimistic tier update: Stripe redirect is proof of payment.
            // Without this, isUnlocked stays false until webhook fires (may take 30s+).
            const newTier = tier.toLowerCase() as import('@/types').UserTier;
            const optimisticUser = { ...parsedUser, tier: newTier };
            localStorage.setItem('prd_v2_user', JSON.stringify(optimisticUser));
            setUser(optimisticUser);
            // Guard: prevent auth listener from downgrading tier before webhook confirms
            sessionStorage.setItem('prd_optimistic_tier', newTier);

            const savedPRD = localStorage.getItem(getUserScopedKey(parsedUser.id, 'prd_v2_finalPRD'));
            if (savedPRD) {
              setFinalPRD(savedPRD);
              setViewMode('doc');
            }
          }
        } catch { /* ignore parse errors */ }
      }

      // Poll profile until webhook updates tier (max 30s, every 2s)
      const pollProfile = async (attempts: number) => {
        try {
          const profile = await prdService.getProfile();
          if (!profile) {
            // Profile not found — retry instead of silently giving up
            if (attempts > 0) setTimeout(() => pollProfile(attempts - 1), 2000);
            return;
          }
          const paidTiers = ['starter', 'pro', 'elite'];
          const dbTierFromPoll = (profile.tier || UserTier.FREE) as string;
          const dbIsPaid = paidTiers.includes(dbTierFromPoll.toLowerCase());

          if (dbIsPaid) {
            // DB confirmed paid tier — clear optimistic guard, update with authoritative DB data
            sessionStorage.removeItem('prd_optimistic_tier');
            const updatedUser: UserProfile = {
              id: profile.id,
              name: profile.full_name || user?.name || 'User',
              email: profile.email || user?.email || '',
              picture: user?.picture || null,
              tier: dbTierFromPoll as UserTier,
              totalRounds: profile.total_rounds || 0,
              remainingDownloads: profile.remaining_downloads || 0,
              invitationCode: profile.invitation_code || '',
              balanceCredits: profile.balance_credits || 0,
              isTrialActive: profile.is_trial_active,
              trialEndDate: profile.trial_end_date ? new Date(profile.trial_end_date).getTime() : undefined,
              deviceFingerprint: profile.fingerprint || '',
            };
            setUser(updatedUser);
            localStorage.setItem('prd_v2_user', JSON.stringify(updatedUser));
            // Restore PRD view if not already showing
            const savedPRD = profile.id ? localStorage.getItem(getUserScopedKey(profile.id, 'prd_v2_finalPRD')) : null;
            if (savedPRD) {
              setFinalPRD(savedPRD);
              setViewMode('doc');
            }
          } else {
            // DB still shows free (Stripe webhook pending) — do NOT overwrite user state.
            // Keep the optimistic tier intact. Just continue polling.
            if (attempts > 0) setTimeout(() => pollProfile(attempts - 1), 2000);
          }
        } catch (err) {
          console.error('Profile refresh error:', err);
          if (attempts > 0) setTimeout(() => pollProfile(attempts - 1), 2000);
        }
      };
      pollProfile(15);

      // Clean URL params
      window.history.replaceState({}, '', '/');
    }


  }, []);

  const handleAuthSuccess = (userData: UserProfile) => {
    setUser(userData);
    localStorage.setItem('prd_v2_user', JSON.stringify(userData));
    setAuthModal({ ...authModal, open: false });
  };

  const handleLogout = async () => {
    const currentUserId = user?.id;
    await supabase.auth.signOut();
    // SIGNED_OUT event will also fire and clear state, but we clear explicitly here for immediate UI response
    setUser(null);
    localStorage.removeItem('prd_v2_user');
    setHistory([]);
    setFinalPRD(null);
    setMessages([]);
    setViewMode('chat');
    setSessionRoundCount(0);
    // Clear legacy unscoped keys
    localStorage.removeItem('prd_v2_history');
    localStorage.removeItem('prd_v2_finalPRD');
  };

  const cleanupRecording = () => {
    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsListening(false);
  };

  const startRecording = async () => {
    if (!user) {
      setAuthModal({ open: true, mode: 'login' });
      return;
    }
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mediaRecorder.onstop = async () => {
        cleanupRecording();
        stream?.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size === 0) return;
        setIsTranscribing(true);
        try {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              const b64 = result.split(',')[1];
              if (!b64) return reject(new Error('Failed to encode audio'));
              resolve(b64);
            };
            reader.onerror = () => reject(new Error('Failed to read audio'));
            reader.readAsDataURL(audioBlob);
          });
          const transcription = await prdService.transcribeAudio(base64, 'audio/webm', i18n.language as Language);
          if (transcription) setInput(prev => prev + transcription);
        } catch (err: any) {
          console.error('Transcription error:', err);
          const code = err?.code;
          if (code === 'TIMEOUT') {
            alert(t('errorTimeout'));
          } else if (code === 'NETWORK') {
            alert(t('errorNetwork'));
          } else {
            alert(t('errorTranscribe'));
          }
        } finally {
          setIsTranscribing(false);
        }
      };
      mediaRecorder.start();
      setIsListening(true);

      // Auto-stop after MAX_RECORDING_SECONDS
      recordingTimerRef.current = setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, MAX_RECORDING_SECONDS * 1000);
    } catch (err) {
      stream?.getTracks().forEach(track => track.stop());
      alert(t('errorMicrophone'));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return;

    if (!user && !chatTurnstileToken) {
      alert('Please complete the security check first.');
      return;
    }

    if (!user || user.tier === UserTier.FREE) {
      if (sessionRoundCount >= LIMITS.SESSION_ROUNDS) {
        alert(t('limitReached'));
        return;
      }
      if (user && user.totalRounds >= LIMITS.ACCOUNT_ROUNDS_FREE) {
        alert(t('accountLimitReached'));
        return;
      }
    }

    const userMsg: ChatMessage = { role: 'user', parts: [{ text: input.trim() }] };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsGenerating(true);
    const newCount = sessionRoundCount + 1;
    setSessionRoundCount(newCount);

    if (newCount === LIMITS.WARNING_ROUND && !isUnlocked && user?.tier === UserTier.FREE) {
      setShowRoundWarning(true);
    }

    if (user) {
      // Optimistic UI update: immediately show the new round count
      setUser(prev => prev ? { ...prev, totalRounds: prev.totalRounds + 1 } : prev);
      // Fire-and-forget: log usage + sync with DB
      prdService.logUsage('chat_round').then(updatedProfile => {
        if (updatedProfile?.total_rounds !== undefined) {
          setUser(prev => prev ? { ...prev, totalRounds: updatedProfile.total_rounds } : prev);
        }
      }).catch(err => console.error('Usage tracking error:', err));
    }

    // Add a placeholder model message for streaming
    const placeholderIdx = messages.length + 1; // index after userMsg
    setMessages(prev => [...prev, { role: 'model', parts: [{ text: '' }] }]);

    try {
      const responseText = await prdService.sendMessage(
        userMsg.parts[0].text,
        i18n.language as Language,
        [...messages, userMsg],
        (_chunk, accumulated) => {
          setMessages(prev => {
            const updated = [...prev];
            updated[placeholderIdx] = { role: 'model', parts: [{ text: accumulated }] };
            return updated;
          });
        }
      );
      // Final update with complete text
      setMessages(prev => {
        const updated = [...prev];
        updated[placeholderIdx] = { role: 'model', parts: [{ text: responseText }] };
        return updated;
      });
    } catch (error: any) {
      console.error('Chat error:', error);
      // Remove empty placeholder on error
      setMessages(prev => prev.filter((_, i) => i !== placeholderIdx));
      if (error instanceof ServiceError) {
        if (error.code === 'TIMEOUT') alert(t('errorTimeout'));
        else if (error.code === 'NETWORK') alert(t('errorNetwork'));
        else alert(t('error'));
      } else {
        alert(t('error'));
      }
    } finally { setIsGenerating(false); }
  };

  const [isFinalizing, setIsFinalizing] = useState(false);

  const handleFinalize = async () => {
    if (messages.length < 2 || isGenerating) return;
    setIsGenerating(true);
    setIsFinalizing(true);
    setCreditUnlocked(false); // Reset single-doc unlock for new PRD
    setFinalPRD('');
    try {
      const prd = await prdService.generateFinalPRD(
        messages,
        i18n.language as Language,
        (_chunk, accumulated) => {
          setFinalPRD(accumulated);
        }
      );
      setFinalPRD(prd);
      // Save finalPRD scoped to user ID to prevent cross-user leakage
      if (user) {
        localStorage.setItem(getUserScopedKey(user.id, 'prd_v2_finalPRD'), prd);
      }

      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        title: messages[0]?.parts[0]?.text.substring(0, 30) || 'New PRD',
        timestamp: Date.now(),
        content: prd,
        mode: PRDMode.PRO,
        language: i18n.language as Language,
        isUnlocked: isUnlocked
      };
      setHistory(prev => {
        const updated = [newHistoryItem, ...prev];
        // Save history scoped to user ID to prevent cross-user leakage
        if (user) {
          localStorage.setItem(getUserScopedKey(user.id, 'prd_v2_history'), JSON.stringify(updated));
        }
        return updated;
      });

      // Switch to doc view AFTER generation completes, then scroll to top
      setViewMode('doc');
      setTimeout(() => { docContainerRef.current?.scrollTo({ top: 0 }); }, 50);
    } catch (error: any) {
      console.error('Finalize error:', error);
      if (error instanceof ServiceError) {
        if (error.code === 'TIMEOUT') alert(t('errorTimeout'));
        else if (error.code === 'NETWORK') alert(t('errorNetwork'));
        else alert(t('error'));
      } else {
        alert(t('error'));
      }
    } finally {
      setIsGenerating(false);
      setIsFinalizing(false);
    }
  };

  const handleDownload = () => {
    if (!finalPRD || !isUnlocked) return;

    // Log download event in DB
    if (user) {
      prdService.logUsage('download', { title: messages[0]?.parts[0]?.text.substring(0, 30) })
        .catch(err => console.error('Download log error:', err));
    }

    const blob = new Blob([finalPRD], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PRD_${Date.now()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUnlock = async (type: UserTier | 'single') => {
    if (!user) {
      setAuthModal({ open: true, mode: 'login' });
      return;
    }

    // Use existing credit (decrement in DB)
    if (type === 'single') {
      try {
        const updatedProfile = await prdService.logUsage('download');
        if (updatedProfile) {
          setUser(prev => prev ? { ...prev, remainingDownloads: updatedProfile.remaining_downloads } : prev);
        }
        setCreditUnlocked(true);
      } catch (error: any) {
        alert(error.message);
      }
      return;
    }

    // Map UserTier to Stripe tier
    const tierMap: Record<string, 'STARTER' | 'PRO' | 'ELITE'> = {
      [UserTier.STARTER]: 'STARTER',
      [UserTier.PRO]: 'PRO',
      [UserTier.ELITE]: 'ELITE',
    };

    const stripeTier = tierMap[type];
    if (!stripeTier) return;

    setCheckoutLoading(true);
    try {
      const checkoutUrl = await prdService.createCheckoutSession(stripeTier);
      window.location.href = checkoutUrl;
    } catch (error: any) {
      setCheckoutLoading(false);
      alert(error.message);
    }
  };

  const useCredit = async () => {
    if (user && user.remainingDownloads > 0) {
      await handleUnlock('single');
    } else {
      setPaywallTab('starter');
    }
  };

  const getLanguageName = (code: string) => {
    const names: Record<string, string> = {
      [Language.EN]: 'English',
      [Language.ZH_TW]: '繁體中文',
      [Language.ZH_CN]: '简体中文',
      [Language.JA]: '日本語',
      [Language.KO]: '한국어',
      [Language.FR]: 'Français',
      [Language.DE]: 'Deutsch',
      [Language.IT]: 'Italiano',
      [Language.ES]: 'Español',
      [Language.PT]: 'Português',
      [Language.RU]: 'Русский',
      [Language.AR]: 'العربية'
    };
    return names[code] || code;
  };

  // Prevent hydration mismatch: don't render i18n-dependent content until client mount
  if (!mounted) {
    return <div className="h-[100dvh] w-screen bg-slate-950" />;
  }

  return (
    <div className="h-[100dvh] w-screen flex bg-slate-950 text-slate-200 overflow-hidden relative">

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Persistent / Toggleable Sidebar */}
      <aside className={`
        fixed lg:relative inset-y-0 ltr:left-0 rtl:right-0 z-50 w-80 bg-slate-900 border-x border-slate-800 flex flex-col h-full overflow-hidden transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : 'ltr:-translate-x-full rtl:translate-x-full lg:translate-x-0 lg:flex'}
      `}>
        <div className="p-6 border-b border-slate-800 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden text-start">
            {user && (
              <>
                <div className="w-10 h-10 shrink-0 rounded-full border-2 border-indigo-500/30 bg-slate-800 flex items-center justify-center text-indigo-400 font-bold">
                  {user.name.charAt(0)}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-bold text-white truncate">{user.name}</p>
                  <p className={`text-[10px] font-black uppercase tracking-widest ${user.tier === UserTier.FREE ? 'text-slate-500' : 'text-amber-400'}`}>
                    {user.tier === UserTier.FREE ? t('tierFree') : t('tierPro')}
                  </p>
                </div>
              </>
            )}
            {!user && <span className="font-black text-indigo-400 tracking-tight">PRD Master</span>}
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 text-slate-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
          {!user ? (
            <button onClick={() => setAuthModal({ open: true, mode: 'login' })} className="w-full bg-indigo-600/20 text-indigo-400 py-3 rounded-xl border border-indigo-500/30 text-xs font-bold hover:bg-indigo-600/30 transition-all">
              {t('loginToStart')}
            </button>
          ) : (
            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 mb-4 text-start">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t('creditsLabel')}</span>
                <span className="text-emerald-400 font-black text-sm">{user.remainingDownloads}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t('roundsLabel')}</span>
                <span className="text-indigo-400 font-black text-sm">{user.totalRounds}/{LIMITS.ACCOUNT_ROUNDS_FREE}</span>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <button onClick={() => { setMessages([]); setFinalPRD(null); if (user) localStorage.removeItem(getUserScopedKey(user.id, 'prd_v2_finalPRD')); setViewMode('chat'); setSessionRoundCount(0); setCreditUnlocked(false); setShowRoundWarning(false); setIsFinalizing(false); if (window.innerWidth < 1024) setSidebarOpen(false); }} className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/10">
              {t('newChat')}
            </button>


          </div>

          <div className="space-y-2">
            <h2 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-4 px-2 text-start">{t('history')}</h2>
            {/* Guard: only show history when user is authenticated */}
            {user ? (
              <>
                {history.map(item => (
                  <button key={item.id} onClick={() => { setFinalPRD(item.content); setCreditUnlocked(!!item.isUnlocked); setViewMode('chat'); if (window.innerWidth < 1024) setSidebarOpen(false); setTimeout(() => setViewMode('doc'), 10); }} className="w-full text-left rtl:text-right p-3 rounded-xl hover:bg-slate-800 text-sm truncate transition-all border border-transparent hover:border-slate-700">
                    <span className="text-slate-400">{item.title}</span>
                    {(item.isUnlocked || isUnlocked) && <span className="mx-2 text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded uppercase font-black">Unlocked</span>}
                  </button>
                ))}
                {history.length === 0 && <p className="text-xs text-slate-600 px-2 text-start">{t('noHistory')}</p>}
              </>
            ) : (
              <p className="text-xs text-slate-600 px-2 text-start">{t('noHistory')}</p>
            )}
          </div>

          {user && (
            <div className="pt-4 border-t border-slate-800 mt-auto">
              <button onClick={handleLogout} className="w-full flex items-center gap-2 text-slate-500 hover:text-red-400 transition-colors text-xs font-bold uppercase tracking-widest p-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl flex items-center justify-between px-6 z-30 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="p-2 text-slate-400 hover:text-indigo-400 transition-colors lg:hidden">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-800 shadow-inner">
              <button onClick={() => setViewMode('chat')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'chat' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>{t('chatMode')}</button>
              <button onClick={() => setViewMode('doc')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'doc' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>{t('docMode')}</button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={i18n.language}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
              className="bg-slate-900 text-xs border border-slate-800 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer text-slate-300"
            >
              {Object.values(Language).map(l => <option key={l} value={l}>{getLanguageName(l)}</option>)}
            </select>
          </div>
        </header>

        {showRoundWarning && (
          <div className="bg-amber-600/90 text-white text-[10px] md:text-xs py-2 px-4 flex justify-between items-center animate-in slide-in-from-top duration-300 font-bold z-20">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              {t('warning15')}
            </div>
            <button onClick={() => setShowRoundWarning(false)} className="hover:underline uppercase text-[10px]">Close</button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar relative" ref={docContainerRef}>
          {viewMode === 'chat' ? (
            <div className="max-w-3xl mx-auto p-6 space-y-6 pb-40">
              {messages.length === 0 ? (
                <div className="h-[60vh] flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 bg-indigo-600/10 rounded-[2.5rem] flex items-center justify-center mb-6 border border-indigo-500/20 shadow-2xl shadow-indigo-600/10">
                    <svg className="w-10 h-10 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                  </div>
                  <h2 className="text-2xl font-black mb-2 text-white">{t('welcomeTitle')}</h2>
                  <p className="text-slate-400 text-sm max-w-xs">{t('welcomeDesc')}</p>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                    <div className={`max-w-[85%] p-4 rounded-2xl ${msg.role === 'user' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10' : 'bg-slate-900 border border-slate-800 text-slate-300'}`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap text-start">{msg.parts[0].text}</p>
                    </div>
                  </div>
                ))
              )}
              {isGenerating && !isFinalizing && (
                <div className="flex justify-start">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">{t('generating')}</span>
                  </div>
                </div>
              )}
              {isFinalizing && (
                <div className="flex justify-start animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-gradient-to-br from-slate-900 to-slate-900/80 border border-indigo-500/30 rounded-2xl p-6 w-full max-w-md shadow-xl shadow-indigo-500/5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center border border-indigo-500/30">
                        <svg className="w-5 h-5 text-indigo-400 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm">{t('finalizing')}</p>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Deep Analysis</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full animate-pulse" style={{ width: '100%', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}></div>
                      </div>
                      <p className="text-slate-600 text-[10px] text-center font-medium">{t('generating')}</p>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="max-w-4xl mx-auto p-6 md:p-10 pb-40 text-start">
              {finalPRD ? (
                <div className="relative">
                  <MarkdownRenderer
                    content={finalPRD}
                    isUnlocked={isUnlocked}
                    onReachedEnd={() => { if (canShowPaywall) setPaywallVisible(true); }}
                  />

                  {paywallVisible && (
                    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
                      <div className="bg-slate-900/95 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl flex flex-col items-center gap-6 animate-in zoom-in-95 duration-500 max-w-md w-full text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="w-16 h-16 rounded-3xl bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-600/30">
                          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        </div>

                        <div className="w-full text-start">
                          <h3 className="text-white font-black text-xl mb-2 text-center">{t('unlockFull')}</h3>
                          <p className="text-slate-400 text-xs mb-6 text-center">想立即拿到這份包含 Stripe 變現與 Auth 系統的完整藍圖嗎？</p>

                          <div className="flex bg-slate-800 rounded-xl p-1 mb-6 border border-slate-700">
                            <button onClick={() => setPaywallTab('starter')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${paywallTab === 'starter' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>{t('starter')}</button>
                            <button onClick={() => setPaywallTab('pro')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${paywallTab === 'pro' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>{t('pro')}</button>
                            <button onClick={() => setPaywallTab('proAnnual')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all relative ${paywallTab === 'proAnnual' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>
                              {t('proAnnual')}
                              <span className="absolute -top-2 -right-1 bg-emerald-500 text-[7px] px-1 rounded-full text-white font-black leading-tight py-0.5">2M Free</span>
                            </button>
                            <button onClick={() => setPaywallTab('elite')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all relative ${paywallTab === 'elite' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>
                              {t('elite')}
                              <span className="absolute -top-2 -right-2 bg-amber-500 text-[8px] px-1 rounded-full text-white animate-bounce">🔥</span>
                            </button>
                          </div>

                          {paywallTab === 'starter' && (
                            <div className="animate-in fade-in slide-in-from-left-4 duration-300 text-center">
                              <p className="text-slate-300 text-sm mb-6">{t('starterDesc')}</p>
                              {user && user.remainingDownloads > 0 ? (
                                <button onClick={useCredit} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2">消耗 1 次剩餘額度</button>
                              ) : (
                                <button onClick={() => handleUnlock(UserTier.STARTER)} disabled={checkoutLoading} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-2">{checkoutLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}{checkoutLoading ? '處理中...' : `$${PRICING.STARTER}`}</button>
                              )}
                            </div>
                          )}

                          {paywallTab === 'pro' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 text-center">
                              <p className="text-slate-300 text-sm mb-1">{t('proDesc')}</p>
                              <p className="text-slate-500 text-xs mb-6">{t('proAnnualDesc')} → <button onClick={() => setPaywallTab('proAnnual')} className="text-emerald-400 font-bold hover:underline">{t('twoMonthsFree')}</button></p>
                              <button onClick={() => handleUnlock(UserTier.PRO)} disabled={checkoutLoading} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-2">{checkoutLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}{checkoutLoading ? '處理中...' : `$49.99 / mo`}</button>
                            </div>
                          )}

                          {paywallTab === 'proAnnual' && (
                             <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 text-center">
                               <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 mb-4">
                                 <p className="text-emerald-400 font-black text-sm">$34/mo · billed $408/yr</p>
                                 <p className="text-emerald-300/80 text-xs mt-1">{t('twoMonthsFree')} — vs $598.88/yr monthly</p>
                               </div>
                               <p className="text-slate-400 text-xs mb-6">{t('proDesc')} Same features, better value.</p>
                               <button onClick={() => handleUnlock(UserTier.PRO)} disabled={checkoutLoading} className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl shadow-xl shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2">{checkoutLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}{checkoutLoading ? '處理中...' : `$408 / yr`}</button>
                               <p className="text-slate-600 text-[10px] mt-3">Billed annually. Cancel anytime.</p>
                             </div>
                           )}

                          {paywallTab === 'elite' && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-300 text-center">
                              <p className="text-slate-300 text-sm mb-2">{t('eliteDesc')}</p>
                              <p className="text-amber-400 text-[10px] font-bold uppercase mb-6 tracking-widest">🎁 Card-Upfront · Cancel Anytime · 1 Free Unlock on Trial Start</p>
                              <button onClick={() => handleUnlock(UserTier.ELITE)} disabled={checkoutLoading} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-2">{checkoutLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}{checkoutLoading ? '處理中...' : t('trialLabel')}</button>
                              <p className="text-slate-500 text-[10px] mt-4">${PRICING.ELITE_YEARLY}/yr after trial. Cancel anytime before renewal.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {isUnlocked && (
                    <div className="flex justify-center mt-10 gap-4 animate-in fade-in slide-in-from-bottom-4">
                      <button onClick={handleDownload} className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-emerald-600/10 active:scale-95 transition-all flex items-center gap-2 border border-emerald-400/20"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>{t('download')}</button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center py-40 opacity-20">
                  <div className="w-32 h-32 rounded-full border-4 border-dashed border-slate-800 mb-6"></div>
                  <p className="font-bold text-xl uppercase tracking-widest text-slate-400">Empty Document</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-950/80 border-t border-slate-800/50 backdrop-blur-xl shrink-0 relative">
          {!user && (
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-10">
              <Turnstile 
                onVerify={(token) => { setChatTurnstileToken(token); setChatTurnstileError(false); }}
                onExpire={() => setChatTurnstileToken(null)}
                onError={() => { setChatTurnstileToken(null); setChatTurnstileError(true); }}
                resetRef={chatTurnstileResetRef}
              />
            </div>
          )}
          <div className="max-w-4xl mx-auto flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea value={input} onChange={e => setInput(e.target.value)} placeholder={isTranscribing ? t('transcribing') : t('placeholder')} disabled={isTranscribing || isListening} className="w-full bg-slate-900/80 border border-slate-700/50 rounded-2xl ltr:pl-5 ltr:pr-14 rtl:pr-5 rtl:pl-14 py-4 text-slate-200 placeholder:text-slate-500 resize-none h-[65px] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500/50 transition-all duration-200 custom-scrollbar text-start" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} />
              <button
                onClick={isListening ? stopRecording : startRecording}
                disabled={isTranscribing}
                className={`absolute ltr:right-3 rtl:left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-xl flex items-center justify-center transition-all ${isListening ? 'bg-red-600 animate-pulse text-white shadow-lg shadow-red-600/20' : 'bg-slate-800 text-slate-400 hover:text-indigo-400'}`}
              >
                {isTranscribing ? <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>}
              </button>
            </div>
            <button onClick={handleSend} disabled={isGenerating || !input.trim() || (!user && !chatTurnstileToken)} className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white h-[65px] px-8 rounded-2xl font-bold shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">{t('send')}</button>
            {messages.length >= 2 && !isFinalizing && (
              <button onClick={handleFinalize} className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white h-[65px] px-6 rounded-2xl font-bold shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">{t('finalize')}</button>
            )}
          </div>
          <div className="max-w-4xl mx-auto mt-6 flex justify-center gap-6 text-[10px] md:text-xs text-slate-500 font-medium">
            <Link href="/privacy-policy" className="hover:text-slate-300 transition-colors">Privacy Policy</Link>
            <Link href="/terms-of-service" className="hover:text-slate-300 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </main>

      <AuthModal isOpen={authModal.open} onClose={() => setAuthModal({ ...authModal, open: false })} onAuthSuccess={(u) => { setUser(u); localStorage.setItem('prd_v2_user', JSON.stringify(u)); setAuthModal({ ...authModal, open: false }); }} initialMode={authModal.mode} />
    </div>
  );
}

