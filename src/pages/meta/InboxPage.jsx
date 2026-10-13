import React, { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { FiSend, FiRefreshCw, FiClock, FiUser } from 'react-icons/fi'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import usePages from '@/components/meta/usePages'
import { PagePicker, ConnectHint, metaErrorText } from '@/components/meta/PagePicker'
import { api } from '@/utils/authSession'
import AiWriter from '@/components/ai/AiWriter'

const when = (d) => (d ? new Date(d).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '')

/** Messenger inbox of a Page: conversations, messages, reply (24-hour rule), assignment. */
const InboxPage = () => {
    const [params] = useSearchParams()
    const { pages, page, selected, setSelected, error, notConnected } = usePages()
    const [convs, setConvs] = useState([])
    const [filter, setFilter] = useState('')
    const [active, setActive] = useState(Number(params.get('c')) || null)
    const [thread, setThread] = useState({ data: [], conversation: null })
    const [text, setText] = useState('')
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(false)

    useEffect(() => { if (params.get('page')) setSelected(params.get('page')) }, []) // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
        let agencyId = ''
        try { agencyId = JSON.parse(localStorage.getItem('user') || '{}').agency_id || '' } catch { agencyId = '' }
        api(`/api/users/by-agency?agency_id=${agencyId}`).then((r) => setUsers((Array.isArray(r) ? r : r?.users || []).filter((u) => u.user_type !== 'client' && u.is_active !== false))).catch(() => setUsers([]))
    }, [])

    const loadList = useCallback(async () => {
        if (!selected) return
        setLoading(true)
        try { setConvs((await api(`/api/meta/pages/${selected}/conversations${filter ? `?assigned=${filter}` : ''}`)).data) } catch (e) { toast.error(metaErrorText(e)) } finally { setLoading(false) }
    }, [selected, filter])
    useEffect(() => { loadList() }, [loadList])

    const openConv = useCallback(async (id) => {
        setActive(id)
        try { setThread(await api(`/api/meta/pages/${selected}/conversations/${id}/messages`)); setConvs((prev) => prev.map((c) => (c.meta_conversation_id === id ? { ...c, unread_count: 0 } : c))) } catch (e) { toast.error(metaErrorText(e)) }
    }, [selected])
    useEffect(() => { if (active && selected) openConv(active) }, [selected]) // eslint-disable-line react-hooks/exhaustive-deps

    const send = async (e) => {
        e.preventDefault()
        try {
            await api(`/api/meta/pages/${selected}/conversations/${active}/messages`, { method: 'POST', body: { text } })
            setText('')
            openConv(active)
        } catch (err) { toast.error(metaErrorText(err)) }
    }
    const assign = async (userId) => {
        try {
            const c = await api(`/api/meta/pages/${selected}/conversations/${active}`, { method: 'PATCH', body: { assigned_to: userId ? Number(userId) : null } })
            setThread((t) => ({ ...t, conversation: c }))
            setConvs((prev) => prev.map((x) => (x.meta_conversation_id === active ? { ...x, ...c } : x)))
            toast.success(userId ? 'Conversation assigned' : 'Assignment removed')
        } catch (err) { toast.error(metaErrorText(err)) }
    }

    const conv = thread.conversation
    return (
        <>
            <PageHeader>
                <div className="d-flex align-items-center justify-content-between w-100 flex-wrap gap-2">
                    <div><h5 className="mb-1">Messenger inbox</h5><p className="fs-12 text-muted mb-0">Messages sent to {page?.name || 'your Pages'}</p></div>
                    <div className="d-flex gap-2 align-items-center">
                        <PagePicker pages={pages} selected={selected} onChange={(v) => { setSelected(v); setActive(null); setThread({ data: [], conversation: null }) }} />
                        <button type="button" className="btn btn-sm btn-light-brand" onClick={loadList} disabled={loading}><FiRefreshCw /></button>
                    </div>
                </div>
            </PageHeader>
            <div className="main-content">
                {notConnected || error ? <div className="row"><ConnectHint error={error} /></div> : (
                    <div className="card"><div className="row g-0" style={{ minHeight: '60vh' }}>
                        <div className="col-md-4 border-end">
                            <div className="p-2 border-bottom btn-group w-100">
                                {[['', 'All'], ['me', 'Mine'], ['none', 'Unassigned']].map(([v, l]) => <button key={v} type="button" className={`btn btn-sm ${filter === v ? 'btn-primary' : 'btn-light'}`} onClick={() => setFilter(v)}>{l}</button>)}
                            </div>
                            <div className="list-group list-group-flush" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                                {!loading && convs.length === 0 && <div className="p-4 text-muted text-center fs-13">No conversations.</div>}
                                {convs.map((c) => (
                                    <button type="button" key={c.meta_conversation_id} onClick={() => openConv(c.meta_conversation_id)} data-testid="conversation"
                                        className={`list-group-item list-group-item-action ${active === c.meta_conversation_id ? 'active' : ''}`}>
                                        <div className="d-flex justify-content-between">
                                            <strong className="fs-13">{c.participant_name || 'Messenger user'}</strong>
                                            {c.unread_count > 0 && <span className="badge bg-danger">{c.unread_count}</span>}
                                        </div>
                                        <div className="fs-11 d-flex justify-content-between"><span>{when(c.last_message_at)}</span><span>{c.assignee ? c.assignee.full_name : ''}</span></div>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="col-md-8 d-flex flex-column">
                            {!active || !conv ? <div className="m-auto text-muted fs-13 p-4">Choose a conversation</div> : (
                                <>
                                    <div className="p-3 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2">
                                        <strong>{conv.participant_name || 'Messenger user'}</strong>
                                        <div className="d-flex align-items-center gap-2">
                                            <FiUser className="text-muted" />
                                            <select className="form-select form-select-sm" style={{ minWidth: 180 }} value={conv.assigned_to || ''} onChange={(e) => assign(e.target.value)} aria-label="Assigned to">
                                                <option value="">Not assigned</option>
                                                {users.map((u) => <option key={u.user_id} value={u.user_id}>{u.full_name || u.email}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="p-3 flex-grow-1" style={{ maxHeight: '55vh', overflowY: 'auto' }} data-testid="thread">
                                        {thread.data.map((m) => (
                                            <div key={m.id} className={`d-flex mb-2 ${m.from_page ? 'justify-content-end' : ''}`}>
                                                <div className={`p-2 rounded ${m.from_page ? 'bg-primary text-white' : 'bg-light'}`} style={{ maxWidth: '75%' }}>
                                                    <div className="fs-13" style={{ whiteSpace: 'pre-line' }}>{m.message || (m.attachments ? '(attachment)' : '')}</div>
                                                    <div className={`fs-11 ${m.from_page ? 'text-white-50' : 'text-muted'}`}>{when(m.created_time)}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {conv.can_reply ? (
                                        <>
                                        <div className="px-3 pt-2 border-top">
                                            <AiWriter kind="reply" network="messenger" testId="ai-reply" label="Suggest a reply" key={active}
                                                context={() => ({ thread: thread.data.filter((m) => m.message).map((m) => ({ from: m.from_page ? 'us' : 'customer', text: m.message })) })}
                                                clientId={page?.client?.client_id} onUse={(v) => setText(v.text)} />
                                        </div>
                                        <form className="p-3 d-flex gap-2" onSubmit={send}>
                                            <input className="form-control" value={text} maxLength={2000} onChange={(e) => setText(e.target.value)} placeholder="Reply as the Page..." aria-label="Reply" />
                                            <button type="submit" className="btn btn-primary" disabled={!text.trim()}><FiSend /></button>
                                        </form>
                                        </>
                                    ) : (
                                        <div className="p-3 border-top fs-13 text-muted"><FiClock className="me-1" />Facebook only allows replies within 24 hours of the customer's last message. You can answer when they write again.</div>
                                    )}
                                </>
                            )}
                        </div>
                    </div></div>
                )}
            </div>
            <Footer />
        </>
    )
}

export default InboxPage
