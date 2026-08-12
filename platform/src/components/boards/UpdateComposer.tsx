'use client'

import { useCallback, useRef, useState } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Mention from '@tiptap/extension-mention'
import { mentionSuggestion } from './mentionSuggestion'
import type { BoardAttachment } from './types'

const EMOJI = ['👍', '🎉', '✅', '🔥', '👀', '❤️', '😂', '🙌', '⚠️', '❓', '🚀', '💯']

interface ToolbarButtonProps {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
}

function ToolbarButton({ onClick, active, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`w-6 h-6 flex items-center justify-center rounded text-xs font-semibold transition-colors ${
        active ? 'bg-teal-100 text-teal-800' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
      }`}
    >
      {children}
    </button>
  )
}

function Toolbar({ editor }: { editor: Editor }) {
  const setLink = useCallback(() => {
    const prev = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Link URL', prev || 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-slate-200 flex-wrap">
      <ToolbarButton title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>B</ToolbarButton>
      <ToolbarButton title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><span className="italic">I</span></ToolbarButton>
      <ToolbarButton title="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><span className="underline">U</span></ToolbarButton>
      <ToolbarButton title="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}><span className="line-through">S</span></ToolbarButton>
      <span className="w-px h-4 bg-slate-200 mx-1" />
      <ToolbarButton title="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>&bull;</ToolbarButton>
      <ToolbarButton title="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1.</ToolbarButton>
      <ToolbarButton title="Checklist" active={editor.isActive('taskList')} onClick={() => editor.chain().focus().toggleTaskList().run()}>☑</ToolbarButton>
      <span className="w-px h-4 bg-slate-200 mx-1" />
      <ToolbarButton title="Quote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>&rdquo;</ToolbarButton>
      <ToolbarButton title="Link" active={editor.isActive('link')} onClick={setLink}>🔗</ToolbarButton>
      <ToolbarButton title="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}>&mdash;</ToolbarButton>
    </div>
  )
}

interface UpdateComposerProps {
  onSubmit: (payload: { body: string; attachments: BoardAttachment[] }) => Promise<void>
  uploadFolder?: string
}

export default function UpdateComposer({ onSubmit, uploadFolder = 'board-updates' }: UpdateComposerProps) {
  const [attachments, setAttachments] = useState<BoardAttachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [posting, setPosting] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' } },
      }),
      Placeholder.configure({ placeholder: 'Write an update… type @ to mention someone' }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Mention.configure({
        HTMLAttributes: { class: 'mention' },
        suggestion: mentionSuggestion,
      }),
    ],
  })

  // Direct PUT to a Supabase signed URL, not a multipart POST through this
  // Vercel serverless function -- that route (formerly /api/uploads) sits
  // underneath Vercel's hard ~4.5MB request-body ceiling, so a multi-MB
  // image/screenshot export died there as a generic browser "Failed to
  // fetch" before any app code ever ran. Found 2026-08-12 from a real
  // board-attachment failure report.
  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || !editor) return
    setUploading(true)
    setError('')
    try {
      for (const file of Array.from(files)) {
        const signedRes = await fetch('/api/boards/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }),
        })
        const signedData = await signedRes.json().catch(() => null)
        if (!signedRes.ok) throw new Error(signedData?.error || 'Failed to prepare upload')

        const putRes = await fetch(signedData.signedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type, 'x-upsert': 'false' },
          body: file,
        })
        if (!putRes.ok) throw new Error('Upload failed')

        setAttachments((prev) => [...prev, { name: file.name, url: signedData.publicUrl, size: file.size, content_type: file.type }])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function removeAttachment(url: string) {
    setAttachments((prev) => prev.filter((a) => a.url !== url))
  }

  async function post() {
    if (!editor || posting || uploading) return
    const body = editor.getHTML()
    const hasText = editor.getText().trim().length > 0
    if (!hasText && attachments.length === 0) return

    setPosting(true)
    setError('')
    try {
      await onSubmit({ body, attachments })
      editor.commands.clearContent()
      setAttachments([])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not post update')
    } finally {
      setPosting(false)
    }
  }

  if (!editor) return null

  const canPost = !posting && !uploading && (editor.getText().trim().length > 0 || attachments.length > 0)

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <Toolbar editor={editor} />

      <div className="tb-editor px-3 py-2 max-h-40 overflow-y-auto">
        <EditorContent editor={editor} className="tb-rich-text" />
      </div>

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-2">
          {attachments.map((a) => (
            <span key={a.url} className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 rounded px-2 py-1">
              📎 {a.name}
              <button type="button" onClick={() => removeAttachment(a.url)} className="text-slate-400 hover:text-red-500 leading-none">×</button>
            </span>
          ))}
        </div>
      )}

      {error && <p className="px-3 pb-2 text-xs text-red-600">{error}</p>}

      <div className="flex items-center justify-between px-2 py-1.5 border-t border-slate-100 relative">
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Attach file"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-7 h-7 flex items-center justify-center rounded text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40"
          >
            📎
          </button>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />

          <button
            type="button"
            title="Emoji"
            onClick={() => setShowEmoji((s) => !s)}
            className="w-7 h-7 flex items-center justify-center rounded text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            🙂
          </button>
          {showEmoji && (
            <div className="absolute bottom-9 left-0 bg-white border border-slate-200 rounded-lg shadow-lg p-2 grid grid-cols-6 gap-1 z-10">
              {EMOJI.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => { editor.chain().focus().insertContent(e).run(); setShowEmoji(false) }}
                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-base"
                >
                  {e}
                </button>
              ))}
            </div>
          )}
          {uploading && <span className="text-xs text-slate-400 ml-1">Uploading…</span>}
        </div>

        <button
          type="button"
          onClick={post}
          disabled={!canPost}
          className="px-3 py-1.5 bg-teal-600 text-white text-sm font-medium rounded hover:bg-teal-700 disabled:opacity-50"
        >
          {posting ? 'Posting…' : 'Post'}
        </button>
      </div>
    </div>
  )
}
