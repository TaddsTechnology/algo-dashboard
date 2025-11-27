import { NextResponse } from 'next/server';

// Hugging Face Space URL - Updated to your new space
const HUGGING_FACE_API_URL = 'https://taddsTeam-algo.hf.space';

interface HealthData {
  status: string;
  categories?: {
    current: { data_points: number; last_update: number };
    near: { data_points: number; last_update: number };
    far: { data_points: number; last_update: number };
  };
  total_data_points?: number;
  server_time?: number;
}

interface HealthResponse {
  status: string;
  message: string;
  data?: HealthData;
  timestamp: string;
  error?: string;
}

export async function GET() {
  try {
    // Check health of Hugging Face backend using the new endpoint
    const hfResponse = await fetch(`${HUGGING_FACE_API_URL}/api/health`, {
      next: { revalidate: 60 }, // Revalidate every minute
    });

    if (!hfResponse.ok) {
      return NextResponse.json({
        status: 'error',
        message: `Hugging Face API health check failed with status ${hfResponse.status}`,
        timestamp: new Date().toISOString(),
      } satisfies HealthResponse, { status: 503 });
    }

    const healthData: HealthData = await hfResponse.json();
    
    return NextResponse.json({
      status: 'success',
      message: 'Hugging Face backend is healthy',
      data: healthData,
      timestamp: new Date().toISOString(),
    } satisfies HealthResponse);

  } catch (error: unknown) {
    console.error('Hugging Face health check failed:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to connect to Hugging Face backend',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    } satisfies HealthResponse, { status: 503 });
  }
}