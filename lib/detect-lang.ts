import { Language } from '@/types';

const SUPPORTED = new Set<string>(Object.values(Language));

export function detectLanguageFromText(text: string, fallback: Language): Language {
  if (!text) return ensureSupported(fallback);

  const sample = text.slice(0, 500);

  let han = 0;
  let trad = 0;
  let simp = 0;
  let hiragana = 0;
  let katakana = 0;
  let hangul = 0;
  let arabic = 0;
  let cyrillic = 0;
  let latin = 0;

  const TRAD_ONLY = '繁體個們麼這這樣對於來說國學會時間問題開關當點實現們們臺灣後產業發單動轉專業價錢買賣藝術讓兒過萬東車書聲愛覺見讀寫話應該風險體驗導購線網絡軟體應註冊';
  const SIMP_ONLY = '简体个们么这这样对于来说国学会时间问题开关当点实现们们台湾后产业发单动转专业价钱买卖艺术让儿过万东车书声爱觉见读写话应该风险体验导购线网络软件应注册';
  const tradSet = new Set(TRAD_ONLY.split(''));
  const simpSet = new Set(SIMP_ONLY.split(''));

  for (const ch of sample) {
    const code = ch.codePointAt(0)!;
    if (code >= 0x4e00 && code <= 0x9fff) {
      han++;
      if (tradSet.has(ch)) trad++;
      if (simpSet.has(ch)) simp++;
    } else if (code >= 0x3040 && code <= 0x309f) hiragana++;
    else if (code >= 0x30a0 && code <= 0x30ff) katakana++;
    else if (code >= 0xac00 && code <= 0xd7af) hangul++;
    else if (code >= 0x0600 && code <= 0x06ff) arabic++;
    else if (code >= 0x0400 && code <= 0x04ff) cyrillic++;
    else if ((code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a)) latin++;
  }

  if (hiragana + katakana > 0) return Language.JA;
  if (hangul > 0) return Language.KO;
  if (arabic > 0) return Language.AR;

  if (han > 0) {
    if (trad > simp) return Language.ZH_TW;
    if (simp > trad) return Language.ZH_CN;
    return fallback === Language.ZH_CN ? Language.ZH_CN : Language.ZH_TW;
  }

  if (cyrillic > 0) return Language.RU;

  if (latin > 0) {
    const lower = sample.toLowerCase();
    const hits = (re: RegExp) => (lower.match(re) || []).length;
    const scores: Array<[Language, number]> = [
      [Language.FR, hits(/\b(le|la|les|un|une|des|et|est|pour|avec|dans|que|qui|nous|vous|cest|c'est|je|tu|mais|où|très)\b/g) + hits(/[àâçèéêëîïôùûü]/g)],
      [Language.DE, hits(/\b(der|die|das|und|ist|nicht|ich|du|wir|ihr|sie|ein|eine|mit|für|auf|aber|sehr|werden|haben|sein)\b/g) + hits(/[äöüß]/g)],
      [Language.IT, hits(/\b(il|lo|la|gli|le|un|una|e|è|per|con|di|che|sono|hai|ho|ma|molto|come|cosa)\b/g)],
      [Language.ES, hits(/\b(el|la|los|las|un|una|y|es|para|con|de|que|pero|muy|cómo|qué|hola|gracias|por)\b/g) + hits(/[ñ¿¡]/g)],
      [Language.PT, hits(/\b(o|a|os|as|um|uma|e|é|para|com|de|que|mas|muito|como|você|obrigado|olá|não)\b/g) + hits(/[ãõç]/g)],
    ];
    scores.sort((a, b) => b[1] - a[1]);
    if (scores[0][1] >= 2) return scores[0][0];
    return Language.EN;
  }

  return ensureSupported(fallback);
}

function ensureSupported(lang: Language): Language {
  return SUPPORTED.has(lang) ? lang : Language.EN;
}
