import { ipcMain } from 'electron';
import { authService } from '../services/auth-service';
import { TokenSet } from '../../lib/auth/claude';

export function setupAuthHandlers() {
  /**
   * Handler for storing tokens in the OS keychain
   */
  ipcMain.handle('auth:store-tokens', async (event, tokens: TokenSet) => {
    try {
      await authService.storeTokens(tokens);
      return { success: true };
    } catch (error) {
      console.error('Error in auth:store-tokens handler:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to store tokens' 
      };
    }
  });

  /**
   * Handler for retrieving tokens from the OS keychain
   */
  ipcMain.handle('auth:get-tokens', async (event) => {
    try {
      const tokens = await authService.getTokens();
      return { 
        success: true, 
        data: tokens 
      };
    } catch (error) {
      console.error('Error in auth:get-tokens handler:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to retrieve tokens' 
      };
    }
  });

  /**
   * Handler for clearing tokens from the OS keychain
   */
  ipcMain.handle('auth:clear-tokens', async (event) => {
    try {
      await authService.clearTokens();
      return { success: true };
    } catch (error) {
      console.error('Error in auth:clear-tokens handler:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to clear tokens' 
      };
    }
  });

  /**
   * Handler for checking if valid tokens exist
   */
  ipcMain.handle('auth:has-valid-tokens', async (event) => {
    try {
      const hasValidTokens = await authService.hasValidTokens();
      return { 
        success: true, 
        data: hasValidTokens 
      };
    } catch (error) {
      console.error('Error in auth:has-valid-tokens handler:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to check token validity' 
      };
    }
  });

  console.log('Auth handlers registered successfully');
}