# AGENTS

## Purpose

This repository is an MVP for an educational video conferencing platform with AI assistance:

- real-time subtitles
- live meeting summaries
- shared conference context from uploaded documents and a whiteboard
- conference archive and transcript export

Keep work aligned with the MVP.
Prefer the smallest working implementation over broad platform design.

## Read First

First of all, ensure that you have project main `.github` AI instructions, skills and agents in the context. Use the most specific agent for the task at hand, but refer to the general instructions in `AGENTS.md` for overall guidance on working style, conventions, and delivery standards.

Before making non-trivial changes, read these files in order:

1. `docs/mvp/description.md` when working on core product features and architecture
2. `docs/backend.md` when working in `backend/`
3. other relevant docs in `docs/` for specific features or domains

Use the docs as product context.
Do not duplicate long product descriptions in code comments or PR summaries.

## Working Rules

- Preserve existing architecture and naming unless the task requires change.
- Prefer incremental changes over large refactors.
- Match the stack already present in each app area.
- Keep new abstractions justified; avoid speculative layers for future features.
- Treat this project as MVP-first: implement the narrowest version that proves the workflow.

## Dev environment tips

- Use `yarn` for package management and scripts.
- Use `yarn test` for running tests and `yarn lint` for linting.
- Note that tests are run with `jest`
- If you need to work with the environment variables, check the `.env.example` file for reference and edit a `.env` file in the root directory with the necessary variables.
- On adding new dependencies, update the `docs/log.md` file with the relevant `yarn add` command for future reference.

## Backend Focus

When working in `backend/`:

- follow NestJS module/service/controller patterns already used in the codebase
- keep DTOs, validation, and API contracts explicit
- prefer targeted tests or checks for changed behavior
- use `docs/backend.md` for local run and endpoint test commands

## Frontend Focus

When working in `frontend/`:

- prefer simple flows that support the MVP demo
- avoid adding heavy state or styling systems unless already adopted
- keep UI tied to core product flows: conference, summary, transcript, whiteboard, and context documents

## Delivery Standard

- State assumptions when requirements are underspecified.
- Flag conflicts between a requested change and the MVP scope.
- Report what changed, what was validated, and any remaining risk.
