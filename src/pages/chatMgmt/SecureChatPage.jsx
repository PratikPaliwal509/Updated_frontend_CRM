import React, { useCallback, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { FiLock, FiPlus, FiSearch, FiUsers } from 'react-icons/fi'
import { toast } from 'react-toastify'
import { SOCKET_URL } from '../../config/api'
import { cachedMe, loadMe } from '@/utils/authSession'
import useE2ee from '@/components/secureChat/useE2ee'
import SecuritySetup from '@/components/secureChat/SecuritySetup'
import DeviceApproval from '@/components/secureChat/DeviceApproval'
import ChatWindow from '@/components/secureChat/ChatWindow'
import ChatInfo from '@/components/secureChat/ChatInfo'
import { api, nameOf, readMessage } from '@/components/secureChat/chatApi'

/** New direct / group / project chat. */
const NewChat = ({ onCreated, onCancel }) => {
    const [type, setType] = useState('direct')
    const [users, setUsers] = useState([])
    const [projects, setProjects] = useState([])
    const [picked, setPicked] = useState([])
    const [name, setName] = useState('')
    const [project, setProject] = useState('')
    const [q, setQ] = useState('')
    const me = cachedMe()?.user
    useEffect(() => {
        api('/api/users/user').then((l) => setUsers((l || []).filter((u) => u.user_id !== me?.user_id && u.user_type !== 'client' && u.is_active !== false))).catch(() => {})
        api('/api/projects').then((p) => setProjects(p || [])).catch(() => {})
    }, []) // eslint-disable-line react-hooks/exhaustive-deps
    const create = async (body) => {
        try { onCreated(await api('/api/chats', { method: 'POST', body })) } catch (e) { toast.error(e.message) }
    }
    const filtered = users.filter((u) => (u.full_name || '').toLowerCase().includes(q.toLowerCase()))
    return (
        <div className="p-3" data-testid="new-chat">
            <div className="btn-group btn-group-sm w-100 mb-3">
                {['direct', 'group', 'project'].map((t) => <button key={t} type="button" className={`btn ${type === t ? 'btn-primary' : 'btn-light'}`} onClick={() => setType(t)}>{t === 'direct' ? 'Person' : t === 'group' ? 'Group' : 'Project'}</button>)}
            </div>
            {type === 'project' ? (
                <>
                    <select className="form-select form-select-sm mb-2" value={project} onChange={(e) => setProject(e.target.value)}>
                        <option value="">Choose a project...</option>
                        {projects.map((p) => <option key={p.project_id} value={p.project_id}>{p.project_name}</option>)}
                    </select>
                    <p className="fs-11 text-muted">Everyone on the project team is added.</p>
                    <button type="button" className="btn btn-primary btn-sm w-100" disabled={!project} onClick={() => create({ chat_type: 'project', project_id: Number(project) })}>Open project chat</button>
                </>
            ) : (
                <>
                    {type === 'group' && <input className="form-control form-control-sm mb-2" placeholder="Group name" value={name} onChange={(e) => setName(e.target.value)} />}
                    <input className="form-control form-control-sm mb-2" placeholder="Search people..." value={q} onChange={(e) => setQ(e.target.value)} />
                    <div className="overflow-auto border rounded" style={{ maxHeight: 280 }}>
                        {filtered.map((u) => (
                            <label key={u.user_id} className="d-flex align-items-center gap-2 px-2 py-1 border-bottom fs-13" role="button">
                                {type === 'group'
                                    ? <input type="checkbox" className="form-check-input m-0" checked={picked.includes(u.user_id)} onChange={() => setPicked((p) => (p.includes(u.user_id) ? p.filter((x) => x !== u.user_id) : [...p, u.user_id]))} />
                                    : <input type="radio" name="dm" className="form-check-input m-0" checked={picked[0] === u.user_id} onChange={() => setPicked([u.user_id])} />}
                                {u.full_name}
                            </label>
                        ))}
                    </div>
                    <button type="button" className="btn btn-primary btn-sm w-100 mt-2" disabled={!picked.length || (type === 'group' && !name.trim())}
                        onClick={() => create(type === 'direct' ? { chat_type: 'direct', user_id: picked[0] } : { chat_type: 'group', chat_name: name.trim(), participant_ids: picked })}>
                        {type === 'direct' ? 'Start chat' : 'Create group'}
                    </button>
                </>
            )}
            <button type="button" className="btn btn-link btn-sm w-100 mt-1" onClick={onCancel}>Cancel</button>
        </div>
    )
}

/** Sidebar entry with a decrypted preview of the last message. */
const ChatRow = ({ client, chat, me, active, onOpen }) => {
    const [preview, setPreview] = useState('')
    const m = chat.last_message
    useEffect(() => {
        let alive = true
        let failed = false
        if (!m) { setPreview('No messages yet'); return undefined }
        const show = () => readMessage(client, chat.chat_id, m).then((v) => {
            if (!alive) return
            failed = v.kind === 'error'
            const who = m.sender_id === me.user_id ? 'You: ' : ''
            setPreview(failed ? '🔒 Encrypted message' : v.kind === 'deleted' ? 'Message deleted' : `${who}${v.text || (v.files?.length ? '📎 File' : '')}`)
        })
        show()
        // the room key may arrive just after the message: try again when new keys come in
        const off = client.on((type) => { if (type === 'to-device' && failed) show() })
        return () => { alive = false; off() }
    }, [m?.message_id, m?.edited_at]) // eslint-disable-line react-hooks/exhaustive-deps
    const other = chat.chat_type === 'direct' ? chat.participants.find((p) => p.user_id !== me.user_id) : null
    return (
        <button type="button" className={`list-group-item list-group-item-action border-0 border-bottom px-3 py-2 ${active ? 'active' : ''}`} onClick={onOpen} data-testid="chat-row">
            <div className="d-flex justify-content-between align-items-center">
                <span className="fw-semibold text-truncate fs-13">
                    {other && <span className={`d-inline-block rounded-circle me-1 ${other.online ? 'bg-success' : 'bg-secondary'}`} style={{ width: 7, height: 7 }} />}
                    {chat.chat_type !== 'direct' && <FiUsers size={12} className="me-1" />}
                    {nameOf(chat, me.user_id)}
                </span>
                {chat.unread_count > 0 && <span className="badge rounded-pill bg-danger" data-testid="unread">{chat.unread_count}</span>}
            </div>
            <div className={`fs-12 text-truncate ${active ? '' : 'text-muted'}`}>{preview}</div>
        </button>
    )
}

/**
 * Chats page: end-to-end encrypted conversations. The page first makes sure this browser has
 * trusted encryption keys (setup / recovery key / approval from another device).
 */
const SecureChatPage = () => {
    const [me, setMe] = useState(cachedMe()?.user || null)
    const e2ee = useE2ee(me?.user_id)
    const [chats, setChats] = useState([])
    const [active, setActive] = useState(null)
    const [newChat, setNewChat] = useState(false)
    const [info, setInfo] = useState(false)
    const [q, setQ] = useState('')
    const socketRef = useRef(null)
    const [socket, setSocket] = useState(null)

    useEffect(() => { if (!me) loadMe().then((r) => setMe(r.user)).catch(() => {}) }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const loadChats = useCallback(async () => {
        try {
            const list = await api('/api/chats/mine')
            setChats(list || [])
            setActive((cur) => (cur ? (list || []).find((c) => c.chat_id === cur.chat_id) || null : cur))
        } catch (e) { toast.error(e.message) }
    }, [])

    const openChat = useCallback(async (chatId) => {
        try {
            const c = await api(`/api/chats/${chatId}`)
            setActive(c)
            setNewChat(false)
            try { localStorage.setItem('lastChatId', String(chatId)) } catch { /* ignore */ }
        } catch (e) { toast.error(e.message) }
    }, [])

    useEffect(() => {
        if (e2ee.phase !== 'ready' || !me) return undefined
        loadChats().then(() => {
            const last = Number(new URLSearchParams(window.location.search).get('chat')) || Number(localStorage.getItem('lastChatId'))
            if (last) openChat(last).catch(() => {})
        })
        const s = io(SOCKET_URL, { auth: { token: localStorage.getItem('token') }, transports: ['websocket'] })
        socketRef.current = s
        setSocket(s)
        const client = e2ee.client
        s.on('e2ee:sync', () => client.sync().catch(() => {}))
        s.on('e2ee:devices-changed', () => client.sync().catch(() => {}))
        s.on('chat:new-chat', loadChats)
        s.on('chat:activity', loadChats)
        s.on('chat:removed', ({ chat_id }) => { loadChats(); setActive((c) => (c && c.chat_id === chat_id ? null : c)) })
        s.on('chat:members-changed', async ({ chat_id }) => {
            // someone joined or left: start a new encryption session before the next message
            await client.rotateRoom(`!c${chat_id}:techleela`).catch(() => {})
            loadChats()
            setActive((c) => { if (c && c.chat_id === chat_id) openChat(chat_id); return c })
        })
        s.on('chat:updated', loadChats)
        s.on('connect', () => client.sync().catch(() => {}))
        const poll = setInterval(() => client.sync().catch(() => {}), 60000)
        return () => { clearInterval(poll); s.disconnect() }
    }, [e2ee.phase, me]) // eslint-disable-line react-hooks/exhaustive-deps

    if (!me) return <div className="p-5 text-muted">Loading...</div>
    if (e2ee.phase !== 'ready') return <div className="main-content"><SecuritySetup e2ee={e2ee} /></div>

    const shown = chats.filter((c) => nameOf(c, me.user_id).toLowerCase().includes(q.toLowerCase()))

    return (
        <div className="d-flex bg-white flex-grow-1 w-100" style={{ height: 'calc(100vh - 80px)' }} data-testid="secure-chat">
            <DeviceApproval client={e2ee.client} />
            <div className="border-end d-flex flex-column" style={{ width: 320, flex: '0 0 320px' }}>
                <div className="p-3 border-bottom d-flex align-items-center justify-content-between">
                    <h6 className="mb-0 d-flex align-items-center gap-2"><FiLock className="text-success" /> Chats</h6>
                    <button type="button" className="btn btn-sm btn-primary" onClick={() => setNewChat((v) => !v)} data-testid="new-chat-button"><FiPlus /> New</button>
                </div>
                {newChat ? <NewChat onCancel={() => setNewChat(false)} onCreated={(c) => { loadChats(); openChat(c.chat_id) }} /> : (
                    <>
                        <div className="p-2 border-bottom"><div className="input-group input-group-sm"><span className="input-group-text"><FiSearch /></span><input className="form-control" placeholder="Search chats" value={q} onChange={(e) => setQ(e.target.value)} /></div></div>
                        <div className="list-group list-group-flush overflow-auto flex-grow-1">
                            {shown.length === 0 && <p className="text-muted fs-12 p-3">No chats yet. Start one with "New".</p>}
                            {shown.map((c) => <ChatRow key={c.chat_id} client={e2ee.client} chat={c} me={me} active={active?.chat_id === c.chat_id} onOpen={() => openChat(c.chat_id)} />)}
                        </div>
                    </>
                )}
            </div>
            <div className="flex-grow-1 d-flex" style={{ minWidth: 0 }}>
                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    {active ? (
                        <ChatWindow key={active.chat_id} client={e2ee.client} me={me} chat={active} socket={socket} onShowInfo={() => setInfo((v) => !v)} onActivity={loadChats} />
                    ) : (
                        <div className="h-100 d-flex flex-column align-items-center justify-content-center text-muted">
                            <FiLock size={36} className="mb-2 text-success" />
                            <div className="fs-13">Choose a chat. Messages are end-to-end encrypted.</div>
                        </div>
                    )}
                </div>
                {active && info && <ChatInfo client={e2ee.client} me={me} chat={active} onClose={() => setInfo(false)} onChanged={() => { openChat(active.chat_id); loadChats() }} onLeft={() => { setInfo(false); setActive(null); loadChats() }} />}
            </div>
        </div>
    )
}

export default SecureChatPage
