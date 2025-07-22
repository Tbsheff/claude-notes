import { jest } from '@jest/globals';
import { ClaudeClient, ClaudeClientConfig, CreateMessageRequest, TokenSet } from '../claude-client';
import { refreshToken, isTokenExpired } from '../../auth/claude';
import { logger } from '../../logger';

// Mock dependencies
jest.mock('../../auth/claude');
jest.mock('../../logger', () => ({
  logger: {
    llm: jest.fn()
  }
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('ClaudeClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      const client = new ClaudeClient({});
      expect(client).toBeDefined();
      // Test through public methods since properties are private
      expect(client.hasValidAuth()).toBe(false);
    });

    it('should accept custom configuration', () => {
      const config: ClaudeClientConfig = {
        apiKey: 'test-key',
        baseUrl: 'https://custom.api.com',
        maxRetries: 5,
        retryDelay: 2000
      };
      const client = new ClaudeClient(config);
      expect(client.hasValidAuth()).toBe(true);
      expect(client.getAuthType()).toBe('api-key');
    });
  });

  describe('getAuthHeaders', () => {
    it('should use OAuth token when available and not expired', () => {
      const tokens: TokenSet = {
        access_token: 'oauth-token',
        expires_at: Date.now() + 3600000
      };
      
      (isTokenExpired as jest.Mock).mockReturnValue(false);
      
      const client = new ClaudeClient({ oauthTokens: tokens });
      
      // Test through createMessage since getAuthHeaders is private
      const request: CreateMessageRequest = {
        model: 'claude-3',
        messages: [{ role: 'user', content: 'test' }]
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'test' })
      });
      
      client.createMessage(request);
      
      expect(logger.llm).toHaveBeenCalledWith('Using OAuth Bearer token for authentication');
    });

    it('should use API key when OAuth token is expired', () => {
      const tokens: TokenSet = {
        access_token: 'oauth-token',
        expires_at: Date.now() - 1000
      };
      
      (isTokenExpired as jest.Mock).mockReturnValue(true);
      
      const client = new ClaudeClient({ 
        oauthTokens: tokens,
        apiKey: 'test-api-key'
      });
      
      const request: CreateMessageRequest = {
        model: 'claude-3',
        messages: [{ role: 'user', content: 'test' }]
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'test' })
      });
      
      client.createMessage(request);
      
      expect(logger.llm).toHaveBeenCalledWith('Using API key for authentication');
    });

    it('should throw error when no auth method available', async () => {
      const client = new ClaudeClient({});
      
      const request: CreateMessageRequest = {
        model: 'claude-3',
        messages: [{ role: 'user', content: 'test' }]
      };
      
      await expect(client.createMessage(request))
        .rejects.toThrow('No valid authentication method available');
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens successfully', async () => {
      const oldTokens: TokenSet = {
        access_token: 'old-token',
        refresh_token: 'refresh-token',
        expires_at: Date.now() - 1000
      };
      
      const newTokens: TokenSet = {
        access_token: 'new-token',
        refresh_token: 'new-refresh-token',
        expires_at: Date.now() + 3600000
      };
      
      (isTokenExpired as jest.Mock).mockReturnValue(true);
      (refreshToken as jest.Mock).mockResolvedValue(newTokens);
      
      const onTokenRefresh = jest.fn();
      const client = new ClaudeClient({ 
        oauthTokens: oldTokens,
        onTokenRefresh
      });
      
      // Trigger token refresh through 401 response
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: async () => 'Unauthorized'
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'test' })
        });
      
      const request: CreateMessageRequest = {
        model: 'claude-3',
        messages: [{ role: 'user', content: 'test' }]
      };
      
      await client.createMessage(request);
      
      expect(refreshToken).toHaveBeenCalledWith('refresh-token');
      expect(onTokenRefresh).toHaveBeenCalledWith(newTokens);
      expect(logger.llm).toHaveBeenCalledWith('OAuth token refreshed successfully');
    });

    it('should handle refresh token failure', async () => {
      const oldTokens: TokenSet = {
        access_token: 'old-token',
        refresh_token: 'refresh-token',
        expires_at: Date.now() - 1000
      };
      
      (isTokenExpired as jest.Mock).mockReturnValue(true);
      (refreshToken as jest.Mock).mockRejectedValue(new Error('Refresh failed'));
      
      const client = new ClaudeClient({ oauthTokens: oldTokens });
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized'
      });
      
      const request: CreateMessageRequest = {
        model: 'claude-3',
        messages: [{ role: 'user', content: 'test' }]
      };
      
      await expect(client.createMessage(request))
        .rejects.toThrow('API Error 401');
      
      expect(logger.llm).toHaveBeenCalledWith('Failed to refresh token: Error: Refresh failed');
    });
  });

  describe('makeRequest', () => {
    it('should make successful request with proper headers', async () => {
      const client = new ClaudeClient({ apiKey: 'test-key' });
      
      const mockResponse = { id: 'msg-123', type: 'message' };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });
      
      const request: CreateMessageRequest = {
        model: 'claude-3',
        messages: [{ role: 'user', content: 'test' }]
      };
      
      const result = await client.createMessage(request);
      
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01',
            'x-api-key': 'test-key'
          },
          body: JSON.stringify({
            model: 'claude-3',
            messages: [{ role: 'user', content: 'test' }]
          })
        }
      );
      
      expect(result).toEqual(mockResponse);
    });

    it('should retry on rate limit with retry-after header', async () => {
      const client = new ClaudeClient({ apiKey: 'test-key' });
      
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Map([['retry-after', '2']]),
          text: async () => 'Rate limited'
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'test' })
        });
      
      const request: CreateMessageRequest = {
        model: 'claude-3',
        messages: [{ role: 'user', content: 'test' }]
      };
      
      const start = Date.now();
      await client.createMessage(request);
      const duration = Date.now() - start;
      
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(duration).toBeGreaterThanOrEqual(1900); // Allow small timing variance
      expect(logger.llm).toHaveBeenCalledWith('Rate limited, retrying after 2000ms');
    });

    it('should retry with exponential backoff on rate limit without retry-after', async () => {
      const client = new ClaudeClient({ 
        apiKey: 'test-key',
        retryDelay: 100
      });
      
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Map(),
          text: async () => 'Rate limited'
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'test' })
        });
      
      const request: CreateMessageRequest = {
        model: 'claude-3',
        messages: [{ role: 'user', content: 'test' }]
      };
      
      await client.createMessage(request);
      
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(logger.llm).toHaveBeenCalledWith('Rate limited, retrying after 100ms');
    });

    it('should stop retrying after max retries', async () => {
      const client = new ClaudeClient({ 
        apiKey: 'test-key',
        maxRetries: 2,
        retryDelay: 10
      });
      
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Map(),
        text: async () => '{"error": {"type": "rate_limit", "message": "Too many requests"}}'
      });
      
      const request: CreateMessageRequest = {
        model: 'claude-3',
        messages: [{ role: 'user', content: 'test' }]
      };
      
      await expect(client.createMessage(request))
        .rejects.toThrow('API Error 429: Too many requests');
      
      expect(global.fetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should handle network errors', async () => {
      const client = new ClaudeClient({ apiKey: 'test-key' });
      
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      
      const request: CreateMessageRequest = {
        model: 'claude-3',
        messages: [{ role: 'user', content: 'test' }]
      };
      
      await expect(client.createMessage(request))
        .rejects.toThrow('Network error');
      
      expect(logger.llm).toHaveBeenCalledWith('Request failed: Network error');
    });

    it('should handle non-JSON error responses', async () => {
      const client = new ClaudeClient({ apiKey: 'test-key' });
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal server error'
      });
      
      const request: CreateMessageRequest = {
        model: 'claude-3',
        messages: [{ role: 'user', content: 'test' }]
      };
      
      await expect(client.createMessage(request))
        .rejects.toThrow('API Error 500: Internal server error');
    });
  });

  describe('createMessage', () => {
    it('should create message successfully', async () => {
      const client = new ClaudeClient({ apiKey: 'test-key' });
      
      const mockResponse = {
        id: 'msg-123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Hello!' }],
        model: 'claude-3',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 5 }
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });
      
      const request: CreateMessageRequest = {
        model: 'anthropic/claude-3',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 100,
        temperature: 0.7
      };
      
      const result = await client.createMessage(request);
      
      expect(logger.llm).toHaveBeenCalledWith('Creating message with model: anthropic/claude-3');
      expect(result).toEqual(mockResponse);
      
      // Check that model prefix is removed
      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.model).toBe('claude-3');
    });
  });

  describe('createMessageStream', () => {
    it('should stream message successfully', async () => {
      const client = new ClaudeClient({ apiKey: 'test-key' });
      
      const chunks = [
        'data: {"type": "content_block_delta", "delta": {"text": "Hello"}}\n',
        'data: {"type": "content_block_delta", "delta": {"text": " world"}}\n',
        'data: [DONE]\n'
      ];
      
      const mockReadableStream = {
        getReader: () => ({
          read: jest.fn()
            .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(chunks[0]) })
            .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(chunks[1]) })
            .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(chunks[2]) })
            .mockResolvedValueOnce({ done: true }),
          releaseLock: jest.fn()
        })
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        body: mockReadableStream
      });
      
      const request: CreateMessageRequest = {
        model: 'claude-3',
        messages: [{ role: 'user', content: 'Hello' }],
        stream: true
      };
      
      const chunks_received: string[] = [];
      for await (const chunk of client.createMessageStream(request)) {
        chunks_received.push(chunk);
      }
      
      expect(chunks_received).toEqual(['Hello', ' world']);
      expect(logger.llm).toHaveBeenCalledWith('Creating streaming message with model: claude-3');
    });

    it('should handle stream errors', async () => {
      const client = new ClaudeClient({ apiKey: 'test-key' });
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Bad request'
      });
      
      const request: CreateMessageRequest = {
        model: 'claude-3',
        messages: [{ role: 'user', content: 'Hello' }]
      };
      
      const generator = client.createMessageStream(request);
      
      await expect(generator.next()).rejects.toThrow('Stream API Error 400: Bad request');
    });

    it('should handle missing response body', async () => {
      const client = new ClaudeClient({ apiKey: 'test-key' });
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        body: null
      });
      
      const request: CreateMessageRequest = {
        model: 'claude-3',
        messages: [{ role: 'user', content: 'Hello' }]
      };
      
      const generator = client.createMessageStream(request);
      
      await expect(generator.next()).rejects.toThrow('No response body available for streaming');
    });
  });

  describe('updateAuth', () => {
    it('should update API key', () => {
      const client = new ClaudeClient({ apiKey: 'old-key' });
      
      expect(client.getAuthType()).toBe('api-key');
      
      client.updateAuth({ apiKey: 'new-key' });
      
      expect(client.hasValidAuth()).toBe(true);
    });

    it('should update OAuth tokens', () => {
      const client = new ClaudeClient({});
      
      const tokens: TokenSet = {
        access_token: 'test-token',
        expires_at: Date.now() + 3600000
      };
      
      (isTokenExpired as jest.Mock).mockReturnValue(false);
      
      client.updateAuth({ oauthTokens: tokens });
      
      expect(client.getAuthType()).toBe('oauth');
    });

    it('should update token refresh callback', () => {
      const client = new ClaudeClient({});
      const newCallback = jest.fn();
      
      client.updateAuth({ onTokenRefresh: newCallback });
      
      // Verify through internal state (would need to trigger refresh to test)
      expect(client.hasValidAuth()).toBe(false);
    });
  });

  describe('hasValidAuth', () => {
    it('should return true for valid OAuth tokens', () => {
      const tokens: TokenSet = {
        access_token: 'test-token',
        expires_at: Date.now() + 3600000
      };
      
      (isTokenExpired as jest.Mock).mockReturnValue(false);
      
      const client = new ClaudeClient({ oauthTokens: tokens });
      
      expect(client.hasValidAuth()).toBe(true);
    });

    it('should return false for expired OAuth tokens', () => {
      const tokens: TokenSet = {
        access_token: 'test-token',
        expires_at: Date.now() - 1000
      };
      
      (isTokenExpired as jest.Mock).mockReturnValue(true);
      
      const client = new ClaudeClient({ oauthTokens: tokens });
      
      expect(client.hasValidAuth()).toBe(false);
    });

    it('should return true for API key', () => {
      const client = new ClaudeClient({ apiKey: 'test-key' });
      
      expect(client.hasValidAuth()).toBe(true);
    });

    it('should return false when no auth provided', () => {
      const client = new ClaudeClient({});
      
      expect(client.hasValidAuth()).toBe(false);
    });
  });

  describe('getAuthType', () => {
    it('should return oauth for valid OAuth tokens', () => {
      const tokens: TokenSet = {
        access_token: 'test-token',
        expires_at: Date.now() + 3600000
      };
      
      (isTokenExpired as jest.Mock).mockReturnValue(false);
      
      const client = new ClaudeClient({ oauthTokens: tokens });
      
      expect(client.getAuthType()).toBe('oauth');
    });

    it('should return api-key when OAuth expired but API key available', () => {
      const tokens: TokenSet = {
        access_token: 'test-token',
        expires_at: Date.now() - 1000
      };
      
      (isTokenExpired as jest.Mock).mockReturnValue(true);
      
      const client = new ClaudeClient({ 
        oauthTokens: tokens,
        apiKey: 'test-key'
      });
      
      expect(client.getAuthType()).toBe('api-key');
    });

    it('should return none when no auth available', () => {
      const client = new ClaudeClient({});
      
      expect(client.getAuthType()).toBe('none');
    });
  });
});