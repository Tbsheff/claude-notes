import React from 'react'
import { ToolBlock } from './types'

export interface ToolComponentProps {
  block: ToolBlock
}

export type ToolComponent = React.ComponentType<ToolComponentProps>

class ToolRegistry {
  private components: Map<string, ToolComponent> = new Map()

  register(toolName: string, component: ToolComponent) {
    this.components.set(toolName, component)
  }

  get(toolName: string): ToolComponent | undefined {
    return this.components.get(toolName)
  }

  has(toolName: string): boolean {
    return this.components.has(toolName)
  }
}

export const toolRegistry = new ToolRegistry()

export function getToolComponent(toolName: string): ToolComponent | undefined {
  return toolRegistry.get(toolName)
}

export function hasToolComponent(toolName: string): boolean {
  return toolRegistry.has(toolName)
} 