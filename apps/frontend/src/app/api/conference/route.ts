import { NextResponse } from 'next/server';
import { getBackendUrl } from '../shared';

export async function GET() {
  try {
    const response = await fetch(getBackendUrl('conference'));
    const payload = await response.json().catch(() => ({ error: 'Empty response from backend' }));

    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json({ error: 'Ошибка при загрузке конференций' }, { status: 500 });
  }
}
