import React, { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { api, cachedMe } from '@/utils/authSession'
import { Empty, Loading, fmtDateTime } from './common'

/** F-024: notes with author, time and pinning. */
const ClientNotesTab = ({ clientId }) => {
    const [rows, setRows] = useState(null)
    const [text, setText] = useState('')
    const [editId, setEditId] = useState(null)
    const [editText, setEditText] = useState('')
    const me = cachedMe()
    const canEditAll = me?.user?.role?.permissions?.clients?.edit === true
    const load = () => api(`/api/clients/${clientId}/notes`).then(setRows).catch((e) => toast.error(e.message))
    useEffect(() => { load() }, [clientId])

    const add = async (e) => {
        e.preventDefault()
        try { await api(`/api/clients/${clientId}/notes`, { method: 'POST', body: { body: text } }); setText(''); await load() } catch (err) { toast.error(err.message) }
    }
    const patch = async (n, body) => { try { await api(`/api/client-notes/${n.note_id}`, { method: 'PUT', body }); setEditId(null); await load() } catch (e) { toast.error(e.message) } }
    const remove = async (n) => {
        if (!window.confirm('Delete this note?')) return
        try { await api(`/api/client-notes/${n.note_id}`, { method: 'DELETE' }); await load() } catch (e) { toast.error(e.message) }
    }

    return (
        <div className="card">
            <div className="card-header"><h5 className="card-title mb-0">Notes</h5></div>
            <div className="card-body">
                <form onSubmit={add} className="mb-4">
                    <textarea className="form-control mb-2" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a note about this client..." required />
                    <button className="btn btn-primary btn-sm">Add note</button>
                </form>
                {rows === null ? <Loading /> : rows.length === 0 ? <Empty>No notes yet.</Empty> : rows.map((n) => {
                    const mine = n.author?.user_id === me?.user?.user_id
                    return (
                        <div key={n.note_id} className={`border rounded p-3 mb-2 ${n.is_pinned ? 'border-primary' : ''}`}>
                            <div className="d-flex justify-content-between fs-11 text-muted mb-1">
                                <span>{n.is_pinned && <span className="badge bg-soft-primary text-primary me-2">Pinned</span>}{n.author?.full_name || 'Unknown'} · {fmtDateTime(n.created_at)}</span>
                                {(mine || canEditAll) && (
                                    <span className="text-nowrap">
                                        <button className="btn btn-link btn-sm p-0 me-2" onClick={() => patch(n, { is_pinned: !n.is_pinned })}>{n.is_pinned ? 'Unpin' : 'Pin'}</button>
                                        <button className="btn btn-link btn-sm p-0 me-2" onClick={() => { setEditId(n.note_id); setEditText(n.body) }}>Edit</button>
                                        <button className="btn btn-link btn-sm p-0 text-danger" onClick={() => remove(n)}>Delete</button>
                                    </span>
                                )}
                            </div>
                            {editId === n.note_id ? (
                                <div>
                                    <textarea className="form-control mb-2" rows={3} value={editText} onChange={(e) => setEditText(e.target.value)} />
                                    <button className="btn btn-sm btn-primary me-2" onClick={() => patch(n, { body: editText })}>Save</button>
                                    <button className="btn btn-sm btn-light" onClick={() => setEditId(null)}>Cancel</button>
                                </div>
                            ) : <div style={{ whiteSpace: 'pre-wrap' }}>{n.body}</div>}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default ClientNotesTab
