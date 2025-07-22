module.exports = {
  schema: 'lib/db/schema.ts',
  out: 'lib/db/migrations',
  dialect: 'sqlite',
  dbCredentials: { url: 'data/app.db' }
} 