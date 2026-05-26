export class BoardCropEventDto {
  conferenceName!: string
  roomId!: string
  participantIdentity?: string
  participantName?: string
  filename!: string
  contentType?: string
  size!: number
  imageBase64!: string
}