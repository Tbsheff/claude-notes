import * as keytar from 'keytar';
import { TokenSet } from '../../lib/auth/claude';

const SERVICE_NAME = 'claude-notes';
const ACCOUNT_NAME = 'oauth-tokens';

export class AuthService {
  /**
   * Store OAuth tokens securely in the OS keychain
   */
  async storeTokens(tokens: TokenSet): Promise<void> {
    try {
      const tokenString = JSON.stringify(tokens);
      await keytar.setPassword(SERVICE_NAME, ACCOUNT_NAME, tokenString);
      console.log('Tokens stored successfully in keychain');
    } catch (error) {
      console.error('Failed to store tokens in keychain:', error);
      throw new Error(`Failed to store tokens: ${error.message}`);
    }
  }

  /**
   * Retrieve OAuth tokens from the OS keychain
   */
  async getTokens(): Promise<TokenSet | null> {
    try {
      const tokenString = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);
      
      if (!tokenString) {
        console.log('No tokens found in keychain');
        return null;
      }

      const tokens = JSON.parse(tokenString) as TokenSet;
      console.log('Tokens retrieved successfully from keychain');
      return tokens;
    } catch (error) {
      console.error('Failed to retrieve tokens from keychain:', error);
      throw new Error(`Failed to retrieve tokens: ${error.message}`);
    }
  }

  /**
   * Remove OAuth tokens from the OS keychain
   */
  async clearTokens(): Promise<void> {
    try {
      const result = await keytar.deletePassword(SERVICE_NAME, ACCOUNT_NAME);
      
      if (result) {
        console.log('Tokens cleared successfully from keychain');
      } else {
        console.log('No tokens found to clear in keychain');
      }
    } catch (error) {
      console.error('Failed to clear tokens from keychain:', error);
      throw new Error(`Failed to clear tokens: ${error.message}`);
    }
  }

  /**
   * Check if valid tokens exist in the keychain
   */
  async hasValidTokens(): Promise<boolean> {
    try {
      const tokens = await this.getTokens();
      
      if (!tokens) {
        return false;
      }

      // Check if tokens have required fields
      if (!tokens.access_token) {
        console.log('Invalid tokens: missing access_token');
        return false;
      }

      // Check if token is expired
      if (tokens.expires_at && tokens.expires_at < Date.now()) {
        console.log('Tokens are expired');
        return false;
      }

      console.log('Valid tokens found in keychain');
      return true;
    } catch (error) {
      console.error('Error checking token validity:', error);
      return false;
    }
  }
}

// Export singleton instance
export const authService = new AuthService();