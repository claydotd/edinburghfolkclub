import { type FormEvent, useEffect, useState } from 'react'
import { isNewsDemo } from '../../news/api'
import {
  adminCreateMember,
  adminDeleteMember,
  adminListMembers,
  adminUpdateMember,
} from '../../membership/api'
import {
  formatMemberDate,
  memberStatusLabel,
  type Member,
  type MemberInput,
} from '../../membership/types'

type MemberForm = {
  name: string
  email: string
  paid: boolean
  paidAt: string
}

const emptyForm: MemberForm = {
  name: '',
  email: '',
  paid: false,
  paidAt: '',
}

function toInput(form: MemberForm): MemberInput {
  return {
    name: form.name,
    email: form.email,
    paid: form.paid,
    paidAt: form.paidAt.trim() || null,
  }
}

export default function AdminMembers() {
  const [members, setMembers] = useState<Member[] | null>(null)
  const [form, setForm] = useState<MemberForm>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    if (isNewsDemo()) return
    let cancelled = false
    adminListMembers()
      .then((list) => {
        if (!cancelled) {
          setMembers(list)
          setError(null)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load members')
          setMembers([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [reloadToken])

  function startEdit(member: Member) {
    setEditingId(member.id)
    setForm({
      name: member.name,
      email: member.email,
      paid: member.paid,
      paidAt: member.paidAt ?? '',
    })
    setError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm)
    setError(null)
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (form.paid && !form.paidAt) {
      setError('Paid date is required when paid is ticked')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const input = toInput(form)
      if (editingId) {
        await adminUpdateMember(editingId, input)
      } else {
        await adminCreateMember(input)
      }
      setForm(emptyForm)
      setEditingId(null)
      setReloadToken((n) => n + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  async function onDelete(member: Member) {
    if (!window.confirm(`Delete ${member.name}? This cannot be undone.`)) return
    setBusy(true)
    setError(null)
    try {
      await adminDeleteMember(member.id)
      if (editingId === member.id) cancelEdit()
      setReloadToken((n) => n + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  if (isNewsDemo()) {
    return (
      <main className="page admin-page">
        <header className="admin-page-header">
          <div>
            <h1 className="page-title">Members</h1>
            <p className="page-lede">
              Member records are stored on the Netlify site. This preview does
              not have a shared membership list.
            </p>
          </div>
        </header>
      </main>
    )
  }

  return (
    <main className="page admin-page">
      <header className="admin-page-header">
        <div>
          <h1 className="page-title">Members</h1>
          <p className="page-lede">
            Add people to the members’ area. A paid membership expires one year
            after the paid date.
          </p>
        </div>
      </header>

      {error ? (
        <p className="news-error" role="alert">
          {error}
        </p>
      ) : null}

      <form className="site-form site-form--wide admin-member-form" onSubmit={onSubmit}>
        <h2 className="admin-member-form-title">
          {editingId ? 'Edit member' : 'Add a member'}
        </h2>
        <div className="admin-edit-grid">
          <label className="form-field">
            <span>Name</span>
            <input
              type="text"
              name="name"
              required
              autoComplete="name"
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
            />
          </label>
          <label className="form-field">
            <span>Email</span>
            <input
              type="email"
              name="email"
              required
              autoComplete="off"
              value={form.email}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, email: event.target.value }))
              }
            />
          </label>
        </div>
        <div className="admin-member-paid-row">
          <label className="form-field consent-field admin-toggle">
            <input
              type="checkbox"
              checked={form.paid}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, paid: event.target.checked }))
              }
            />
            <span>Paid</span>
          </label>
          <label className="form-field">
            <span>Paid date</span>
            <input
              type="date"
              name="paidAt"
              required={form.paid}
              value={form.paidAt}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, paidAt: event.target.value }))
              }
            />
          </label>
        </div>
        <div className="admin-form-actions">
          <button type="submit" className="form-submit" disabled={busy}>
            {busy ? 'Saving…' : editingId ? 'Save changes' : 'Add member'}
          </button>
          {editingId ? (
            <button
              type="button"
              className="admin-action-btn"
              onClick={cancelEdit}
              disabled={busy}
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      {members === null ? (
        <p className="admin-loading">Loading members…</p>
      ) : members.length === 0 ? (
        <div className="admin-empty">
          <p className="page-lede">No members yet. Add the first one above.</p>
        </div>
      ) : (
        <div className="admin-member-table-wrap">
          <table className="admin-member-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Paid</th>
                <th scope="col">Paid on</th>
                <th scope="col">Expires</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const status = memberStatusLabel(member)
                return (
                  <tr key={member.id}>
                    <td>{member.name}</td>
                    <td>{member.email}</td>
                    <td>{member.paid ? 'Yes' : 'No'}</td>
                    <td>{member.paidAt ? formatMemberDate(member.paidAt) : '—'}</td>
                    <td>
                      {member.expiresAt ? formatMemberDate(member.expiresAt) : '—'}
                    </td>
                    <td>
                      <span
                        className={
                          status === 'Current'
                            ? 'admin-post-status is-published'
                            : status === 'Expired'
                              ? 'admin-post-status is-expired'
                              : 'admin-post-status is-draft'
                        }
                      >
                        {status}
                      </span>
                    </td>
                    <td>
                      <div className="admin-post-actions">
                        <button
                          type="button"
                          className="admin-action-btn"
                          onClick={() => startEdit(member)}
                          disabled={busy}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="admin-action-btn admin-post-delete"
                          onClick={() => void onDelete(member)}
                          disabled={busy}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
