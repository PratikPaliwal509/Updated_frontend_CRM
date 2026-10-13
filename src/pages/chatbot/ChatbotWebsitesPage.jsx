import React, { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { FiPlus, FiMessageCircle, FiGlobe } from 'react-icons/fi'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import { adsApi } from '@/components/meta/adsApi'
import { api } from '@/utils/authSession'

/** Website chatbots (F-121): one per website; knowledge base, widget code and chats per website. */
const ChatbotWebsitesPage = () => {
    const navigate = useNavigate()
    const [rows, setRows] = useState([])
    const [loading, setLoading] = useState(true)
    const [adding, setAdding] = useState(false)
    const [form, setForm] = useState({ name: '', client_id: '', origin: '' })
    const [clients, setClients] = useState([])

    const load = useCallback(async () => {
        try { setRows((await adsApi('/api/chatbot/websites')).data) } catch (e) { toast.error(e.message) } finally { setLoading(false) }
    }, [])
    useEffect(() => { load() }, [load])
    useEffect(() => { if (adding) api('/api/clients').then((r) => setClients(Array.isArray(r) ? r : r?.clients || r?.data || [])).catch(() => setClients([])) }, [adding])

    const create = async (e) => {
        e.preventDefault()
        try {
            let origin = form.origin.trim()
            if (origin && !/^https?:\/\//i.test(origin)) origin = `https://${origin}`
            if (origin) { try { origin = new URL(origin).origin } catch { return toast.error('Enter the website address like https://www.example.com') } }
            const r = await adsApi('/api/chatbot/websites', { method: 'POST', body: { name: form.name.trim(), client_id: form.client_id ? Number(form.client_id) : null, allowed_origins: origin ? [origin] : [] } })
            toast.success('Website added - now add its knowledge')
            navigate(`/chatbot/websites/${r.data.website_id}?tab=knowledge`)
        } catch (err) { toast.error(err.message) }
    }

    return (
        <>
            <PageHeader>
                <div className="d-flex gap-2">
                    <Link to="/chatbot/inbox" className="btn btn-light-brand"><FiMessageCircle className="me-2" />Website chats</Link>
                    <button type="button" className="btn btn-primary" onClick={() => setAdding(true)} data-testid="add-website"><FiPlus className="me-2" />Add website</button>
                </div>
            </PageHeader>
            <div className="main-content">
                {adding && (
                    <form className="card mb-4" onSubmit={create} data-testid="website-form">
                        <div className="card-header"><h6 className="mb-0">New website chatbot</h6></div>
                        <div className="card-body row g-3">
                            <div className="col-md-4"><label className="form-label" htmlFor="ws-name">Name *</label><input id="ws-name" className="form-control" required maxLength={150} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Sunrise Bakery website" /></div>
                            <div className="col-md-4"><label className="form-label" htmlFor="ws-origin">Website address</label><input id="ws-origin" className="form-control" value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} placeholder="https://www.example.com" /><div className="fs-11 text-muted mt-1">The chat only works on the addresses you allow.</div></div>
                            <div className="col-md-4"><label className="form-label" htmlFor="ws-client">Client (optional)</label>
                                <select id="ws-client" className="form-select" value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
                                    <option value="">Our own website</option>
                                    {clients.map((c) => <option key={c.client_id} value={c.client_id}>{c.company_name}</option>)}
                                </select>
                            </div>
                            <div className="col-12 d-flex gap-2"><button type="submit" className="btn btn-primary" disabled={!form.name.trim()}>Create</button><button type="button" className="btn btn-light" onClick={() => setAdding(false)}>Cancel</button></div>
                        </div>
                    </form>
                )}
                <div className="card">
                    {!loading && rows.length === 0 && !adding ? (
                        <div className="card-body text-center py-5">
                            <FiGlobe size={40} className="text-primary mb-3" />
                            <h6>No website chatbot yet</h6>
                            <p className="text-muted fs-13">Add a website, teach the bot from its pages, documents and FAQs, then paste one line of code into the site. Visitors get instant answers, can leave their details (a CRM lead) or ask for a person.</p>
                            <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}><FiPlus className="me-2" />Add website</button>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover mb-0" data-testid="websites">
                                <thead><tr><th>Website</th><th>Client</th><th>Bot</th><th className="text-end">Knowledge</th><th className="text-end">Chats</th><th className="text-end">Open</th><th>Status</th></tr></thead>
                                <tbody>
                                    {rows.map((w) => (
                                        <tr key={w.website_id} className="cursor-pointer" onClick={() => navigate(`/chatbot/websites/${w.website_id}`)} data-testid="website-row">
                                            <td><div className="fw-semibold">{w.name}</div><div className="fs-11 text-muted">{w.allowed_origins.join(', ') || 'no website address yet'}</div></td>
                                            <td className="fs-13">{w.client?.company_name || '-'}</td>
                                            <td className="fs-13"><span className="d-inline-block rounded-circle me-2" style={{ width: 10, height: 10, background: w.brand_color }} />{w.bot_name}{!w.ai_enabled && <span className="badge bg-soft-secondary text-secondary ms-2">AI off</span>}</td>
                                            <td className="text-end fs-13">{w.sources_count} source{w.sources_count === 1 ? '' : 's'}</td>
                                            <td className="text-end fs-13">{w.conversations_count}</td>
                                            <td className="text-end">{w.open_conversations > 0 ? <span className="badge bg-danger">{w.open_conversations}</span> : <span className="text-muted fs-13">0</span>}</td>
                                            <td>{w.is_active ? <span className="badge bg-soft-success text-success">Active</span> : <span className="badge bg-soft-secondary text-secondary">Off</span>}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
            <Footer />
        </>
    )
}

export default ChatbotWebsitesPage
