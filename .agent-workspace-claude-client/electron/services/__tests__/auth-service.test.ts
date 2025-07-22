import { jest } from '@jest/globals';
import { authService } from '../auth-service';
import * as keytar from 'keytar';
import { TokenSet } from '../../../lib/auth/claude';

// Mock keytar module
jest.mock('keytar', () => ({
  setPassword: jest.fn(),
  getPassword: jest.fn(),
  deletePassword: jest.fn()
}));

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset console methods
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('storeTokens', () => {
    it('should store tokens successfully in keychain', async () => {
      const tokens: TokenSet = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_at: Date.now() + 3600000,
        token_type: 'Bearer',
        scope: 'read write'
      };

      (keytar.setPassword as jest.Mock).mockResolvedValueOnce(undefined);

      await authService.storeTokens(tokens);

      expect(keytar.setPassword).toHaveBeenCalledWith(
        'claude-notes',
        'oauth-tokens',
        JSON.stringify(tokens)
      );
      expect(console.log).toHaveBeenCalledWith('Tokens stored successfully in keychain');
    });

    it('should handle keychain storage failures', async () => {
      const tokens: TokenSet = {
        access_token: 'test-token'
      };

      const keychainError = new Error('Keychain access denied');
      (keytar.setPassword as jest.Mock).mockRejectedValueOnce(keychainError);

      await expect(authService.storeTokens(tokens))
        .rejects.toThrow('Failed to store tokens: Keychain access denied');

      expect(console.error).toHaveBeenCalledWith(
        'Failed to store tokens in keychain:',
        keychainError
      );
    });

    it('should handle non-Error objects in catch block', async () => {
      const tokens: TokenSet = {
        access_token: 'test-token'
      };

      (keytar.setPassword as jest.Mock).mockRejectedValueOnce('String error');

      await expect(authService.storeTokens(tokens))
        .rejects.toThrow('Failed to store tokens: undefined');
    });
  });

  describe('getTokens', () => {
    it('should retrieve tokens successfully from keychain', async () => {
      const storedTokens: TokenSet = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_at: Date.now() + 3600000,
        token_type: 'Bearer'
      };

      (keytar.getPassword as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(storedTokens)
      );

      const result = await authService.getTokens();

      expect(keytar.getPassword).toHaveBeenCalledWith(
        'claude-notes',
        'oauth-tokens'
      );
      expect(result).toEqual(storedTokens);
      expect(console.log).toHaveBeenCalledWith('Tokens retrieved successfully from keychain');
    });

    it('should return null when no tokens found', async () => {
      (keytar.getPassword as jest.Mock).mockResolvedValueOnce(null);

      const result = await authService.getTokens();

      expect(result).toBeNull();
      expect(console.log).toHaveBeenCalledWith('No tokens found in keychain');
    });

    it('should handle keychain retrieval failures', async () => {
      const keychainError = new Error('Keychain locked');
      (keytar.getPassword as jest.Mock).mockRejectedValueOnce(keychainError);

      await expect(authService.getTokens())
        .rejects.toThrow('Failed to retrieve tokens: Keychain locked');

      expect(console.error).toHaveBeenCalledWith(
        'Failed to retrieve tokens from keychain:',
        keychainError
      );
    });

    it('should handle malformed JSON in keychain', async () => {
      (keytar.getPassword as jest.Mock).mockResolvedValueOnce('invalid-json');

      await expect(authService.getTokens())
        .rejects.toThrow();

      expect(console.error).toHaveBeenCalledWith(
        'Failed to retrieve tokens from keychain:',
        expect.any(Error)
      );
    });
  });

  describe('clearTokens', () => {
    it('should clear tokens successfully from keychain', async () => {
      (keytar.deletePassword as jest.Mock).mockResolvedValueOnce(true);

      await authService.clearTokens();

      expect(keytar.deletePassword).toHaveBeenCalledWith(
        'claude-notes',
        'oauth-tokens'
      );
      expect(console.log).toHaveBeenCalledWith('Tokens cleared successfully from keychain');
    });

    it('should handle case when no tokens exist to clear', async () => {
      (keytar.deletePassword as jest.Mock).mockResolvedValueOnce(false);

      await authService.clearTokens();

      expect(keytar.deletePassword).toHaveBeenCalledWith(
        'claude-notes',
        'oauth-tokens'
      );
      expect(console.log).toHaveBeenCalledWith('No tokens found to clear in keychain');
    });

    it('should handle keychain deletion failures', async () => {
      const keychainError = new Error('Keychain permission denied');
      (keytar.deletePassword as jest.Mock).mockRejectedValueOnce(keychainError);

      await expect(authService.clearTokens())
        .rejects.toThrow('Failed to clear tokens: Keychain permission denied');

      expect(console.error).toHaveBeenCalledWith(
        'Failed to clear tokens from keychain:',
        keychainError
      );
    });
  });

  describe('hasValidTokens', () => {
    it('should return true for valid non-expired tokens', async () => {
      const validTokens: TokenSet = {
        access_token: 'test-access-token',
        expires_at: Date.now() + 3600000 // 1 hour from now
      };

      (keytar.getPassword as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(validTokens)
      );

      const result = await authService.hasValidTokens();

      expect(result).toBe(true);
      expect(console.log).toHaveBeenCalledWith('Valid tokens found in keychain');
    });

    it('should return false when no tokens found', async () => {
      (keytar.getPassword as jest.Mock).mockResolvedValueOnce(null);

      const result = await authService.hasValidTokens();

      expect(result).toBe(false);
    });

    it('should return false for tokens missing access_token', async () => {
      const invalidTokens = {
        refresh_token: 'test-refresh-token',
        expires_at: Date.now() + 3600000
      };

      (keytar.getPassword as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(invalidTokens)
      );

      const result = await authService.hasValidTokens();

      expect(result).toBe(false);
      expect(console.log).toHaveBeenCalledWith('Invalid tokens: missing access_token');
    });

    it('should return false for expired tokens', async () => {
      const expiredTokens: TokenSet = {
        access_token: 'test-access-token',
        expires_at: Date.now() - 1000 // 1 second ago
      };

      (keytar.getPassword as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(expiredTokens)
      );

      const result = await authService.hasValidTokens();

      expect(result).toBe(false);
      expect(console.log).toHaveBeenCalledWith('Tokens are expired');
    });

    it('should return true for tokens without expiry date', async () => {
      const tokensNoExpiry: TokenSet = {
        access_token: 'test-access-token'
      };

      (keytar.getPassword as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(tokensNoExpiry)
      );

      const result = await authService.hasValidTokens();

      expect(result).toBe(true);
      expect(console.log).toHaveBeenCalledWith('Valid tokens found in keychain');
    });

    it('should handle errors gracefully and return false', async () => {
      const keychainError = new Error('Keychain unavailable');
      (keytar.getPassword as jest.Mock).mockRejectedValueOnce(keychainError);

      const result = await authService.hasValidTokens();

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        'Error checking token validity:',
        keychainError
      );
    });
  });

  describe('Service Name and Account Name', () => {
    it('should use consistent service and account names', async () => {
      const tokens: TokenSet = { access_token: 'test' };
      
      // Test storeTokens
      (keytar.setPassword as jest.Mock).mockResolvedValueOnce(undefined);
      await authService.storeTokens(tokens);
      expect(keytar.setPassword).toHaveBeenCalledWith(
        'claude-notes',
        'oauth-tokens',
        expect.any(String)
      );

      // Test getTokens
      (keytar.getPassword as jest.Mock).mockResolvedValueOnce(null);
      await authService.getTokens();
      expect(keytar.getPassword).toHaveBeenCalledWith(
        'claude-notes',
        'oauth-tokens'
      );

      // Test clearTokens
      (keytar.deletePassword as jest.Mock).mockResolvedValueOnce(true);
      await authService.clearTokens();
      expect(keytar.deletePassword).toHaveBeenCalledWith(
        'claude-notes',
        'oauth-tokens'
      );
    });
  });
});