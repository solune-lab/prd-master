export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return Response.json({ success: false, error: 'Missing token' }, { status: 400 });
    }

    const secretKey = process.env.TURNSTILE_SECRET_KEY;
    if (!secretKey) {
      // If no secret key configured, pass through (dev fallback)
      return Response.json({ success: true });
    }

    const formData = new FormData();
    formData.append('secret', secretKey);
    formData.append('response', token);

    // Get client IP from Cloudflare header
    const ip = request.headers.get('CF-Connecting-IP') ?? undefined;
    if (ip) formData.append('remoteip', ip);

    const verifyRes = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      { method: 'POST', body: formData }
    );

    const data = await verifyRes.json() as { success: boolean; 'error-codes'?: string[] };

    if (!data.success) {
      return Response.json(
        { success: false, error: 'Bot verification failed', codes: data['error-codes'] },
        { status: 403 }
      );
    }

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ success: false, error: 'Verification error' }, { status: 500 });
  }
}
