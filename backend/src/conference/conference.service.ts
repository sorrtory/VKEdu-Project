import { Injectable } from '@nestjs/common';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';

@Injectable()
export class ConferenceService {
  private readonly roomService: RoomServiceClient;
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor() {
    const host = process.env.LIVEKIT_HOST ?? 'http://livekit:7880';
    const apiKey = process.env.LIVEKIT_API_KEY ?? 'devkey';
    const apiSecret = process.env.LIVEKIT_API_SECRET ?? process.env.LK_KEY;

    if (!apiKey || !apiSecret) {
      throw new Error('LiveKit API credentials are not configured');
    }

    this.apiKey = apiKey;
    this.apiSecret = apiSecret;

    this.roomService = new RoomServiceClient(host, apiKey, apiSecret);
  }

  async createRoom(roomName: string) {
    await this.roomService.createRoom({
      name: roomName,
    });
  }

  async generateToken(
    roomName: string,
    participantName: string,
  ): Promise<string> {
    const accessToken = new AccessToken(this.apiKey, this.apiSecret, {
      identity: participantName,
      name: participantName,
    });

    accessToken.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });

    return accessToken.toJwt();
  }
}
