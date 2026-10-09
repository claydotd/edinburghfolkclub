import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { marked } from 'marked'
import TurndownService from 'turndown'

type MarkdownEditorProps = {
  value: string
  onChange: (value: string) => void
  label?: string
  id?: string
}

type EditorMode = 'visual' | 'code'

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '_',
  strongDelimiter: '**',
})

turndown.addRule('strike', {
  filter: ['del', 's', 'strike'] as unknown as TurndownService.Filter,
  replacement: (content) => `~~${content}~~`,
})

marked.setOptions({ gfm: true, breaks: false })

function markdownToHtml(markdown: string): string {
  const html = marked.parse(markdown || '', { async: false })
  return typeof html === 'string' ? html : ''
}

function htmlToMarkdown(html: string): string {
  const cleaned = html
    .replace(/<div><br><\/div>/gi, '<p></p>')
    .replace(/<div>/gi, '<p>')
    .replace(/<\/div>/gi, '</p>')
  return turndown.turndown(cleaned).trim()
}

function runCommand(command: string, value?: string) {
  document.execCommand(command, false, value)
}

export default function MarkdownEditor({
  value,
  onChange,
  label = 'Body',
  id = 'news-body',
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<EditorMode>('visual')
  const visualRef = useRef<HTMLDivElement>(null)
  const lastEmitted = useRef(value)
  const skipNextVisualSync = useRef(false)
  const valueRef = useRef(value)
  valueRef.current = value

  // Always hydrate the contenteditable when entering Visual mode (fixes empty remount).
  useLayoutEffect(() => {
    if (mode !== 'visual') return
    const el = visualRef.current
    if (!el) return
    el.innerHTML = markdownToHtml(valueRef.current) || '<p><br></p>'
    lastEmitted.current = valueRef.current
    skipNextVisualSync.current = false
  }, [mode])

  // Sync external value changes while already in Visual (e.g. loaded post).
  useEffect(() => {
    if (mode !== 'visual') return
    const el = visualRef.current
    if (!el) return
    if (skipNextVisualSync.current) {
      skipNextVisualSync.current = false
      return
    }
    if (value === lastEmitted.current) return
    el.innerHTML = markdownToHtml(value) || '<p><br></p>'
    lastEmitted.current = value
  }, [mode, value])

  function emitFromVisual() {
    const el = visualRef.current
    if (!el) return
    const next = htmlToMarkdown(el.innerHTML)
    lastEmitted.current = next
    skipNextVisualSync.current = true
    onChange(next)
  }

  function switchMode(next: EditorMode) {
    if (next === mode) return
    if (mode === 'visual') {
      emitFromVisual()
      skipNextVisualSync.current = false
    }
    setMode(next)
  }

  function formatVisual(command: string, commandValue?: string) {
    const el = visualRef.current
    if (!el) return
    el.focus()
    if (command === 'createLink') {
      const url = window.prompt('Link URL', 'https://')
      if (!url) return
      runCommand('createLink', url)
    } else if (command === 'formatBlock') {
      runCommand('formatBlock', commandValue)
    } else {
      runCommand(command, commandValue)
    }
    emitFromVisual()
  }

  return (
    <div className="markdown-editor">
      <div className="markdown-editor-bar">
        <span className="markdown-editor-label">{label}</span>
        <div className="markdown-editor-mode" role="group" aria-label="Editor mode">
          <button
            type="button"
            className={mode === 'visual' ? 'is-active' : undefined}
            aria-pressed={mode === 'visual'}
            onClick={() => switchMode('visual')}
          >
            Visual
          </button>
          <button
            type="button"
            className={mode === 'code' ? 'is-active' : undefined}
            aria-pressed={mode === 'code'}
            onClick={() => switchMode('code')}
          >
            Code
          </button>
        </div>
      </div>

      {mode === 'visual' ? (
        <>
          <div className="markdown-editor-toolbar" role="toolbar" aria-label="Formatting">
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => formatVisual('bold')}>
              Bold
            </button>
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => formatVisual('italic')}>
              Italic
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => formatVisual('formatBlock', 'h2')}
            >
              Heading
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => formatVisual('createLink')}
            >
              Link
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => formatVisual('insertUnorderedList')}
            >
              List
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => formatVisual('insertOrderedList')}
            >
              Numbered
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => formatVisual('formatBlock', 'blockquote')}
            >
              Quote
            </button>
          </div>
          <div
            ref={visualRef}
            id={id}
            className="markdown-editor-visual prose"
            contentEditable
            role="textbox"
            aria-multiline="true"
            aria-label={label}
            data-placeholder="Write your article…"
            suppressContentEditableWarning
            onInput={emitFromVisual}
            onBlur={emitFromVisual}
          />
        </>
      ) : (
        <textarea
          id={`${id}-code`}
          className="markdown-editor-code"
          name="bodyMarkdown"
          rows={18}
          value={value}
          aria-label={`${label} markdown`}
          spellCheck
          onChange={(e) => {
            lastEmitted.current = e.target.value
            onChange(e.target.value)
          }}
        />
      )}
    </div>
  )
}
