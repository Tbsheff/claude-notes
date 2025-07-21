# Claude Notes 📝

**Let Claude Code Edit Your Application**

Claude Notes is a simple frontend for Anthropic's Claude Code SDK. It provides a clean interface for AI-powered note-taking and code editing, where you can describe what you want in natural language and Claude will implement the changes for you.

## How It Works

Claude Notes is built on top of Claude Code SDK - Anthropic's command-line tool for agentic coding. When you request changes:

1. **Creates isolated workspace** - Each change runs in a separate, clean environment
2. **Claude processes your request** - Uses natural language to understand what you want
3. **Validates changes** - Tests and verifies the implementation in the isolated workspace  
4. **Applies or discards** - If validation passes, changes are applied. If not, the workspace is deleted
5. **Everything stays local** - Your code, database, and data never leave your machine

## Prerequisites

- Node.js (v20 or higher)
- npm or yarn package manager  
- Anthropic API key (required for AI features)

## Setup 

1. **Install dependencies:**
```bash
npm install
```

2. **Setup database:**
```bash
npm run db:generate
npm run db:push
```

3. **Run with debug (development):**
```bash
npm run watch-dev
```

4. **Run without debug (production):**
```bash
npm run watch-prod
```

5. **Configure API Key:**
   - In the running application, go to Settings (3 dots in the header)
   - Insert your Anthropic API key

All data is stored locally on your machine - no external servers or cloud services are used.
