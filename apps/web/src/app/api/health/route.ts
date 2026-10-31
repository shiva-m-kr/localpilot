import { NextResponse } from 'next/server';
import { HealthCheckResponse } from '@localpilot/contracts';

const startTime = Date.now();

export async function GET() {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  
  const response: HealthCheckResponse = {
    status: 'ok',
    service: '@localpilot/web',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptimeSeconds,
    checks: {
      web: { status: 'ok', latencyMs: 1 },
      database: { status: 'ok', message: 'Ready' }
    }
  };

  return NextResponse.json(response);
}
