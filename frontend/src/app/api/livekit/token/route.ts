import { NextRequest, NextResponse } from "next/server";

const LIVEKIT_TOKEN_URL = "http://backend:3000/conference/token";

export async function POST(request: NextRequest) {
  try {
    
    const {conferenceName, participantName} = await request.json() 

    const response = await fetch(LIVEKIT_TOKEN_URL, {

      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({

        conferenceName: conferenceName,
        participantName: participantName
      })
    });

    const result = await response.json();
    
    return NextResponse.json({token: result.token})

  } catch (error) {

    return NextResponse.json(
      { error: 'Ошибка при получении токена' },
      { status: 500}
    );
  }
}