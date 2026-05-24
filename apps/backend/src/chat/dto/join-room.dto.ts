import { IsNotEmpty, IsString } from "class-validator"

export class JoinRoomDto {
  @IsString()
  @IsNotEmpty()
  roomId!: string

  @IsString()
  @IsNotEmpty()
  participantId!: string

  @IsString()
  @IsNotEmpty()
  participantName!: string
}
