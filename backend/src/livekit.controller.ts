import { Controller, Get, Query } from '@nestjs/common';
import { AccessToken } from 'livekit-server-sdk';

@Controller('livekit')
export class LivekitController {
  @Get('token')
  async getToken(
    @Query('room') room = 'hello-world',
    @Query('identity') identity = `user-${Math.floor(Math.random() * 10000)}`,
  ) {
    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      { identity },
    );

    at.addGrant({
      roomJoin: true,
      room,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    return {
      token,
      serverUrl: process.env.LIVEKIT_URL,
      roomName: room,
      identity,
    };
  }
}
