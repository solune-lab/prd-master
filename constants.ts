
import { Language } from './types';

export const APP_NAME = "PRD Master";

export const PRICING = {
  STARTER: 29,
  PRO_MONTHLY: 49,
  ELITE_YEARLY: 499
};

export const LIMITS = {
  WARNING_ROUND: 15,
  SESSION_ROUNDS: 20,
  ACCOUNT_ROUNDS_FREE: 100,
  SESSIONS_PER_HOUR: 3
};

export const CHAT_SYSTEM_PROMPT = (lang: Language) => `Role: PRD Master 2026 (Ultimate Edge-Native & Monetization Architect)

Mission: Transform vague ideas into precise, "AI-Agent-Ready" PRDs optimized for the 2026 tech ecosystem.

Interaction Logic & Workflow (STRICT ADHERENCE REQUIRED):

1. **Diagnostic Inquiry (小步快跑)**: 
   - Goal: Identify missing building blocks (Logic, UI, Flow, Monetization).
   - Tone: Professional consultant in a dialogue, NOT a questionnaire.
   - **Constraint**: Ask a maximum of 2-3 core questions per response. Do not overwhelm the user with long lists.

2. **Confidence Score (進度控制)**:
   - Internally evaluate your confidence/understanding of the project (0-100%).
   - **If confidence < 80%**: Continue the diagnostic inquiry. At the end of EVERY response, you MUST append the progress status in the current language: \`[目前進度：XX% - 獲取資訊中]\`.
   - **If confidence >= 80%**: STOP asking questions immediately.

3. **Convergence Strategy (強制收斂)**:
   - **Termination Instruction**: Once information is sufficient (Confidence >= 80%), you MUST answer exactly: "資訊已收集完整。我現在對專案已有 90% 以上的掌握度，請點擊下方（或輸入『開始生成』）來獲取您的完整 PRD 預覽版。" (Translate this phrase to the detected user language if necessary).
   - **Round Limit**: If the conversation history reaches 25 turns, you must force a summary of existing info and provide the termination instruction.

4. **Technical Defaults**: Use Supabase (Auth/DB) and Stripe (Payments). Do not ask for technical preferences.

Language: Automatically adapt to the user's input language. Initial language set to: ${lang}.`;

export const FINAL_PRD_PROMPT = `# Role: PRD Master 2026 (Ultimate Edge-Native & Monetization Architect)

## 1. STRICT Technical Constraints (Edge-First)
- **Framework**: MUST use Next.js (App Router).
- **Runtime**: Every API Route and Server Action MUST declare \`export const runtime = 'edge'\`.
- **Forbidden Modules**: fs, path, crypto (Node native), buffer, process, stream, os, etc.
- **Alternatives**: Use \`jose\` for Auth, \`bcryptjs\` for hashing, native \`fetch()\`, and \`Stripe.createFetchHttpClient()\`.

## 2. Mandatory Output Structure

### [公開預覽區：商業與架構設計]
1. **Title**: # PRD: [專案名稱]
2. **Global Context**: 
   - Tech Stack: Next.js (Edge), Supabase (Auth/DB), Stripe, Tailwind.
   - **Directory Tree**: 輸出詳細的專案目錄結構樹 (app/, components/, lib/ 等)。
3. **User Flow (Mermaid)**: 
   - **必須輸出 Mermaid 流程圖**。展示用戶從進入到完成付費訂閱的轉化路徑。
4. **Monetization & Feature Specs**:
   - 建議 2-3 種具體定價策略 (如月費 $9.9 或按次計費)。
   - 分析如何利用 Stripe 實作收費與權限控管。
5. **系統提示與斷點**:
   - 輸出文字：「由於技術規格包含 Stripe Webhook、Supabase RLS 與完整的變現原始碼，請解鎖完整版 PRD 以獲取 Agent-Ready 代碼。」
   - **關鍵標記**：--- [PREVIEW_END_MARKER] ---

### [付費解鎖區：技術實作代碼]
6. **Database Schema (SQL)**: 完整的 Supabase SQL 與 RLS 政策 (包含 device_fingerprint 欄位)。
7. **Implementation Logic**: 具備變現邏輯的核心 Server Actions 代碼。
8. **Monetization Implementation**: 完整的 Stripe Webhook 與 Checkout Session 代碼。
9. **Anti-Abuse System**: 實作設備指紋識別與一次性信箱過濾邏輯。

## 3. Format Constraints
- **Language**: Automatically adapt to the user's input language.
- **NO Markdown Wrapper**: NEVER wrap the entire response in a markdown code block (e.g., \`\`\`markdown). Start directly with "# PRD:".
- **Tone**: Professional Senior Architect.`;

export const TRANSLATIONS: Partial<Record<Language, any>> = {
  [Language.EN]: {
    history: "History",
    noHistory: "No PRDs yet.",
    placeholder: "Type or record your idea...",
    send: "Send",
    finalize: "Generate PRD",
    chatMode: "Architect Chat",
    docMode: "PRD Preview",
    generating: "Analyzing...",
    finalizing: "Architecting PRD...",
    transcribing: "Transcribing...",
    download: "Download .md",
    welcomeTitle: "PRD Master",
    welcomeDesc: "Edge-Native & Monetization Optimized Architecture.",
    error: "Service error. Please try again.",
    errorTimeout: "Request timed out. Please try again.",
    errorNetwork: "Network error. Please check your connection.",
    errorTranscribe: "Voice transcription failed. Please try again.",
    errorMicrophone: "Unable to access microphone.",
    voiceStart: "Recording...",
    voiceStop: "Stop",
    newChat: "New Architecture",
    login: "Login",
    register: "Register",
    loginToStart: "Please login to start",
    loginGoogle: "Continue with Google",
    statusGuest: "Guest",
    unlockFull: "Unlock this Blueprint",
    limitReached: "Session limit reached. Please unlock to continue.",
    accountLimitReached: "Account limit reached. Please upgrade to Pro.",
    tierFree: "Standard User",
    tierPro: "Elite Architect",
    referralTitle: "Referral Rewards",
    referralDesc: "Invite a friend and both get 1 free unlock.",
    warning15: "Depth analysis reached. 5 rounds left.",
    inviteCode: "Your Invite Code",
    inviteLink: "Your Invite Link",
    applyCode: "Apply Code",
    copyCode: "Copy",
    copyLink: "Copy Link",
    starter: "Starter",
    pro: "Pro",
    elite: "Elite",
    mostPopular: "Most Popular 🔥",
    starterDesc: "Unlock this document for $29.",
    proDesc: "12 downloads/mo for $49/mo.",
    eliteDesc: "144 downloads/yr. 14-day Free Trial! ($499/yr)",
    trialLabel: "Start 14-Day Free Trial",
    creditsLabel: "Credits",
    roundsLabel: "Rounds"
  },
  [Language.ZH_TW]: {
    history: "歷史紀錄",
    noHistory: "尚未生成內容。",
    placeholder: "輸入或用語音描述您的構思...",
    send: "發送",
    finalize: "生成 PRD",
    chatMode: "診斷引導",
    docMode: "藍圖預覽",
    generating: "深度分析中...",
    finalizing: "正在構建 Edge-Native PRD...",
    transcribing: "語音辨識中...",
    download: "下載 Markdown",
    welcomeTitle: "PRD Master",
    welcomeDesc: "專為邊緣運算與商務轉化設計的產品架構工具。",
    error: "服務發生錯誤，請重試。",
    errorTimeout: "請求逾時，請稍後重試。",
    errorNetwork: "網路連線異常，請檢查網路後重試。",
    errorTranscribe: "語音辨識失敗，請重新錄音。",
    errorMicrophone: "無法存取麥克風。",
    voiceStart: "正在錄音...",
    voiceStop: "停止",
    newChat: "開啟新專案",
    login: "登入",
    register: "註冊",
    loginToStart: "請登入後開始使用",
    loginGoogle: "使用 Google 帳號登入",
    statusGuest: "訪客模式",
    unlockFull: "立即解鎖此份藍圖",
    limitReached: "對話額度已滿，請解鎖全文。",
    accountLimitReached: "帳號配額已滿，請升級專業版。",
    tierFree: "標準用戶",
    tierPro: "精英架構師",
    referralTitle: "邀請獎勵",
    referralDesc: "邀請好友註冊，雙方各獲得 1 次免費解鎖。",
    warning15: "已進入深度架構分析階段。剩餘 5 輪免費額度。",
    inviteCode: "您的邀請碼",
    inviteLink: "專屬邀請連結",
    applyCode: "輸入邀請碼",
    copyCode: "複製代碼",
    copyLink: "複製連結",
    starter: "Starter (單次購買)",
    pro: "Pro (月費訂閱)",
    elite: "Elite (年費訂閱)",
    mostPopular: "最受歡迎方案 🔥",
    starterDesc: "立即解鎖此份 PRD 下載權限 ($29)",
    proDesc: "高產出獨立開發者首選。每月 12 次下載額度 ($49/月)",
    eliteDesc: "最強創業工具包。每年 144 次下載。14 天免費試用！($499/年)",
    trialLabel: "啟動 14 天免費試用 ($0)",
    creditsLabel: "解鎖額度",
    roundsLabel: "剩餘對話輪數"
  }
};
