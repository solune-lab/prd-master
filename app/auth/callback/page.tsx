'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const errorParam = params.get('error')
      const errorDescription = params.get('error_description')
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/prd-master'

      // Supabase error (e.g. otp_expired)
      if (errorParam) {
        setStatus('error')
        setErrorMsg(errorDescription || errorParam)
        setTimeout(() => {
          window.location.replace(`${basePath}/?error=${errorParam}&msg=${encodeURIComponent(errorDescription || '')}`)
        }, 2500)
        return
      }

      // OAuth / PKCE path (Google login): URL has ?code=
      if (code) {
        try {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            setStatus('error')
            setErrorMsg(error.message)
            setTimeout(() => {
              window.location.replace(`${basePath}/?error=auth_failed&msg=${encodeURIComponent(error.message)}`)
            }, 2500)
            return
          }
          setStatus('success')
          window.location.replace(basePath)
        } catch (err: any) {
          setStatus('error')
          setErrorMsg(err?.message || 'Authentication failed')
          setTimeout(() => {
            window.location.replace(`${basePath}/?error=auth_failed`)
          }, 2500)
        }
        return
      }

      // Magic link implicit flow: token is in URL hash (#access_token=...).
      // SDK _initialize() auto-processes the hash on createBrowserClient; just wait for session.
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setStatus('success')
        window.location.replace(basePath)
      } else {
        // Give SDK a moment to process the hash fragment
        setTimeout(async () => {
          const { data: { session: s } } = await supabase.auth.getSession()
          if (s) {
            setStatus('success')
            window.location.replace(basePath)
          } else {
            setStatus('error')
            setErrorMsg('Authentication failed. Please try again.')
            setTimeout(() => window.location.replace(`${basePath}/?error=no_session`), 2500)
          }
        }, 1500)
      }
    }

    handleCallback()
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center space-y-4">
        {status === 'loading' && (
          <>
            <div className="w-12 h-12 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto" />
            <p className="text-slate-400 text-sm font-medium">Signing you in…</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-slate-300 text-sm font-medium">Login successful! Redirecting…</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-12 h-12 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-red-400 text-sm font-medium">{errorMsg}</p>
            <p className="text-slate-500 text-xs">Redirecting back…</p>
          </>
        )}
      </div>
    </div>
  )
}
