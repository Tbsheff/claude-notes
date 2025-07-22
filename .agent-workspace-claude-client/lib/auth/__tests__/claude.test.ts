import { jest } from '@jest/globals';
import crypto from 'crypto';
import {
  generatePKCEParams,
  buildLoginUrl,
  exchangeCode,
  refreshToken,
  isTokenExpired,
  redactTokenFromError,
  TokenSet,
  PKCEParams
} from '../claude';

// Mock fetch globally
global.fetch = jest.fn();

describe('claude auth module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  describe('generatePKCEParams', () => {
    it('should generate valid PKCE parameters', () => {
      const params = generatePKCEParams();
      
      expect(params).toHaveProperty('codeVerifier');
      expect(params).toHaveProperty('codeChallenge');
      expect(params).toHaveProperty('state');
      
      // Check code verifier is base64url encoded and proper length
      expect(params.codeVerifier).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(params.codeVerifier.length).toBeGreaterThanOrEqual(43);
      expect(params.codeVerifier.length).toBeLessThanOrEqual(128);
      
      // Check code challenge is base64url encoded
      expect(params.codeChallenge).toMatch(/^[A-Za-z0-9_-]+$/);
      
      // Check state is base64url encoded
      expect(params.state).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('should generate different parameters each time', () => {
      const params1 = generatePKCEParams();
      const params2 = generatePKCEParams();
      
      expect(params1.codeVerifier).not.toBe(params2.codeVerifier);
      expect(params1.codeChallenge).not.toBe(params2.codeChallenge);
      expect(params1.state).not.toBe(params2.state);
    });

    it('should generate correct code challenge from verifier', () => {
      const params = generatePKCEParams();
      
      // Manually calculate expected challenge
      const expectedChallenge = crypto
        .createHash('sha256')
        .update(params.codeVerifier)
        .digest('base64url');
      
      expect(params.codeChallenge).toBe(expectedChallenge);
    });
  });

  describe('buildLoginUrl', () => {
    it('should build correct OAuth URL with required parameters', () => {
      const pkceParams: PKCEParams = {
        codeVerifier: 'test-verifier',
        codeChallenge: 'test-challenge',
        state: 'test-state'
      };
      
      const url = buildLoginUrl(pkceParams);
      const parsedUrl = new URL(url);
      
      expect(parsedUrl.origin).toBe('https://console.anthropic.com');
      expect(parsedUrl.pathname).toBe('/oauth/authorize');
      
      const params = parsedUrl.searchParams;
      expect(params.get('response_type')).toBe('code');
      expect(params.get('client_id')).toBe('claude-notes-desktop');
      expect(params.get('redirect_uri')).toBe('http://127.0.0.1:51703/cb');
      expect(params.get('code_challenge')).toBe('test-challenge');
      expect(params.get('code_challenge_method')).toBe('S256');
      expect(params.get('state')).toBe('test-state');
    });

    it('should include scopes when provided', () => {
      const pkceParams: PKCEParams = {
        codeVerifier: 'test-verifier',
        codeChallenge: 'test-challenge',
        state: 'test-state'
      };
      
      const scopes = ['read', 'write', 'admin'];
      const url = buildLoginUrl(pkceParams, scopes);
      const parsedUrl = new URL(url);
      
      expect(parsedUrl.searchParams.get('scope')).toBe('read write admin');
    });

    it('should not include scope parameter when empty array provided', () => {
      const pkceParams: PKCEParams = {
        codeVerifier: 'test-verifier',
        codeChallenge: 'test-challenge',
        state: 'test-state'
      };
      
      const url = buildLoginUrl(pkceParams, []);
      const parsedUrl = new URL(url);
      
      expect(parsedUrl.searchParams.has('scope')).toBe(false);
    });
  });

  describe('exchangeCode', () => {
    it('should successfully exchange code for tokens', async () => {
      const mockTokens: TokenSet = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'read write'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokens
      });

      const result = await exchangeCode('test-code', 'test-verifier');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/oauth/token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: expect.stringContaining('grant_type=authorization_code')
        }
      );

      const callBody = (global.fetch as jest.Mock).mock.calls[0][1].body;
      expect(callBody).toContain('code=test-code');
      expect(callBody).toContain('code_verifier=test-verifier');
      expect(callBody).toContain('client_id=claude-notes-desktop');
      expect(callBody).toContain('redirect_uri=http%3A%2F%2F127.0.0.1%3A51703%2Fcb');

      expect(result.access_token).toBe('test-access-token');
      expect(result.expires_at).toBeDefined();
      expect(result.expires_at).toBeGreaterThan(Date.now());
    });

    it('should handle token exchange errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Invalid authorization code'
      });

      await expect(exchangeCode('invalid-code', 'test-verifier'))
        .rejects.toThrow('Token exchange failed: 400 - Invalid authorization code');
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(exchangeCode('test-code', 'test-verifier'))
        .rejects.toThrow('[REDACTED]');
    });

    it('should redact sensitive information from errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Failed with token: Bearer sk-ant-api03-verysecrettoken123')
      );

      await expect(exchangeCode('test-code', 'test-verifier'))
        .rejects.toThrow('Failed with token: [REDACTED]');
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh tokens', async () => {
      const mockTokens: TokenSet = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokens
      });

      const result = await refreshToken('old-refresh-token');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/oauth/token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: expect.stringContaining('grant_type=refresh_token')
        }
      );

      const callBody = (global.fetch as jest.Mock).mock.calls[0][1].body;
      expect(callBody).toContain('refresh_token=old-refresh-token');
      expect(callBody).toContain('client_id=claude-notes-desktop');

      expect(result.access_token).toBe('new-access-token');
      expect(result.expires_at).toBeDefined();
    });

    it('should handle refresh token errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Refresh token expired'
      });

      await expect(refreshToken('expired-token'))
        .rejects.toThrow('Token refresh failed: 401 - Refresh token expired');
    });

    it('should calculate expires_at when expires_in is missing', async () => {
      const mockTokens: TokenSet = {
        access_token: 'new-access-token',
        token_type: 'Bearer'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokens
      });

      const result = await refreshToken('refresh-token');

      expect(result.access_token).toBe('new-access-token');
      expect(result.expires_at).toBeUndefined();
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for non-expired tokens', () => {
      const tokenSet: TokenSet = {
        access_token: 'test-token',
        expires_at: Date.now() + 3600000 // 1 hour from now
      };

      expect(isTokenExpired(tokenSet)).toBe(false);
    });

    it('should return true for expired tokens', () => {
      const tokenSet: TokenSet = {
        access_token: 'test-token',
        expires_at: Date.now() - 1000 // 1 second ago
      };

      expect(isTokenExpired(tokenSet)).toBe(true);
    });

    it('should return true for tokens expiring within 5-minute buffer', () => {
      const tokenSet: TokenSet = {
        access_token: 'test-token',
        expires_at: Date.now() + 240000 // 4 minutes from now
      };

      expect(isTokenExpired(tokenSet)).toBe(true);
    });

    it('should return false when expires_at is not set', () => {
      const tokenSet: TokenSet = {
        access_token: 'test-token'
      };

      expect(isTokenExpired(tokenSet)).toBe(false);
    });
  });

  describe('redactTokenFromError', () => {
    it('should redact long alphanumeric tokens', () => {
      const error = 'Failed with token: sk-ant-api03-abcdef1234567890abcdef1234567890';
      const result = redactTokenFromError(error);
      expect(result).toBe('Failed with token: [REDACTED]');
    });

    it('should redact Bearer tokens', () => {
      const error = 'Authorization failed: Bearer sk-ant-api03-secrettoken123';
      const result = redactTokenFromError(error);
      expect(result).toBe('Authorization failed: [REDACTED]');
    });

    it('should redact refresh tokens in various formats', () => {
      const error = 'Failed to use refresh_token="supersecretrefreshtoken123"';
      const result = redactTokenFromError(error);
      expect(result).toBe('Failed to use [REDACTED]');
    });

    it('should redact access tokens in various formats', () => {
      const error = 'Invalid access_token: verysecretaccesstoken456';
      const result = redactTokenFromError(error);
      expect(result).toBe('Invalid [REDACTED]');
    });

    it('should redact authorization codes', () => {
      const error = 'Invalid code=authorizationcode789xyz';
      const result = redactTokenFromError(error);
      expect(result).toBe('Invalid [REDACTED]');
    });

    it('should handle Error objects', () => {
      const error = new Error('Token Bearer sk-ant-secrettoken failed');
      const result = redactTokenFromError(error);
      expect(result).toBe('Token [REDACTED] failed');
    });

    it('should handle non-string, non-error inputs', () => {
      const error = { message: 'token: secrettoken123' };
      const result = redactTokenFromError(error);
      expect(result).toContain('[REDACTED]');
    });

    it('should redact multiple sensitive patterns', () => {
      const error = 'Failed with Bearer secrettoken123 and refresh_token=anothertoken456';
      const result = redactTokenFromError(error);
      expect(result).toBe('Failed with [REDACTED] and [REDACTED]');
    });
  });
});