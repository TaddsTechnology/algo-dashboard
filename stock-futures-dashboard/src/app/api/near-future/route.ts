import { NextResponse } from 'next/server';

const FLASK_BASE = process.env.FLASK_BASE_URL || 'http://127.0.0.1:5000';

export async function GET() {
  try {
    const res = await fetch(`${FLASK_BASE}/api/near-future`, {
      // Avoid Next.js fetch caching for live data
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ success: false, error: `Flask API error ${res.status}: ${text}` }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Proxy error' }, { status: 500 });
  }
}


