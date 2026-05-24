import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '../../../shared';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conferenceName: string }> },
) {
  try {
    const { conferenceName } = await params;
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    const response = await fetch(
      getBackendUrl(`conference/${encodeURIComponent(conferenceName)}/boardcrop`),
      {
        method: 'POST',
        body: formData,
      },
    );

    const payload = await response.json().catch(() => ({ error: 'Empty response from backend' }));
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json(
      { error: 'Ошибка при отправке снапшота доски' },
      { status: 500 },
    );
  }
}