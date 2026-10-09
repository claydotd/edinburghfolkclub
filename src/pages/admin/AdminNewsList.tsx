import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  adminDeletePost,
  adminListPosts,
  adminUpdatePost,
  formatNewsDate,
} from '../../news/api'
import type { NewsPost } from '../../news/types'

export default function AdminNewsList() {
  const [posts, setPosts] = useState<NewsPost[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false
    adminListPosts()
      .then((list) => {
        if (!cancelled) {
          setPosts(list)
          setError(null)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load posts')
          setPosts([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [reloadToken])

  async function togglePublished(post: NewsPost) {
    setBusyId(post.id)
    setError(null)
    try {
      await adminUpdatePost(post.id, {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        bodyMarkdown: post.bodyMarkdown,
        published: !post.published,
      })
      setReloadToken((n) => n + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setBusyId(null)
    }
  }

  async function onDelete(post: NewsPost) {
    if (!window.confirm(`Delete “${post.title}”? This cannot be undone.`)) return
    setBusyId(post.id)
    setError(null)
    try {
      await adminDeletePost(post.id)
      setReloadToken((n) => n + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <main className="page admin-page">
      <header className="page-masthead">
        <h1 className="page-title">Posts</h1>
        <p className="page-lede">
          <Link to="/admin/new">Create a new post</Link>
        </p>
      </header>

      {error ? (
        <p className="news-error" role="alert">
          {error}
        </p>
      ) : null}

      {posts === null ? (
        <p className="page-lede">Loading…</p>
      ) : posts.length === 0 ? (
        <p className="page-lede">No posts yet.</p>
      ) : (
        <ul className="admin-post-list">
          {posts.map((post) => (
            <li key={post.id} className="admin-post-row">
              <div className="admin-post-meta">
                <Link to={`/admin/${post.id}`} className="admin-post-title">
                  {post.title}
                </Link>
                <span className="admin-post-slug">/{post.slug}</span>
                <span
                  className={
                    post.published
                      ? 'admin-post-status is-published'
                      : 'admin-post-status is-draft'
                  }
                >
                  {post.published ? 'Published' : 'Draft'}
                  {post.publishedAt ? ` · ${formatNewsDate(post.publishedAt)}` : ''}
                </span>
              </div>
              <div className="admin-post-actions">
                <Link to={`/admin/${post.id}`}>Edit</Link>
                <button
                  type="button"
                  disabled={busyId === post.id}
                  onClick={() => void togglePublished(post)}
                >
                  {post.published ? 'Unpublish' : 'Publish'}
                </button>
                <button
                  type="button"
                  className="admin-post-delete"
                  disabled={busyId === post.id}
                  onClick={() => void onDelete(post)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
