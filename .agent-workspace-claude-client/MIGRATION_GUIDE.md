# ClaudeClient Migration Guide

This guide explains how to migrate from the old direct API implementation to the new centralized ClaudeClient that supports both OAuth and API key authentication.

## Overview

The new `ClaudeClient` class provides:
- Automatic authentication method detection (OAuth tokens preferred over API keys)
- Built-in retry logic for 401 errors with automatic token refresh
- Unified interface for both authentication methods
- Better error handling and logging

## Files Changed

### New Files
- `/lib/llm/claude-client.ts` - The new centralized client
- `/lib/llm/core-new.ts` - Updated core.ts to use ClaudeClient
- `/electron/services/ai-service-new.ts` - Updated ai-service.ts
- `/lib/agent/index-new.ts` - Updated agent index.ts

### Migration Steps

1. **Update lib/llm/core.ts**
   - Replace the current implementation with `core-new.ts`
   - The new version uses ClaudeClient instead of direct fetch calls
   - Adds support for OAuth authentication

2. **Update electron/services/ai-service.ts**
   - Replace with `ai-service-new.ts`
   - Now creates and manages a ClaudeClient instance
   - Handles both OAuth and API key authentication

3. **Update lib/agent/index.ts**
   - Replace with `index-new.ts`
   - Uses a custom Anthropic provider for OAuth support
   - Automatically switches between auth methods

## Key Changes

### Before (Direct API calls):
```typescript
const response = await fetch('https://api.anthropic.com/v1/messages', {
  headers: {
    'x-api-key': apiKey,
    'Content-Type': 'application/json',
    'anthropic-version': '2023-06-01'
  },
  // ...
})
```

### After (ClaudeClient):
```typescript
const client = new ClaudeClient({
  apiKey: storedKeys.anthropicApiKey,
  oauthTokens: oauthTokens,
  onTokenRefresh: async (tokens) => {
    await authService.storeTokens(tokens)
  }
})

const response = await client.createMessage(request)
```

## Authentication Flow

1. ClaudeClient checks for OAuth tokens first
2. If valid OAuth tokens exist, uses Bearer authentication
3. If no OAuth tokens or they're expired, falls back to API key
4. On 401 errors with OAuth, automatically attempts token refresh
5. After successful refresh, retries the request

## Testing

To test the implementation:

1. **Test OAuth authentication**:
   - Login with OAuth
   - Make API calls
   - Let token expire (or manually expire it)
   - Verify automatic refresh works

2. **Test API key authentication**:
   - Logout from OAuth
   - Configure API key in settings
   - Make API calls
   - Verify they work correctly

3. **Test fallback**:
   - Configure both OAuth and API key
   - Verify OAuth is preferred
   - Remove OAuth tokens
   - Verify fallback to API key works

## Environment Variables

The implementation still respects `ANTHROPIC_API_KEY` environment variable as a fallback when no other authentication is configured.

## Error Handling

The new client provides better error messages:
- Clear indication of which auth method is being used
- Specific errors for missing authentication
- Detailed logging for debugging

## Notes

- The ClaudeClient is designed to be a singleton in most cases
- Token refresh callbacks allow persisting new tokens
- The client can be updated with new auth credentials at runtime
- All existing API functionality is preserved