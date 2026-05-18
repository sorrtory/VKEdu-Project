import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
  type BucketLocationConstraint,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { Injectable, ServiceUnavailableException } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { randomUUID } from "node:crypto"

export interface StoredObject {
  bucket: string
  key: string
  filename: string
  contentType?: string
  size: number
}

@Injectable()
export class S3StorageService {
  private readonly bucket: string | undefined
  private readonly region: string
  private readonly client: S3Client | undefined
  private bucketReady = false

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>("S3_ENDPOINT")
    const accessKeyId = this.configService.get<string>("S3_ACCESS_KEY_ID")
    const secretAccessKey = this.configService.get<string>(
      "S3_SECRET_ACCESS_KEY",
    )

    this.bucket = this.configService.get<string>("S3_BUCKET")
    this.region = this.configService.get<string>("S3_REGION") ?? "us-east-1"

    if (this.bucket && accessKeyId && secretAccessKey) {
      this.client = new S3Client({
        region: this.region,
        endpoint,
        forcePathStyle:
          this.configService.get<string>("S3_FORCE_PATH_STYLE") !== "false",
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      })
    }
  }

  async uploadConferenceFile(params: {
    conferenceName: string
    file: Express.Multer.File
  }): Promise<StoredObject> {
    this.ensureConfigured()
    await this.ensureBucket()

    const filename = this.sanitizeSegment(params.file.originalname || "file")
    const conferenceName = this.sanitizeSegment(params.conferenceName)
    const key = `conferences/${conferenceName}/${Date.now()}-${randomUUID()}-${filename}`

    await this.client!.send(
      new PutObjectCommand({
        Bucket: this.bucket!,
        Key: key,
        Body: params.file.buffer,
        ContentLength: params.file.size,
        ContentType: params.file.mimetype,
        Metadata: {
          originalFilename: encodeURIComponent(params.file.originalname),
          conferenceName: encodeURIComponent(params.conferenceName),
        },
      }),
    )

    return {
      bucket: this.bucket!,
      key,
      filename: params.file.originalname,
      contentType: params.file.mimetype,
      size: params.file.size,
    }
  }

  async createDownloadUrl(key: string): Promise<string> {
    this.ensureConfigured()

    return getSignedUrl(
      this.client!,
      new GetObjectCommand({
        Bucket: this.bucket!,
        Key: key,
      }),
      { expiresIn: this.getDownloadTtlSeconds() },
    )
  }

  getDownloadTtlSeconds(): number {
    const ttl = Number(
      this.configService.get<string>("S3_DOWNLOAD_TTL_SECONDS"),
    )
    return Number.isFinite(ttl) && ttl > 0 ? ttl : 900
  }

  private ensureConfigured() {
    if (!this.client || !this.bucket) {
      throw new ServiceUnavailableException(
        "S3 storage is not configured. Set S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY.",
      )
    }
  }

  private async ensureBucket() {
    if (this.bucketReady) {
      return
    }

    try {
      await this.client!.send(new HeadBucketCommand({ Bucket: this.bucket! }))
    } catch {
      const createBucketInput: {
        Bucket: string
        CreateBucketConfiguration?: {
          LocationConstraint: BucketLocationConstraint
        }
      } = { Bucket: this.bucket! }

      if (this.region !== "us-east-1") {
        createBucketInput.CreateBucketConfiguration = {
          LocationConstraint: this.region as BucketLocationConstraint,
        }
      }

      await this.client!.send(new CreateBucketCommand(createBucketInput))
    }

    this.bucketReady = true
  }

  private sanitizeSegment(value: string): string {
    const sanitized = value.trim().replace(/[^a-zA-Z0-9._-]/g, "_")
    return sanitized || "file"
  }
}
