import { NextResponse } from 'next/server';
import { resolveRegion } from '@/lib/stripe';

export const runtime = 'edge';

export async function GET(req: Request) {
  const country =
    req.headers.get('cf-ipcountry') ||
    (req as any).cf?.country ||
    null;
  const region = resolveRegion(country);
  return NextResponse.json({ country, region });
}
