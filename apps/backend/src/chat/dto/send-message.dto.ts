import { IsNotEmpty, IsOptional, IsString } from "class-validator"

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  roomId!: string

  @IsString()
  @IsOptional()
  senderId?: string

  @IsString()
  @IsNotEmpty()
  text!: string

  @IsString()
  @IsOptional()
  senderName?: string
}
