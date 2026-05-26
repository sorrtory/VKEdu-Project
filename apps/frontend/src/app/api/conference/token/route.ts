import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '../../shared';

export async function POST(request: NextRequest) {
  try {
    const { conferenceName, participantIdentity, participantName } = await request.json();
    const response = await fetch(getBackendUrl('conference/token'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conferenceName,
        participantIdentity,
        participantName,
      }),
    });

    const payload = await response.json().catch(() => ({ error: 'Empty response from backend' }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error('[conference/token] proxy failed:', error);
    const message = error instanceof Error ? error.message : 'Ошибка при получении токена';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
