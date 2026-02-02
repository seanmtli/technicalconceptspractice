# Project Instructions for Claude

## Secrets Management

**NEVER commit API keys or secrets to the repository.**

- Store secrets in `.env` file (already in `.gitignore`)
- Use `.env.example` as a template for required variables
- Access secrets via `Constants.expoConfig?.extra` from `expo-constants`
- Current environment variables:
  - `OPENROUTER_API_KEY` - API key for OpenRouter services

## Git Workflow

**Always commit and push changes after completing a feature or significant change.**

When building a new feature:
1. Implement the feature
2. Run TypeScript compilation check (`npx tsc --noEmit`)
3. Stage relevant files with `git add`
4. Commit with a descriptive message following conventional commits:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `refactor:` for code refactoring
   - `docs:` for documentation changes
5. Push to remote with `git push`

## Project Overview

This is a React Native (Expo) app that helps users **explain and apply** technical concepts rather than just memorize them.

**Key Philosophy:**
- Focus on understanding, not rote memorization of syntax or definitions
- Users explain concepts in their own words and receive AI-powered feedback
- Covers data science, software fundamentals, and broader technical topics
- Uses spaced repetition to reinforce deep understanding

## Key Directories

- `src/types/` - TypeScript type definitions
- `src/constants/` - App constants including category definitions
- `src/data/` - Seed questions and content data
- `src/services/` - Database, API, and utility services
- `src/screens/` - React Native screen components
- `src/components/` - Reusable UI components

## Database

- Uses Expo SQLite
- Schema version tracked in `database.ts`
- Migrations handled in `runMigrations()` function
- Always bump `CURRENT_SCHEMA_VERSION` when adding migrations

## Adding New Categories

When adding new question categories:
1. Add to `Category` type in `src/types/index.ts`
2. Add `CategoryInfo` entry in `src/constants/categories.ts`
3. Update `VALID_CATEGORIES` array in `src/services/database.ts`
4. Update `ALL_CATEGORIES` array in `src/services/database.ts`
5. Update `DEFAULT_DIFFICULTIES` in `src/services/database.ts`
6. Update fallback difficulties in `src/screens/OnboardingChatScreen.tsx`
7. Update fallback difficulties in `src/services/onboardingApi.ts`
