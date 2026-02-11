
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PRDService } from './services/geminiService';
import { PRDMode, ChatMessage, HistoryItem, Language, UserTier, UserProfile } from './types';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { LIMITS, PRICING } from './constants';

// --- Auth Components ---
const AuthModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  onAuthSuccess: (user: UserProfile) => void;
  initialMode: 'login' | 'register'
}> = ({ isOpen, onClose, onAuthSuccess, initialMode }) => {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      completeAuth(email);
    }, 800);
  };

  const handleGoogleLogin = () => {
    setIsLoading(true);
    setTimeout(() => {
      completeAuth("google.user@example.com", "Google Cloud Architect");
    }, 1200);
  };

  const completeAuth = (userEmail: string, userName?: string) => {
    const fingerprint = localStorage.getItem('prd_device_fingerprint') || Math.random().toString(36).substring(2);
    localStorage.setItem('prd_device_fingerprint', fingerprint);

    const mockUser: UserProfile = {
      id: Math.random().toString(36).substring(7),
      name: userName || userEmail.split('@')[0] || 'User',
      email: userEmail,
      picture: null,
      tier: UserTier.FREE,
      totalRounds: 0,
      remainingDownloads: (inviteCode) ? 1 : 0, // 只要輸入邀請碼就送 1 次
      invitationCode: Math.random().toString(36).substring(2, 10).toUpperCase(),
      balanceCredits: 0,
      deviceFingerprint: fingerprint
    };
    onAuthSuccess(mockUser);
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl relative animate-in zoom-in-95 duration-300">
        <button onClick={onClose} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors text-xl">✕</button>
        
        <div className="mb-8">
          <h2 className="text-2xl font-black mb-1 text-white">{mode === 'login' ? t('login') : t('register')}</h2>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">PRD Master Architecture</p>
        </div>

        <button 
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold py-3.5 rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-3 mb-6"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {t('loginGoogle')}
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
          <div className="relative flex justify-center text-[10px] uppercase font-black text-slate-600 tracking-widest"><span className="bg-slate-900 px-3">Or continue with email</span></div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4 text-start">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">Email</label>
            <input 
              type="email" required 
              value={email} onChange={e => setEmail(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm text-white"
              placeholder="name@example.com"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">{t('inviteCode')} (Optional)</label>
            <input 
              type="text" 
              value={inviteCode} onChange={e => setInviteCode(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm text-white"
              placeholder="ABC12345"
            />
            <p className="text-[10px] text-emerald-500/80 mt-2 px-1 font-medium leading-relaxed">{t('referralDesc')}</p>
          </div>
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4"
          >
            {isLoading && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
            {mode === 'login' ? t('login') : t('register')}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-slate-500">
          {mode === 'login' ? 'Not registered?' : 'Already have an account?'}
          <button 
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')} 
            className="text-indigo-400 font-bold ml-1 rtl:mr-1 hover:underline transition-all"
          >
            {mode === 'login' ? t('register') : t('login')}
          </button>
        </p>
      </div>
    </div>
  );
};

// --- Main App ---
const App: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [viewMode, setViewMode] = useState<'chat' | 'doc'>('chat');
  const [finalPRD, setFinalPRD] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [sessionRoundCount, setSessionRoundCount] = useState(0);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [paywallTab, setPaywallTab] = useState<'starter' | 'pro' | 'elite'>('elite');
  const [showRoundWarning, setShowRoundWarning] = useState(false);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [authModal, setAuthModal] = useState<{ open: boolean; mode: 'login' | 'register' }>({ open: false, mode: 'login' });

  const prdService = useMemo(() => new PRDService(), []);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const docContainerRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const savedUser = localStorage.getItem('prd_v2_user');
    if (savedUser) setUser(JSON.parse(savedUser));
    
    if (!localStorage.getItem('prd_device_fingerprint')) {
      localStorage.setItem('prd_device_fingerprint', Math.random().toString(36).substring(2));
    }

    document.documentElement.dir = i18n.language === Language.AR ? 'rtl' : 'ltr';
  }, [i18n.language]);

  useEffect(() => {
    const container = docContainerRef.current;
    if (!container || isUnlocked || !finalPRD || viewMode !== 'doc') return;

    const handleScroll = () => {
      if (container.scrollTop > 120) {
        setShowPaywallModal(true);
      } else {
        setShowPaywallModal(false);
      }
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isUnlocked, finalPRD, viewMode]);

  const handleAuthSuccess = (userData: UserProfile) => {
    setUser(userData);
    localStorage.setItem('prd_v2_user', JSON.stringify(userData));
    setAuthModal({ ...authModal, open: false });
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('prd_v2_user');
    setIsUnlocked(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setIsTranscribing(true);
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1];
          const transcription = await prdService.transcribeAudio(base64, 'audio/webm', i18n.language as Language);
          if (transcription) setInput(prev => prev + transcription);
          setIsTranscribing(false);
        };
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.start();
      setIsListening(true);
    } catch (err) { alert("無法存取麥克風"); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return;

    if (!user || (user.tier === UserTier.FREE && !isUnlocked)) {
      if (sessionRoundCount >= LIMITS.SESSION_ROUNDS) {
        setShowPaywallModal(true);
        setViewMode('chat');
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
      const updatedUser = { ...user, totalRounds: user.totalRounds + 1 };
      setUser(updatedUser);
      localStorage.setItem('prd_v2_user', JSON.stringify(updatedUser));
    }

    try {
      const responseText = await prdService.sendMessage(userMsg.parts[0].text, i18n.language as Language, [...messages, userMsg]);
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: responseText }] }]);
    } catch (error) { alert(t('error')); }
    finally { setIsGenerating(false); }
  };

  const handleFinalize = async () => {
    if (messages.length < 2 || isGenerating) return;
    setIsGenerating(true);
    try {
      const prd = await prdService.generateFinalPRD(messages, i18n.language as Language);
      setFinalPRD(prd);
      setViewMode('doc');
      
      const unlocked = (user?.tier !== UserTier.FREE && user?.tier !== undefined);
      setIsUnlocked(unlocked); 
      
      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        title: messages[0]?.parts[0]?.text.substring(0, 30) || 'New PRD',
        timestamp: Date.now(),
        content: prd,
        mode: PRDMode.PRO,
        language: i18n.language as Language,
        isUnlocked: unlocked
      };
      setHistory(prev => [newHistoryItem, ...prev]);
    } catch (error) { alert(t('error')); }
    finally { setIsGenerating(false); }
  };

  const handleDownload = () => {
    if (!finalPRD || !isUnlocked) return;
    const blob = new Blob([finalPRD], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PRD_${Date.now()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUnlock = (type: UserTier | 'single') => {
    if (!user) {
      setAuthModal({ open: true, mode: 'login' });
      return;
    }
    
    let newTier = user.tier;
    let downloads = user.remainingDownloads;
    let isTrialActive = user.isTrialActive;
    let trialEndDate = user.trialEndDate;

    if (type === 'single') {
      if (downloads > 0) downloads -= 1;
      setIsUnlocked(true);
    } else if (type === UserTier.STARTER) {
      downloads += 1;
      setIsUnlocked(true);
    } else if (type === UserTier.PRO) {
      newTier = UserTier.PRO;
      downloads += 12;
      setIsUnlocked(true);
    } else if (type === UserTier.ELITE) {
      newTier = UserTier.ELITE;
      downloads += 145; // 144 + 1 bonus
      isTrialActive = true;
      trialEndDate = Date.now() + 14 * 24 * 60 * 60 * 1000;
      setIsUnlocked(true);
    }
    
    const updatedUser: UserProfile = { 
      ...user, 
      tier: newTier, 
      remainingDownloads: downloads,
      isTrialActive,
      trialEndDate
    };
    setUser(updatedUser);
    localStorage.setItem('prd_v2_user', JSON.stringify(updatedUser));
    setShowPaywallModal(false);
  };

  const useCredit = () => {
    if (user && user.remainingDownloads > 0) {
      handleUnlock('single');
    } else {
      setPaywallTab('starter');
      setShowPaywallModal(true);
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

  return (
    <div className="h-[100dvh] w-screen flex bg-slate-950 text-slate-200 overflow-hidden relative">
      
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Persistent / Toggleable Sidebar */}
      <aside className={`
        fixed lg:relative inset-y-0 ltr:left-0 rtl:right-0 z-50 w-80 bg-slate-900 border-x border-slate-800 flex flex-col h-full overflow-hidden transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : 'ltr:-translate-x-full rtl:translate-x-full lg:hidden'}
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
            <button onClick={() => { setMessages([]); setFinalPRD(null); setViewMode('chat'); setSessionRoundCount(0); setIsUnlocked(false); setShowRoundWarning(false); if (window.innerWidth < 1024) setSidebarOpen(false); }} className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/10">
              {t('newChat')}
            </button>
            
            {user && (
              <div className="bg-emerald-600/10 p-4 rounded-2xl border border-emerald-500/20 text-start space-y-4">
                 <div>
                   <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-2 flex justify-between">
                     <span>{t('inviteCode')}</span>
                     <button onClick={() => { navigator.clipboard.writeText(user.invitationCode); }} className="text-[8px] hover:text-white transition-colors uppercase">{t('copyCode')}</button>
                   </p>
                   <div className="bg-slate-800 p-2.5 rounded-lg text-xs font-mono text-emerald-400 border border-slate-700 text-center tracking-widest font-bold">{user.invitationCode}</div>
                 </div>

                 <div>
                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-2 flex justify-between">
                      <span>{t('inviteLink')}</span>
                      <button onClick={() => { 
                        const link = `${window.location.origin}/?ref=${user.invitationCode}`;
                        navigator.clipboard.writeText(link); 
                      }} className="text-[8px] hover:text-white transition-colors uppercase">{t('copyLink')}</button>
                    </p>
                    <div className="bg-slate-800 p-2.5 rounded-lg text-[9px] font-mono text-emerald-400/80 border border-slate-700 truncate tracking-tight">{window.location.origin}/?ref={user.invitationCode}</div>
                 </div>

                 <p className="text-[10px] text-slate-500 leading-relaxed italic">{t('referralDesc')}</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h2 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-4 px-2 text-start">{t('history')}</h2>
            {history.map(item => (
              <button key={item.id} onClick={() => { setFinalPRD(item.content); setViewMode('chat'); setIsUnlocked(item.isUnlocked || (user?.tier !== UserTier.FREE && user?.tier !== undefined)); if (window.innerWidth < 1024) setSidebarOpen(false); setTimeout(() => setViewMode('doc'), 10); }} className="w-full text-left rtl:text-right p-3 rounded-xl hover:bg-slate-800 text-sm truncate transition-all border border-transparent hover:border-slate-700">
                <span className="text-slate-400">{item.title}</span>
                {(item.isUnlocked || isUnlocked) && <span className="mx-2 text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded uppercase font-black">Unlocked</span>}
              </button>
            ))}
            {history.length === 0 && <p className="text-xs text-slate-600 px-2 text-start">{t('noHistory')}</p>}
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
            <button onClick={() => setSidebarOpen(true)} className="p-2 text-slate-400 hover:text-indigo-400 transition-colors">
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
              className="bg-slate-900 text-xs border border-slate-800 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
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
              {isGenerating && (
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
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="max-w-4xl mx-auto p-6 md:p-10 pb-40 text-start">
              {finalPRD ? (
                <div className="relative">
                  <MarkdownRenderer content={finalPRD} isUnlocked={isUnlocked} />
                  
                  {!isUnlocked && (
                    <div className={`absolute inset-0 flex items-start justify-center pt-[20vh] pointer-events-none transition-all duration-700 ${showPaywallModal ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                       <div className="sticky top-[15vh] bg-slate-900/90 glass-blur p-8 rounded-[2.5rem] border border-white/10 shadow-2xl flex flex-col items-center gap-6 animate-in zoom-in-95 duration-500 max-w-md w-full text-center pointer-events-auto">
                          <div className="w-16 h-16 rounded-3xl bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-600/30">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                          </div>
                          
                          <div className="w-full text-start">
                            <h3 className="text-white font-black text-xl mb-2 text-center">{t('unlockFull')}</h3>
                            <p className="text-slate-400 text-xs mb-6 text-center">想立即拿到這份包含 Stripe 變現與 Auth 系統的完整藍圖嗎？</p>

                            <div className="flex bg-slate-800 rounded-xl p-1 mb-6 border border-slate-700">
                              <button onClick={() => setPaywallTab('starter')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${paywallTab === 'starter' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>{t('starter')}</button>
                              <button onClick={() => setPaywallTab('pro')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${paywallTab === 'pro' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>{t('pro')}</button>
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
                                  <button onClick={() => handleUnlock(UserTier.STARTER)} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">${PRICING.STARTER}</button>
                                )}
                              </div>
                            )}

                            {paywallTab === 'pro' && (
                              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 text-center">
                                <p className="text-slate-300 text-sm mb-6">{t('proDesc')}</p>
                                <button onClick={() => handleUnlock(UserTier.PRO)} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">${PRICING.PRO_MONTHLY} / mo</button>
                              </div>
                            )}

                            {paywallTab === 'elite' && (
                              <div className="animate-in fade-in slide-in-from-right-4 duration-300 text-center">
                                <p className="text-slate-300 text-sm mb-2">{t('eliteDesc')}</p>
                                <p className="text-emerald-400 text-[10px] font-bold uppercase mb-6 tracking-widest">🎁 啟動試用立即贈送 1 次完整解鎖額度</p>
                                <button onClick={() => handleUnlock(UserTier.ELITE)} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">{t('trialLabel')}</button>
                                <p className="text-slate-500 text-[10px] mt-4">試用結束後將以 ${PRICING.ELITE_YEARLY}/年 續約，可隨時取消。</p>
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

        <div className="p-4 md:p-6 bg-slate-950/95 border-t border-slate-800 shrink-0 z-40 relative">
          <div className="max-w-4xl mx-auto relative group">
            
            {!user && (
              <div className="absolute inset-0 z-50 rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-white/5 flex items-center justify-between px-10 gap-4 animate-in fade-in duration-500 shadow-[0_0_50px_-12px_rgba(79,70,229,0.3)]">
                 <div className="flex flex-col text-start">
                    <p className="text-white font-black text-lg tracking-tight leading-none mb-2">{t('loginToStart')}</p>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">Architectural grade product clarity</p>
                 </div>
                 <div className="flex gap-3">
                    <button onClick={() => setAuthModal({ open: true, mode: 'login' })} className="bg-slate-800/80 hover:bg-slate-700 text-white px-8 py-3 rounded-xl border border-slate-700/50 text-xs font-black transition-all active:scale-95 uppercase tracking-widest">{t('login')}</button>
                    <button onClick={() => setAuthModal({ open: true, mode: 'register' })} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl text-xs font-black shadow-xl shadow-indigo-600/30 transition-all active:scale-95 uppercase tracking-widest">{t('register')}</button>
                 </div>
              </div>
            )}

            <div className="flex gap-3 items-end">
              <div className="flex-1 relative">
                <textarea 
                  value={input} 
                  onChange={(e) => setInput(e.target.value)} 
                  placeholder={isTranscribing ? t('transcribing') : t('placeholder')} 
                  disabled={isTranscribing || isListening}
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl ltr:pl-4 ltr:pr-14 rtl:pr-4 rtl:pl-14 py-4 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 resize-none h-[65px] transition-all scrollbar-none text-start"
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} 
                />
                <button 
                  onClick={isListening ? stopRecording : startRecording}
                  disabled={isTranscribing}
                  className={`absolute ltr:right-3 rtl:left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-xl flex items-center justify-center transition-all ${isListening ? 'bg-red-600 animate-pulse text-white shadow-lg shadow-red-600/20' : 'bg-slate-800 text-slate-400 hover:text-indigo-400'}`}
                >
                  {isTranscribing ? <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>}
                </button>
              </div>
              <button onClick={handleSend} disabled={isGenerating || !input.trim()} className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-900 disabled:text-slate-700 text-white h-[65px] px-8 rounded-2xl font-bold transition-all shadow-lg min-w-[100px] border border-indigo-400/20 active:scale-95">{t('send')}</button>
            </div>

            {messages.length >= 2 && viewMode === 'chat' && !isGenerating && (
              <div className="mt-4 flex justify-between items-center animate-in fade-in slide-in-from-bottom-1 px-1">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                  {t('roundsLabel')}: {sessionRoundCount} / {LIMITS.SESSION_ROUNDS}
                </span>
                <button onClick={handleFinalize} className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-2.5 rounded-full text-[10px] font-black shadow-lg shadow-emerald-600/10 active:scale-95 transition-all uppercase tracking-widest border border-emerald-400/20">
                  {t('finalize')}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      <AuthModal 
        key={authModal.mode}
        isOpen={authModal.open} 
        onClose={() => setAuthModal({ ...authModal, open: false })} 
        onAuthSuccess={handleAuthSuccess}
        initialMode={authModal.mode}
      />
    </div>
  );
};

export default App;
