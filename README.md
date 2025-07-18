# Claude Notes

AI-powered note-taking application with Claude Code integration built with React, Electron, and SQLite.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Generate database schema and run migrations:
```bash
npm run db:generate
npm run db:push
```

3. Start development:
```bash
npm run dev:electron
```

## Database Commands

- `npm run db:generate` - Generate migrations from schema changes
- `npm run db:push` - Apply schema to database

## Build

```bash
npm run build
```

## Scripts

- `npm run dev` - Start Vite dev server
- `npm run dev:electron` - Start Electron in development mode
- `npm run build` - Build for production
- `npm run electron` - Start Electron app
