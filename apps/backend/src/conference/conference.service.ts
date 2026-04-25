import { 
    AccessToken, 
    RoomServiceClient, 
    TrackSource, 
    VideoGrant,
    RoomConfiguration,
    RoomAgentDispatch 
} from "livekit-server-sdk";

export class ConferenceService {
    private readonly roomService: RoomServiceClient;
    private readonly API_KEY: string;
    private readonly API_Secret: string;
    private readonly LK_HOST: string;

    constructor() {
        this.LK_HOST = 'http://livekit:7880';
        this.API_KEY = 'devkey';
        this.API_Secret = 'secret_hehe_boy_a3f8c1e9b2d4f6a0c5e7b9d1f3a5c8e2b4d6f8a0c2e4b6d8f0a2c4e6b8d0f2a4';
        this.roomService = new RoomServiceClient(this.LK_HOST, this.API_KEY, this.API_Secret);
    }

    // 🔍 Вспомогательный метод: проверка существования комнаты
    private async roomExists(roomName: string): Promise<boolean> {
        try {
            await this.roomService.getRoom(roomName);
            return true;
        } catch (error: any) {
            if (error?.status === 404) return false;
            // Другие ошибки (сеть, авторизация) — пробрасываем дальше
            throw error;
        }
    }

    async generateToken(conferenceName: string, participantName: string, isAdmin: boolean) {
        console.log(`[generateToken] Processing request for room: ${conferenceName}`);
        
        // 1. Проверяем, существует ли комната
        const exists = await this.roomExists(conferenceName);
        console.log(`[generateToken] Room ${conferenceName} exists: ${exists}`);
        
        // 2. Если комнаты нет — готовим конфигурацию с агентом
        let roomConfig: RoomConfiguration | undefined;
        if (!exists) {
            console.log(`[generateToken] Room will be created with agent: default-agent`);
            roomConfig = new RoomConfiguration({
                agents: [
                    new RoomAgentDispatch({
                        agentName: 'default-agent',
                        meta: JSON.stringify({ 
                            initiator: participantName,
                            createdAt: new Date().toISOString()
                        })
                    })
                ]
            });
        }

        // 3. Генерируем токен
        const token = new AccessToken(this.API_KEY, this.API_Secret, {
            identity: participantName, 
            name: participantName
        }, {
            roomConfig: roomConfig  // передаём конфиг (может быть undefined)
        });

        const grant: VideoGrant = {
            roomJoin: true,
            room: conferenceName,
            canPublish: true,
            canSubscribe: true,
            roomAdmin: isAdmin,
        };
        token.addGrant(grant);

        console.log(`[generateToken] Token generated for ${participantName}`);
        return token.toJwt();
    }

    // Опционально: явное создание комнаты без участника (агент НЕ прикрепится)
    async createConference(conferenceName: string) {
        await this.roomService.createRoom({ name: conferenceName });
    }


    // Мутит или размучивает треки участникам. True - включить, false - выключить.
    async manageTrack(conferenceName: string, callerName: string, targetName: string, trackType: TrackSource, type: boolean) {

        const participant = await this.roomService.getParticipant(conferenceName, targetName);
        for (const track of participant.tracks) {
            if (track.source === trackType) {
                await this.roomService.mutePublishedTrack(
                    conferenceName,
                    targetName,
                    track.sid,
                    type
                )
            }
        };
        
        return {success: true}
    }

    async onMicro(conferenceName: string, callerName: string, targetName: string) {
        await this.manageTrack(conferenceName, callerName, targetName, TrackSource.MICROPHONE, true)
    }

    async offMicro(conferenceName: string, callerName: string, targetName: string) {
        await this.manageTrack(conferenceName, callerName, targetName, TrackSource.MICROPHONE, false)    
    }

    async onCam(conferenceName: string, callerName: string, targetName: string) {
        await this.manageTrack(conferenceName, callerName, targetName, TrackSource.CAMERA, true)
    }

    async offCam(conferenceName: string, callerName: string, targetName: string) {
        await this.manageTrack(conferenceName, callerName, targetName, TrackSource.CAMERA, false)    
    }



}
