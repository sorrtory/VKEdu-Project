import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '../shared';

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization');
    const response = await fetch(getBackendUrl('conference'), {
      headers: authorization ? { Authorization: authorization } : undefined,
    });
    const payload = await response.json().catch(() => ({ error: 'Empty response from backend' }));

    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json({ error: 'Ошибка при загрузке конференций' }, { status: 500 });
  }
}
