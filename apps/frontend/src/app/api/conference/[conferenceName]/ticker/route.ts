import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '../../../shared';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ conferenceName: string }> },
) {
  try {
    const { conferenceName } = await params;
    const response = await fetch(
      getBackendUrl(`conference/${encodeURIComponent(conferenceName)}/ticker`),
    );
    const payload = await response.json().catch(() => ({ error: 'Empty response from backend' }));

    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json({ error: 'Ошибка при загрузке статуса тикера' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conferenceName: string }> },
) {
  try {
    const { conferenceName } = await params;
    const body = await request.json().catch(() => ({}));
    const response = await fetch(
      getBackendUrl(`conference/${encodeURIComponent(conferenceName)}/ticker`),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );
    const payload = await response.json().catch(() => ({ error: 'Empty response from backend' }));

    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json({ error: 'Ошибка при управлении тикером' }, { status: 500 });
  }
}
