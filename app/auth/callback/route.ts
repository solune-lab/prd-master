import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

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
                    get(name: string) {
                        return request.cookies.get(name)?.value
                    },
                    set(name: string, value: string, options: CookieOptions) {
                        response.cookies.set({
                            name,
                            value,
                            ...options,
                            sameSite: 'lax',
                            secure: process.env.NODE_ENV === 'production',
                        })
                    },
                    remove(name: string, options: CookieOptions) {
                        response.cookies.set({
                            name,
                            value: '',
                            ...options,
                            maxAge: 0,
                        })
                    },
                },
            }
        )

        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        console.log('Exchange data:', !!data.session, !!data.user);

        if (error) {
            console.error('Auth callback error detail:', error);
            const errorMsg = encodeURIComponent(error.message || 'Authentication failed during code exchange');
            return NextResponse.redirect(`${origin}/?error=auth_failed&msg=${errorMsg}`)
        }

        if (!data.session) {
            console.error('No session returned after code exchange');
            return NextResponse.redirect(`${origin}/?error=no_session`)
        }

        console.log('Auth successful for user:', data.user?.email)
        return response
    }

    // No code provided
    console.error('No code in callback URL')
    return NextResponse.redirect(`${origin}/?error=no_code`)
}
