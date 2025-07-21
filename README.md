# Claude Notes 📝

**Software That Works Exactly How You Want**

Claude Notes is a simple frontend for Anthropic's Claude Code SDK. It provides a clean interface for AI-powered note-taking and code editing, where you can describe what you want in natural language and Claude will implement the changes for you.

https://github.com/user-attachments/assets/9e159be8-0bf2-44af-b7e5-d7a16cd83426

## How It Works

Claude Notes is built on top of Claude Code SDK - Anthropic's command-line tool for agentic coding. When you request changes:

1. **Creates isolated workspace** - Each change runs in a separate, clean environment
2. **Claude processes your request** - Uses natural language to understand what you want
3. **Validates changes** - Tests and verifies the implementation in the isolated workspace  
4. **Applies or discards** - If validation passes, changes are applied. If not, the workspace is deleted
5. **Everything stays local** - Your code, database, and data never leave your machine

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

## Use Cases

### AI-Powered Follow-ups
Select any text in your documents and generate intelligent follow-up content based on the context.

https://github.com/user-attachments/assets/9850fbf9-1b32-46b8-b8bc-724480a544ca

### AI-Powered Translation  
Select text in any document and instantly translate it to different languages using AI.

https://github.com/user-attachments/assets/a5729365-c472-4017-ba1d-8842e35eaf97

### Document Writing Assistant
Works like Cursor for documents - Claude can write, edit, and improve your content with natural language instructions.

https://github.com/user-attachments/assets/1a622529-523b-4f37-b971-52cb68781a4e

All data is stored locally on your machine - no external servers or cloud services are used.
