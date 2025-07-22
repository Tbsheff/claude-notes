import { ipcMain } from 'electron'
import { ChatService } from '../services/chat-service'

ipcMain.handle('chats:create', async (_e, chat) => {
  try {
    await ChatService.createChat(chat)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
})

ipcMain.handle('chats:addMessage', async (_e, chatId, message) => {
  try {
    await ChatService.addMessage(chatId, message)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
})

ipcMain.handle('chats:getMessages', async (_e, chatId) => {
  try {
    const data = await ChatService.getMessages(chatId)
    return { success: true, messages: data }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
})

ipcMain.handle('chats:get', async (_e, chatId) => {
  try {
    const chat = await ChatService.getChat(chatId)
    return { success: true, chat }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
})

ipcMain.handle('chats:list', async () => {
  try {
    const chats = await ChatService.getAllChats()
    return { success: true, chats }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
})

ipcMain.handle('chats:updateMessage', async (_e, message) => {
  try {
    await ChatService.updateMessage(message)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
})

ipcMain.handle('chats:delete', async (_e, chatId) => {
  try {
    await ChatService.deleteChat(chatId)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
})

ipcMain.handle('chats:updateTitle', async (_e, chatId, title) => {
  try {
    await ChatService.updateChatTitle(chatId, title)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}) 