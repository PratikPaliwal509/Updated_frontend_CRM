import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import { api } from '@/utils/authSession'
import { ContactForm } from '@/components/clientMgmt/ClientContactsTab'
import { Empty, Loading } from '@/components/clientMgmt/common'

/**
 * Customers = the people you deal with: every contact of every client you can see,
 * plus contacts not linked to a client yet. Same records as each client's Contacts tab.
 */
const CustomersPage = () => {
    const [rows, setRows] = useState(null)
    const [clients, setClients] = useState([])
    const [q, setQ] = useState('')
    const [clientId, setClientId] = useState('')
    const [editing, setEditing] = useState(null)
    const [busy, setBusy] = useState(false)

    const load = () => {
        const p = new URLSearchParams(Object.entries({ q, client_id: clientId }).filter(([, v]) => v))
        return api(`/api/contacts?${p}`).then(setRows).catch((e) => { setRows([]); toast.error(e.message) })
    }
    useEffect(() => { api('/api/clients').then(setClients).catch(() => setClients([])) }, [])
    useEffect(() => { load() }, [clientId])

    const save = async (f) => {
        setBusy(true)
        try {
            const body = { first_name: f.first_name, last_name: f.last_name, email: f.email, phone: f.phone, job_title: f.job_title, is_primary: !!f.is_primary, client_id: f.client_id ? Number(f.client_id) : null }
            if (editing === 'new') await api('/api/contacts', { method: 'POST', body })
            else await api(`/api/contacts/${editing.contact_id}`, { method: 'PUT', body })
            toast.success('Customer saved'); setEditing(null); await load()
        } catch (e) { toast.error(e.message) } finally { setBusy(false) }
    }
    const remove = async (c) => {
        if (!window.confirm(`Delete ${c.first_name}?`)) return
        try { await api(`/api/contacts/${c.contact_id}`, { method: 'DELETE' }); await load() } catch (e) { toast.error(e.message) }
    }

    return (
        <>
            <PageHeader><button className="btn btn-sm btn-primary" onClick={() => setEditing('new')}>Add customer</button></PageHeader>
            <div className="main-content">
                {editing !== null && <div className="card mb-4"><div className="card-body"><ContactForm value={editing === 'new' ? null : { ...editing, client_id: editing.client?.client_id || '' }} clients={clients} onSubmit={save} onCancel={() => setEditing(null)} busy={busy} /></div></div>}
                <div className="card mb-3"><div className="card-body d-flex gap-2 flex-wrap">
                    <form className="d-flex gap-2" onSubmit={(e) => { e.preventDefault(); load() }}>
                        <input className="form-control" placeholder="Search name, email, phone" value={q} onChange={(e) => setQ(e.target.value)} />
                        <button className="btn btn-light">Search</button>
                    </form>
                    <select className="form-select" style={{ maxWidth: 260 }} value={clientId} onChange={(e) => setClientId(e.target.value)}>
                        <option value="">All clients</option>{clients.map((c) => <option key={c.client_id} value={c.client_id}>{c.company_name}</option>)}
                    </select>
                </div></div>
                <div className="card"><div className="card-body p-0">
                    {rows === null ? <Loading /> : rows.length === 0 ? <Empty>No customers found.</Empty> : (
                        <div className="table-responsive"><table className="table mb-0">
                            <thead><tr><th>Name</th><th>Client</th><th>Job title</th><th>Email</th><th>Phone</th><th /></tr></thead>
                            <tbody>{rows.map((c) => (
                                <tr key={c.contact_id}>
                                    <td>{c.first_name} {c.last_name} {c.is_primary && <span className="badge bg-soft-primary text-primary ms-1">Primary</span>}</td>
                                    <td>{c.client ? <Link to={`/clients/view/${c.client.client_id}`}>{c.client.company_name}</Link> : <span className="text-muted">-</span>}</td>
                                    <td>{c.job_title || '-'}</td>
                                    <td>{c.email ? <a href={`mailto:${c.email}`}>{c.email}</a> : '-'}</td>
                                    <td>{c.phone || '-'}</td>
                                    <td className="text-end text-nowrap"><button className="btn btn-sm btn-light me-1" onClick={() => setEditing(c)}>Edit</button><button className="btn btn-sm btn-outline-danger" onClick={() => remove(c)}>Delete</button></td>
                                </tr>
                            ))}</tbody>
                        </table></div>
                    )}
                </div></div>
            </div>
            <Footer />
        </>
    )
}

export default CustomersPage
