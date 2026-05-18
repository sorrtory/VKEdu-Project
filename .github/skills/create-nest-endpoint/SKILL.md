---
name: create-nest-endpoint
description: Create or update a NestJS HTTP endpoint in this repository with explicit OpenAPI documentation and at least one test. Use when adding a new controller route, request DTO, response contract, Swagger decorators, or endpoint-level backend test coverage.
---

# Create Nest Endpoint

Follow this procedure when implementing a new endpoint in `backend/`.

## Read First

1. Read `AGENTS.md`.
2. Read `.github/instructions/typescript-conventions.instructions.md`.
3. Read `docs/backend.md`.
4. Inspect the target module under `backend/src/**` before adding files.
5. Check `backend/src/main.ts` to confirm global Swagger setup is still present.

## Step-By-Step

1. Identify the target module.
   If a matching module already exists, extend it instead of creating a parallel module.

2. Define the endpoint contract first.
   Decide:
   - HTTP method and route
   - request body, params, and query shape
   - response status code
   - response body shape
   - service method name

3. Create explicit DTOs when the endpoint accepts structured input or returns structured output.
   Use classes for Swagger compatibility.

4. Add Swagger decorators to every new route.
   Minimum expectation:
   - `@ApiOperation({ summary: '...' })`
   - `@ApiBody({ type: CreateSomethingDto })` when there is a request body
   - `@ApiOkResponse(...)`, `@ApiCreatedResponse(...)`, or another accurate success decorator
   - `@ApiBadRequestResponse(...)` or other error decorators when relevant
   - `@ApiTags('...')` on the controller if missing

5. Add Swagger field metadata on DTO properties.
   Use `@ApiProperty()` or `@ApiPropertyOptional()` so the generated OpenAPI schema is useful, not generic.

6. Keep controller methods thin.
   The controller should parse input and delegate to the service.
   Business logic belongs in the service.

7. Keep TypeScript strict.
   Follow repo conventions:
   - use interfaces for object shapes when appropriate
   - handle `null` and `undefined` safely
   - prefer `async/await`

8. Add a test with the endpoint.
   Minimum requirement: add or update a focused test that exercises the new route.
   Prefer:
   - controller unit test when logic is simple and isolated
   - e2e test when route wiring, validation, or HTTP contract matters

9. Validate the implementation.
   Run the smallest relevant checks first, then broaden only if needed:
   - affected unit test
   - affected e2e test
   - `yarn lint`

10. Report the outcome.
   Summarize:
   - route added
   - DTOs added
   - Swagger decorators added
   - tests added or updated
   - commands run

## Endpoint Checklist

- Route lives in the correct module and controller.
- Request and response shapes are explicit.
- DTOs are named clearly.
- Swagger decorators exist on the route.
- DTO fields have `@ApiProperty` metadata.
- Success response decorator matches the actual status code.
- Error response decorators are present when relevant.
- Test coverage exists for the new endpoint.
- Lint and targeted tests pass.

## Swagger Pattern

```ts
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';

class CreateConferenceDto {
  @ApiProperty({
    description: 'Unique room name for the conference',
    example: 'math-101',
  })
  roomName: string;
}

class CreateConferenceResponseDto {
  @ApiProperty({ example: true })
  success: boolean;
}

@ApiTags('conference')
@Controller('conference')
export class ConferenceController {
  @Post('room')
  @ApiOperation({ summary: 'Create a conference room' })
  @ApiBody({ type: CreateConferenceDto })
  @ApiCreatedResponse({ type: CreateConferenceResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  async createRoom(
    @Body() body: CreateConferenceDto,
  ): Promise<CreateConferenceResponseDto> {
    return { success: true };
  }
}
```

Use the correct success decorator for the actual behavior. Do not claim `201` if the route returns `200`.

## Test Pattern

For a route-level e2e test, prefer the existing `supertest` setup under `backend/test/`.

```ts
it('/conference/room (POST)', () => {
  return request(app.getHttpServer())
    .post('/conference/room')
    .send({ roomName: 'math-101' })
    .expect(201)
    .expect({ success: true });
});
```

If the service calls external systems, mock the provider in a unit test or isolate the e2e path so the test remains deterministic.

## Guardrails

- Do not add undocumented endpoints.
- Do not use inline anonymous body types for new routes.
- Do not put business logic in the controller.
- Do not skip tests for a new endpoint unless the user explicitly accepts that tradeoff.
- Do not change global Swagger bootstrap in `backend/src/main.ts` unless the task requires it.
