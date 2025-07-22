import { ipcMain, shell, BrowserWindow } from 'electron';
import { authService } from '../services/auth-service';
import { TokenSet, generatePKCEParams, buildLoginUrl, exchangeCode } from '../../lib/auth/claude';
import * as http from 'http';
import * as url from 'url';

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

  /**
   * Handler for starting OAuth flow
   */
  ipcMain.handle('auth:start-oauth', async (event) => {
    try {
      // Generate PKCE parameters
      const pkceParams = generatePKCEParams();
      
      // Build login URL
      const loginUrl = buildLoginUrl(pkceParams, ['read', 'write']);
      
      // Create a local HTTP server to handle the callback
      const server = await createCallbackServer(pkceParams);
      
      // Open the login URL in the default browser
      await shell.openExternal(loginUrl);
      
      // Wait for the OAuth flow to complete
      const result = await server;
      
      return result;
    } catch (error) {
      console.error('Error in auth:start-oauth handler:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to start OAuth flow' 
      };
    }
  });

  /**
   * Handler for getting user info from tokens
   */
  ipcMain.handle('auth:get-user-info', async (event) => {
    try {
      const tokens = await authService.getTokens();
      if (\!tokens) {
        return { success: false, error: 'No tokens found' };
      }
      
      // For now, return basic info from token
      // In a real implementation, you might want to call an API endpoint
      return {
        success: true,
        data: {
          isAuthenticated: true,
          tokenType: tokens.token_type || 'Bearer',
          expiresAt: tokens.expires_at,
          scope: tokens.scope
        }
      };
    } catch (error) {
      console.error('Error in auth:get-user-info handler:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to get user info' 
      };
    }
  });

  console.log('Auth handlers registered successfully');
}

/**
 * Create a local HTTP server to handle OAuth callback
 */
function createCallbackServer(pkceParams: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const parsedUrl = url.parse(req.url || '', true);
      
      if (parsedUrl.pathname === '/cb') {
        const { code, state, error } = parsedUrl.query;
        
        // Handle errors
        if (error) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 50px;">
                <h2>Authentication Failed</h2>
                <p>${error}</p>
                <p>You can close this window.</p>
              </body>
            </html>
          `);
          server.close();
          resolve({ success: false, error: error as string });
          return;
        }
        
        // Verify state
        if (state \!== pkceParams.state) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 50px;">
                <h2>Authentication Failed</h2>
                <p>Invalid state parameter</p>
                <p>You can close this window.</p>
              </body>
            </html>
          `);
          server.close();
          resolve({ success: false, error: 'Invalid state parameter' });
          return;
        }
        
        // Exchange code for tokens
        try {
          const tokens = await exchangeCode(code as string, pkceParams.codeVerifier);
          
          // Store tokens
          await authService.storeTokens(tokens);
          
          // Send success response
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 50px;">
                <h2>Authentication Successful\!</h2>
                <p>You can close this window and return to Claude Notes.</p>
                <script>window.close();</script>
              </body>
            </html>
          `);
          
          // Focus the main window
          const mainWindow = BrowserWindow.getAllWindows()[0];
          if (mainWindow) {
            mainWindow.focus();
          }
          
          server.close();
          resolve({ success: true, tokens });
        } catch (error) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 50px;">
                <h2>Authentication Failed</h2>
                <p>${error.message}</p>
                <p>You can close this window.</p>
              </body>
            </html>
          `);
          server.close();
          resolve({ success: false, error: error.message });
        }
      } else {
        res.writeHead(404);
        res.end();
      }
    });
    
    // Listen on the redirect URI port
    server.listen(51703, '127.0.0.1', () => {
      console.log('OAuth callback server listening on http://127.0.0.1:51703');
    });
    
    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error('OAuth flow timed out'));
    }, 5 * 60 * 1000);
  });
}
