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
            // Передаём имя в массиве — вернёт только эту комнату, если она есть
            const rooms = await this.roomService.listRooms([roomName]);
            return rooms.length > 0;
        } catch (error: any) {
            if (error?.status === 401 || error?.status === 403) {
                throw error; // критичная ошибка авторизации
            }
            console.log(`[roomExists] here was some warn`);
            return false;
        }
    }

    async generateToken(conferenceName: string, participantName: string, isAdmin: boolean): Promise<string> {
        console.log(`[generateToken] Processing request for room: ${conferenceName}, participant: ${participantName}`);
        
        // 1. Проверяем, существует ли комната (SDK v2.x: listRooms принимает массив имён)
        let roomExists = false;
        try {
            const rooms = await this.roomService.listRooms([conferenceName]);
            roomExists = rooms.length > 0;
            console.log(`[generateToken] Room ${conferenceName} exists: ${roomExists}`);
        } catch (error: any) {
            if (error?.status === 401 || error?.status === 403) {
                console.error(`[generateToken] Auth error checking room:`, error.message);
                throw error;
            }
            console.warn(`[generateToken] Could not check room existence:`, error.message);
            // При ошибке сети считаем, что комнаты нет — агент диспатчится при создании
            roomExists = false;
        }

        // 2. Создаём AccessToken
        const token = new AccessToken(this.API_KEY, this.API_Secret, {
            identity: participantName,
            name: participantName,
            // ttl: 3600, // опционально: время жизни токена в секундах
        });

        // 3. Если комната создаётся впервые — добавляем конфигурацию с агентом
        if (!roomExists) {
            console.log(`[generateToken] Setting roomConfig with agent: default-agent`);
            token.roomConfig = {
                agents: [{
                    agent_name: 'default-agent', 
                    metadata: JSON.stringify({ 
                        initiator: participantName,
                        createdAt: new Date().toISOString(),
                        conference: conferenceName
                    })
                }]
            };
        }

        // 4. Добавляем права доступа (гранты)
        token.addGrant({
            roomJoin: true,
            room: conferenceName,
            canPublish: true,
            canSubscribe: true,
            canPublishData: true,
            roomAdmin: isAdmin,
            // canUpdateOwnMetadata: true, // опционально
        });

        // 5. Генерируем и возвращаем JWT
        const jwt = await token.toJwt();
        console.log(`[generateToken] Token generated successfully for ${participantName}`);
        
        console.log('[generateToken] roomConfig:', JSON.stringify(token.roomConfig, null, 2));
        
        return jwt;
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
