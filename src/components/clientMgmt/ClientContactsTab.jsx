import React, { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { api } from '@/utils/authSession'
import { Empty, Loading } from './common'

const blank = { first_name: '', last_name: '', email: '', phone: '', job_title: '', is_primary: false }

/** F-022: several contacts per client; one primary contact. */
export const ContactForm = ({ value, onSubmit, onCancel, busy, clients }) => {
    const [f, setF] = useState(value || blank)
    const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
    return (
        <form className="row g-2 align-items-end" onSubmit={(e) => { e.preventDefault(); onSubmit(f) }}>
            <div className="col-md-2"><label className="form-label">First name</label><input className="form-control" value={f.first_name} onChange={set('first_name')} required /></div>
            <div className="col-md-2"><label className="form-label">Last name</label><input className="form-control" value={f.last_name || ''} onChange={set('last_name')} /></div>
            <div className="col-md-3"><label className="form-label">Email</label><input type="email" className="form-control" value={f.email || ''} onChange={set('email')} /></div>
            <div className="col-md-2"><label className="form-label">Phone</label><input className="form-control" value={f.phone || ''} onChange={set('phone')} /></div>
            <div className="col-md-2"><label className="form-label">Job title</label><input className="form-control" value={f.job_title || ''} onChange={set('job_title')} /></div>
            {clients && (
                <div className="col-md-3"><label className="form-label">Client</label>
                    <select className="form-select" value={f.client_id || ''} onChange={set('client_id')}>
                        <option value="">Not linked to a client</option>
                        {clients.map((c) => <option key={c.client_id} value={c.client_id}>{c.company_name}</option>)}
                    </select>
                </div>
            )}
            <div className="col-md-1"><label className="d-flex align-items-center gap-1 mb-2"><input type="checkbox" checked={!!f.is_primary} onChange={set('is_primary')} /> Primary</label></div>
            <div className="col-12 d-flex gap-2">
                <button className="btn btn-primary btn-sm" disabled={busy}>Save contact</button>
                {onCancel && <button type="button" className="btn btn-light btn-sm" onClick={onCancel}>Cancel</button>}
            </div>
        </form>
    )
}

const ClientContactsTab = ({ clientId }) => {
    const [rows, setRows] = useState(null)
    const [editing, setEditing] = useState(null) // null | 'new' | contact
    const [busy, setBusy] = useState(false)
    const load = () => api(`/api/clients/${clientId}/contacts`).then(setRows).catch((e) => toast.error(e.message))
    useEffect(() => { load() }, [clientId])

    const save = async (f) => {
        setBusy(true)
        try {
            const body = { first_name: f.first_name, last_name: f.last_name, email: f.email, phone: f.phone, job_title: f.job_title, is_primary: !!f.is_primary }
            if (editing === 'new') await api(`/api/clients/${clientId}/contacts`, { method: 'POST', body })
            else await api(`/api/contacts/${editing.contact_id}`, { method: 'PUT', body })
            toast.success('Contact saved'); setEditing(null); await load()
        } catch (e) { toast.error(e.message) } finally { setBusy(false) }
    }
    const remove = async (c) => {
        if (!window.confirm(`Delete ${c.first_name}?`)) return
        try { await api(`/api/contacts/${c.contact_id}`, { method: 'DELETE' }); await load() } catch (e) { toast.error(e.message) }
    }

    return (
        <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">Contacts</h5>
                {editing === null && <button className="btn btn-sm btn-primary" onClick={() => setEditing('new')}>Add contact</button>}
            </div>
            <div className="card-body">
                {editing !== null && <div className="mb-4"><ContactForm value={editing === 'new' ? null : editing} onSubmit={save} onCancel={() => setEditing(null)} busy={busy} /></div>}
                {rows === null ? <Loading /> : rows.length === 0 ? <Empty>No contacts yet.</Empty> : (
                    <div className="table-responsive"><table className="table mb-0">
                        <thead><tr><th>Name</th><th>Job title</th><th>Email</th><th>Phone</th><th /></tr></thead>
                        <tbody>{rows.map((c) => (
                            <tr key={c.contact_id}>
                                <td>{c.first_name} {c.last_name} {c.is_primary && <span className="badge bg-soft-primary text-primary ms-1">Primary</span>}</td>
                                <td>{c.job_title || '-'}</td>
                                <td>{c.email ? <a href={`mailto:${c.email}`}>{c.email}</a> : '-'}</td>
                                <td>{c.phone || '-'}</td>
                                <td className="text-end text-nowrap">
                                    <button className="btn btn-sm btn-light me-1" onClick={() => setEditing(c)}>Edit</button>
                                    <button className="btn btn-sm btn-outline-danger" onClick={() => remove(c)}>Delete</button>
                                </td>
                            </tr>
                        ))}</tbody>
                    </table></div>
                )}
            </div>
        </div>
    )
}

export default ClientContactsTab
