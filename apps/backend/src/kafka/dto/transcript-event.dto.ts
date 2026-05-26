import { Type } from "class-transformer"
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { IsInt, IsOptional, IsString } from "class-validator"

export class TranscriptEventDto {
  @ApiProperty({ example: "2026-05-24T10:15:30.000Z" })
  @IsString()
  timestamp!: string

  @ApiProperty({ example: "speech" })
  @IsString()
  type!: string

  @ApiProperty({ example: "room-123" })
  @IsString()
  room_id!: string

  @ApiProperty({ example: "room-123" })
  @IsString()
  room_name!: string

  @ApiPropertyOptional({ example: "participant-1" })
  @IsOptional()
  @IsString()
  participant_id?: string

  @ApiPropertyOptional({ example: "alice" })
  @IsOptional()
  @IsString()
  participant_identity?: string

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  sequence!: number

  @ApiProperty({ example: "Hello, world" })
  @IsString()
  text!: string
}
