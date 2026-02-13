import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/'

    if (code) {
        const response = NextResponse.redirect(`${origin}${next}`)

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll()
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            response.cookies.set(name, value, options)
                        })
                    },
                },
            }
        )

        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
            console.error('Auth callback error:', error)
            const errorMsg = encodeURIComponent(error.message || 'Authentication failed')
            return NextResponse.redirect(`${origin}/?error=auth_failed&msg=${errorMsg}`)
        }

        if (!data.session) {
            console.error('No session returned after code exchange')
            return NextResponse.redirect(`${origin}/?error=no_session`)
        }

        return response
    }

    console.error('No code in callback URL')
    return NextResponse.redirect(`${origin}/?error=no_code`)
}
