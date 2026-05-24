export class BoardCropEventDto {
  conferenceName!: string
  participantIdentity?: string
  participantName?: string
  filename!: string
  contentType?: string
  size!: number
  imageBase64!: string
}