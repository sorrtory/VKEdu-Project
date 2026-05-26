import { NextResponse } from 'next/server';
import { getBackendUrl } from '../../../../shared';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ conferenceName: string }> },
) {
  try {
    const { conferenceName } = await params;
    const response = await fetch(
      getBackendUrl(`conference/${encodeURIComponent(conferenceName)}/summary/request`),
      { method: 'POST' },
    );
    const payload = await response.json().catch(() => ({ error: 'Empty response from backend' }));

    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json({ error: 'Ошибка при запросе саммари' }, { status: 500 });
  }
}
