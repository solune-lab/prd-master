'use client';

import { useEffect, useRef, useCallback } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: {
        sitekey: string;
        callback: (token: string) => void;
        'error-callback'?: () => void;
        'expired-callback'?: () => void;
        theme?: 'light' | 'dark' | 'auto';
        size?: 'normal' | 'compact';
        appearance?: 'always' | 'execute' | 'interaction-only';
      }) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

interface TurnstileProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  /** Call reset() on parent ref to reset the widget */
  resetRef?: React.MutableRefObject<(() => void) | null>;
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';

export const Turnstile: React.FC<TurnstileProps> = ({
  onVerify,
  onExpire,
  onError,
  resetRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const scriptLoadedRef = useRef(false);

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile || widgetIdRef.current) return;
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: SITE_KEY,
      callback: onVerify,
      'expired-callback': () => {
        widgetIdRef.current = null;
        onExpire?.();
      },
      'error-callback': () => {
        widgetIdRef.current = null;
        onError?.();
      },
      theme: 'dark',
      size: 'normal',
      appearance: 'always',
    });
  }, [onVerify, onExpire, onError]);

  // Expose reset function to parent
  useEffect(() => {
    if (resetRef) {
      resetRef.current = () => {
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current);
          widgetIdRef.current = null;
        }
      };
    }
  }, [resetRef]);

  useEffect(() => {
    // If Turnstile is already loaded (e.g. navigating back)
    if (window.turnstile) {
      renderWidget();
      return;
    }

    if (scriptLoadedRef.current) return;
    scriptLoadedRef.current = true;

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    script.onload = renderWidget;
    document.head.appendChild(script);

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [renderWidget]);

  return (
    <div className="flex justify-center my-2">
      <div ref={containerRef} />
    </div>
  );
};
