import { db } from '../../lib/db'
import { chats, messages } from '../../lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import type { UnifiedMessage } from '../../lib/agent/types'

type NewChatRow = typeof chats.$inferInsert
type NewMessageRow = typeof messages.$inferInsert
type MessageRow = typeof messages.$inferSelect

export const ChatService = {
  createChat: (chat: NewChatRow) => db.insert(chats).values(chat).run(),

  addMessage: (chatId: string, message: UnifiedMessage) => {
    const row: NewMessageRow = {
      id: message.id,
      chatId,
      role: message.role,
      content: message.content,
      blocks: JSON.stringify(message.blocks),
      metadata: JSON.stringify(message.metadata),
      createdAt: Date.now()
    }
    db.insert(messages).values(row).run()
  },

  getMessages: (chatId: string): UnifiedMessage[] => {
    const rows: MessageRow[] = db
      .select()
      .from(messages)
      .where(eq(messages.chatId, chatId))
      .orderBy(asc(messages.createdAt))
      .all()

    return rows.map((row) => ({
      id: row.id,
      role: row.role as 'user' | 'assistant',
      content: row.content || '',
      blocks: JSON.parse(row.blocks || '[]'),
      metadata: JSON.parse(row.metadata || '{}'),
      toolInvocations: []
    }))
  },

  getChat: (chatId: string) => db.select().from(chats).where(eq(chats.id, chatId)).get(),

  getAllChats: () => db.select().from(chats).all(),

  deleteChat: (chatId: string) => {
    db.delete(chats).where(eq(chats.id, chatId)).run()
  },

  updateMessage: (message: UnifiedMessage) => {
    console.log('✅ Updating message in DB:', message.id)
    db.update(messages)
      .set({
        content: message.content,
        blocks: JSON.stringify(message.blocks)
      })
      .where(eq(messages.id, message.id))
      .run()
  }
} 