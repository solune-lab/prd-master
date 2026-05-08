'use client'

import { useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function AuthCallbackPage() {
  useEffect(() => {
    const handleCallback = async () => {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/prd-master'

      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        const params = new URLSearchParams(window.location.search)
        const code = params.get('code')

        // PKCE code path: try exchange, ignore PKCE-verifier errors since
        // Supabase server already created the session. Fall through to getSession.
        if (code) {
          try { await supabase.auth.exchangeCodeForSession(code) } catch {}
        }

        // Wait for SDK to finish processing URL (hash fragment for implicit flow,
        // or any in-flight cookie/storage write from PKCE exchange).
        for (let i = 0; i < 10; i++) {
          const { data: { session } } = await supabase.auth.getSession()
          if (session) break
          await new Promise(r => setTimeout(r, 300))
        }
      } catch { /* swallow — always redirect home */ }

      window.location.replace(basePath)
    }

    handleCallback()
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto" />
        <p className="text-slate-400 text-sm font-medium">Signing you in…</p>
      </div>
    </div>
  )
}
