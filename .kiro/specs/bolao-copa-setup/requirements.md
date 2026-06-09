# Requirements Document

## Introduction

Especificação da fundação do sistema de Bolão para a Copa do Mundo 2026. Este documento cobre o scaffolding do projeto, modelo de dados (schema), autenticação via Google OAuth e o algoritmo de pontuação. É a base sobre a qual todas as features futuras serão construídas.

## Glossary

- **System**: O aplicativo web Bolão Copa 2026 como um todo
- **Auth_Module**: Módulo de autenticação baseado em NextAuth.js com provider Google OAuth
- **Database**: Banco de dados SQLite gerenciado via Prisma ORM
- **User**: Pessoa autenticada no sistema com conta Google
- **Admin**: User com papel administrativo que gerencia jogos e resultados
- **Match**: Partida/jogo da Copa do Mundo com duas seleções, data/hora e placar real
- **Prediction**: Palpite de um User para um Match específico, contendo placar previsto
- **Scoring_Engine**: Módulo responsável por calcular a pontuação de cada Prediction
- **Ranking**: Classificação dos Users baseada na pontuação acumulada
- **Phase**: Fase da competição (group_stage, round_of_32, round_of_16, quarter_finals, semi_finals, third_place, final)
- **Phase_Ranking**: Ranking parcial dos Users calculado por Phase específica

## Requirements

### Requirement 1: Project Scaffolding

**User Story:** Como desenvolvedor, eu quero um projeto Next.js 14+ configurado com TypeScript strict, Prisma, Tailwind CSS e NextAuth.js, para que eu tenha uma base sólida para desenvolver o sistema de bolão.

#### Acceptance Criteria

1. THE System SHALL use Next.js 14 or later with App Router as the application framework
2. THE System SHALL enforce TypeScript strict mode in the tsconfig.json configuration
3. THE System SHALL use Prisma ORM with SQLite as the database layer
4. THE System SHALL use Tailwind CSS as the styling framework
5. THE System SHALL use NextAuth.js with Google OAuth as the authentication provider, configured via environment variables for client ID and client secret
6. THE System SHALL organize source code in a feature-based structure under the `src/` directory with `app/`, `components/`, `lib/`, and `server/` subdirectories
7. THE System SHALL compile and build without TypeScript errors when running the project build command
8. THE System SHALL use Vitest as the test framework with at least one passing sanity test confirming the setup works
9. THE System SHALL use Zod as the runtime validation library

### Requirement 2: User Authentication

**User Story:** Como usuário, eu quero me autenticar usando minha conta Google, para que eu possa acessar o sistema de forma segura sem criar uma senha adicional.

#### Acceptance Criteria

1. WHEN a User initiates login, THE Auth_Module SHALL redirect the User to Google OAuth consent screen within 3 seconds
2. WHEN Google OAuth returns a successful authorization, THE Auth_Module SHALL create or update the User record in the Database with the Google profile information (name, email, avatar URL) and redirect the User to the originally requested page or to the home page if no prior page was requested
3. WHEN Google OAuth returns an error, THE Auth_Module SHALL display an error message indicating that authentication failed and redirect the User to the login page
4. WHILE a User is authenticated, THE Auth_Module SHALL maintain a valid session containing user ID, email, and name, with a maximum duration of 30 days, accessible via server and client components
5. WHEN a User initiates logout, THE Auth_Module SHALL invalidate the session and redirect to the login page
6. IF an unauthenticated request attempts to access a protected route, THEN THE Auth_Module SHALL redirect the request to the login page preserving the originally requested URL for post-login redirect
7. IF a session expires, THEN THE Auth_Module SHALL treat the User as unauthenticated and redirect to the login page on the next request to a protected route

### Requirement 3: Database Schema - User Entity

**User Story:** Como sistema, eu preciso armazenar dados dos usuários autenticados, para que eu possa associar palpites e pontuações a cada pessoa.

#### Acceptance Criteria

1. THE Database SHALL store User records with the following fields: id (auto-generated unique CUID), name (optional, max 255 characters), email (required, max 255 characters), image URL (optional, max 2048 characters), role (required, enum of "user" or "admin"), createdAt (auto-set to creation timestamp), and updatedAt (auto-set on every record modification)
2. THE Database SHALL enforce uniqueness on the User email field
3. THE Database SHALL set the default role for new User records to "user"
4. THE Database SHALL store NextAuth.js Account and Session entities linked to the User entity via foreign keys, and SHALL cascade-delete associated Account and Session records when a User record is deleted
5. IF a User record is created via OAuth without a name or image URL, THEN THE Database SHALL accept the record with those fields stored as null

### Requirement 4: Database Schema - Match Entity

**User Story:** Como admin, eu quero que o sistema armazene dados das partidas da Copa, para que os usuários possam fazer palpites sobre elas.

#### Acceptance Criteria

1. THE Database SHALL store Match records with fields: id (unique identifier), homeTeam (string, maximum 100 characters), awayTeam (string, maximum 100 characters), matchDate (date and time of kickoff in UTC), phase (group_stage, round_of_32, round_of_16, quarter_finals, semi_finals, third_place, final), group (nullable, applicable only for group_stage matches, values A through L), homeScore (nullable, integer from 0 to 99), awayScore (nullable, integer from 0 to 99), status (scheduled, live, finished), createdAt, and updatedAt
2. WHILE a Match status is "scheduled", THE Database SHALL keep homeScore and awayScore as null
3. WHILE a Match status is "live", THE Database SHALL allow homeScore and awayScore to be updated with non-negative integer values from 0 to 99 or remain null
4. WHEN a Match status transitions to "finished", THE Database SHALL require both homeScore and awayScore to have non-negative integer values from 0 to 99
5. THE Database SHALL only allow status transitions in the following order: "scheduled" to "live", "live" to "finished"
6. THE Database SHALL enforce that no two Match records exist with the same homeTeam, awayTeam, and matchDate combination

### Requirement 5: Database Schema - Prediction Entity

**User Story:** Como usuário, eu quero que meus palpites sejam armazenados de forma segura, para que possam ser comparados com o resultado real após o jogo.

#### Acceptance Criteria

1. THE Database SHALL store Prediction records with fields: id (unique identifier), userId (foreign key to User), matchId (foreign key to Match), homeScore (integer ranging from 0 to 99), awayScore (integer ranging from 0 to 99), points (nullable integer accepting only the values 0, 5, 7, or 10), createdAt (timestamp), and updatedAt (timestamp)
2. THE Database SHALL enforce a unique constraint on the combination of userId and matchId (one prediction per user per match)
3. THE Database SHALL cascade delete Predictions when the associated User or Match is deleted
4. IF a Prediction insert or update violates the unique constraint on userId and matchId, THEN THE Database SHALL reject the operation and preserve the existing Prediction record unchanged

### Requirement 6: Prediction Submission Rules

**User Story:** Como usuário, eu quero submeter meu palpite antes do jogo começar, para que o sistema garanta a integridade do bolão.

#### Acceptance Criteria

1. WHEN a User submits a Prediction before the Match matchDate, THE System SHALL accept and store the Prediction
2. WHEN a User submits a Prediction after the Match matchDate, THE System SHALL reject the Prediction with an error message indicating the deadline has passed
3. WHEN a User submits a Prediction for a Match where a Prediction already exists and the current time is before matchDate, THE System SHALL update the existing Prediction with the new homeScore and awayScore values
4. THE System SHALL validate that both homeScore and awayScore in a Prediction are non-negative integers with a maximum value of 99
5. IF homeScore or awayScore fails validation, THEN THE System SHALL reject the Prediction with an error message indicating which field is invalid and the allowed range (0 to 99)

### Requirement 7: Scoring Engine

**User Story:** Como usuário, eu quero que minha pontuação seja calculada automaticamente após o resultado real ser registrado, para que eu saiba quantos pontos marquei.

#### Acceptance Criteria

1. WHEN an Admin registers the final result for a Match, THE Scoring_Engine SHALL calculate and persist points for all Predictions associated with that Match within 5 seconds of the result being saved
2. WHEN a Prediction homeScore and awayScore exactly match the Match homeScore and awayScore, THE Scoring_Engine SHALL award 10 points
3. WHEN a Prediction correctly identifies the winner and the goal difference (Prediction homeScore minus Prediction awayScore equals Match homeScore minus Match awayScore) but the exact scores do not match, THE Scoring_Engine SHALL award 7 points
4. WHEN a Prediction correctly identifies the winner (or correctly predicts a draw) but the goal difference (Prediction homeScore minus Prediction awayScore) does not equal the Match goal difference (Match homeScore minus Match awayScore), THE Scoring_Engine SHALL award 5 points
5. WHEN a Prediction does not correctly identify the match outcome (winner or draw), THE Scoring_Engine SHALL award 0 points
6. THE Scoring_Engine SHALL apply scoring rules in priority order: exact score (10), correct winner plus goal difference (7), correct winner or draw (5), wrong (0), awarding only the highest applicable tier per Prediction
7. WHEN an Admin updates a previously registered final result for a Match, THE Scoring_Engine SHALL recalculate and update the points for all Predictions associated with that Match
8. IF the Scoring_Engine fails to calculate points for one or more Predictions during a scoring run, THEN THE Scoring_Engine SHALL preserve any previously stored points unchanged and indicate to the Admin that scoring failed for the affected Predictions

### Requirement 8: Ranking Calculation

**User Story:** Como usuário, eu quero ver o ranking atualizado dos participantes, para que eu saiba minha posição em relação aos outros.

#### Acceptance Criteria

1. THE System SHALL calculate each User's total score as the sum of points from all scored Predictions
2. THE System SHALL rank Users in descending order of total score, displaying position, User name, total score, and number of exact score predictions for each ranked User
3. WHEN two or more Users have the same total score, THE System SHALL rank them by the number of exact score predictions (descending) as first tiebreaker, and by earliest exact score prediction timestamp (ascending) as second tiebreaker
4. WHEN a Match result is registered and scores are calculated, THE System SHALL update the Ranking to reflect the new totals within 5 seconds
5. IF a User has zero scored Predictions, THEN THE System SHALL include that User in the Ranking with a total score of 0 and position them below all Users who have scored Predictions

### Requirement 9: Phase-Based Prizes (Premiação por Fase)

**User Story:** Como usuário, eu quero que haja premiação separada para cada fase da Copa (fase de grupos e cada fase de mata-mata), para que existam mais oportunidades de reconhecimento e competição ao longo do torneio.

#### Acceptance Criteria

1. THE System SHALL calculate a Phase_Ranking for each Phase by summing only the Prediction points from Matches belonging to that Phase
2. THE System SHALL display the Phase_Ranking for each Phase that has at least one Match with status "finished", separately from the overall Ranking
3. WHEN all Matches in a Phase have status "finished" and scores have been calculated, THE System SHALL mark that Phase_Ranking as final
4. THE System SHALL rank Users within each Phase_Ranking in descending order of phase points, using the number of exact score predictions within that Phase as first tiebreaker, and alphabetical order of User display name as second tiebreaker
5. THE System SHALL support the following Phases: group_stage, round_of_32, round_of_16, quarter_finals, semi_finals, third_place, final
6. THE System SHALL display the overall Ranking (all Phases combined) as the primary ranking view
7. THE System SHALL include in a Phase_Ranking only Users who have submitted at least one Prediction for a Match in that Phase
8. IF a Phase has no Matches with status "finished", THEN THE System SHALL NOT display a Phase_Ranking for that Phase
