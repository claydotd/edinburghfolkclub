import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import MarkdownEditor from '../../components/MarkdownEditor'
import {
  adminCreatePost,
  adminGetPost,
  adminUpdatePost,
  slugifyTitle,
} from '../../news/api'

export default function AdminNewsEdit() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()

  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadedId, setLoadedId] = useState<string | null>(isNew ? 'new' : null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [excerpt, setExcerpt] = useState('')
  const [bodyMarkdown, setBodyMarkdown] = useState('')
  const [published, setPublished] = useState(false)

  useEffect(() => {
    if (isNew) return
    let cancelled = false
    adminGetPost(id)
      .then((post) => {
        if (cancelled) return
        setTitle(post.title)
        setSlug(post.slug)
        setSlugTouched(true)
        setExcerpt(post.excerpt)
        setBodyMarkdown(post.bodyMarkdown)
        setPublished(post.published)
        setLoadError(null)
        setLoadedId(post.id)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load post')
          setLoadedId(id)
        }
      })
    return () => {
      cancelled = true
    }
  }, [id, isNew])

  function onTitleChange(next: string) {
    setTitle(next)
    if (!slugTouched) setSlug(slugifyTitle(next))
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    const input = {
      title,
      slug,
      excerpt,
      bodyMarkdown,
      published,
    }
    try {
      if (isNew) {
        const post = await adminCreatePost(input)
        navigate(`/admin/${post.id}`, { replace: true })
      } else {
        await adminUpdatePost(id, input)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const loading = !isNew && loadedId !== id

  if (loading) {
    return (
      <main className="page admin-page">
        <p className="page-lede">Loading…</p>
      </main>
    )
  }

  if (loadError) {
    return (
      <main className="page admin-page">
        <header className="page-masthead">
          <h1 className="page-title">Post not found</h1>
          <p className="page-lede">{loadError}</p>
          <p className="page-lede">
            <Link to="/admin/list">← All posts</Link>
          </p>
        </header>
      </main>
    )
  }

  return (
    <main className="page admin-page admin-edit-page">
      <header className="page-masthead">
        <h1 className="page-title">{isNew ? 'New post' : 'Edit post'}</h1>
        <p className="page-lede">
          <Link to="/admin/list">← All posts</Link>
        </p>
      </header>

      <form className="site-form site-form--wide admin-edit-form" onSubmit={onSubmit}>
        <label className="form-field">
          <span>Title</span>
          <input
            type="text"
            name="title"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            required
          />
        </label>

        <label className="form-field">
          <span>Slug</span>
          <input
            type="text"
            name="slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true)
              setSlug(e.target.value)
            }}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            title="Lowercase letters, numbers, and hyphens"
            required
          />
        </label>

        <label className="form-field">
          <span>Excerpt</span>
          <textarea
            name="excerpt"
            rows={3}
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
          />
        </label>

        <label className="form-field consent-field">
          <input
            type="checkbox"
            name="published"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
          />
          <span>Published (visible on /news)</span>
        </label>

        <MarkdownEditor value={bodyMarkdown} onChange={setBodyMarkdown} />

        {error ? (
          <p className="news-error" role="alert">
            {error}
          </p>
        ) : null}

        <button type="submit" className="form-submit" disabled={saving}>
          {saving ? 'Saving…' : isNew ? 'Create post' : 'Save changes'}
        </button>
      </form>
    </main>
  )
}
