import { ipcMain, IpcMainInvokeEvent } from 'electron'
import * as imsgService from '../services/imsg-service'

export function setupImsgHandlers(): void {
  ipcMain.handle('imsg:isSupported', async () => {
    return imsgService.isSupported()
  })

  ipcMain.handle('imsg:listConversations', async () => {
    return imsgService.listConversations()
  })

  ipcMain.handle(
    'imsg:getMessages',
    async (_event: IpcMainInvokeEvent, conversationId: string, limit?: number) => {
      return imsgService.getMessages(conversationId, limit)
    }
  )

  ipcMain.handle(
    'imsg:sendMessage',
    async (_event: IpcMainInvokeEvent, recipient: string, text: string) => {
      return imsgService.sendMessage(recipient, text)
    }
  )

  ipcMain.handle(
    'imsg:sendFile',
    async (_event: IpcMainInvokeEvent, recipient: string, filePath: string) => {
      return imsgService.sendFile(recipient, filePath)
    }
  )
}
