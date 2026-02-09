
'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ClientPRDService } from '@/services/clientService';
import { PRDMode, ChatMessage, HistoryItem, Language, UserTier, UserProfile } from '@/types';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { LIMITS, PRICING } from '@/constants';
import '@/i18n'; // 保持原本的 i18n 初始化邏輯

// AuthModal 組件保持不變，但確保使用客戶端狀態
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

  useEffect(() => { if (isOpen) setMode(initialMode); }, [isOpen, initialMode]);
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      const fingerprint = localStorage.getItem('prd_device_fingerprint') || Math.random().toString(36).substring(2);
      const mockUser: UserProfile = {
        id: Math.random().toString(36).substring(7),
        name: email.split('@')[0],
        email: email,
        picture: null,
        tier: UserTier.FREE,
        totalRounds: 0,
        remainingDownloads: inviteCode ? 1 : 0,
        invitationCode: Math.random().toString(36).substring(2, 10).toUpperCase(),
        balanceCredits: 0,
        deviceFingerprint: fingerprint
      };
      onAuthSuccess(mockUser);
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl relative">
        <button onClick={onClose} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors text-xl">✕</button>
        <h2 className="text-2xl font-black mb-1 text-white">{mode === 'login' ? t('login') : t('register')}</h2>
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-8">PRD Master Architecture</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">{t('inviteCode')} (Optional)</label>
            <input type="text" value={inviteCode} onChange={e => setInviteCode(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white" />
          </div>
          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg mt-4">{mode === 'login' ? t('login') : t('register')}</button>
        </form>
      </div>
    </div>
  );
};

export default function Page() {
  const { t, i18n } = useTranslation();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<'chat' | 'doc'>('chat');
  const [finalPRD, setFinalPRD] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authModal, setAuthModal] = useState<{ open: boolean; mode: 'login' | 'register' }>({ open: false, mode: 'login' });

  const prdService = useMemo(() => new ClientPRDService(), []);

  useEffect(() => {
    const savedUser = localStorage.getItem('prd_v2_user');
    if (savedUser) setUser(JSON.parse(savedUser));
    setSidebarOpen(window.innerWidth >= 1024);
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return;
    const userMsg: ChatMessage = { role: 'user', parts: [{ text: input.trim() }] };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsGenerating(true);
    try {
      const responseText = await prdService.sendMessage(userMsg.parts[0].text, i18n.language as Language, [...messages, userMsg]);
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: responseText }] }]);
    } catch (error) { console.error(error); }
    finally { setIsGenerating(false); }
  };

  const handleFinalize = async () => {
    setIsGenerating(true);
    try {
      const prd = await prdService.generateFinalPRD(messages, i18n.language as Language);
      setFinalPRD(prd);
      setViewMode('doc');
    } catch (error) { console.error(error); }
    finally { setIsGenerating(false); }
  };

  return (
    <div className="h-[100dvh] w-screen flex bg-slate-950 text-slate-200 overflow-hidden relative">
      <aside className={`fixed lg:relative inset-y-0 z-50 w-80 bg-slate-900 border-x border-slate-800 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:hidden'}`}>
        <div className="p-6 border-b border-slate-800 shrink-0 font-black text-indigo-400">PRD Master</div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {!user ? (
            <button onClick={() => setAuthModal({ open: true, mode: 'login' })} className="w-full bg-indigo-600/20 text-indigo-400 py-3 rounded-xl border border-indigo-500/30 text-xs font-bold">登入後開始</button>
          ) : (
            <div className="bg-emerald-600/10 p-4 rounded-2xl border border-emerald-500/20 space-y-4">
              <div>
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-2 flex justify-between">
                  <span>邀請碼</span>
                  <button onClick={() => navigator.clipboard.writeText(user.invitationCode)} className="text-[8px] uppercase">複製</button>
                </p>
                <div className="bg-slate-800 p-2.5 rounded-lg text-xs font-mono text-emerald-400 text-center font-bold">{user.invitationCode}</div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-2 flex justify-between">
                  <span>邀請連結</span>
                  <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/?ref=${user.invitationCode}`)} className="text-[8px] uppercase">複製連結</button>
                </p>
                <div className="bg-slate-800 p-2.5 rounded-lg text-[9px] font-mono text-emerald-400/80 truncate">{window.location.origin}/?ref={user.invitationCode}</div>
              </div>
            </div>
          )}
          <button onClick={() => { setMessages([]); setFinalPRD(null); setViewMode('chat'); }} className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-bold shadow-lg">開啟新專案</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl flex items-center justify-between px-6 z-30">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-slate-400"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg></button>
          <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-800">
            <button onClick={() => setViewMode('chat')} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${viewMode === 'chat' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>診斷模式</button>
            <button onClick={() => setViewMode('doc')} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${viewMode === 'doc' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>藍圖預覽</button>
          </div>
          <div className="w-10"></div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {viewMode === 'chat' ? (
            <div className="max-w-3xl mx-auto p-6 space-y-6 pb-40">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-4 rounded-2xl ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-300'}`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.parts[0].text}</p>
                  </div>
                </div>
              ))}
              {isGenerating && <div className="text-xs text-slate-500 font-bold uppercase tracking-widest animate-pulse">深度分析中...</div>}
            </div>
          ) : (
            <div className="max-w-4xl mx-auto p-6 md:p-10 pb-40">
              {finalPRD && <MarkdownRenderer content={finalPRD} isUnlocked={true} />}
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-950/95 border-t border-slate-800">
          <div className="max-w-4xl mx-auto flex gap-3 items-end">
            <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="描述您的構思..." className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-4 text-slate-200 resize-none h-[65px] focus:ring-2 focus:ring-indigo-500" />
            <button onClick={handleSend} disabled={isGenerating || !input.trim()} className="bg-indigo-600 text-white h-[65px] px-8 rounded-2xl font-bold shadow-lg">發送</button>
            {messages.length >= 2 && !finalPRD && (
              <button onClick={handleFinalize} className="bg-emerald-600 text-white h-[65px] px-6 rounded-2xl font-bold">生成 PRD</button>
            )}
          </div>
        </div>
      </main>

      <AuthModal isOpen={authModal.open} onClose={() => setAuthModal({ ...authModal, open: false })} onAuthSuccess={(u) => { setUser(u); localStorage.setItem('prd_v2_user', JSON.stringify(u)); setAuthModal({ ...authModal, open: false }); }} initialMode={authModal.mode} />
    </div>
  );
}
