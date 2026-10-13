import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import Swal from 'sweetalert2'
import { FiArrowLeft, FiCopy, FiRefreshCw, FiTrash2, FiUpload, FiLink, FiMap, FiHelpCircle, FiFileText, FiSearch, FiPlay, FiEdit3 } from 'react-icons/fi'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import { adsApi } from '@/components/meta/adsApi'
import { api } from '@/utils/authSession'
import { API_BASE_URL } from '../../config/api'

/**
 * One website chatbot: settings (F-121/F-123/F-124), knowledge base (F-122) and the embed code.
 */
const STATUS = { pending: ['bg-soft-info text-info', 'Waiting'], processing: ['bg-soft-info text-info', 'Reading...'], ready: ['bg-soft-success text-success', 'Ready'], failed: ['bg-soft-danger text-danger', 'Failed'] }
const TYPE = { url: [FiLink, 'Web page'], sitemap: [FiMap, 'Sitemap'], document: [FiFileText, 'Document'], faq: [FiHelpCircle, 'FAQ'], text: [FiEdit3, 'Text'] }
const FIELDS = [['name', 'Name'], ['email', 'Email'], ['phone', 'Phone'], ['company', 'Company']]
const when = (d) => (d ? new Date(d).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-')

const SettingsTab = ({ w, onSaved }) => {
    const [f, setF] = useState(() => ({ ...w, allowed_text: w.allowed_origins.join('\n'), ai_instructions: w.ai_instructions || '' }))
    const [users, setUsers] = useState([])
    const [saving, setSaving] = useState(false)
    useEffect(() => {
        let agencyId = ''
        try { agencyId = JSON.parse(localStorage.getItem('user') || '{}').agency_id || '' } catch { agencyId = '' }
        api(`/api/users/by-agency?agency_id=${agencyId}`).then((r) => setUsers((Array.isArray(r) ? r : r?.users || []).filter((u) => u.user_type !== 'client' && u.is_active !== false))).catch(() => setUsers([]))
    }, [])
    const lc = f.lead_capture || {}
    const setLc = (patch) => setF({ ...f, lead_capture: { enabled: true, ask: 'on_handoff', fields: ['name', 'email', 'phone'], required: ['name', 'email'], ...lc, ...patch } })
    const save = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            const body = {
                name: f.name, bot_name: f.bot_name, welcome_message: f.welcome_message, fallback_message: f.fallback_message, brand_color: f.brand_color, position: f.position,
                ai_enabled: f.ai_enabled, ai_instructions: f.ai_instructions || null, assign_to: f.assign_to ? Number(f.assign_to) : null, daily_ai_limit: Number(f.daily_ai_limit),
                recrawl_frequency: f.recrawl_frequency, is_active: f.is_active,
                allowed_origins: f.allowed_text.split(/[\s,]+/).map((x) => x.trim()).filter(Boolean),
                lead_capture: { enabled: lc.enabled !== false, ask: lc.ask || 'on_handoff', fields: lc.fields || ['name', 'email'], required: (lc.required || []).filter((x) => (lc.fields || []).includes(x)), ...(lc.message ? { message: lc.message } : {}), ...(lc.consent_text ? { consent_text: lc.consent_text } : {}) },
            }
            const r = await adsApi(`/api/chatbot/websites/${w.website_id}`, { method: 'PUT', body })
            toast.success('Chatbot saved'); onSaved(r.data)
        } catch (err) { toast.error(err.message) } finally { setSaving(false) }
    }
    const inp = (k, label, props = {}) => (
        <div className={props.col || 'col-md-6'}>
            <label className="form-label fs-13" htmlFor={`cb-${k}`}>{label}</label>
            {props.area ? <textarea id={`cb-${k}`} className="form-control" rows={props.rows || 2} maxLength={props.max} value={f[k] ?? ''} onChange={(e) => setF({ ...f, [k]: e.target.value })} placeholder={props.ph} />
                : <input id={`cb-${k}`} className="form-control" type={props.type || 'text'} maxLength={props.max} min={props.min} value={f[k] ?? ''} onChange={(e) => setF({ ...f, [k]: e.target.value })} placeholder={props.ph} />}
            {props.help && <div className="fs-11 text-muted mt-1">{props.help}</div>}
        </div>
    )
    return (
        <form className="card-body" onSubmit={save} data-testid="chatbot-settings">
            <div className="row g-3">
                {inp('name', 'Name', { max: 150 })}
                {inp('bot_name', 'Bot name', { max: 60 })}
                {inp('allowed_text', 'Allowed website addresses', { area: true, rows: 3, col: 'col-12', ph: 'https://www.example.com\nhttps://*.example.com', help: 'One per line. The chat only opens on these sites (plus the preview here). Use https://*.example.com for all subdomains.' })}
                {inp('welcome_message', 'Welcome message', { max: 500, area: true })}
                {inp('fallback_message', 'When the bot does not know', { max: 500, area: true })}
                <div className="col-md-3"><label className="form-label fs-13" htmlFor="cb-color">Colour</label><input id="cb-color" type="color" className="form-control form-control-color w-100" value={f.brand_color} onChange={(e) => setF({ ...f, brand_color: e.target.value })} /></div>
                <div className="col-md-3"><label className="form-label fs-13" htmlFor="cb-pos">Position</label><select id="cb-pos" className="form-select" value={f.position} onChange={(e) => setF({ ...f, position: e.target.value })}><option value="right">Bottom right</option><option value="left">Bottom left</option></select></div>
                <div className="col-md-3"><label className="form-label fs-13" htmlFor="cb-assign">New chats go to</label>
                    <select id="cb-assign" className="form-select" value={f.assign_to || ''} onChange={(e) => setF({ ...f, assign_to: e.target.value })}>
                        <option value="">Everyone with chat access</option>
                        {users.map((u) => <option key={u.user_id} value={u.user_id}>{u.full_name || u.email}</option>)}
                    </select>
                </div>
                <div className="col-md-3"><label className="form-label fs-13" htmlFor="cb-recrawl">Re-read website</label><select id="cb-recrawl" className="form-select" value={f.recrawl_frequency} onChange={(e) => setF({ ...f, recrawl_frequency: e.target.value })}><option value="none">Only when I ask</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></div>

                <div className="col-12"><hr className="my-1" /><h6 className="fs-14">AI answers</h6></div>
                <div className="col-md-4 form-check form-switch ms-2">
                    <input className="form-check-input" type="checkbox" id="cb-ai" checked={!!f.ai_enabled} onChange={(e) => setF({ ...f, ai_enabled: e.target.checked })} />
                    <label className="form-check-label" htmlFor="cb-ai">Answer automatically with AI</label>
                    <div className="fs-11 text-muted">Off: every message goes straight to your team.</div>
                </div>
                {inp('daily_ai_limit', 'Max AI answers per day', { type: 'number', min: 0, col: 'col-md-3', help: 'Cost guard. After that, visitors are offered a person.' })}
                {inp('ai_instructions', 'Extra rules for the bot', { area: true, max: 2000, col: 'col-md-5', ph: 'e.g. Always suggest booking a free consultation. Never discuss competitors.' })}

                <div className="col-12"><hr className="my-1" /><h6 className="fs-14">Collect contact details (creates a lead)</h6></div>
                <div className="col-md-3 form-check form-switch ms-2">
                    <input className="form-check-input" type="checkbox" id="lc-on" checked={lc.enabled !== false} onChange={(e) => setLc({ enabled: e.target.checked })} />
                    <label className="form-check-label" htmlFor="lc-on">Ask for details</label>
                </div>
                <div className="col-md-4"><label className="form-label fs-13" htmlFor="lc-ask">When</label>
                    <select id="lc-ask" className="form-select" value={lc.ask || 'on_handoff'} onChange={(e) => setLc({ ask: e.target.value })}>
                        <option value="before_chat">Before the chat starts</option><option value="on_handoff">When the visitor asks for a person</option><option value="manual">Only when the visitor chooses to</option>
                    </select>
                </div>
                <div className="col-md-5"><div className="form-label fs-13">Fields (tick = required)</div>
                    <div className="d-flex flex-wrap gap-3">
                        {FIELDS.map(([k, l]) => {
                            const on = (lc.fields || []).includes(k)
                            return (
                                <span key={k} className="fs-13">
                                    <input type="checkbox" className="form-check-input me-1" id={`lf-${k}`} checked={on} onChange={(e) => setLc({ fields: e.target.checked ? [...(lc.fields || []), k] : (lc.fields || []).filter((x) => x !== k) })} />
                                    <label htmlFor={`lf-${k}`}>{l}</label>
                                    {on && <input type="checkbox" className="form-check-input ms-2 me-1" id={`lr-${k}`} title="Required" checked={(lc.required || []).includes(k)} onChange={(e) => setLc({ required: e.target.checked ? [...(lc.required || []), k] : (lc.required || []).filter((x) => x !== k) })} />}
                                    {on && <label htmlFor={`lr-${k}`} className="fs-11 text-muted">required</label>}
                                </span>
                            )
                        })}
                    </div>
                </div>
                <div className="col-md-6"><label className="form-label fs-13" htmlFor="lc-msg">Message above the form</label><input id="lc-msg" className="form-control" maxLength={300} value={lc.message || ''} onChange={(e) => setLc({ message: e.target.value })} placeholder="Leave your details and we will get back to you." /></div>
                <div className="col-md-6"><label className="form-label fs-13" htmlFor="lc-consent">Consent text (optional, shown as a checkbox)</label><input id="lc-consent" className="form-control" maxLength={500} value={lc.consent_text || ''} onChange={(e) => setLc({ consent_text: e.target.value })} placeholder="I agree to be contacted about my request." /></div>

                <div className="col-12 d-flex align-items-center gap-3">
                    <button type="submit" className="btn btn-primary" disabled={saving} data-testid="save-chatbot">Save</button>
                    <span className="form-check form-switch mb-0"><input className="form-check-input" type="checkbox" id="cb-active" checked={!!f.is_active} onChange={(e) => setF({ ...f, is_active: e.target.checked })} /><label className="form-check-label fs-13" htmlFor="cb-active">Chat is live on the website</label></span>
                </div>
            </div>
        </form>
    )
}

const KnowledgeTab = ({ w }) => {
    const [sources, setSources] = useState([])
    const [add, setAdd] = useState('url')
    const [url, setUrl] = useState('')
    const [pages, setPages] = useState(20)
    const [faq, setFaq] = useState({ question: '', answer: '' })
    const [text, setText] = useState({ title: '', content: '' })
    const [busy, setBusy] = useState(false)
    const [q, setQ] = useState('')
    const [hits, setHits] = useState(null)
    const fileRef = useRef(null)

    const load = useCallback(async () => {
        try { setSources((await adsApi(`/api/chatbot/websites/${w.website_id}/sources`)).data) } catch (e) { toast.error(e.message) }
    }, [w.website_id])
    useEffect(() => { load() }, [load])
    useEffect(() => {
        if (!sources.some((s) => s.status === 'pending' || s.status === 'processing')) return undefined
        const t = setTimeout(load, 2000)
        return () => clearTimeout(t)
    }, [sources, load])

    const submit = async (e) => {
        e.preventDefault()
        setBusy(true)
        try {
            let body
            if (add === 'url') body = { type: 'url', url: url.trim(), max_pages: Number(pages) || 1 }
            else if (add === 'sitemap') body = { type: 'sitemap', url: url.trim() }
            else if (add === 'faq') body = { type: 'faq', ...faq }
            else body = { type: 'text', ...text }
            await adsApi(`/api/chatbot/websites/${w.website_id}/sources`, { method: 'POST', body })
            toast.success('Added - the bot is reading it')
            setUrl(''); setFaq({ question: '', answer: '' }); setText({ title: '', content: '' })
            load()
        } catch (err) { toast.error(err.message) } finally { setBusy(false) }
    }
    const upload = async (e) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file) return
        if (file.size > 10 * 1024 * 1024) return toast.error('Files can be at most 10 MB')
        setBusy(true)
        try {
            const form = new FormData()
            form.append('file', file)
            const res = await fetch(`${API_BASE_URL}/api/chatbot/websites/${w.website_id}/documents`, { method: 'POST', body: form })
            const json = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(json.message || 'Upload failed')
            toast.success('Document added - the bot is reading it')
            load()
        } catch (err) { toast.error(err.message) } finally { setBusy(false) }
    }
    const resync = async (s) => { try { await adsApi(`/api/chatbot/websites/${w.website_id}/sources/${s.source_id}/resync`, { method: 'POST' }); load() } catch (err) { toast.error(err.message) } }
    const remove = async (s) => {
        const ok = await Swal.fire({ title: `Remove "${s.title}"?`, text: 'The bot will no longer use it.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Remove' })
        if (!ok.isConfirmed) return
        try { await adsApi(`/api/chatbot/websites/${w.website_id}/sources/${s.source_id}`, { method: 'DELETE' }); load() } catch (err) { toast.error(err.message) }
    }
    const search = async (e) => {
        e.preventDefault()
        try { setHits((await adsApi(`/api/chatbot/websites/${w.website_id}/test`, { method: 'POST', body: { question: q } })).data) } catch (err) { toast.error(err.message) }
    }

    return (
        <div className="card-body">
            <div className="btn-group mb-3 flex-wrap" role="group">
                {[['url', FiLink, 'Website pages'], ['sitemap', FiMap, 'Sitemap'], ['doc', FiUpload, 'Document'], ['faq', FiHelpCircle, 'FAQ'], ['text', FiEdit3, 'Text']].map(([k, I, l]) => (
                    <button key={k} type="button" className={`btn btn-sm ${add === k ? 'btn-primary' : 'btn-light'}`} onClick={() => setAdd(k)} data-testid={`kb-add-${k}`}><I className="me-1" />{l}</button>
                ))}
            </div>
            {add === 'doc' ? (
                <div className="border rounded p-3 mb-4">
                    <p className="fs-13 mb-2">PDF, Word (.docx), TXT, Markdown, CSV or HTML - up to 10 MB. Scanned PDFs (images only) cannot be read.</p>
                    <input ref={fileRef} type="file" className="form-control" accept=".pdf,.docx,.txt,.md,.csv,.html,.htm" onChange={upload} disabled={busy} data-testid="kb-file" />
                </div>
            ) : (
                <form className="border rounded p-3 mb-4" onSubmit={submit} data-testid="kb-form">
                    {(add === 'url' || add === 'sitemap') && (
                        <div className="row g-2 align-items-end">
                            <div className="col-md-8"><label className="form-label fs-13" htmlFor="kb-url">{add === 'url' ? 'Page address' : 'Sitemap address'}</label><input id="kb-url" className="form-control" required value={url} onChange={(e) => setUrl(e.target.value)} placeholder={add === 'url' ? 'https://www.example.com/' : 'https://www.example.com/sitemap.xml'} /></div>
                            {add === 'url' && <div className="col-md-2"><label className="form-label fs-13" htmlFor="kb-pages">Pages</label><input id="kb-pages" type="number" min={1} max={500} className="form-control" value={pages} onChange={(e) => setPages(e.target.value)} /></div>}
                            <div className="col-md-2 d-grid"><button type="submit" className="btn btn-primary" disabled={busy || !url.trim()} data-testid="kb-submit">Add</button></div>
                            <div className="col-12 fs-11 text-muted">{add === 'url' ? 'With more than 1 page, links on the same website are followed. Pages blocked by robots.txt or marked noindex are skipped.' : 'Every page in the sitemap (same website) is read, up to the page limit of the platform.'}</div>
                        </div>
                    )}
                    {add === 'faq' && (
                        <div className="row g-2">
                            <div className="col-12"><label className="form-label fs-13" htmlFor="kb-q">Question</label><input id="kb-q" className="form-control" required maxLength={500} value={faq.question} onChange={(e) => setFaq({ ...faq, question: e.target.value })} /></div>
                            <div className="col-12"><label className="form-label fs-13" htmlFor="kb-a">Answer</label><textarea id="kb-a" className="form-control" rows={3} required maxLength={5000} value={faq.answer} onChange={(e) => setFaq({ ...faq, answer: e.target.value })} /></div>
                            <div className="col-12"><button type="submit" className="btn btn-primary" disabled={busy} data-testid="kb-submit">Add FAQ</button></div>
                        </div>
                    )}
                    {add === 'text' && (
                        <div className="row g-2">
                            <div className="col-12"><label className="form-label fs-13" htmlFor="kb-t">Title</label><input id="kb-t" className="form-control" required maxLength={255} value={text.title} onChange={(e) => setText({ ...text, title: e.target.value })} /></div>
                            <div className="col-12"><label className="form-label fs-13" htmlFor="kb-c">Text</label><textarea id="kb-c" className="form-control" rows={5} required minLength={20} value={text.content} onChange={(e) => setText({ ...text, content: e.target.value })} /></div>
                            <div className="col-12"><button type="submit" className="btn btn-primary" disabled={busy} data-testid="kb-submit">Add text</button></div>
                        </div>
                    )}
                </form>
            )}

            <div className="table-responsive mb-4">
                <table className="table table-sm table-hover mb-0" data-testid="kb-sources">
                    <thead><tr><th>Source</th><th>Type</th><th>Status</th><th className="text-end">Pages</th><th className="text-end">Blocks</th><th>Updated</th><th className="text-end">Actions</th></tr></thead>
                    <tbody>
                        {sources.length === 0 && <tr><td colSpan={7} className="text-muted text-center py-4 fs-13">Nothing yet - add the website, documents or FAQs the bot should answer from.</td></tr>}
                        {sources.map((s) => {
                            const [I, l] = TYPE[s.type] || TYPE.text
                            const [cls, st] = STATUS[s.status] || STATUS.pending
                            return (
                                <tr key={s.source_id} data-testid="kb-source">
                                    <td><div className="fw-semibold fs-13">{s.title}</div>{s.url && <div className="fs-11 text-muted text-truncate" style={{ maxWidth: 320 }}>{s.url}</div>}{s.error && <div className={`fs-11 ${s.status === 'failed' ? 'text-danger' : 'text-muted'}`}>{s.error}</div>}</td>
                                    <td className="fs-13"><I className="me-1" />{l}</td>
                                    <td><span className={`badge ${cls}`} data-testid="kb-status">{st}</span></td>
                                    <td className="text-end fs-13">{s.pages_count}</td>
                                    <td className="text-end fs-13">{s.chunks_count}</td>
                                    <td className="fs-12">{when(s.last_synced_at)}</td>
                                    <td className="text-end text-nowrap">
                                        {(s.type === 'url' || s.type === 'sitemap') && <button type="button" className="btn btn-sm btn-light me-1" onClick={() => resync(s)} title="Read again"><FiRefreshCw /></button>}
                                        <button type="button" className="btn btn-sm btn-light-danger" onClick={() => remove(s)} title="Remove"><FiTrash2 /></button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            <h6 className="fs-14"><FiSearch className="me-1" />Check what the bot would read</h6>
            <form className="d-flex gap-2 mb-2" onSubmit={search}>
                <input className="form-control" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask a question a visitor might ask" aria-label="Test question" data-testid="kb-test-q" />
                <button type="submit" className="btn btn-light-brand" disabled={!q.trim()} data-testid="kb-test">Search</button>
            </form>
            <div className="fs-11 text-muted mb-2">Shows the best matching text blocks (no AI call, no cost). If nothing matches, the bot says it does not know.</div>
            {hits && (hits.length === 0 ? <div className="alert alert-warning fs-13 py-2">No matching knowledge for this question.</div> : (
                <div className="d-flex flex-column gap-2" data-testid="kb-hits">
                    {hits.map((h) => <div key={h.chunk_id} className="border rounded p-2"><div className="fw-semibold fs-13">{h.title}</div>{h.url && <div className="fs-11 text-muted">{h.url}</div>}<div className="fs-12">{h.preview}...</div></div>)}
                </div>
            ))}
        </div>
    )
}

const InstallTab = ({ w, onRotate }) => {
    const [preview, setPreview] = useState(false)
    useEffect(() => () => { try { window.TechleelaChat?.destroy?.() } catch { /* ignore */ } document.querySelectorAll('script[data-tl-preview]').forEach((s) => s.remove()) }, [])
    const copy = async () => { try { await navigator.clipboard.writeText(w.embed_code); toast.success('Code copied') } catch { toast.error('Copy failed - select the code and copy it') } }
    const startPreview = () => {
        try { window.TechleelaChat?.destroy?.() } catch { /* ignore */ }
        document.querySelectorAll('script[data-tl-preview]').forEach((s) => s.remove())
        const s = document.createElement('script')
        s.src = `${w.script_url}?v=${Date.now()}`
        s.async = true
        s.setAttribute('data-website-key', w.website_key)
        s.setAttribute('data-tl-preview', '1')
        document.body.appendChild(s)
        setPreview(true)
    }
    return (
        <div className="card-body">
            <h6 className="fs-14">1. Paste this code into the website</h6>
            <p className="fs-13 text-muted">Put it before <code>&lt;/body&gt;</code> on every page (or in your site builder's "custom code" / footer scripts setting).</p>
            <pre className="bg-light border rounded p-3 fs-12" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }} data-testid="embed-code">{w.embed_code}</pre>
            <button type="button" className="btn btn-sm btn-primary me-2" onClick={copy}><FiCopy className="me-1" />Copy code</button>
            <button type="button" className="btn btn-sm btn-light-brand me-2" onClick={startPreview} data-testid="preview-widget"><FiPlay className="me-1" />{preview ? 'Reload preview' : 'Preview here'}</button>
            <button type="button" className="btn btn-sm btn-light-danger" onClick={onRotate}><FiRefreshCw className="me-1" />New website key</button>
            <h6 className="fs-14 mt-4">2. Allow the website address</h6>
            <p className="fs-13 mb-1">Allowed now: {w.allowed_origins.length ? w.allowed_origins.map((o) => <code key={o} className="me-2">{o}</code>) : <span className="text-danger">none - add it in Settings, or the chat will not open on the site</span>}</p>
            <p className="fs-12 text-muted">The website key is public (it is in the page source). It only identifies the chat; the allowed addresses and rate limits stop other sites from using it.</p>
        </div>
    )
}

const ChatbotWebsitePage = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const [params, setParams] = useSearchParams()
    const tab = params.get('tab') || 'settings'
    const [w, setW] = useState(null)

    const load = useCallback(async () => {
        try { setW((await adsApi(`/api/chatbot/websites/${id}`)).data) } catch (e) { toast.error(e.message); if (e.status === 404) navigate('/chatbot/websites') }
    }, [id, navigate])
    useEffect(() => { load() }, [load])

    const rotate = async () => {
        const ok = await Swal.fire({ title: 'Create a new website key?', text: 'The chat stops working on the website until you paste the new code.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Create new key' })
        if (!ok.isConfirmed) return
        try { setW((await adsApi(`/api/chatbot/websites/${id}/rotate-key`, { method: 'POST' })).data); toast.success('New key created - update the code on the website') } catch (e) { toast.error(e.message) }
    }
    const remove = async () => {
        const ok = await Swal.fire({ title: `Delete "${w.name}"?`, text: 'Its knowledge and chats are deleted. Leads already created stay in the CRM.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Delete' })
        if (!ok.isConfirmed) return
        try { await adsApi(`/api/chatbot/websites/${id}`, { method: 'DELETE' }); navigate('/chatbot/websites') } catch (e) { toast.error(e.message) }
    }

    return (
        <>
            <PageHeader>
                <div className="d-flex gap-2">
                    <Link to="/chatbot/websites" className="btn btn-light"><FiArrowLeft className="me-1" />Websites</Link>
                    {w && <Link to={`/chatbot/inbox?website=${w.website_id}`} className="btn btn-light-brand">Chats</Link>}
                    {w && <button type="button" className="btn btn-light-danger" onClick={remove} title="Delete"><FiTrash2 /></button>}
                </div>
            </PageHeader>
            <div className="main-content">
                {!w ? <div className="text-muted">Loading...</div> : (
                    <>
                        <div className="row mb-3">
                            <div className="col-md-8"><h5 className="mb-1" data-testid="website-name">{w.name}</h5><div className="fs-12 text-muted">{w.client ? `Client: ${w.client.company_name} · ` : ''}{w.is_active ? 'Live' : 'Switched off'} · AI answers {w.ai_enabled ? 'on' : 'off'}</div></div>
                            <div className="col-md-4 d-flex gap-3 justify-content-md-end fs-13">
                                <div><div className="fw-bold">{w.stats.conversations_30d}</div><div className="text-muted fs-11">chats (30 days)</div></div>
                                <div><div className="fw-bold">{w.stats.leads_30d}</div><div className="text-muted fs-11">leads (30 days)</div></div>
                                <div><div className="fw-bold">{w.stats.ai_replies_today}/{w.daily_ai_limit}</div><div className="text-muted fs-11">AI answers today</div></div>
                            </div>
                        </div>
                        <div className="card">
                            <div className="card-header p-0">
                                <ul className="nav nav-tabs border-0">
                                    {[['settings', 'Settings'], ['knowledge', 'Knowledge base'], ['install', 'Install on website']].map(([k, l]) => (
                                        <li className="nav-item" key={k}><button type="button" className={`nav-link ${tab === k ? 'active' : ''}`} onClick={() => setParams({ tab: k })} data-testid={`tab-${k}`}>{l}</button></li>
                                    ))}
                                </ul>
                            </div>
                            {tab === 'settings' && <SettingsTab key={w.updated_at} w={w} onSaved={setW} />}
                            {tab === 'knowledge' && <KnowledgeTab w={w} />}
                            {tab === 'install' && <InstallTab w={w} onRotate={rotate} />}
                        </div>
                    </>
                )}
            </div>
            <Footer />
        </>
    )
}

export default ChatbotWebsitePage
