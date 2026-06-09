# Bolão Copa do Mundo 2026

## Visão Geral
Site para registrar palpites dos jogos da Copa do Mundo 2026. Funciona como um bolão entre amigos/colegas com ranking automático.

## Stack
- Next.js 14+ (App Router) com TypeScript (strict)
- SQLite via Drizzle ORM + @libsql/client
- NextAuth.js (Auth.js) para autenticação (Google OAuth)
- Tailwind CSS para estilização
- Deploy na Vercel

## Arquitetura
- Monolito full-stack (Next.js)
- Estrutura por feature dentro de `src/`
- Server Actions para mutações
- Server Components por padrão, Client Components só quando necessário

## Estrutura de Pastas
```
src/
  app/           # Rotas e páginas (App Router)
  components/    # Componentes reutilizáveis
  lib/           # Utilitários, config, helpers
  server/        # Lógica de servidor (actions, queries)
prisma/
  schema.prisma  # Schema do banco
```

## Convenções
- camelCase para variáveis e funções
- PascalCase para componentes e tipos
- Validação com Zod
- Erros da API seguem formato: { error: string, details?: object }
- Testes com Vitest

## Regras de Negócio (alto nível)
- Usuários se autenticam via Google
- Jogos são cadastrados pelo admin
- Palpites são registrados antes do início de cada jogo
- Pontuação automática após resultado real ser registrado
- Ranking em tempo real baseado na pontuação acumulada

## Regras de Pontuação (padrão)
- Placar exato: 10 pontos
- Acertou vencedor + saldo de gols: 7 pontos
- Acertou vencedor (ou empate): 5 pontos
- Errou tudo: 0 pontos
