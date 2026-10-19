import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import MarkdownContent from '../components/MarkdownContent'
import { fetchNewsPost, formatNewsDate } from '../news/api'
import type { NewsSnapshotPost } from '../news/types'
import Reveal from '../components/Reveal'

type LoadState =
  | { status: 'loading'; slug: string }
  | { status: 'ready'; slug: string; post: NewsSnapshotPost }
  | { status: 'error'; slug: string; message: string }

export default function NewsPost() {
  const { slug = '' } = useParams()
  const [state, setState] = useState<LoadState>({ status: 'loading', slug })

  useEffect(() => {
    let cancelled = false
    fetchNewsPost(slug)
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', slug, post: data.post })
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            slug,
            message: err instanceof Error ? err.message : 'Post not found',
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  const loading = state.status === 'loading' || state.slug !== slug
  const post = state.status === 'ready' && state.slug === slug ? state.post : null
  const error =
    state.status === 'error' && state.slug === slug ? state.message : null

  return (
    <main className="page prose-page news-article">
      <p className="back-link">
        <Link to="/news">← News</Link>
      </p>

      {loading ? (
        <p className="page-lede">Loading…</p>
      ) : error || !post ? (
        <header className="page-masthead">
          <h1 className="page-title">Post not found</h1>
          <p className="page-lede">{error ?? 'This article is unavailable.'}</p>
        </header>
      ) : (
        <>
        <Reveal variant="zoom" delay={100}>
          <header className="page-masthead news-article-masthead">
            <h1 className="page-title">{post.title}</h1>
            {post.publishedAt ? (
              <time className="news-article-date" dateTime={post.publishedAt}>
                {formatNewsDate(post.publishedAt)}
              </time>
            ) : null}
          </header>
          </Reveal>
          <Reveal variant="up" delay={200}>
          <div className="prose">
            <MarkdownContent>{post.bodyMarkdown}</MarkdownContent>
          </div>
          </Reveal>
        </>
      )}
    </main>
  )
}
