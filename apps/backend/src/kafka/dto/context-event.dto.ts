export class TextContextEventDto {
  text!: string
}

export class FileContextEventDto {
  conferenceName!: string
  filename!: string
  bucket!: string
  objectKey!: string
  contentType?: string
  size!: number
}
