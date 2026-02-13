
import React, { useEffect, useRef, useState, useMemo } from 'react';

declare global {
  interface Window {
    mermaid: any;
  }
}

interface MarkdownRendererProps {
  content: string;
  isUnlocked?: boolean;
  onPaywallVisible?: () => void;
}

// Mermaid diagram component with error handling
const MermaidDiagram: React.FC<{ code: string; id: string }> = ({ code, id }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSource, setShowSource] = useState(false);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      if (!ref.current || !window.mermaid) return;
      setError(null);
      setRendered(false);

      try {
        window.mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          securityLevel: 'loose',
          fontFamily: 'Inter, sans-serif',
          flowchart: { curve: 'basis', useMaxWidth: true },
        });

        const { svg } = await window.mermaid.render(`mermaid-${id}`, code);
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
          setRendered(true);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('[Mermaid] render error:', err?.message || err);
          setError(err?.message || 'Diagram syntax error');
        }
      }
    };

    // Wait for mermaid to be available
    if (window.mermaid) {
      render();
    } else {
      const timer = setInterval(() => {
        if (window.mermaid) {
          clearInterval(timer);
          render();
        }
      }, 200);
      return () => { cancelled = true; clearInterval(timer); };
    }

    return () => { cancelled = true; };
  }, [code, id]);

  if (error) {
    return (
      <div className="bg-slate-900/80 border border-red-500/30 rounded-2xl p-6 my-6">
        <div className="flex items-center gap-3 mb-3">
          <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-red-400 text-sm font-bold">Diagram Render Error</span>
          <button
            onClick={() => setShowSource(s => !s)}
            className="ml-auto text-[10px] text-slate-500 hover:text-slate-300 border border-slate-700 rounded px-2 py-1 transition-colors uppercase font-bold"
          >
            {showSource ? 'Hide' : 'View'} Source
          </button>
        </div>
        {showSource && (
          <pre className="text-xs text-slate-400 bg-slate-950 rounded-xl p-4 overflow-x-auto border border-slate-800 whitespace-pre-wrap">{code}</pre>
        )}
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-700/50 my-6 flex justify-center overflow-x-auto transition-all shadow-xl shadow-indigo-500/5">
      <div ref={ref} className="max-w-full" />
    </div>
  );
};

// Inline markdown formatting (bold, inline code)
const renderInline = (text: string, key: number): React.ReactNode => {
  // Bold: **text**
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  if (parts.length === 1) return text;
  return (
    <React.Fragment key={key}>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="text-white font-bold">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return <code key={i} className="bg-slate-800 text-indigo-300 px-1.5 py-0.5 rounded text-[0.85em] font-mono">{part.slice(1, -1)}</code>;
        }
        return part;
      })}
    </React.Fragment>
  );
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, isUnlocked = true, onPaywallVisible }) => {
  const paywallTriggerRef = useRef<HTMLDivElement>(null);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const hasTriggeredRef = useRef(false);
  const initialCheckDoneRef = useRef(false);

  useEffect(() => {
    if (isUnlocked || !onPaywallVisible || !paywallTriggerRef.current) return;
    hasTriggeredRef.current = false;
    initialCheckDoneRef.current = false;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Skip the initial synchronous intersection check that fires on observe()
        if (!initialCheckDoneRef.current) {
          initialCheckDoneRef.current = true;
          return;
        }
        if (entries[0].isIntersecting && !hasTriggeredRef.current) {
          hasTriggeredRef.current = true;
          onPaywallVisible();
        }
      },
      { threshold: 0.1 }
    );
    observerRef.current.observe(paywallTriggerRef.current);
    return () => {
      observerRef.current?.disconnect();
    };
  }, [isUnlocked, onPaywallVisible]);
  // Truncate content at breakpoint BEFORE rendering — locked content never reaches the DOM
  const visibleContent = useMemo(() => {
    if (isUnlocked) return content;

    const rawLines = content.split('\n');

    // Primary: look for explicit paywall marker (handles both exact and decorated forms)
    // e.g. "--- [PREVIEW_END_MARKER] ---" or "<!-- PAYWALL_BREAK -->" or "[PREVIEW_END_MARKER]"
    const splitIndex = rawLines.findIndex(l =>
      l.includes('[PREVIEW_END_MARKER]') ||
      l.includes('<!-- PAYWALL_BREAK -->') ||
      l.includes('PAYWALL_BREAK')
    );

    if (splitIndex !== -1) {
      return rawLines.slice(0, splitIndex).join('\n');
    }

    // Fallback: cut after the 3rd ## heading (show points 1-3 only)
    let h2Count = 0;
    for (let i = 0; i < rawLines.length; i++) {
      if (rawLines[i].startsWith('## ') || rawLines[i].startsWith('### ')) {
        h2Count++;
        if (h2Count === 4) {
          return rawLines.slice(0, i).join('\n');
        }
      }
    }

    // Last resort: 25% of lines, min 10
    const cutoff = Math.max(10, Math.floor(rawLines.length * 0.25));
    return rawLines.slice(0, cutoff).join('\n');
  }, [content, isUnlocked]);

  const rawLines = visibleContent.split('\n');

  // Build structured blocks (handle multi-line Mermaid)
  const blocks: { type: string; content: string; key: number }[] = [];
  let inMermaid = false;
  let mermaidCode = '';
  let mermaidStartKey = 0;
  let inCodeBlock = false;
  let codeContent = '';
  let codeStartKey = 0;
  let codeLanguage = '';

  rawLines.forEach((line, i) => {
    const trimmed = line.trim();

    // Skip paywall markers
    if (line.includes('[PREVIEW_END_MARKER]') || line.includes('<!-- PAYWALL_BREAK -->')) return;

    // Filter outer markdown code block wrappers
    if (!inMermaid && !inCodeBlock && (trimmed === '```markdown' || trimmed === '```md')) return;
    if (!inMermaid && !inCodeBlock && trimmed === '```' && (i === 0 || i === rawLines.length - 1)) return;

    // Mermaid block start
    if (!inCodeBlock && trimmed.startsWith('```mermaid')) {
      inMermaid = true;
      mermaidCode = '';
      mermaidStartKey = i;
      return;
    }
    // Mermaid block end
    if (inMermaid && trimmed === '```') {
      inMermaid = false;
      blocks.push({ type: 'mermaid', content: mermaidCode, key: mermaidStartKey });
      mermaidCode = '';
      return;
    }
    if (inMermaid) {
      mermaidCode += line + '\n';
      return;
    }

    // Generic code block start
    if (!inMermaid && trimmed.startsWith('```') && trimmed !== '```') {
      inCodeBlock = true;
      codeLanguage = trimmed.replace('```', '').trim();
      codeContent = '';
      codeStartKey = i;
      return;
    }
    // Generic code block end
    if (inCodeBlock && trimmed === '```') {
      inCodeBlock = false;
      blocks.push({ type: 'code', content: codeContent, key: codeStartKey });
      codeContent = '';
      return;
    }
    if (inCodeBlock) {
      codeContent += line + '\n';
      return;
    }

    blocks.push({ type: 'line', content: line, key: i });
  });

  return (
    <div className="prose prose-invert max-w-none space-y-1">
      {blocks.map((block) => {
        if (block.type === 'mermaid') {
          return <MermaidDiagram key={block.key} code={block.content} id={String(block.key)} />;
        }

        if (block.type === 'code') {
          return (
            <pre key={block.key} className="bg-slate-900/90 backdrop-blur-sm p-4 rounded-xl text-xs text-indigo-300 overflow-x-auto border border-slate-700/50 my-4 shadow-lg">
              <code>{block.content}</code>
            </pre>
          );
        }

        const line = block.content;
        const key = block.key;

        if (line.includes('[PREVIEW_END_MARKER]') || line.includes('<!-- PAYWALL_BREAK -->')) return null;

        if (line.startsWith('# ')) return <h1 key={key} className="text-3xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mt-10 mb-6 border-b border-slate-800/50 pb-3">{renderInline(line.slice(2), key)}</h1>;
        if (line.startsWith('## ')) return <h2 key={key} className="text-2xl font-bold text-indigo-300/90 mt-8 mb-4">{renderInline(line.slice(3), key)}</h2>;
        if (line.startsWith('### ')) return <h3 key={key} className="text-xl font-semibold text-indigo-200/80 mt-6 mb-3">{renderInline(line.slice(4), key)}</h3>;
        if (line.startsWith('#### ')) return <h4 key={key} className="text-lg font-semibold text-slate-200 mt-4 mb-2">{renderInline(line.slice(5), key)}</h4>;

        // List items
        if (line.match(/^(\s*)- /)) {
          const indent = line.match(/^(\s*)/)?.[1].length || 0;
          const text = line.replace(/^\s*- /, '');
          return <li key={key} className={`list-disc text-slate-300 mb-1.5 leading-relaxed ${indent > 0 ? 'ml-10' : 'ml-6'}`}>{renderInline(text, key)}</li>;
        }
        if (line.match(/^\s*\d+\. /)) {
          const text = line.replace(/^\s*\d+\. /, '');
          return <li key={key} className="list-decimal ml-6 text-slate-300 mb-1.5 leading-relaxed">{renderInline(text, key)}</li>;
        }

        if (line.trim() === '') return <div key={key} className="h-3" />;

        // Horizontal rule
        if (line.trim().match(/^---+$/) || line.trim().match(/^\*\*\*+$/)) {
          return <hr key={key} className="border-slate-800 my-6" />;
        }

        // Table rows
        if (line.includes('|')) {
          const isHeader = rawLines[block.key + 1]?.includes('---');
          const cells = line.split('|').filter(c => c.trim() !== '');
          if (cells.length > 1) {
            return (
              <div key={key} className={`flex text-xs font-mono border-b border-slate-800/50 ${isHeader ? 'text-indigo-300 font-bold bg-slate-800/30' : 'text-slate-300'}`}>
                {cells.map((cell, ci) => (
                  <div key={ci} className="flex-1 px-3 py-2">{cell.trim()}</div>
                ))}
              </div>
            );
          }
        }

        // Table separator row
        if (line.trim().match(/^\|?[\s-|]+\|$/)) return null;

        // Tree structures
        if (line.includes('+--') || (line.includes('│') && !line.includes('|'))) {
          return <pre key={key} className="mono bg-slate-900/90 p-1 text-xs text-indigo-300 overflow-x-auto">{line}</pre>;
        }

        return <p key={key} className="text-slate-300 leading-relaxed mb-2 whitespace-pre-wrap">{renderInline(line, key)}</p>;
      })}

      {/* Fade-out gradient overlay + paywall trigger zone for locked content */}
      {!isUnlocked && (
        <div className="relative mt-8" ref={paywallTriggerRef}>
          <div className="absolute -top-32 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-slate-950 pointer-events-none" />
          <div className="flex flex-col items-center pt-8 pb-4 border-t border-slate-800/50">
            <svg className="w-10 h-10 text-indigo-500/60 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-slate-400 text-sm font-medium">Subscribe to Continue Reading</p>
          </div>
        </div>
      )}
    </div>
  );
};
