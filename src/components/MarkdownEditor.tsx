import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { marked } from 'marked'
import TurndownService from 'turndown'
import { markdownColorsToHtml } from '../utils/markdownColor'

export type MarkdownEditorFormat =
  | 'bold'
  | 'italic'
  | 'red'
  | 'green'
  | 'heading'
  | 'link'
  | 'list'
  | 'numbered'
  | 'quote'

const DEFAULT_FORMATS: MarkdownEditorFormat[] = [
  'bold',
  'italic',
  'red',
  'green',
  'heading',
  'link',
  'list',
  'numbered',
  'quote',
]

type MarkdownEditorProps = {
  value: string
  onChange: (value: string) => void
  label?: string
  id?: string
  placeholder?: string
  formats?: MarkdownEditorFormat[]
  showModeToggle?: boolean
  variant?: 'default' | 'compact'
  /** Keep only paragraphs, bold, italic, and safe links. */
  emailSafe?: boolean
}

function sanitizeEmailFormatting(root: HTMLElement) {
  const doc = root.ownerDocument

  const clean = (node: Node): Node[] => {
    if (node.nodeType === Node.TEXT_NODE) {
      return [doc.createTextNode(node.textContent ?? '')]
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return []
    const el = node as HTMLElement
    const children = Array.from(el.childNodes).flatMap(clean)
    const tag = el.tagName
    if (tag === 'BR') return [doc.createElement('br')]
    if (tag === 'STRONG' || tag === 'B') {
      const strong = doc.createElement('strong')
      children.forEach((child) => strong.appendChild(child))
      return [strong]
    }
    if (tag === 'EM' || tag === 'I') {
      const em = doc.createElement('em')
      children.forEach((child) => em.appendChild(child))
      return [em]
    }
    if (tag === 'A') {
      const href = acceptableEditorLinkUrl(el.getAttribute('href') ?? '')
      if (!href) return children
      const anchor = doc.createElement('a')
      anchor.setAttribute('href', href)
      children.forEach((child) => anchor.appendChild(child))
      return [anchor]
    }
    if (tag === 'P' || tag === 'DIV') {
      const paragraph = doc.createElement('p')
      children.forEach((child) => paragraph.appendChild(child))
      return [paragraph]
    }
    if (tag === 'LI') {
      return [...children, doc.createElement('br')]
    }
    return children
  }

  root.replaceChildren(...Array.from(root.childNodes).flatMap(clean))
}

function escapeAttr(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

/** Links the newsletter and article editors are allowed to insert. */
export function acceptableEditorLinkUrl(raw: string): string | null {
  const value = raw.trim()
  if (!value || value === 'https://' || value === 'http://') return null
  if (value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\')) {
    return value
  }
  if (/^https?:\/\/\S+$/i.test(value)) return value
  if (/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(value)) return value
  if (/^www\.\S+$/i.test(value)) return `https://${value}`
  return null
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

turndown.addRule('mdColor', {
  filter: (node) =>
    node.nodeName === 'SPAN' &&
    (node.classList.contains('md-red') || node.classList.contains('md-green')),
  replacement: (content, node) => {
    const color = (node as HTMLElement).classList.contains('md-red') ? 'red' : 'green'
    return `{${color}}${content}{/${color}}`
  },
})

marked.setOptions({ gfm: true, breaks: false })

function markdownToHtml(markdown: string): string {
  const html = marked.parse(markdownColorsToHtml(markdown || ''), { async: false })
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
  placeholder = 'Write your article…',
  formats = DEFAULT_FORMATS,
  showModeToggle = true,
  variant = 'default',
  emailSafe = false,
}: MarkdownEditorProps) {
  const enabled = new Set(formats)
  const [mode, setMode] = useState<EditorMode>('visual')
  const [linkDraft, setLinkDraft] = useState<string | null>(null)
  const [linkError, setLinkError] = useState<string | null>(null)
  const visualRef = useRef<HTMLDivElement>(null)
  const linkInputRef = useRef<HTMLInputElement>(null)
  const savedLinkRange = useRef<Range | null>(null)
  const linkFieldOpen = linkDraft !== null
  const lastEmitted = useRef(value)
  const skipNextVisualSync = useRef(false)
  const valueRef = useRef(value)
  valueRef.current = value

  useEffect(() => {
    if (!linkFieldOpen) return
    const input = linkInputRef.current
    if (!input) return
    input.focus()
    input.select()
  }, [linkFieldOpen])

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
    setLinkDraft(null)
    setLinkError(null)
    setMode(next)
  }

  function rememberSelection() {
    const el = visualRef.current
    const selection = window.getSelection()
    if (!el || !selection || selection.rangeCount === 0) {
      savedLinkRange.current = null
      return
    }
    const range = selection.getRangeAt(0)
    if (!el.contains(range.commonAncestorContainer)) {
      savedLinkRange.current = null
      return
    }
    savedLinkRange.current = range.cloneRange()
  }

  function restoreSelection() {
    const el = visualRef.current
    if (!el) return
    el.focus()
    const selection = window.getSelection()
    if (!selection) return
    selection.removeAllRanges()
    if (savedLinkRange.current) {
      selection.addRange(savedLinkRange.current)
      return
    }
    const range = document.createRange()
    range.selectNodeContents(el)
    range.collapse(false)
    selection.addRange(range)
  }

  function beginLink() {
    rememberSelection()
    setLinkError(null)
    setLinkDraft('https://')
  }

  function applyLink() {
    const url = acceptableEditorLinkUrl(linkDraft ?? '')
    if (!url) {
      setLinkError('Use an https:// link, a site path starting with /, or a mailto: address.')
      return
    }
    restoreSelection()
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) {
      const label = url.replace(/^mailto:/i, '').replace(/^https?:\/\//i, '')
      runCommand(
        'insertHTML',
        `<a href="${escapeAttr(url)}">${escapeAttr(label)}</a>`,
      )
    } else {
      runCommand('createLink', url)
    }
    setLinkDraft(null)
    setLinkError(null)
    emitFromVisual()
  }

  function applyColor(color: 'red' | 'green') {
    const el = visualRef.current
    if (!el) return
    el.focus()
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return
    const range = selection.getRangeAt(0)
    if (!el.contains(range.commonAncestorContainer)) return
    const span = document.createElement('span')
    span.className = `md-${color}`
    span.appendChild(range.extractContents())
    range.insertNode(span)
    emitFromVisual()
  }

  function formatVisual(command: string, commandValue?: string) {
    const el = visualRef.current
    if (!el) return
    el.focus()
    if (command === 'createLink') {
      if (emailSafe) {
        beginLink()
        return
      }
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
    <div className={variant === 'compact' ? 'markdown-editor is-compact' : 'markdown-editor'}>
      <div className="markdown-editor-bar">
        <span className="markdown-editor-label">{label}</span>
        {showModeToggle ? (
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
        ) : null}
      </div>

      {mode === 'visual' ? (
        <>
          <div className="markdown-editor-toolbar" role="toolbar" aria-label="Formatting">
            {enabled.has('bold') ? (
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => formatVisual('bold')}>
                <strong>Bold</strong>
              </button>
            ) : null}
            {enabled.has('italic') ? (
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => formatVisual('italic')}>
                <em>Italic</em>
              </button>
            ) : null}
            {enabled.has('red') ? (
              <button
                type="button"
                className="md-color-red"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyColor('red')}
              >
                Red
              </button>
            ) : null}
            {enabled.has('green') ? (
              <button
                type="button"
                className="md-color-green"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyColor('green')}
              >
                Green
              </button>
            ) : null}
            {enabled.has('heading') ? (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => formatVisual('formatBlock', 'h2')}
              >
                Heading
              </button>
            ) : null}
            {enabled.has('link') ? (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => formatVisual('createLink')}
              >
                Link
              </button>
            ) : null}
            {enabled.has('list') ? (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => formatVisual('insertUnorderedList')}
              >
                List
              </button>
            ) : null}
            {enabled.has('numbered') ? (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => formatVisual('insertOrderedList')}
              >
                Numbered
              </button>
            ) : null}
            {enabled.has('quote') ? (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => formatVisual('formatBlock', 'blockquote')}
              >
                Quote
              </button>
            ) : null}
          </div>
          {linkDraft !== null ? (
            <div className="markdown-editor-link">
              <label className="markdown-editor-link-field">
                <span>Link URL</span>
                <input
                  ref={linkInputRef}
                  type="text"
                  value={linkDraft}
                  autoComplete="off"
                  placeholder="https://"
                  aria-invalid={linkError ? true : undefined}
                  onChange={(event) => {
                    setLinkDraft(event.target.value)
                    setLinkError(null)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      applyLink()
                    } else if (event.key === 'Escape') {
                      event.preventDefault()
                      setLinkDraft(null)
                      setLinkError(null)
                    }
                  }}
                />
              </label>
              <button type="button" onClick={applyLink}>
                Add link
              </button>
              <button
                type="button"
                onClick={() => {
                  setLinkDraft(null)
                  setLinkError(null)
                }}
              >
                Cancel
              </button>
              {linkError ? (
                <p className="markdown-editor-link-error" role="alert">
                  {linkError}
                </p>
              ) : null}
            </div>
          ) : null}
          <div
            ref={visualRef}
            id={id}
            className="markdown-editor-visual markdown-body prose"
            contentEditable
            role="textbox"
            aria-multiline="true"
            aria-label={label}
            data-placeholder={placeholder}
            suppressContentEditableWarning
            onInput={emitFromVisual}
            onBlur={emitFromVisual}
            onPaste={
              emailSafe
                ? (event) => {
                    event.preventDefault()
                    const html = event.clipboardData.getData('text/html')
                    const text = event.clipboardData.getData('text/plain')
                    if (html) {
                      const holder = document.createElement('div')
                      holder.innerHTML = html
                      sanitizeEmailFormatting(holder)
                      runCommand('insertHTML', holder.innerHTML)
                    } else {
                      runCommand('insertText', text)
                    }
                    emitFromVisual()
                  }
                : undefined
            }
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
