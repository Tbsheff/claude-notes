import React from 'react'

interface NoteEditorFooterProps {
  characterCount: number
}

export function NoteEditorFooter({ characterCount }: NoteEditorFooterProps) {
  return (
    <div className="border-t border-gray-200 px-6 py-2 flex items-center justify-between bg-gray-50">
      <span className="text-xs text-gray-500">
        {characterCount} characters
      </span>
      <div></div>
    </div>
  )
} 