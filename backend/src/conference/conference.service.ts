import { AccessToken, RoomServiceClient, TrackSource, VideoGrant } from "livekit-server-sdk";


export class ConferenceService {
    private readonly roomService: RoomServiceClient;
    private readonly API_KEY: string;
    private readonly API_Secret: string;

    constructor() {

        const LK_HOST = 'http://livekit:7880';
        this.API_KEY = 'devkey';
        this.API_Secret = 'secret_hehe_boy_a3f8c1e9b2d4f6a0c5e7b9d1f3a5c8e2b4d6f8a0c2e4b6d8f0a2c4e6b8d0f2a4';


        this.roomService = new RoomServiceClient(LK_HOST, this.API_KEY, this.API_Secret);
    }

    // Генерит входной токен для конфы
    async generateToken(conferenceName: string, participantName: string, isAdmin: boolean) {

        const token = new AccessToken(this.API_KEY, this.API_Secret, 
            {identity: participantName, name: participantName}
        )

        const grant: VideoGrant = {
            roomJoin: true,
            room: conferenceName,
            canPublish: true,
            canSubscribe: true,

            roomAdmin: isAdmin,
        }

        token.addGrant(grant);

        return token.toJwt();
    }

    // + конфа
    async createConference(conferenceName: string) {
        await this.roomService.createRoom({name: conferenceName});
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