import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

type MasterInstrument = {
  tradingSymbol?: string;
  companyName?: string;
  instType?: string;
  expiry?: string | number | null;
  scripCode?: number | string;
  lotSize?: number;
  tickSize?: number;
};

type Contract = {
  symbol: string;
  name: string;
  scripCode: string;
  expiry: string;
  days_to_expiry: number;
  lotSize: number;
  instrumentType: string;
  tickSize: number;
  category: 'current' | 'near' | 'far';
};

function parseExpiry(exp: string | number | null): string | null {
  if (!exp || String(exp).toLowerCase() === 'none' || String(exp) === '0') return null;
  const s = String(exp);
  // Expect DD/MM/YYYY or DD-MMM-YY etc.; return as-is
  return s.includes('/') || s.includes('-') ? s : s;
}

function daysBetween(today: Date, expiryStr: string): number {
  // Handle DD/MM/YYYY
  const m = expiryStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  let expiry: Date;
  if (m) {
    const d = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10) - 1;
    const y = parseInt(m[3], 10);
    expiry = new Date(y, mo, d);
  } else {
    // Fallback: attempt Date parse
    expiry = new Date(expiryStr);
  }
  const ms = expiry.getTime() - today.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function categorizeByTopThreeExpiries(instruments: MasterInstrument[]): Record<'current' | 'near' | 'far', Contract[]> {
  const today = new Date();
  // Collect valid FS with expiry
  const fs = instruments.filter((it) => (it.instType || '').toUpperCase() === 'FS')
    .map((it) => ({ ...it, expiryStr: parseExpiry(it.expiry ?? null) }))
    .filter((it) => !!it.expiryStr) as (MasterInstrument & { expiryStr: string })[];

  // Group by expiry
  const byExpiry = new Map<string, MasterInstrument[]>();
  for (const it of fs) {
    const key = it.expiryStr as string;
    if (!byExpiry.has(key)) byExpiry.set(key, []);
    byExpiry.get(key)!.push(it);
  }

  // Sort expiries ascending by date
  const expiries = Array.from(byExpiry.keys()).sort((a, b) => {
    const da = daysBetween(today, a);
    const db = daysBetween(today, b);
    return da - db;
  });

  // Pick the first three as current/near/far
  const [currentExp, nearExp, farExp] = expiries;

  const makeContracts = (list: MasterInstrument[], category: 'current' | 'near' | 'far'): Contract[] =>
    list.map((instrument) => {
      const symbol = (instrument.tradingSymbol || '').toString().toUpperCase();
      const name = (instrument.companyName || '').toString().toUpperCase();
      const expiry = (instrument as any).expiryStr as string;
      return {
        symbol,
        name,
        scripCode: String(instrument.scripCode ?? ''),
        expiry,
        days_to_expiry: daysBetween(today, expiry),
        lotSize: instrument.lotSize ?? 1,
        instrumentType: (instrument.instType || '').toString().toUpperCase(),
        tickSize: instrument.tickSize ?? 0.05,
        category,
      };
    }).sort((a, b) => a.symbol.localeCompare(b.symbol));

  const result: Record<'current' | 'near' | 'far', Contract[]> = { current: [], near: [], far: [] };
  if (currentExp) result.current = makeContracts(byExpiry.get(currentExp)!, 'current');
  if (nearExp) result.near = makeContracts(byExpiry.get(nearExp)!, 'near');
  if (farExp) result.far = makeContracts(byExpiry.get(farExp)!, 'far');
  return result;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const exchange = searchParams.get('exchange') || 'NF'; // NF = Nifty Futures master
    let accessToken = searchParams.get('accessToken') || process.env.SHAREKHAN_ACCESS_TOKEN || '';
    const apiKey = process.env.SHAREKHAN_API_KEY || '';

    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'Missing SHAREKHAN_API_KEY env' }, { status: 400 });
    }
    if (!accessToken) {
      // Attempt to read from updatedSharekhan/token_config.json maintained by Python TokenManager
      try {
        const repoRoot = process.cwd();
        const tokenPath = path.join(repoRoot, '..', 'updatedSharekhan', 'token_config.json');
        const raw = await fs.readFile(tokenPath, 'utf-8');
        const parsed = JSON.parse(raw || '{}');
        const token = parsed.access_token as string | undefined;
        const exp = parsed.expires_at as number | undefined; // seconds since epoch
        const nowSec = Math.floor(Date.now() / 1000);
        const bufferSec = 5 * 60;
        if (token && exp && nowSec < (exp - bufferSec)) {
          accessToken = token;
        }
      } catch {}
    }
    if (!accessToken) {
      // Return empty data instead of error when no token available
      return NextResponse.json({ 
        success: true, 
        data: { current: [], near: [], far: [] }, 
        summary: { current: 0, near: 0, far: 0, total: 0 },
        message: 'No access token available. Set SHAREKHAN_ACCESS_TOKEN or run Python token refresher.' 
      });
    }

    const url = `https://api.sharekhan.com/skapi/services/master/${encodeURIComponent(exchange)}`;
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
        'Authorization': `Bearer ${accessToken}`,
      },
      // No cache for live instruments
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ success: false, error: `Sharekhan master error ${res.status}: ${text}` }, { status: 502 });
    }

    const payload = await res.json();
    const instruments: MasterInstrument[] = Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload) ? payload : []);
    if (!Array.isArray(instruments) || instruments.length === 0) {
      return NextResponse.json({ success: false, error: 'Empty master data' }, { status: 500 });
    }

    const categorized = categorizeByTopThreeExpiries(instruments);
    const summary = {
      current: categorized.current.length,
      near: categorized.near.length,
      far: categorized.far.length,
      total: categorized.current.length + categorized.near.length + categorized.far.length,
    };

    return NextResponse.json({ success: true, data: categorized, summary });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Unexpected error' }, { status: 500 });
  }
}


