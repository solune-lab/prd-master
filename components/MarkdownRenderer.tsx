
import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    mermaid: any;
  }
}

interface MarkdownRendererProps {
  content: string;
  isUnlocked?: boolean;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, isUnlocked = true }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.mermaid) {
      window.mermaid.initialize({
        startOnLoad: true,
        theme: 'dark',
        securityLevel: 'loose',
        fontFamily: 'Inter'
      });
      window.mermaid.contentLoaded();
    }
  }, [content]);

  // Use <!-- PAYWALL_BREAK --> as the primary marker
  const rawLines = content.split('\n');
  const splitIndex = rawLines.findIndex(l => l.includes('<!-- PAYWALL_BREAK -->') || l.includes('[PREVIEW_END_MARKER]'));

  // Use the marker index if found, otherwise default to line count logic
  const visibleThreshold = splitIndex !== -1 ? splitIndex : Math.max(8, Math.floor(rawLines.length * 0.2));

  let inMermaid = false;
  let mermaidCode = '';

  return (
    <div ref={containerRef} className="prose prose-invert max-w-none space-y-4">
      {rawLines.map((line, i) => {
        const trimmedLine = line.trim();

        // Skip rendering the paywall marker itself
        if (line.includes('<!-- PAYWALL_BREAK -->') || line.includes('[PREVIEW_END_MARKER]')) return null;

        // Filter out the outer wrapping markdown code blocks (e.g., ```markdown or ``` at the end)
        if (!inMermaid && (trimmedLine.startsWith('```markdown') || trimmedLine.startsWith('```md'))) {
          return null;
        }
        if (!inMermaid && trimmedLine === '```' && (i === 0 || i === rawLines.length - 1)) {
          return null;
        }

        // Handle Mermaid diagrams
        if (trimmedLine.startsWith('```mermaid')) {
          inMermaid = true;
          mermaidCode = '';
          return null;
        }
        if (inMermaid && trimmedLine.startsWith('```')) {
          inMermaid = false;
          const currentCode = mermaidCode;
          // Mermaid is blurred if locked and below threshold
          const isMermaidBlurred = !isUnlocked && i > visibleThreshold;
          return (
            <div key={i} className={`mermaid bg-slate-900/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-700/50 my-6 flex justify-center transition-all shadow-xl shadow-indigo-500/5 ${isMermaidBlurred ? 'paywall-blur' : ''}`}>
              {currentCode}
            </div>
          );
        }
        if (inMermaid) {
          mermaidCode += line + '\n';
          return null;
        }

        const isBlurred = !isUnlocked && i > visibleThreshold;

        // Basic Markdown parsing for display
        if (line.startsWith('# ')) return <h1 key={i} className={`text-3xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mt-10 mb-6 border-b border-slate-800/50 pb-3 transition-all ${isBlurred ? 'paywall-blur' : ''}`}>{line.replace('# ', '')}</h1>;
        if (line.startsWith('## ')) return <h2 key={i} className={`text-2xl font-bold text-indigo-300/90 mt-8 mb-4 transition-all ${isBlurred ? 'paywall-blur' : ''}`}>{line.replace('## ', '')}</h2>;
        if (line.startsWith('### ')) return <h3 key={i} className={`text-xl font-semibold text-indigo-200/80 mt-6 mb-3 transition-all ${isBlurred ? 'paywall-blur' : ''}`}>{line.replace('### ', '')}</h3>;
        if (line.startsWith('- ')) return <li key={i} className={`ml-6 list-disc text-slate-300 mb-2 transition-all ${isBlurred ? 'paywall-blur' : ''}`}>{line.replace('- ', '')}</li>;

        if (line.trim() === '') return <div key={i} className="h-4"></div>;

        // Tree structures or tables
        if (line.includes('|') || line.includes('+--') || line.includes('-->')) {
          return <pre key={i} className={`mono bg-slate-900/90 backdrop-blur-sm p-4 rounded-xl text-xs text-indigo-300 overflow-x-auto border border-slate-700/50 my-4 shadow-lg transition-all ${isBlurred ? 'paywall-blur' : ''}`}>{line}</pre>;
        }

        return <p key={i} className={`text-slate-300 leading-relaxed mb-4 whitespace-pre-wrap transition-all ${isBlurred ? 'paywall-blur' : ''}`}>{line}</p>;
      })}
    </div>
  );
};
