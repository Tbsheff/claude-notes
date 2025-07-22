# Schema Migration System Documentation

## Overview

This document describes the schema migration system implemented for moving API keys from database storage to the OS keychain for improved security.

## Architecture

### Components

1. **Settings Service** (`electron/services/settings-service.ts`)
   - Manages application settings with schema versioning
   - Handles settings persistence to disk
   - Provides safe access to configuration data

2. **Migration Service** (`electron/services/migration-service.ts`)
   - Orchestrates schema migrations
   - Handles rollback on failure
   - Provides migration status and health checks

3. **IPC Handlers**
   - `electron/ipc/settings-handlers.ts` - Settings management
   - `electron/ipc/migration-handlers.ts` - Migration controls

## Schema Versions

### Version 1 (Legacy)
- API keys stored in `settings.json` file
- Basic settings structure without version tracking

### Version 2 (Current)
- API keys moved to OS keychain using `keytar`
- Added schema version tracking
- Migration history tracking
- Enhanced security model

## Migration Process

### Automatic Migration

1. **On Application Startup**
   ```typescript
   // In electron.ts
   await settingsService.initialize();
   
   if (await migrationService.needsMigration()) {
     const result = await migrationService.runMigrations();
   }
   ```

2. **Migration Steps (v1 → v2)**
   - Read API key from settings.json
   - Store in OS keychain using auth service
   - Verify successful storage
   - Clear API key from settings.json
   - Update schema version to 2

### Manual Migration Controls

```typescript
// Check migration status
const status = await ipcRenderer.invoke('migration:check');

// Run migration manually
const result = await ipcRenderer.invoke('migration:run');

// Force re-migration (testing)
const result = await ipcRenderer.invoke('migration:force');

// Check and repair issues
const health = await ipcRenderer.invoke('migration:repair');
```

## Error Handling

### Failure Scenarios

1. **Keychain Access Denied**
   - User prompted to grant access
   - Migration paused, can be retried
   - API key remains in settings

2. **Partial Migration**
   - Automatic rollback attempted
   - Previous state restored
   - Error logged with details

3. **Corrupted Settings**
   - Repair function attempts fix
   - Defaults applied if unrecoverable
   - User notified of data loss

### Rollback Mechanism

```typescript
// Emergency rollback (v2 → v1)
const result = await ipcRenderer.invoke('migration:rollback');
```

This will:
1. Retrieve API key from keychain
2. Store back in settings.json
3. Clear from keychain
4. Revert schema version

## Security Considerations

1. **API Key Protection**
   - Never exposed via IPC to renderer
   - Cleared from memory after migration
   - Stored encrypted in OS keychain

2. **Settings Access**
   - Sensitive fields filtered in IPC responses
   - Schema version protected from user modification
   - Migration history preserved for audit

## Testing

### Unit Tests

```typescript
// Test migration success
describe('Migration v1 to v2', () => {
  it('should move API key to keychain', async () => {
    // Setup v1 settings with API key
    await settingsService.set({ 
      schemaVersion: 1, 
      apiKey: 'test-key' 
    });
    
    // Run migration
    const result = await migrationService.runMigrations();
    
    // Verify
    expect(result.success).toBe(true);
    expect(settingsService.get('apiKey')).toBeUndefined();
    
    const tokens = await authService.getTokens();
    expect(tokens?.access_token).toBe('test-key');
  });
});
```

### Manual Testing

1. **Fresh Installation**
   - No settings file exists
   - Should create v2 settings
   - No migration needed

2. **Upgrade from v1**
   - Existing settings.json with API key
   - Should migrate automatically
   - Verify keychain storage

3. **Failed Migration Recovery**
   - Deny keychain access
   - Should show error dialog
   - Can retry via settings UI

## Monitoring

### Migration Status Events

```typescript
// Subscribe to status updates
migrationService.on('status-update', (status) => {
  console.log(`Migration progress: ${status.progress}%`);
  console.log(`Current step: ${status.message}`);
});
```

### Logs and History

```typescript
// Get migration history
const logs = await ipcRenderer.invoke('migration:logs');
console.log(logs.data.history);
```

## Troubleshooting

### Common Issues

1. **"Keychain access denied"**
   - Grant access in system preferences
   - Retry migration from settings

2. **"Migration already in progress"**
   - Wait for completion
   - Check logs for stuck migration
   - Restart app if necessary

3. **"Invalid schema version"**
   - Run repair function
   - Check settings.json integrity
   - Reset to defaults if corrupted

### Debug Commands

```bash
# Check current schema version
cat ~/Library/Application\ Support/claude-notes/settings.json | jq .schemaVersion

# View migration history
cat ~/Library/Application\ Support/claude-notes/settings.json | jq .migrationHistory

# Check keychain entry (macOS)
security find-generic-password -s "claude-notes" -a "oauth-tokens"
```

## Future Migrations

### Adding New Migrations

1. Increment `TARGET_SCHEMA_VERSION` in migration service
2. Add new case in `runSingleMigration()`
3. Implement migration logic
4. Update documentation

Example:
```typescript
case '2->3':
  await this.migrateV2ToV3();
  break;

private async migrateV2ToV3(): Promise<void> {
  // Migration logic here
}
```

### Best Practices

1. Always provide rollback logic
2. Validate data before and after migration
3. Log all operations for debugging
4. Test with various edge cases
5. Consider backward compatibility