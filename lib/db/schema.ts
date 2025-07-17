import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const chats = sqliteTable('chats', {
  id: text('id').primaryKey(),
  title: text('title'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull()
})

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  chatId: text('chat_id')
    .references(() => chats.id, { onDelete: 'cascade' })
    .notNull(),
  role: text('role').notNull(),
  content: text('content'),
  blocks: text('blocks'),
  metadata: text('metadata'),
  createdAt: integer('created_at').notNull()
})

export const notesIndex = sqliteTable('notes_index', {
  id: text('id').primaryKey(),
  title: text('title'),
  filePath: text('file_path'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull()
})

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value')
}) 