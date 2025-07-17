import { FC } from 'react'
import { ToolBlock } from './types'
import { Note } from '@/app/modules/editor/api/types'

export interface ToolComponentProps {
  block: ToolBlock;
  currentNote?: Note;
  onApplyChanges?: (data: { action: string; content: string; newNote?: Note }) => void;
  onUpdateBlock?: (block: ToolBlock) => void;
}

class ToolRegistry {
  private components = new Map<string, React.FC<ToolComponentProps>>()

  register(toolName: string, component: React.FC<ToolComponentProps>) {
    this.components.set(toolName, component)
  }

  get(toolName: string): React.FC<ToolComponentProps> | undefined {
    return this.components.get(toolName)
  }
}

export const toolRegistry = new ToolRegistry()

export function getToolComponent(toolName: string): React.FC<ToolComponentProps> | undefined {
  return toolRegistry.get(toolName)
}

export function hasToolComponent(toolName: string): boolean {
  return toolRegistry.get(toolName) !== undefined
} 