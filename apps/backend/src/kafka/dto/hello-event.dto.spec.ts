import { validate } from "class-validator"
import { HelloEventDto } from "./hello-event.dto"

describe("HelloEventDto", () => {
  it("validates message is a non-empty string", async () => {
    const dto = new HelloEventDto()

    let errors = await validate(dto)
    expect(errors.length).toBeGreaterThan(0)

    dto.message = 123 as unknown as string
    errors = await validate(dto)
    expect(errors.length).toBeGreaterThan(0)

    dto.message = "ok"
    errors = await validate(dto)
    expect(errors.length).toBe(0)
  })
})
