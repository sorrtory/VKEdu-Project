import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { IsOptional, IsString } from "class-validator"

export class BoardCropMetadataDto {
  @ApiPropertyOptional({
    description: "Identity of the participant who captured the snapshot",
    example: "creator-1",
  })
  @IsOptional()
  @IsString()
  participantIdentity?: string

  @ApiPropertyOptional({
    description: "Display name of the participant who captured the snapshot",
    example: "Alice",
  })
  @IsOptional()
  @IsString()
  participantName?: string
}

export class BoardCropResponseDto {
  @ApiProperty({ example: true })
  success!: boolean

  @ApiProperty({ example: "Board snapshot sent to Kafka" })
  message!: string
}
