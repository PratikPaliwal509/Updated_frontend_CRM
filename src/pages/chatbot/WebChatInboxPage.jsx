import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { FiSend, FiRefreshCw, FiUser, FiZap, FiCpu, FiCheckCircle, FiExternalLink, FiSettings } from 'react-icons/fi'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import { adsApi } from '@/components/meta/adsApi'
import { aiErrorText } from '@/components/ai/AiWriter'
import { api } from '@/utils/authSession'

/**
 * Website chats (F-125): conversations from the website widgets - bot answers, visitors waiting for a
 * person, staff replies, assignment, closing, and an AI-drafted reply from the knowledge base.
 */
const STATUS = { bot: ['bg-soft-info text-info', 'Bot'], waiting: ['bg-soft-danger text-danger', 'Waiting'], open: ['bg-soft-success text-success', 'Open'], closed: ['bg-soft-secondary text-secondary', 'Closed'] }
const when = (d) => (d ? new Date(d).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '')
const FILTERS = [['active', 'Needs a person'], ['bot', 'With the bot'], ['closed', 'Closed'], ['', 'All']]

const WebChatInboxPage = () => {
    const [params, setParams] = useSearchParams()
    const [status, setStatus] = useState('active')
    const [website, setWebsite] = useState(params.get('website') || '')
    const [mine, setMine] = useState(false)
    const [q, setQ] = useState('')
    const [list, setList] = useState({ data: [], counts: {} })
    const [websites, setWebsites] = useState([])
    const [users, setUsers] = useState([])
    const [active, setActive] = useState(Number(params.get('c')) || null)
    const [conv, setConv] = useState(null)
    const [text, setText] = useState('')
    const [suggesting, setSuggesting] = useState(false)
    const [aiNote, setAiNote] = useState(null)
    const bottom = useRef(null)

    useEffect(() => {
        adsApi('/api/chatbot/websites').then((r) => setWebsites(r.data)).catch(() => setWebsites([]))
        let agencyId = ''
        try { agencyId = JSON.parse(localStorage.getItem('user') || '{}').agency_id || '' } catch { agencyId = '' }
        api(`/api/users/by-agency?agency_id=${agencyId}`).then((r) => setUsers((Array.isArray(r) ? r : r?.users || []).filter((u) => u.user_type !== 'client' && u.is_active !== false))).catch(() => setUsers([]))
    }, [])
    // a link from a notification opens that chat whatever its status
    useEffect(() => { if (params.get('c')) setStatus('') }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const loadList = useCallback(async () => {
        const qs = new URLSearchParams()
        if (status) qs.set('status', status)
        if (website) qs.set('website_id', website)
        if (mine) qs.set('mine', 'true')
        if (q.trim()) qs.set('q', q.trim())
        try { const r = await adsApi(`/api/chatbot/conversations?${qs}`); setList({ data: r.data, counts: r.counts || {} }) } catch (e) { toast.error(e.message) }
    }, [status, website, mine, q])
    useEffect(() => { loadList() }, [loadList])

    const loadConv = useCallback(async (id, quiet) => {
        try {
            const r = await adsApi(`/api/chatbot/conversations/${id}`)
            setConv((prev) => { if (!quiet || !prev || prev.messages.length !== r.data.messages.length || prev.status !== r.data.status) return r.data; return prev })
        } catch (e) { if (!quiet) toast.error(e.message) }
    }, [])
    useEffect(() => { if (active) { setAiNote(null); loadConv(active) } else setConv(null) }, [active, loadConv])
    // live enough: refresh the list and the open chat every 5 seconds
    useEffect(() => {
        const t = setInterval(() => { loadList(); if (active) loadConv(active, true) }, 5000)
        return () => clearInterval(t)
    }, [loadList, loadConv, active])
    useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }) }, [conv?.messages?.length])

    const open = (id) => { setActive(id); setParams((p) => { const n = new URLSearchParams(p); n.set('c', id); return n }) }
    const send = async (e) => {
        e.preventDefault()
        if (!text.trim()) return
        try {
            await adsApi(`/api/chatbot/conversations/${active}/messages`, { method: 'POST', body: { text: text.trim() } })
            setText(''); setAiNote(null)
            loadConv(active); loadList()
        } catch (err) { toast.error(err.message) }
    }
    const patch = async (body, msg) => {
        try { const r = await adsApi(`/api/chatbot/conversations/${active}`, { method: 'PATCH', body }); setConv(r.data); loadList(); toast.success(msg) } catch (err) { toast.error(err.message) }
    }
    const suggest = async () => {
        setSuggesting(true); setAiNote(null)
        try {
            const r = await adsApi(`/api/chatbot/conversations/${active}/suggest`, { method: 'POST' })
            setText(r.data.reply)
            setAiNote({ sources: r.data.sources })
        } catch (err) { setAiNote({ error: err }) } finally { setSuggesting(false) }
    }

    const c = conv
    return (
        <>
            <PageHeader>
                <div className="d-flex gap-2 align-items-center flex-wrap">
                    <select className="form-select form-select-sm" style={{ minWidth: 180 }} value={website} onChange={(e) => setWebsite(e.target.value)} aria-label="Website">
                        <option value="">All websites</option>
                        {websites.map((w) => <option key={w.website_id} value={w.website_id}>{w.name}</option>)}
                    </select>
                    <Link to="/chatbot/websites" className="btn btn-sm btn-light-brand"><FiSettings className="me-1" />Chatbots</Link>
                    <button type="button" className="btn btn-sm btn-light-brand" onClick={loadList} aria-label="Refresh"><FiRefreshCw /></button>
                </div>
            </PageHeader>
            <div className="main-content">
                <div className="card"><div className="row g-0" style={{ minHeight: '65vh' }}>
                    <div className="col-md-4 border-end">
                        <div className="p-2 border-bottom">
                            <div className="btn-group w-100 mb-2 flex-wrap">
                                {FILTERS.map(([v, l]) => (
                                    <button key={v} type="button" className={`btn btn-sm ${status === v ? 'btn-primary' : 'btn-light'}`} onClick={() => setStatus(v)} data-testid={`filter-${v || 'all'}`}>
                                        {l}{v === 'active' && ((list.counts.waiting || 0) + (list.counts.open || 0)) > 0 && <span className="badge bg-danger ms-1">{(list.counts.waiting || 0) + (list.counts.open || 0)}</span>}
                                    </button>
                                ))}
                            </div>
                            <div className="d-flex gap-2">
                                <input className="form-control form-control-sm" placeholder="Search name, email or text" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search chats" />
                                <label className="btn btn-sm btn-light text-nowrap mb-0"><input type="checkbox" className="form-check-input me-1" checked={mine} onChange={(e) => setMine(e.target.checked)} />Mine</label>
                            </div>
                        </div>
                        <div className="list-group list-group-flush" style={{ maxHeight: '62vh', overflowY: 'auto' }} data-testid="webchat-list">
                            {list.data.length === 0 && <div className="p-4 text-muted text-center fs-13">No chats here.</div>}
                            {list.data.map((x) => {
                                const [cls, l] = STATUS[x.status] || STATUS.bot
                                return (
                                    <button type="button" key={x.conversation_id} onClick={() => open(x.conversation_id)} data-testid="webchat-item"
                                        className={`list-group-item list-group-item-action ${active === x.conversation_id ? 'active' : ''}`}>
                                        <div className="d-flex justify-content-between align-items-center">
                                            <strong className="fs-13">{x.visitor_name || `Visitor #${x.conversation_id}`}</strong>
                                            <span>{x.unread_agent > 0 && <span className="badge bg-danger me-1">{x.unread_agent}</span>}<span className={`badge ${cls}`}>{l}</span></span>
                                        </div>
                                        <div className="fs-12 text-truncate">{x.last_message ? `${x.last_message.from === 'visitor' ? '' : `${x.last_message.from}: `}${x.last_message.text}` : ''}</div>
                                        <div className="fs-11 d-flex justify-content-between"><span>{x.website?.name}</span><span>{when(x.last_message_at)}</span></div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                    <div className="col-md-8 d-flex flex-column">
                        {!c ? <div className="m-auto text-muted fs-13 p-4">Choose a chat</div> : (
                            <>
                                <div className="p-3 border-bottom d-flex justify-content-between align-items-start flex-wrap gap-2">
                                    <div>
                                        <strong data-testid="webchat-visitor">{c.visitor_name || `Visitor #${c.conversation_id}`}</strong> <span className={`badge ${(STATUS[c.status] || STATUS.bot)[0]}`} data-testid="webchat-status">{(STATUS[c.status] || STATUS.bot)[1]}</span>
                                        <div className="fs-12 text-muted">
                                            {[c.visitor_email, c.visitor_phone, c.visitor_company].filter(Boolean).join(' · ')}
                                            {c.lead && <> · <Link to={`/leads/view/${c.lead.lead_id}`} data-testid="webchat-lead">Lead: {c.lead.name}</Link></>}
                                        </div>
                                        <div className="fs-11 text-muted">{c.website?.name}{c.page_url && <> · <a href={c.page_url} target="_blank" rel="noopener noreferrer">{c.page_url}<FiExternalLink className="ms-1" /></a></>}</div>
                                    </div>
                                    <div className="d-flex align-items-center gap-2 flex-wrap">
                                        <FiUser className="text-muted" />
                                        <select className="form-select form-select-sm" style={{ minWidth: 160 }} value={c.assigned_to || ''} onChange={(e) => patch({ assigned_to: e.target.value ? Number(e.target.value) : null }, 'Assignment saved')} aria-label="Assigned to">
                                            <option value="">Not assigned</option>
                                            {users.map((u) => <option key={u.user_id} value={u.user_id}>{u.full_name || u.email}</option>)}
                                        </select>
                                        {c.status !== 'closed' && <button type="button" className="btn btn-sm btn-light" onClick={() => patch({ status: 'closed' }, 'Chat closed')} data-testid="webchat-close"><FiCheckCircle className="me-1" />Close</button>}
                                        {c.status !== 'bot' && <button type="button" className="btn btn-sm btn-light" onClick={() => patch({ status: 'bot' }, 'The bot answers again')} title="Let the bot answer again"><FiCpu /></button>}
                                    </div>
                                </div>
                                <div className="p-3 flex-grow-1 bg-light" style={{ maxHeight: '52vh', overflowY: 'auto' }} data-testid="webchat-thread">
                                    {c.messages.map((m) => (
                                        m.sender_type === 'system' ? <div key={m.message_id} className="text-center fs-11 text-muted my-2">{m.body}</div> : (
                                            <div key={m.message_id} className={`d-flex mb-2 ${m.sender_type === 'visitor' ? '' : 'justify-content-end'}`}>
                                                <div className={`p-2 rounded ${m.sender_type === 'visitor' ? 'bg-white border' : m.sender_type === 'bot' ? 'bg-soft-info' : 'bg-primary text-white'}`} style={{ maxWidth: '75%' }} data-testid={`msg-${m.sender_type}`}>
                                                    <div className="fs-11 opacity-75 mb-1">{m.sender_type === 'bot' ? 'Bot' : m.sender_type === 'agent' ? (m.agent?.full_name || 'Team') : 'Visitor'}{m.meta?.fallback ? ' · did not know' : ''}</div>
                                                    <div className="fs-13" style={{ whiteSpace: 'pre-line' }}>{m.body}</div>
                                                    {m.sources?.length > 0 && <div className="fs-11 mt-1">Sources: {m.sources.map((s, i) => (s.url ? <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="me-2">{s.title}</a> : <span key={i} className="me-2">{s.title}</span>))}</div>}
                                                    <div className={`fs-11 ${m.sender_type === 'agent' ? 'text-white-50' : 'text-muted'}`}>{when(m.created_at)}</div>
                                                </div>
                                            </div>
                                        )
                                    ))}
                                    <div ref={bottom} />
                                </div>
                                <div className="border-top">
                                    {aiNote?.error && <div className="alert alert-warning fs-13 py-2 m-2 mb-0">{aiErrorText(aiNote.error)}</div>}
                                    {aiNote?.sources && <div className="fs-11 text-muted px-3 pt-2">AI draft{aiNote.sources.length ? ` based on: ${aiNote.sources.map((s) => s.title).join(', ')}` : ''} - check it before sending.</div>}
                                    <form className="p-3 d-flex gap-2 align-items-end" onSubmit={send}>
                                        <textarea className="form-control" rows={2} value={text} maxLength={2000} onChange={(e) => setText(e.target.value)} placeholder="Reply to the visitor..." aria-label="Reply" data-testid="webchat-reply"
                                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e) } }} />
                                        <button type="button" className="btn btn-light-brand" onClick={suggest} disabled={suggesting} title="Suggest a reply with AI" data-testid="webchat-suggest">{suggesting ? <span className="spinner-border spinner-border-sm" /> : <FiZap />}</button>
                                        <button type="submit" className="btn btn-primary" disabled={!text.trim()} data-testid="webchat-send"><FiSend /></button>
                                    </form>
                                </div>
                            </>
                        )}
                    </div>
                </div></div>
            </div>
            <Footer />
        </>
    )
}

export default WebChatInboxPage
