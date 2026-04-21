import { NextRequest, NextResponse } from "next/server";
import { getBackendAuthUrl, getJsonPayload } from "../shared";

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization');
    if (!authorization) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const response = await fetch(`${getBackendAuthUrl()}/me`, {
      method: 'GET',
      headers: {
        Authorization: authorization,
      },
    });

    const payload = await getJsonPayload(response);
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json(
      { error: 'Ошибка при получении профиля' },
      { status: 500 },
    );
  }
}