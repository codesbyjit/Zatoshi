import { NextResponse } from 'next/server';
import { register } from '@repo/metrics';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  try {
    const metrics = await register.metrics();
    return new NextResponse(metrics, {
      status: 200,
      headers: {
        'Content-Type': register.contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    return new NextResponse(
      `# Metrics collection error: ${error instanceof Error ? error.message : 'Unknown error'}\n`,
      {
        status: 500,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      },
    );
  }
}
