# Authentication Module Test Suite

This directory contains comprehensive unit tests for the Claude client authentication module, covering OAuth token handling, keychain operations, HTTP client functionality, and database migrations.

## Test Coverage

### 1. **lib/auth/claude.test.ts**
Tests for the core OAuth authentication module:
- **PKCE Generation**: Verifies cryptographically secure parameter generation
- **Login URL Building**: Tests OAuth authorization URL construction with proper parameters
- **Token Exchange**: Tests authorization code to token exchange flow
- **Token Refresh**: Tests refresh token flow and error handling
- **Token Expiry**: Tests token expiration checks with buffer time
- **Error Redaction**: Tests sensitive data redaction from error messages

### 2. **electron/services/auth-service.test.ts**
Tests for secure token storage using OS keychain:
- **Token Storage**: Tests storing OAuth tokens in keychain
- **Token Retrieval**: Tests retrieving and parsing tokens from keychain
- **Token Deletion**: Tests clearing tokens from keychain
- **Token Validation**: Tests checking for valid, non-expired tokens
- **Error Handling**: Tests keychain access failures and recovery

### 3. **lib/llm/claude-client.test.ts**
Tests for the HTTP client with authentication:
- **Auth Headers**: Tests automatic selection between OAuth and API key
- **Token Refresh**: Tests automatic token refresh on 401 responses
- **Retry Logic**: Tests rate limiting and exponential backoff
- **Streaming**: Tests server-sent events streaming
- **Error Handling**: Tests network errors and malformed responses
- **Auth Updates**: Tests dynamic authentication method switching

### 4. **electron/services/migration-service.test.ts**
Tests for database schema migrations:
- **Version Detection**: Tests schema version checking
- **API Key Migration**: Tests migrating API keys to keychain (v1 → v2)
- **OAuth Token Migration**: Tests handling existing OAuth tokens
- **Rollback**: Tests migration failure and rollback scenarios
- **Concurrent Protection**: Tests preventing concurrent migrations
- **Health Checks**: Tests migration integrity verification

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test suites
npm run test:auth      # Auth module tests only
npm run test:services  # Electron services tests only
npm run test:llm       # LLM client tests only
npm run test:migration # Migration service tests only

# Run tests in CI mode
npm run test:ci
```

## Test Configuration

Tests are configured using Jest with TypeScript support:
- **Test Environment**: Node.js
- **Coverage Threshold**: 80% for branches, functions, lines, and statements
- **Mocking**: Automatic mocking of electron, keytar, and fetch
- **Setup**: Global test configuration in `jest.setup.ts`

## Key Testing Scenarios

### Security Testing
- Sensitive data redaction in error messages
- Keychain access permission failures
- Token expiration with clock skew buffer
- OAuth token refresh on authentication failures

### Error Resilience
- Network timeouts and failures
- Malformed API responses
- Keychain locked or unavailable
- Migration rollback on failure
- Rate limiting with retry logic

### Edge Cases
- Expired tokens with missing refresh tokens
- Partial token data
- Concurrent migration attempts
- Empty or malformed keychain data
- API key to OAuth token conversion

## Mocking Strategy

### External Dependencies
- **keytar**: Mocked for keychain operations
- **fetch**: Mocked for HTTP requests
- **electron**: Mocked for IPC and app paths
- **crypto**: Real implementation used for PKCE tests

### Test Isolation
- Each test suite uses `beforeEach` to reset mocks
- Console output is suppressed unless testing logs
- Mock implementations are type-safe using Jest generics

## Coverage Reports

After running `npm run test:coverage`, open `coverage/lcov-report/index.html` in a browser to view detailed coverage reports with line-by-line analysis.

## Adding New Tests

When adding new authentication features:
1. Add test cases covering happy path and error scenarios
2. Mock external dependencies appropriately
3. Test edge cases and security implications
4. Ensure tests are deterministic and isolated
5. Update this README with new test scenarios