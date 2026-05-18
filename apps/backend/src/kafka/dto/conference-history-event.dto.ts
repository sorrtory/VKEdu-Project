import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator"

export class ConferenceHistoryEventDto {
  @IsString()
  @IsOptional()
  conferenceName?: string

  @IsString()
  @IsOptional()
  roomId?: string

  @IsString()
  @IsOptional()
  senderId?: string

  @IsString()
  @IsOptional()
  senderName?: string

  @IsString()
  @IsOptional()
  speakerId?: string

  @IsString()
  @IsOptional()
  speakerName?: string

  @IsString()
  @IsNotEmpty()
  text!: string

  @IsDateString()
  @IsOptional()
  createdAt?: string
}

export class TranscriptHistoryEventDto extends ConferenceHistoryEventDto {
  @IsString()
  @IsIn(["voice", "chat", "board", "file"])
  @IsOptional()
  source?: "voice" | "chat" | "board" | "file"

  @IsDateString()
  @IsOptional()
  occurredAt?: string
}
