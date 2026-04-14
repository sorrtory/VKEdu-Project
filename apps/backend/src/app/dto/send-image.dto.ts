import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SendImageDto {
  @ApiPropertyOptional({
    description: 'Optional metadata passed with the uploaded file',
    example: '{"topic":"geometry"}',
  })
  @IsOptional()
  @IsString()
  metadata?: string;
}
