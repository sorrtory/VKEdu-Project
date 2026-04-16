import { Test, TestingModule } from "@nestjs/testing"
import { INestApplication } from "@nestjs/common"
import request from "supertest"
import type { Server } from "http"
import { of } from "rxjs"
import { AppModule } from "../src/app.module"

describe("Send Endpoint (real e2e without AppService mock)", () => {
  let app: INestApplication

  beforeEach(async () => {
    // Ensure ClientsModule registers Kafka provider
    process.env.KAFKA_BROKERS = process.env.KAFKA_BROKERS || "broker:9092"

    // Minimal fake Kafka client that mimics ClientKafka shape
    const fakeKafka = {
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      emit: jest.fn().mockReturnValue(of({})),
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider("KAFKA_SERVICE")
      .useValue(fakeKafka)
      .compile()

    app = moduleFixture.createNestApplication()
    await app.init()
  })

  it("/send (POST) uploads file and returns success (real AppService)", async () => {
    const httpServer = app.getHttpServer() as Server
    const res = await request(httpServer)
      .post("/send")
      .field("metadata", JSON.stringify({ foo: "bar" }))
      .attach("file", Buffer.from("pngdata"), "test.png")
      .expect(201)

    expect(res.body).toEqual({
      success: true,
      message: "Image sent to Kafka",
      filename: "test.png",
    })
  })
})
