import React from 'react'

interface NoteEditorFooterProps {
  characterCount: number
  wordCount: number
}

export function NoteEditorFooter({ characterCount, wordCount }: NoteEditorFooterProps) {
  return (
    <div className="border-t border-gray-200 px-6 py-2 flex items-center justify-between bg-white">
      <span className="text-xs text-gray-500">
        {characterCount} characters
      </span>
      <span className="text-xs text-gray-500">
        {wordCount} words
      </span>
    </div>
  )
} 