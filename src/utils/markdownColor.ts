type Color = 'red' | 'green'

type MdNode = {
  type: string
  value?: string
  children?: MdNode[]
  data?: {
    hName?: string
    hProperties?: { className?: string[] }
  }
}

const OPEN_COLOR = /\{(red|green)\}/
const COLOR_TOKEN = /\{(\/)?(red|green)\}/g

function colorNode(color: Color, children: MdNode[]): MdNode {
  return {
    type: 'mdColor',
    data: {
      hName: 'span',
      hProperties: { className: [`md-${color}`] },
    },
    children,
  }
}

function splitText(color: Color, value: string, depthStart: number) {
  COLOR_TOKEN.lastIndex = 0
  let depth = depthStart
  let match: RegExpExecArray | null
  while ((match = COLOR_TOKEN.exec(value))) {
    const isClose = Boolean(match[1])
    const tokenColor = match[2] as Color
    if (tokenColor !== color) continue
    if (isClose) {
      depth -= 1
      if (depth === 0) {
        return {
          closed: true as const,
          innerText: value.slice(0, match.index),
          rest: value.slice(match.index + match[0].length),
        }
      }
    } else {
      depth += 1
    }
  }
  return { closed: false as const, depth, innerText: value }
}

function takeUntilClose(color: Color, queue: MdNode[]) {
  let depth = 1
  const inner: MdNode[] = []
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index]
    if (current.type !== 'text' || current.value == null) {
      inner.push(current)
      continue
    }
    const split = splitText(color, current.value, depth)
    if (split.closed) {
      if (split.innerText) inner.push({ type: 'text', value: split.innerText })
      const tail: MdNode[] = []
      if (split.rest) tail.push({ type: 'text', value: split.rest })
      tail.push(...queue.slice(index + 1))
      return { inner, tail }
    }
    depth = split.depth
    if (split.innerText) inner.push({ type: 'text', value: split.innerText })
  }
  return null
}

function rewrite(nodes: MdNode[]): MdNode[] {
  const out: MdNode[] = []
  let index = 0
  while (index < nodes.length) {
    const node = nodes[index]
    const value = node.type === 'text' ? (node.value ?? '') : ''
    const open = value.match(OPEN_COLOR)
    if (!open || open.index === undefined) {
      if (node.children) node.children = rewrite(node.children)
      out.push(node)
      index += 1
      continue
    }

    const color = open[1] as Color
    const before = value.slice(0, open.index)
    const after = value.slice(open.index + open[0].length)
    const queue: MdNode[] = []
    if (after) queue.push({ type: 'text', value: after })
    queue.push(...nodes.slice(index + 1))
    const taken = takeUntilClose(color, queue)
    if (!taken) {
      out.push(node)
      index += 1
      continue
    }

    if (before) out.push({ type: 'text', value: before })
    const inner = rewrite(taken.inner)
    if (inner.length > 0) out.push(colorNode(color, inner))
    out.push(...rewrite(taken.tail))
    break
  }
  return out
}

/** Turn `{red}…{/red}` and `{green}…{/green}` into span elements. */
export function remarkColorText() {
  return (tree: MdNode) => {
    if (tree.children) tree.children = rewrite(tree.children)
  }
}

function replaceColorMarkers(markdown: string): string {
  return markdown.replace(/\{(red|green)\}([\s\S]*?)\{\/\1\}/g, (_match, color: Color, inner: string) => {
    return `<span class="md-${color}">${replaceColorMarkers(inner)}</span>`
  })
}

/** Editor preview: same colour syntax, leaving fenced and inline code alone. */
export function markdownColorsToHtml(markdown: string): string {
  const parts = markdown.split(/(```[\s\S]*?```|`[^`\n]+`)/g)
  return parts
    .map((part, index) => (index % 2 === 1 ? part : replaceColorMarkers(part)))
    .join('')
}
