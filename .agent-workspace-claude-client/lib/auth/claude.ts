import crypto from 'crypto';

// OAuth constants
const ANTHROPIC_AUTH_URL = 'https://console.anthropic.com/oauth/authorize';
const ANTHROPIC_TOKEN_URL = 'https://api.anthropic.com/oauth/token';
const CLIENT_ID = 'claude-notes-desktop';
const REDIRECT_URI = 'http://127.0.0.1:51703/cb';

// Interfaces
export interface TokenSet {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  token_type?: string;
  scope?: string;
}

export interface PKCEParams {
  codeVerifier: string;
  codeChallenge: string;
  state: string;
}

// PKCE generation
export function generatePKCEParams(): PKCEParams {
  // Generate code verifier (43-128 characters, URL-safe)
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  
  // Generate code challenge using SHA256
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  
  // Generate state for CSRF protection
  const state = crypto.randomBytes(16).toString('base64url');
  
  return {
    codeVerifier,
    codeChallenge,
    state
  };
}

// Build OAuth authorization URL
export function buildLoginUrl(pkceParams: PKCEParams, scopes: string[] = []): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    code_challenge: pkceParams.codeChallenge,
    code_challenge_method: 'S256',
    state: pkceParams.state,
  });
  
  if (scopes.length > 0) {
    params.append('scope', scopes.join(' '));
  }
  
  return `${ANTHROPIC_AUTH_URL}?${params.toString()}`;
}

// Exchange authorization code for tokens
export async function exchangeCode(
  code: string,
  codeVerifier: string
): Promise<TokenSet> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    code_verifier: codeVerifier,
  });
  
  try {
    const response = await fetch(ANTHROPIC_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Token exchange failed: ${response.status} - ${errorData}`);
    }
    
    const tokenSet: TokenSet = await response.json();
    
    // Calculate expires_at if expires_in is provided
    if (tokenSet.expires_in) {
      tokenSet.expires_at = Date.now() + tokenSet.expires_in * 1000;
    }
    
    return tokenSet;
  } catch (error) {
    // Redact any sensitive information from error
    throw new Error(redactTokenFromError(error));
  }
}

// Refresh expired tokens
export async function refreshToken(refreshToken: string): Promise<TokenSet> {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: CLIENT_ID,
  });
  
  try {
    const response = await fetch(ANTHROPIC_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Token refresh failed: ${response.status} - ${errorData}`);
    }
    
    const tokenSet: TokenSet = await response.json();
    
    // Calculate expires_at if expires_in is provided
    if (tokenSet.expires_in) {
      tokenSet.expires_at = Date.now() + tokenSet.expires_in * 1000;
    }
    
    return tokenSet;
  } catch (error) {
    // Redact any sensitive information from error
    throw new Error(redactTokenFromError(error));
  }
}

// Check if token is expired
export function isTokenExpired(tokenSet: TokenSet): boolean {
  if (!tokenSet.expires_at) {
    // If no expiry information, assume token is valid
    return false;
  }
  
  // Add a 5-minute buffer to account for clock skew
  const bufferMs = 5 * 60 * 1000;
  return Date.now() >= tokenSet.expires_at - bufferMs;
}

// Redact sensitive information from error messages
export function redactTokenFromError(error: unknown): string {
  let errorMessage = '';
  
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else {
    errorMessage = String(error);
  }
  
  // Patterns to redact
  const sensitivePatterns = [
    // OAuth tokens (various formats)
    /\b[A-Za-z0-9_-]{20,}\b/g,
    // Bearer tokens
    /Bearer\s+[A-Za-z0-9_-]+/gi,
    // Refresh tokens
    /refresh_token["\s:=]+[A-Za-z0-9_-]+/gi,
    // Access tokens
    /access_token["\s:=]+[A-Za-z0-9_-]+/gi,
    // Authorization codes
    /code["\s:=]+[A-Za-z0-9_-]+/gi,
  ];
  
  let redactedMessage = errorMessage;
  
  // Replace sensitive patterns with [REDACTED]
  sensitivePatterns.forEach(pattern => {
    redactedMessage = redactedMessage.replace(pattern, '[REDACTED]');
  });
  
  return redactedMessage;
}