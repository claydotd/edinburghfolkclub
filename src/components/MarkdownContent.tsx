import type { ComponentPropsWithoutRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { remarkColorText } from '../utils/markdownColor'
import { publicUrl } from '../utils/publicUrl'

type WithNode<T> = T & { node?: unknown }

function omitNode<T extends { node?: unknown }>({ node, ...props }: T) {
  void node
  return props
}

const markdownComponents = {
  img: ({ src, alt, ...props }: WithNode<ComponentPropsWithoutRef<'img'>>) => (
    <img src={src ? publicUrl(src) : src} alt={alt ?? ''} {...omitNode(props)} />
  ),
  table: ({ children, ...props }: WithNode<ComponentPropsWithoutRef<'table'>>) => (
    <div className="markdown-table-wrap">
      <table {...omitNode(props)}>{children}</table>
    </div>
  ),
}

type MarkdownContentProps = {
  children: string
}

export default function MarkdownContent({ children }: MarkdownContentProps) {
  return (
    <div className="markdown-body">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkColorText]} components={markdownComponents}>
        {children}
      </ReactMarkdown>
    </div>
  )
}
