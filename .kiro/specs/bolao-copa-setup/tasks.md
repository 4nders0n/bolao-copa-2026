# Implementation Plan: Bolão Copa Setup

## Overview

This plan implements the foundational setup of the Bolão Copa do Mundo 2026 system — a Next.js 14+ App Router application with TypeScript strict mode, Prisma/SQLite, NextAuth.js Google OAuth, Tailwind CSS, Zod validation, and a scoring/ranking engine with property-based tests. Tasks are ordered to build incrementally, starting with scaffolding and ending with full integration.

## Tasks

- [x] 1. Project scaffolding and configuration
  - [x] 1.1 Initialize Next.js 14+ project with TypeScript strict mode and Tailwind CSS
    - Create the Next.js project with App Router enabled
    - Configure `tsconfig.json` with `strict: true`
    - Set up Tailwind CSS with default config
    - Create the `src/` directory structure: `app/`, `components/`, `lib/`, `server/`
    - _Requirements: 1.1, 1.2, 1.4, 1.6_

  - [x] 1.2 Install and configure Prisma with SQLite
    - Install `prisma` and `@prisma/client`
    - Run `prisma init` with SQLite provider
    - Create the `prisma/schema.prisma` file with SQLite datasource
    - Create `src/lib/prisma.ts` singleton client
    - _Requirements: 1.3_

  - [x] 1.3 Install and configure Vitest with fast-check
    - Install `vitest` and `fast-check` as dev dependencies
    - Create `vitest.config.ts` with path aliases matching tsconfig
    - Write a sanity test (`src/lib/__tests__/sanity.test.ts`) that passes to confirm setup works
    - _Requirements: 1.8_

  - [x] 1.4 Install Zod and NextAuth.js dependencies
    - Install `zod`, `next-auth`, `@auth/prisma-adapter`
    - Create placeholder `.env.example` with required environment variables (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXTAUTH_SECRET, NEXTAUTH_URL, DATABASE_URL)
    - _Requirements: 1.5, 1.9_

- [x] 2. Database schema (Prisma models)
  - [x] 2.1 Define User, Account, and Session models in Prisma schema
    - Add User model with id (cuid), name (optional), email (unique), image (optional), role (default "user"), createdAt, updatedAt
    - Add Account and Session models as per NextAuth.js Prisma Adapter requirements
    - Configure cascade delete from User to Account/Session
    - Run `prisma generate` to create the client
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 2.2 Define Match model in Prisma schema
    - Add Match model with id (cuid), homeTeam, awayTeam, matchDate (DateTime), phase, group (optional), homeScore (optional Int), awayScore (optional Int), status (default "scheduled"), createdAt, updatedAt
    - Add unique constraint on `[homeTeam, awayTeam, matchDate]`
    - _Requirements: 4.1, 4.6_

  - [x] 2.3 Define Prediction model in Prisma schema
    - Add Prediction model with id (cuid), userId (FK), matchId (FK), homeScore (Int), awayScore (Int), points (optional Int), createdAt, updatedAt
    - Add unique constraint on `[userId, matchId]`
    - Configure cascade deletes from User and Match to Prediction
    - Run `prisma db push` to apply schema to SQLite
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 3. Authentication setup
  - [x] 3.1 Configure NextAuth.js with Google OAuth provider and Prisma adapter
    - Create `src/lib/auth.ts` with NextAuth configuration
    - Configure Google OAuth provider using environment variables
    - Set up Prisma adapter for session/account persistence
    - Include user role in session callbacks
    - Set session maxAge to 30 days
    - _Requirements: 2.1, 2.2, 2.4, 2.5_

  - [x] 3.2 Create NextAuth API route and session provider
    - Create `src/app/api/auth/[...nextauth]/route.ts` exporting GET and POST handlers
    - Create `src/components/SessionProvider.tsx` client component wrapping NextAuth SessionProvider
    - Update `src/app/layout.tsx` to include the SessionProvider
    - _Requirements: 2.1, 2.4_

  - [x] 3.3 Create login page and AuthButton component
    - Create `src/app/login/page.tsx` with Google sign-in button
    - Create `src/components/AuthButton.tsx` showing login/logout based on session state
    - Handle OAuth error display on the login page
    - _Requirements: 2.1, 2.3, 2.5_

  - [x] 3.4 Implement middleware for protected routes
    - Create `src/middleware.ts` to protect routes and redirect unauthenticated users to login with callbackUrl
    - Configure matcher to exclude public routes (login, api/auth, static assets)
    - _Requirements: 2.6, 2.7_

- [x] 4. Checkpoint - Verify scaffolding, schema, and auth
  - Ensure the project builds without TypeScript errors
  - Ensure `prisma generate` succeeds
  - Ensure the sanity test passes with `vitest --run`
  - Ask the user if questions arise

- [x] 5. Validation schemas (Zod)
  - [x] 5.1 Create prediction and match validation schemas
    - Create `src/lib/validations.ts`
    - Define `predictionSchema` validating matchId (cuid string), homeScore (int 0-99), awayScore (int 0-99)
    - Define `matchResultSchema` validating matchId (cuid string), homeScore (int 0-99), awayScore (int 0-99)
    - Define `matchStatusTransitionSchema` enforcing valid transitions (scheduled→live, live→finished)
    - Export inferred TypeScript types from schemas
    - _Requirements: 6.4, 6.5, 4.5_

  - [x]* 5.2 Write property test for prediction score validation (Property 5)
    - **Property 5: Prediction score validation**
    - Test that the schema accepts integers in [0, 99] and rejects all other values (negatives, >99, floats, strings)
    - Use `fc.integer()`, `fc.double()`, `fc.string()` generators
    - **Validates: Requirements 6.4, 6.5**

  - [x]* 5.3 Write property test for match status transition validity (Property 2)
    - **Property 2: Match status transition validity**
    - Test that only ("scheduled","live") and ("live","finished") transitions are accepted, all others rejected
    - Use `fc.constantFrom("scheduled","live","finished")` pairs
    - **Validates: Requirements 4.5**

- [x] 6. Scoring engine
  - [x] 6.1 Implement the `calculatePoints` function
    - Create `src/lib/scoring.ts`
    - Implement the `calculatePoints(input: ScoreInput): ScoringTier` pure function
    - Apply tier logic: exact (10), winner+goal diff (7), winner/draw only (5), wrong (0)
    - Ensure mutual exclusivity — exactly one tier applies per input
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x]* 6.2 Write property test for scoring tier correctness (Property 6)
    - **Property 6: Scoring tier correctness and mutual exclusivity**
    - Generate all four scores with `fc.integer({min:0, max:99})`
    - Assert exactly one tier applies and the returned value matches the tier conditions
    - **Validates: Requirements 7.2, 7.3, 7.4, 7.5, 7.6, 7.7**

  - [x] 6.3 Implement `scoreMatchPredictions` function for batch scoring
    - Add function to `src/lib/scoring.ts` that takes a match result and array of predictions, returns scored predictions
    - Ensure it preserves previous points on failure for individual predictions
    - _Requirements: 7.1, 7.7, 7.8_

  - [ ]* 6.4 Write property test for match score-status invariant (Property 1) _(skipped - requires DB integration)_
    - **Property 1: Match score-status invariant**
    - Test that scheduled→scores null, live→scores nullable [0,99], finished→scores required [0,99]
    - **Validates: Requirements 4.2, 4.3, 4.4**

  - [x]* 6.5 Write unit tests for scoring engine edge cases
    - Test 0-0 draws, high-score matches, boundary values (0, 99)
    - Test recalculation when result is updated
    - _Requirements: 7.2, 7.3, 7.4, 7.5_

- [x] 7. Ranking engine
  - [x] 7.1 Implement `calculateRanking` function for overall ranking
    - Create `src/lib/ranking.ts`
    - Implement `calculateRanking(predictions: ScoredPrediction[]): RankedUser[]`
    - Sort by total score descending, then exact predictions count descending, then earliest exact prediction timestamp ascending
    - Position users with zero scored predictions below scored users
    - _Requirements: 8.1, 8.2, 8.3, 8.5_

  - [x]* 7.2 Write property test for total score sum (Property 7)
    - **Property 7: Total score is sum of scored predictions**
    - Generate arrays of scored predictions and verify total equals arithmetic sum of points
    - **Validates: Requirements 8.1**

  - [x]* 7.3 Write property test for overall ranking order (Property 8)
    - **Property 8: Overall ranking order**
    - Verify ordering by total score, then exact predictions, then earliest exact timestamp
    - Verify zero-scored users appear at the bottom
    - **Validates: Requirements 8.2, 8.3, 8.5**

  - [x] 7.4 Implement `calculatePhaseRanking` function
    - Add `calculatePhaseRanking(predictions: ScoredPrediction[], phase: Phase): PhaseRankedUser[]`
    - Filter predictions to only those matching the given phase
    - Sort by phase points descending, exact predictions in phase descending, alphabetical name ascending
    - Include only users with at least one prediction in the phase
    - _Requirements: 9.1, 9.4, 9.7_

  - [x]* 7.5 Write property test for phase ranking scoping (Property 9)
    - **Property 9: Phase ranking scoping**
    - Generate predictions across multiple phases; verify phase ranking only sums points from the specified phase
    - **Validates: Requirements 9.1, 9.7**

  - [x]* 7.6 Write property test for phase ranking order (Property 12)
    - **Property 12: Phase ranking order**
    - Verify ordering by phase points, then exact predictions count, then alphabetical name
    - **Validates: Requirements 9.4**

  - [x] 7.7 Implement phase display and finalization helpers
    - Add `shouldDisplayPhaseRanking(matches: Match[]): boolean` — returns true if phase has at least one finished match
    - Add `isPhaseFinalized(matches: Match[], predictions: Prediction[]): boolean` — returns true if all matches finished and scored
    - _Requirements: 9.2, 9.3, 9.8_

  - [x]* 7.8 Write property test for phase display condition (Property 10)
    - **Property 10: Phase ranking display condition**
    - Verify ranking displays iff phase has at least one finished match
    - **Validates: Requirements 9.2, 9.8**

  - [x]* 7.9 Write property test for phase finalization (Property 11)
    - **Property 11: Phase ranking finalization**
    - Verify phase is marked final iff all matches finished and predictions scored
    - **Validates: Requirements 9.3**

- [x] 8. Checkpoint - Verify scoring and ranking engines
  - Ensure all tests pass with `vitest --run`
  - Ask the user if questions arise

- [x] 9. Server actions for predictions
  - [x] 9.1 Implement `submitPrediction` server action
    - Create `src/server/actions/predictions.ts`
    - Validate input with `predictionSchema`
    - Check authentication (reject if unauthenticated)
    - Enforce deadline: reject if current time >= matchDate
    - Upsert prediction (create or update if exists and deadline not passed)
    - Return `ActionResult` with success/error
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 9.2 Write property test for prediction deadline enforcement (Property 3) _(requires DB integration)_
    - **Property 3: Prediction deadline enforcement**
    - Generate timestamps relative to matchDate; verify acceptance iff timestamp < matchDate
    - **Validates: Requirements 6.1, 6.2**

  - [ ]* 9.3 Write property test for prediction upsert before deadline (Property 4) _(requires DB integration)_
    - **Property 4: Prediction upsert before deadline**
    - Verify that re-submitting before deadline updates existing record without creating duplicates
    - **Validates: Requirements 6.3**

- [x] 10. Server actions for match management
  - [x] 10.1 Implement `registerMatchResult` server action
    - Create `src/server/actions/matches.ts`
    - Validate input with `matchResultSchema`
    - Enforce admin-only access
    - Validate status transition (must be transitioning to "finished")
    - Update match scores and status
    - Trigger scoring engine for all associated predictions
    - Return `ActionResult`
    - _Requirements: 7.1, 7.7, 4.4, 4.5_

  - [x] 10.2 Implement `updateMatchStatus` server action
    - Validate status transition (scheduled→live, live→finished)
    - Enforce score-status invariant: require scores when finishing, reject scores when scheduling
    - Update match record in transaction
    - _Requirements: 4.2, 4.3, 4.4, 4.5_

  - [ ]* 10.3 Write unit tests for match management actions _(requires DB integration)_
    - Test valid transitions, invalid transitions, missing scores on finish, admin-only enforcement
    - _Requirements: 4.5, 7.1_

- [x] 11. Server queries
  - [x] 11.1 Implement ranking and match queries
    - Create `src/server/queries/ranking.ts` with `getRanking()` and `getPhaseRanking(phase)`
    - Create `src/server/queries/matches.ts` with `getMatches()`, `getMatchById(id)`, `getMatchesByPhase(phase)`
    - Create `src/server/queries/predictions.ts` with `getUserPredictions(userId)`, `getMatchPredictions(matchId)`
    - _Requirements: 8.1, 8.2, 8.4, 9.1, 9.2, 9.6_

- [x] 12. Integration and wiring
  - [x] 12.1 Create the home page with overall ranking display
    - Create `src/app/page.tsx` as a Server Component
    - Fetch and display the overall ranking using `getRanking()`
    - Show position, name, total score, and exact predictions count for each user
    - _Requirements: 8.2_

  - [x] 12.2 Wire prediction submission UI placeholder
    - Create a basic prediction form component (Client Component) that calls `submitPrediction`
    - Display validation errors and deadline messages from server action response
    - _Requirements: 6.1, 6.4, 6.5_

  - [ ]* 12.3 Write integration tests for scoring pipeline _(requires DB integration)_
    - Test full flow: register match result → scoring runs → ranking reflects new totals
    - Test cascade deletes: delete user → predictions removed
    - _Requirements: 7.1, 8.4, 5.3_

- [x] 13. Final checkpoint - Ensure all tests pass
  - Ensure the project builds without TypeScript errors
  - Ensure all tests pass with `vitest --run`
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate the 12 universal correctness properties defined in the design
- Unit tests validate specific examples and edge cases
- The scoring engine is synchronous (small dataset: ~100 users × 64 matches)
- All Server Actions return `ActionResult<T>` type for consistent error handling

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4"] },
    { "id": 2, "tasks": ["2.1", "2.2", "2.3"] },
    { "id": 3, "tasks": ["3.1", "5.1"] },
    { "id": 4, "tasks": ["3.2", "3.3", "3.4", "5.2", "5.3"] },
    { "id": 5, "tasks": ["6.1", "7.1", "7.4", "7.7"] },
    { "id": 6, "tasks": ["6.2", "6.3", "6.4", "6.5", "7.2", "7.3", "7.5", "7.6", "7.8", "7.9"] },
    { "id": 7, "tasks": ["9.1", "10.1", "10.2"] },
    { "id": 8, "tasks": ["9.2", "9.3", "10.3", "11.1"] },
    { "id": 9, "tasks": ["12.1", "12.2"] },
    { "id": 10, "tasks": ["12.3"] }
  ]
}
```
