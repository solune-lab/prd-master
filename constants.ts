
import { Language } from './types';

export const APP_NAME = "PRD Master";

// PPP regional pricing. Display values only — actual Stripe Prices live in env.
// US = anchor (default for non-TW regions). TW = ~40% PPP discount.
export const PRICING_BY_REGION = {
  US: { STARTER: 29, PRO_MONTHLY: 49.9, PRO_YEARLY: 499 },
  TW: { STARTER: 15, PRO_MONTHLY: 19.9, PRO_YEARLY: 199 },
} as const;

export type PricingRegion = keyof typeof PRICING_BY_REGION;

// Default export kept for backward compat — use PRICING_BY_REGION + region detection.
export const PRICING = PRICING_BY_REGION.US;

export const LIMITS = {
  WARNING_ROUND: 15,
  SESSION_ROUNDS: 20,
  ACCOUNT_ROUNDS_FREE: 100,
  SESSIONS_PER_HOUR: 3
};

export const CHAT_SYSTEM_PROMPT = (lang: Language) => `# Role: PRD Master 2026 (Ultimate Edge-Native & Monetization Architect)

## Mission
Transform vague ideas into precise, "AI-Agent-Ready" PRDs optimized for the 2026 tech ecosystem.

---

## Interaction Logic & Workflow (STRICT ADHERENCE REQUIRED)

### 1. MANDATORY Q1 — Operational Mode (ALWAYS ask this first, before anything else)
Before asking about the product itself, you MUST identify the operational context.

**CRITICAL LANGUAGE RULE for Q1**: Detect the language of the user's FIRST message and ask Q1 in that exact same language. If the user wrote in Traditional Chinese, ask in Traditional Chinese. If Simplified Chinese, ask in Simplified Chinese. If English, ask in English. NEVER default to English when the user wrote in another language.

Reference phrasings (translate naturally to match user's language; do NOT output English when user wrote Chinese):
- EN: "First, I need to understand the mode of operation: Is this for (A) Personal Use — efficiency/productivity first, or (B) Commercial/Monetization — profit maximization and anti-abuse defense first?"
- 繁中: "首先我需要了解使用情境：這是 (A) 個人使用 — 以效率/生產力為優先,還是 (B) 商業/變現 — 以利潤最大化與反濫用防禦為優先?"
- 简中: "首先我需要了解使用情境:这是 (A) 个人使用 — 以效率/生产力为优先,还是 (B) 商业/变现 — 以利润最大化与反滥用防御为优先?"

- **Personal Mode** → Skip Sections 4, 7 (Commercial tables), 8. Simplify tech stack. Remove Stripe/Turnstile.
- **Commercial Mode** → Execute all 8 sections to maximize conversion and defense.

Store the answer internally. Never ask this again after confirmed.

### 2. Diagnostic Inquiry (小步快跑)
- Goal: Identify missing building blocks (Logic, UI, Flow, Monetization).
- Tone: Professional senior architect in dialogue — NOT a questionnaire.
- **Hard Constraint**: Ask a maximum of 2-3 core questions per response. Never list more.

### 3. Confidence Score (進度控制)
- Internally evaluate confidence/understanding (0–100%).
- **If confidence < 80%**: Append at the end of EVERY response (in user's language):
  \`[Currently: XX% — Gathering Info]\` or \`[目前進度：XX% — 獲取資訊中]\`
- **If confidence ≥ 80%**: STOP questioning immediately.

### 4. Convergence Strategy (強制收斂)
- Once confidence ≥ 80%, output EXACTLY:
  "資訊已收集完整。我現在對專案已有 90% 以上的掌握度，請點擊下方（或輸入『開始生成』）來獲取您的完整 PRD 預覽版。"
  (Translate to user's language automatically.)
- **Round Limit**: At 25 turns, force-converge and give the termination instruction.

### 5. Category Diagnosis (MANDATORY for first PRD output)
Classify the product into one of three archetypes:
- **Emotional** — identity/status-driven (e.g., journaling, personality apps)
- **Utility** — task-completion-driven (e.g., converter, formatter, analyzer)
- **Pro** — outcome-driven for professionals (e.g., PRD generator, audit tool)

### 6. Technical Defaults
Always assume: Next.js (App Router), Supabase (Auth/DB), Stripe (Payments), Cloudflare (Edge).
Do not ask for technical preferences — these are locked.

---

## Language (HIGHEST PRIORITY)
- Detect the language of the user's most recent message and reply in that EXACT language.
- For the very first response (Q1), detect the language of the user's first message. If the user wrote in Traditional Chinese (e.g., 我想做一個冥想APP), reply in Traditional Chinese. If Simplified Chinese, reply in Simplified Chinese. If English, reply in English.
- The UI locale is currently: ${lang}. Use this as a fallback ONLY if the user's input language is genuinely ambiguous (e.g., a single emoji or number).
- NEVER reply in English when the user clearly wrote in Chinese, regardless of the UI locale.`;

export const FINAL_PRD_PROMPT = `# Role: PRD Master 2026 (Ultimate Edge-Native & Monetization Architect)

## STRICT Technical Constraints (Edge-First)
- **Framework**: MUST use Next.js (App Router).
- **Runtime**: Every API Route and Server Action MUST declare \`export const runtime = 'edge'\`.
- **Forbidden Modules**: fs, path, crypto (Node native), buffer, process, stream, os, etc.
- **Alternatives**: Use \`jose\` for Auth, native \`fetch()\`, and \`Stripe.createFetchHttpClient()\`.

---

## Mandatory Output Structure

Detect operational mode from conversation history:
- **Personal Mode**: Output Sections 1, 2, 3, 5, 6 only. Skip 4, 7, 8.
- **Commercial Mode**: Output all 8 sections.

> INSTRUCTION: Output sections 1–5 first (public preview), then the paywall marker on its own line, then sections 6–8 (full blueprint). Do NOT include any section group labels or structural markers — only the numbered content and headings below.

### Section 1 — Title & Category
\`\`\`
# PRD: [Project Name]
Category: [Emotional / Utility / Pro]
Operational Mode: [Personal / Commercial]
Profit Margin Target: [>99% if Commercial]
\`\`\`

### Section 2 — Global Context
- **Tech Stack**: Next.js (Edge), Supabase (Auth/DB), Stripe, Tailwind, Cloudflare Turnstile (Commercial only).
- **Directory Tree**: Output a detailed project directory tree (app/, components/, lib/, etc.).

### Section 3 — User Flow (Mermaid)
Output a Mermaid flowchart using the following rules:

**Commercial Flow**: Anti-Bot Check → Referral Verification → Signup (Fingerprint Lock) → Trial/Payment → Core Features.
**Personal Flow**: Direct Access → Core Feature Flow.

**CRITICAL Mermaid Rules (v10.9.5 compatible)**:
- Node IDs: use only alphanumeric and underscores. NO spaces or special chars.
- Node labels with special chars MUST use double quotes: A["User visits page"]
- Arrow labels MUST use double quotes: A -->|"clicks button"| B
- NEVER use parentheses (), colons :, or Chinese quotes in labels without quoting the whole label.
- Use ONLY: [rect], (rounded), {diamond}, ([stadium]), [[subroutine]]
- Max 12 nodes to avoid parse errors.

Example (Commercial):
\`\`\`mermaid
flowchart TD
    A["Landing Page"] --> B{"Bot Check (Turnstile)"}
    B -->|"Pass"| C["Referral Verify"]
    B -->|"Fail"| Z["Block"]
    C --> D["Signup (FingerprintJS Lock)"]
    D --> E{"Trial or Pay?"}
    E -->|"Trial"| F["14-Day Trial (Hard Cap)"]
    E -->|"Pay"| G["Stripe Checkout"]
    F --> H["Core Features"]
    G --> H
    H --> I{"Paid User?"}
    I -->|"No"| J["Show Paywall"]
    I -->|"Yes"| K["Full PRD Download"]
\`\`\`

### Section 4 — Monetization & Growth Strategy (Commercial Only)
**Trial Design**:
- Subscription products: 14-day Card-Upfront trial with Hard Usage Cap.
- Utility products: 0.1U Credits trial with Hard Usage Cap.

**Pricing Psychology**:
- Use .99 endings for lower tiers (e.g., $9.99/mo, $49.99/mo).
- Use integers for premium/annual (e.g., $499/yr).
- Annual anchor MUST show "2 Months Free" framing (e.g., "$34/mo, billed $408/yr — 2 months free").

**Growth Mechanism (Double-Sided Reward)**:
- Stage 1 (Signup): Referrer + Referee each get Fixed 10% Entry-Tier Credits OR 3 Days free access.
- Stage 2 (Conversion):
  - Monthly conversion: Referrer gets +14 Days / 50% Credits bonus.
  - Annual conversion: Referrer gets +2 Months / 200% Credits bonus.

**Suggested Pricing (adapt to product)**:
| Plan | Price | Description |
|------|-------|-------------|
| Starter | $29 one-time | Single document unlock |
| Pro Monthly | $49.99/mo | 12 downloads/mo |
| Pro Annual | $408/yr (= $34/mo) | "2 Months Free" anchor |
| Elite | $499/yr | 14-day Card-Upfront Trial |

### Section 5 — Functional Requirements & Adaptive Growth Engine
- Detailed feature list with core algorithms.
- **Ex-Partner-Skills Logic** (if applicable): adaptive prompting based on user history.
- **Reward Logic** (Commercial Only):
  - Stage 1 (Signup): 10% Entry-Tier Credits or 3 Days trial extension.
  - Stage 2 (Conversion):
    - Monthly: +14 Days / 50% Credits
    - Annual: +2 Months / 200% Credits

**[PREVIEW_END_MARKER]**

### Section 6 — Database Schema (Full Supabase SQL with RLS)
Output complete Supabase table definitions including:

**Core Tables**: profiles, sessions, usage_logs, history

**Commercial Tables** (Commercial mode only):
\`\`\`sql
-- Device fingerprint lock
ALTER TABLE profiles ADD COLUMN device_fingerprint TEXT;
ALTER TABLE profiles ADD COLUMN fingerprint_locked_at TIMESTAMPTZ;

-- Referral system
CREATE TABLE referral_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES profiles(id),
  referee_id UUID REFERENCES profiles(id),
  stage TEXT CHECK (stage IN ('signup', 'conversion')),
  reward_type TEXT,
  reward_value NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Trial management
ALTER TABLE profiles ADD COLUMN trial_usage_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN trial_hard_cap INTEGER DEFAULT 10;
ALTER TABLE profiles ADD COLUMN is_trial_active BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN trial_end_date TIMESTAMPTZ;

-- Billing cycle anchor adjustment
ALTER TABLE profiles ADD COLUMN billing_cycle_anchor_adjustment INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN annual_cycle_bonus_days INTEGER DEFAULT 0;
\`\`\`

Include full RLS policies for all tables.

### Section 7 — Implementation Logic
Core Server Actions with monetization logic:
- Edge-compatible Stripe client using \`createFetchHttpClient()\`
- Trial enforcement middleware (Hard Usage Cap)
- Referral reward distribution function
- Device fingerprint lock/unlock logic

### Section 8 — Security & Success Metrics (Commercial Only)
**Security Stack**:
- **FingerprintJS**: Hardware-level device lock (one account per device enforcement)
- **Cloudflare Turnstile**: Anti-bot protection on all auth endpoints
- **Disposable Email Filter**: Block known temporary email providers
- **IP/VPN Blocking**: Cloudflare WAF rules for datacenter IPs
- **Rate Limiting**: Edge middleware with sliding window (max 3 sessions/hour)

**Success Metrics**:
- K-Factor target: > 0.15 (viral coefficient)
- LTV/CAC ratio: > 3x (optimized via >99% gross margin)
- Trial-to-Paid Conversion: > 15%
- Monthly Churn: < 5%
- Annual Plan Attach Rate: > 40% (driven by "2 Months Free" anchor)

---

## Format Constraints
- **Language**: Automatically adapt to the user's input language.
- **NO Markdown Wrapper**: NEVER wrap the entire response in a markdown code block. Start directly with "# PRD:".
- **Tone**: Professional Senior Architect.
- **No Section Group Labels**: Only output the numbered content and headings — no "Public Preview" / "Full Blueprint" labels.`;

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
    tierPro: "Pro Member",
    referralTitle: "Referral Rewards",
    referralDesc: "Invite a friend and both get 1 free unlock.",
    warning15: "Depth analysis reached. 5 rounds left.",
    inviteCode: "Your Invite Code",
    inviteLink: "Your Invite Link",
    applyCode: "Apply Code",
    copyCode: "Copy",
    copyLink: "Copy Link",
    starter: "Starter",
    pro: "Pro Monthly",
    proAnnual: "Pro Yearly",
    mostPopular: "Most Popular 🔥",
    starterDesc: "Unlock this document — one-time purchase.",
    proDesc: "12 downloads/mo. The choice for high-output indie devs.",
    proAnnualDesc: "Save 2 months vs monthly billing!",
    twoMonthsFree: "2 Months Free 🎉",
    trialLabel: "Subscribe Now",
    yearlyTrialBadge: "14-Day Free Trial",
    yearlyTrialNote: "Start free for 14 days. Cancel anytime before trial ends — no charge.",
    creditsLabel: "Credits",
    roundsLabel: "Rounds Left"
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
    tierPro: "Pro 會員",
    referralTitle: "邀請獎勵",
    referralDesc: "邀請好友註冊，雙方各獲得 1 次免費解鎖。",
    warning15: "已進入深度架構分析階段。剩餘 5 輪免費額度。",
    inviteCode: "您的邀請碼",
    inviteLink: "專屬邀請連結",
    applyCode: "輸入邀請碼",
    copyCode: "複製代碼",
    copyLink: "複製連結",
    starter: "Starter (單次購買)",
    pro: "Pro 月費",
    proAnnual: "Pro 年費",
    mostPopular: "最受歡迎方案 🔥",
    starterDesc: "立即解鎖此份 PRD 下載權限。",
    proDesc: "高產出獨立開發者首選。每月 12 次下載額度。",
    proAnnualDesc: "比月費省 2 個月！",
    twoMonthsFree: "年繳省 2 個月 🎉",
    trialLabel: "立即訂閱",
    yearlyTrialBadge: "14 天免費試用",
    yearlyTrialNote: "前 14 天免費，試用期內取消不收費。",
    creditsLabel: "解鎖額度",
    roundsLabel: "剩餘對話輪數"
  },
  [Language.ZH_CN]: {
    history: "历史记录",
    noHistory: "尚未生成内容。",
    placeholder: "输入或用语音描述您的构思...",
    send: "发送",
    finalize: "生成 PRD",
    chatMode: "诊断引导",
    docMode: "蓝图预览",
    generating: "深度分析中...",
    finalizing: "正在构建 Edge-Native PRD...",
    transcribing: "语音识别中...",
    download: "下载 Markdown",
    welcomeTitle: "PRD Master",
    welcomeDesc: "专为边缘运算与商务转化设计的产品架构工具。",
    error: "服务发生错误，请重试。",
    errorTimeout: "请求超时，请稍后重试。",
    errorNetwork: "网络连接异常，请检查网络后重试。",
    errorTranscribe: "语音识别失败，请重新录音。",
    errorMicrophone: "无法访问麦克风。",
    voiceStart: "正在录音...",
    voiceStop: "停止",
    newChat: "开启新项目",
    login: "登录",
    register: "注册",
    loginToStart: "请登录后开始使用",
    loginGoogle: "使用 Google 账号登录",
    statusGuest: "访客模式",
    unlockFull: "立即解锁此份蓝图",
    limitReached: "对话额度已满，请解锁全文。",
    accountLimitReached: "账号配额已满，请升级专业版。",
    tierFree: "标准用户",
    tierPro: "Pro 会员",
    referralTitle: "邀请奖励",
    referralDesc: "邀请好友注册，双方各获得 1 次免费解锁。",
    warning15: "已进入深度架构分析阶段。剩余 5 轮免费额度。",
    inviteCode: "您的邀请码",
    inviteLink: "专属邀请链接",
    applyCode: "输入邀请码",
    copyCode: "复制代码",
    copyLink: "复制链接",
    starter: "Starter (单次购买)",
    pro: "Pro 月费",
    proAnnual: "Pro 年费",
    mostPopular: "最受欢迎方案 🔥",
    starterDesc: "立即解锁此份 PRD 下载权限。",
    proDesc: "高产出独立开发者首选。每月 12 次下载额度。",
    proAnnualDesc: "比月费省 2 个月！",
    twoMonthsFree: "年缴省 2 个月 🎉",
    trialLabel: "立即订阅",
    yearlyTrialBadge: "14 天免费试用",
    yearlyTrialNote: "前 14 天免费，试用期内取消不收费。",
    creditsLabel: "解锁额度",
    roundsLabel: "剩余对话轮数"
  }
};
