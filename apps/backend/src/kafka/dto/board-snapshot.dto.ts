import { IsString, IsISO8601, IsNotEmpty, IsOptional } from "class-validator"

export class BoardSnapshotEventDto {
  @IsNotEmpty()
  @IsString()
  conferenceId!: string

  @IsNotEmpty()
  @IsString()
  imageBase64!: string

  @IsNotEmpty()
  @IsISO8601()
  capturedAt!: string

  @IsOptional()
  @IsString()
  speakerId?: string

  @IsOptional()
  @IsString()
  revision?: string
}
