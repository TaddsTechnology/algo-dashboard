import { NextResponse } from 'next/server';

// Hugging Face Space URL - Updated to your new space
const HUGGING_FACE_API_URL = 'https://taddsTeam-algo.hf.space';

// Simple proxy to your Hugging Face backend using the new combined endpoint.
// This avoids calling the old /api/market-data route (which returns 404)
// and just forwards whatever your backend returns.
export async function GET() {
  try {
    const hfResponse = await fetch(`${HUGGING_FACE_API_URL}/api/all-futures-combined`, {
      next: { revalidate: 5 }, // Small revalidate window for near‑live data
    });

    if (!hfResponse.ok) {
      console.error(`Hugging Face API error: ${hfResponse.status}`);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch data from Hugging Face API',
          status: hfResponse.status,
        },
        { status: 503 },
      );
    }

    const data = await hfResponse.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('Hugging Face API failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch data from Hugging Face API',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
