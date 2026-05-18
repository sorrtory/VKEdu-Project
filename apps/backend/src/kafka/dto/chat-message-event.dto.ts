import { IsDateString, IsIn, IsNotEmpty, IsString } from "class-validator"

export class ChatMessageEventDto {
  @IsString()
  @IsNotEmpty()
  roomId!: string

  @IsString()
  @IsNotEmpty()
  senderId!: string

  @IsString()
  @IsNotEmpty()
  senderName!: string

  @IsString()
  @IsIn(["chat", "ai"])
  senderType!: "chat" | "ai"

  @IsString()
  @IsNotEmpty()
  text!: string

  @IsDateString()
  createdAt!: string
}
