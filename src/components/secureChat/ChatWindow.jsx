import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FiLock, FiPaperclip, FiSend, FiInfo, FiCornerUpLeft, FiEdit2, FiTrash2, FiSearch, FiAlertTriangle, FiClipboard, FiX, FiDownload, FiShield } from 'react-icons/fi'
import { toast } from 'react-toastify'
import { api, roomIdOf, nameOf, othersOf, readMessage, forgetCached, fmtTime, fmtSize } from './chatApi'
import TaskModal from '@/components/chats/TaskModal'

const REACTIONS = ['👍', '❤️', '😂', '🎉', '✅']
const MAX_FILE = 100 * 1024 * 1024

/** Downloads an encrypted file, decrypts it on this device and returns an object URL. */
const openFile = async (client, attachmentId, file) => {
    const link = await api(`/api/chat-attachments/${attachmentId}/download`)
    const res = await fetch(link.url)
    if (!res.ok) throw new Error('Could not download the file')
    const plain = client.decryptFile(new Uint8Array(await res.arrayBuffer()), file.info)
    return URL.createObjectURL(new Blob([plain], { type: file.mimetype || 'application/octet-stream' }))
}

const FileItem = ({ client, attachmentId, file }) => {
    const [url, setUrl] = useState(null)
    const [busy, setBusy] = useState(false)
    const isImage = /^image\//.test(file.mimetype || '')
    const load = async (download) => {
        setBusy(true)
        try {
            const u = url || await openFile(client, attachmentId, file)
            setUrl(u)
            if (download) { const a = document.createElement('a'); a.href = u; a.download = file.name || 'file'; a.click() }
        } catch (e) { toast.error(e.message) } finally { setBusy(false) }
    }
    useEffect(() => { if (isImage && attachmentId) load(false) }, [attachmentId]) // eslint-disable-line react-hooks/exhaustive-deps
    return (
        <div className="mt-2" data-testid="chat-file">
            {isImage && url && <img src={url} alt={file.name} className="rounded border mb-1" style={{ maxWidth: 260, maxHeight: 200 }} />}
            <button type="button" className="btn btn-sm btn-light d-flex align-items-center gap-2" disabled={busy || !attachmentId} onClick={() => load(true)}>
                <FiDownload /> <span className="text-truncate" style={{ maxWidth: 200 }}>{file.name}</span> <span className="text-muted fs-11">{fmtSize(file.size)}</span>
            </button>
        </div>
    )
}

const Bubble = ({ m, view, mine, client, onReply, onEdit, onDelete, onReact, seen, canModerate }) => {
    const encryptedFiles = (m.attachments || []).filter((a) => a.is_encrypted).sort((a, b) => a.attachment_id - b.attachment_id)
    return (
        <div className={`d-flex mb-3 ${mine ? 'justify-content-end' : ''}`} data-testid="chat-message" data-message-id={m.message_id}>
            <div style={{ maxWidth: '72%' }}>
                {!mine && <div className="fs-11 fw-semibold text-muted mb-1">{m.sender?.full_name}</div>}
                <div className={`px-3 py-2 rounded-3 ${mine ? 'bg-primary text-white' : 'bg-light'} ${view?.kind === 'error' ? 'border border-warning' : ''}`}>
                    {view?.replyText && <div className={`border-start border-3 ps-2 mb-1 fs-12 ${mine ? 'text-white-50' : 'text-muted'}`}>{view.replyText}</div>}
                    {!view ? <span className="fs-12 opacity-75"><span className="spinner-border spinner-border-sm me-1" />Decrypting...</span>
                        : view.kind === 'deleted' ? <em className="fs-13 opacity-75">{view.text}</em>
                        : view.kind === 'error' ? <span className="fs-13 text-dark"><FiLock className="me-1" />{view.text}</span>
                        : view.kind === 'task' ? (
                            <div className="fs-13">
                                <div className="fw-semibold"><FiClipboard className="me-1" />{view.task?.task_title || view.text}</div>
                                {view.task && <div className="fs-11 opacity-75">{view.task.task_number} · {String(view.task.status).replace('_', ' ')}</div>}
                                <div className="fs-10 opacity-75 mt-1">Task card - not end-to-end encrypted (it is CRM data)</div>
                            </div>
                        )
                        : <div className="fs-13" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{view.text}</div>}
                    {view?.kind === 'encrypted' && (view.files || []).map((f, i) => <FileItem key={i} client={client} attachmentId={encryptedFiles[i]?.attachment_id} file={f} />)}
                    {view?.kind === 'legacy' && (view.files || []).map((a) => <a key={a.attachment_id} href={a.file_url} target="_blank" rel="noreferrer" className="d-block fs-12">{a.file_name}</a>)}
                </div>
                <div className={`d-flex align-items-center gap-2 fs-11 text-muted mt-1 ${mine ? 'justify-content-end' : ''}`}>
                    <span>{fmtTime(m.created_at)}</span>
                    {m.is_edited && <span>edited</span>}
                    {view?.kind === 'legacy' && <span className="badge bg-soft-warning text-warning" title="Sent before end-to-end encryption was turned on">not encrypted</span>}
                    {view?.shield && <span title={view.shield}><FiShield className="text-warning" /></span>}
                    {mine && seen && <span className="text-primary" data-testid="seen">Seen</span>}
                    {!m.is_deleted && (
                        <span className="d-flex gap-1">
                            {view && ['encrypted', 'task', 'legacy'].includes(view.kind) && <button type="button" className="btn btn-link p-0 text-muted" title="Reply" onClick={() => onReply(m, view)}><FiCornerUpLeft size={12} /></button>}
                            {mine && view?.kind === 'encrypted' && <button type="button" className="btn btn-link p-0 text-muted" title="Edit" onClick={() => onEdit(m, view)}><FiEdit2 size={12} /></button>}
                            {(mine || canModerate) && <button type="button" className="btn btn-link p-0 text-muted" title="Delete for everyone" onClick={() => onDelete(m)}><FiTrash2 size={12} /></button>}
                            <span className="dropdown">
                                <button type="button" className="btn btn-link p-0 text-muted" data-bs-toggle="dropdown" title="React">☺</button>
                                <span className="dropdown-menu p-1">{REACTIONS.map((r) => <button key={r} type="button" className="btn btn-sm" onClick={() => onReact(m, r)}>{r}</button>)}</span>
                            </span>
                        </span>
                    )}
                </div>
                {(m.reactions || []).length > 0 && (
                    <div className={`d-flex gap-1 mt-1 ${mine ? 'justify-content-end' : ''}`}>
                        {Object.entries((m.reactions || []).reduce((o, r) => { o[r.reaction] = (o[r.reaction] || 0) + 1; return o }, {})).map(([r, n]) => (
                            <button key={r} type="button" className="btn btn-sm btn-light py-0 px-2 fs-12" onClick={() => onReact(m, r)}>{r} {n}</button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

/**
 * One conversation. Every text, edit and file is encrypted on this device before it is sent;
 * messages are decrypted here. Task cards, reactions and read receipts are not encrypted.
 */
const ChatWindow = ({ client, me, chat, socket, onShowInfo, onActivity }) => {
    const meId = me.user_id
    const roomId = roomIdOf(chat.chat_id)
    const [messages, setMessages] = useState([])
    const [views, setViews] = useState({})
    const [reads, setReads] = useState([])
    const [hasMore, setHasMore] = useState(false)
    const [text, setText] = useState('')
    const [files, setFiles] = useState([])
    const [reply, setReply] = useState(null)
    const [editing, setEditing] = useState(null)
    const [sending, setSending] = useState(false)
    const [typing, setTyping] = useState({})
    const [search, setSearch] = useState('')
    const [showSearch, setShowSearch] = useState(false)
    const [warnings, setWarnings] = useState([])
    const [taskOpen, setTaskOpen] = useState(false)
    const bottom = useRef(null)
    const messagesRef = useRef([])
    const failedRef = useRef(new Set())
    const lastTyping = useRef(0)
    const fileInput = useRef(null)
    useEffect(() => { messagesRef.current = messages }, [messages])
    useEffect(() => {
        failedRef.current = new Set(Object.entries(views).filter(([, v]) => v?.kind === 'error').map(([id]) => Number(id)))
    }, [views])
    /** Messages whose key had not arrived yet are decrypted again (keys can arrive just after the message). */
    const retryFailed = useCallback(async () => {
        if (!failedRef.current.size) return
        const out = {}
        for (const m of messagesRef.current.filter((x) => failedRef.current.has(x.message_id))) {
            forgetCached(m)
            const v = await readMessage(client, chat.chat_id, m)
            if (v.kind !== 'error') out[m.message_id] = v
        }
        if (Object.keys(out).length) setViews((p) => ({ ...p, ...out }))
    }, [client, chat.chat_id])

    const memberIds = useMemo(() => (chat.participants || []).map((p) => p.user_id), [chat])
    const myRole = (chat.participants || []).find((p) => p.user_id === meId)?.role
    const canModerate = chat.chat_type !== 'direct' && myRole === 'admin' && me.user_type !== 'client'

    const decryptAll = useCallback(async (list) => {
        const out = {}
        for (const m of list) out[m.message_id] = await readMessage(client, chat.chat_id, m)
        for (const m of list) {
            const v = out[m.message_id]
            if (m.reply_to_message_id) {
                const target = list.find((x) => x.message_id === m.reply_to_message_id)
                const tv = target && out[target.message_id]
                v.replyText = tv ? `${target.sender?.full_name || ''}: ${String(tv.text || '').slice(0, 80)}` : 'Earlier message'
            }
        }
        setViews((prev) => ({ ...prev, ...out }))
    }, [client, chat.chat_id])

    const load = useCallback(async (before) => {
        const r = await api(`/api/chats/${chat.chat_id}/messages${before ? `?before=${before}` : ''}`)
        setHasMore(r.has_more)
        setReads(r.reads || [])
        setMessages((prev) => {
            const merged = before ? [...r.messages, ...prev] : r.messages
            decryptAll(merged)
            return merged
        })
        if (!before) setTimeout(() => bottom.current?.scrollIntoView(), 50)
    }, [chat.chat_id, decryptAll])

    // contacts who cannot receive messages yet / whose security key changed
    const checkMembers = useCallback(async () => {
        const out = []
        for (const p of othersOf(chat, meId)) {
            try {
                const sn = await client.safetyNumber(p.user_id)
                if (!sn) out.push({ type: 'no-keys', user: p })
                else if (sn.changed) out.push({ type: 'changed', user: p })
            } catch (e) { /* skip */ }
        }
        setWarnings(out)
    }, [client, chat, meId])

    useEffect(() => {
        setMessages([]); setViews({}); setReply(null); setEditing(null); setText(''); setFiles([]); setSearch('')
        load()
        checkMembers()
        socket?.emit('chat:join', chat.chat_id)
        const onMessage = (m) => {
            if (m.chat_id !== chat.chat_id) return
            setMessages((prev) => (prev.some((x) => x.message_id === m.message_id) ? prev : [...prev, m]))
            readMessage(client, chat.chat_id, m).then((v) => setViews((p) => ({ ...p, [m.message_id]: v })))
            setTimeout(() => bottom.current?.scrollIntoView({ behavior: 'smooth' }), 50)
        }
        const onEdited = (m) => {
            if (m.chat_id !== chat.chat_id) return
            setMessages((prev) => prev.map((x) => (x.message_id === m.message_id ? m : x)))
            readMessage(client, chat.chat_id, m).then((v) => setViews((p) => ({ ...p, [m.message_id]: v })))
        }
        const onDeleted = ({ chat_id, message_id }) => {
            if (chat_id !== chat.chat_id) return
            setMessages((prev) => prev.map((x) => (x.message_id === message_id ? { ...x, is_deleted: true, ciphertext: null, attachments: [], reactions: [] } : x)))
            setViews((p) => ({ ...p, [message_id]: { kind: 'deleted', text: 'This message was deleted' } }))
        }
        const onReactions = ({ chat_id, message_id, reactions }) => {
            if (chat_id === chat.chat_id) setMessages((prev) => prev.map((x) => (x.message_id === message_id ? { ...x, reactions } : x)))
        }
        const onRead = ({ chat_id, user_id, message_id }) => {
            if (chat_id === chat.chat_id) setReads((prev) => prev.map((r) => (r.user_id === user_id ? { ...r, last_read_message_id: Math.max(r.last_read_message_id || 0, message_id) } : r)))
        }
        const onTyping = ({ chat_id, user_id, user_name }) => {
            if (chat_id !== chat.chat_id || user_id === meId) return
            setTyping((t) => ({ ...t, [user_id]: { name: user_name, at: Date.now() } }))
        }
        const onStop = ({ chat_id, user_id }) => { if (chat_id === chat.chat_id) setTyping((t) => { const n = { ...t }; delete n[user_id]; return n }) }
        const events = { 'chat:message': onMessage, 'chat:message-edited': onEdited, 'chat:message-deleted': onDeleted, 'chat:reactions': onReactions, 'chat:read': onRead, 'chat:typing': onTyping, 'chat:stop-typing': onStop }
        Object.entries(events).forEach(([e, fn]) => socket?.on(e, fn))
        // when a room key arrives later, retry messages we could not read yet
        const off = client.on((type) => { if (type === 'to-device') retryFailed() })
        const tick = setInterval(() => {
            setTyping((t) => Object.fromEntries(Object.entries(t).filter(([, v]) => Date.now() - v.at < 6000)))
            if (failedRef.current.size) client.sync().then(retryFailed).catch(() => {})
        }, 3000)
        return () => {
            Object.entries(events).forEach(([e, fn]) => socket?.off(e, fn))
            socket?.emit('chat:leave', chat.chat_id)
            off(); clearInterval(tick)
        }
    }, [chat.chat_id]) // eslint-disable-line react-hooks/exhaustive-deps

    // read receipt for the newest message from someone else
    useEffect(() => {
        const last = [...messages].reverse().find((m) => m.sender_id !== meId)
        const mine = reads.find((r) => r.user_id === meId)
        if (last && (!mine || (mine.last_read_message_id || 0) < last.message_id) && document.visibilityState === 'visible') {
            api(`/api/chats/${chat.chat_id}/read`, { method: 'POST', body: { message_id: last.message_id } }).then(() => onActivity?.()).catch(() => {})
            setReads((prev) => prev.map((r) => (r.user_id === meId ? { ...r, last_read_message_id: last.message_id } : r)))
        }
    }, [messages]) // eslint-disable-line react-hooks/exhaustive-deps

    const lastMineSeen = useMemo(() => {
        const mine = [...messages].reverse().find((m) => m.sender_id === meId && !m.is_deleted)
        if (!mine) return null
        return reads.some((r) => r.user_id !== meId && (r.last_read_message_id || 0) >= mine.message_id) ? mine.message_id : null
    }, [messages, reads, meId])

    const uploadFile = async (file) => {
        if (file.size > MAX_FILE) throw new Error(`${file.name} is larger than 100 MB`)
        const { data, info } = client.encryptFile(new Uint8Array(await file.arrayBuffer()))
        const sig = await api('/api/chat-attachments/upload-signature', { method: 'POST', body: { chat_id: chat.chat_id } })
        const form = new FormData()
        Object.entries(sig.params).forEach(([k, v]) => form.append(k, v))
        form.append('file', new Blob([data], { type: 'application/octet-stream' }), 'encrypted.bin')
        const res = await fetch(sig.upload_url, { method: 'POST', body: form })
        const up = await res.json()
        if (!res.ok) throw new Error(up.error?.message || 'Upload failed')
        return { meta: { name: file.name, mimetype: file.type, size: file.size, info }, storage_key: up.public_id, size: data.length }
    }

    const send = async (e) => {
        e?.preventDefault()
        if (sending || (!text.trim() && !files.length)) return
        setSending(true)
        try {
            if (editing) {
                const content = { msgtype: 'm.text', body: text.trim(), files: views[editing.message_id]?.files || [], reply_to: views[editing.message_id]?.replyTo || null }
                const ciphertext = await client.encrypt(roomId, memberIds, content)
                await api(`/api/chat-messages/${editing.message_id}`, { method: 'PUT', body: { ciphertext } })
                setEditing(null)
            } else {
                const uploaded = []
                for (const f of files) uploaded.push(await uploadFile(f))
                const content = { msgtype: uploaded.length ? 'm.file' : 'm.text', body: text.trim(), files: uploaded.map((u) => ({ ...u.meta, storage_key: u.storage_key })), reply_to: reply?.message_id || null }
                const ciphertext = await client.encrypt(roomId, memberIds, content)
                const msg = await api('/api/chat-messages', {
                    method: 'POST',
                    body: { chat_id: chat.chat_id, message_type: uploaded.length ? 'file' : 'text', sender_device_id: client.deviceId, ciphertext, reply_to_message_id: reply?.message_id || null, attachments: uploaded.map((u) => ({ storage_key: u.storage_key, size: u.size })) },
                })
                setMessages((prev) => (prev.some((x) => x.message_id === msg.message_id) ? prev : [...prev, msg]))
                readMessage(client, chat.chat_id, msg).then((v) => setViews((p) => ({ ...p, [msg.message_id]: { ...v, replyText: reply ? reply.preview : undefined } })))
                setReply(null); setFiles([])
                if (fileInput.current) fileInput.current.value = ''
            }
            setText('')
            socket?.emit('chat:stop-typing', { chat_id: chat.chat_id })
            onActivity?.()
            setTimeout(() => bottom.current?.scrollIntoView({ behavior: 'smooth' }), 50)
        } catch (err) {
            toast.error(err.code === 'IDENTITY_CHANGED' || /verif/i.test(err.message) ? 'A member’s security key changed. Review it in the chat info before sending.' : err.message)
            checkMembers()
        } finally {
            setSending(false)
        }
    }

    const onType = (v) => {
        setText(v)
        if (Date.now() - lastTyping.current > 2500) { socket?.emit('chat:typing', { chat_id: chat.chat_id }); lastTyping.current = Date.now() }
    }

    const del = async (m) => {
        if (!window.confirm('Delete this message for everyone?')) return
        try { await api(`/api/chat-messages/${m.message_id}`, { method: 'DELETE' }) } catch (err) { toast.error(err.message) }
    }
    const react = async (m, r) => {
        try {
            const res = await api(`/api/chat-messages/${m.message_id}/reactions`, { method: 'POST', body: { reaction: r } })
            setMessages((prev) => prev.map((x) => (x.message_id === m.message_id ? { ...x, reactions: res.reactions } : x)))
        } catch (err) { toast.error(err.message) }
    }

    const shown = useMemo(() => {
        if (!search.trim()) return messages
        const q = search.toLowerCase()
        return messages.filter((m) => String(views[m.message_id]?.text || '').toLowerCase().includes(q) || (views[m.message_id]?.files || []).some((f) => String(f.name).toLowerCase().includes(q)))
    }, [messages, views, search])

    const typingNames = Object.values(typing).map((t) => t.name)

    return (
        <div className="d-flex flex-column h-100" data-testid="chat-window">
            <div className="d-flex align-items-center justify-content-between px-4 py-3 border-bottom bg-white">
                <div>
                    <h6 className="mb-0" data-testid="chat-title">{nameOf(chat, meId)}</h6>
                    <div className="fs-11 text-muted d-flex align-items-center gap-2">
                        <span className="text-success d-flex align-items-center gap-1" data-testid="e2ee-badge"><FiLock size={11} /> End-to-end encrypted</span>
                        {chat.chat_type !== 'direct' && <span>· {(chat.participants || []).length} people</span>}
                        {chat.chat_type === 'direct' && othersOf(chat, meId)[0]?.online && <span className="text-success">· online</span>}
                    </div>
                </div>
                <div className="d-flex gap-2">
                    <button type="button" className="btn btn-sm btn-light" title="Search this chat" onClick={() => setShowSearch((v) => !v)}><FiSearch /></button>
                    {me.user_type !== 'client' && <button type="button" className="btn btn-sm btn-light" title="Create a task from this chat" onClick={() => setTaskOpen(true)}><FiClipboard /></button>}
                    {onShowInfo && <button type="button" className="btn btn-sm btn-light" title="Chat info and security" onClick={onShowInfo}><FiInfo /></button>}
                </div>
            </div>
            {showSearch && (
                <div className="px-4 py-2 border-bottom bg-light">
                    <input className="form-control form-control-sm" placeholder="Search messages in this chat..." value={search} onChange={(e) => setSearch(e.target.value)} data-testid="chat-search" autoFocus />
                    <div className="fs-11 text-muted mt-1">Searches messages decrypted on this device (the server cannot search encrypted messages). Load older messages to search further back.</div>
                </div>
            )}
            {warnings.length > 0 && (
                <div className="px-4 py-2 border-bottom bg-soft-warning fs-12" data-testid="member-warnings">
                    {warnings.map((w) => (
                        <div key={w.user.user_id}>
                            <FiAlertTriangle className="me-1 text-warning" />
                            {w.type === 'no-keys'
                                ? `${w.user.user?.full_name} has not turned on secure chat yet and will not be able to read messages sent before they do.`
                                : `${w.user.user?.full_name}'s security key changed. Check their safety number in the chat info.`}
                        </div>
                    ))}
                </div>
            )}
            <div className="flex-grow-1 overflow-auto px-4 py-3" style={{ minHeight: 300 }}>
                {hasMore && !search && <div className="text-center mb-3"><button type="button" className="btn btn-sm btn-light" onClick={() => load(messages[0]?.message_id)}>Load older messages</button></div>}
                {shown.length === 0 && <p className="text-center text-muted fs-13 mt-5">{search ? 'No matching messages.' : 'No messages yet. Messages here are end-to-end encrypted.'}</p>}
                {shown.map((m) => (
                    <Bubble key={m.message_id} m={m} view={views[m.message_id]} mine={m.sender_id === meId} client={client} seen={lastMineSeen === m.message_id} canModerate={canModerate}
                        onReply={(msg, v) => setReply({ message_id: msg.message_id, preview: `${msg.sender?.full_name || ''}: ${String(v.text || '').slice(0, 80)}` })}
                        onEdit={(msg, v) => { setEditing(msg); setText(v.text); setReply(null) }}
                        onDelete={del} onReact={react} />
                ))}
                {typingNames.length > 0 && <div className="fs-12 text-muted" data-testid="typing">{typingNames.join(', ')} {typingNames.length > 1 ? 'are' : 'is'} typing...</div>}
                <div ref={bottom} />
            </div>
            <form className="border-top bg-white px-4 py-3" onSubmit={send}>
                {(reply || editing) && (
                    <div className="d-flex justify-content-between align-items-center bg-light rounded px-3 py-1 mb-2 fs-12">
                        <span>{editing ? 'Editing message' : `Replying to ${reply.preview}`}</span>
                        <button type="button" className="btn btn-link p-0" onClick={() => { setReply(null); setEditing(null); setText('') }}><FiX /></button>
                    </div>
                )}
                {files.length > 0 && <div className="fs-12 mb-2">{files.map((f) => <span key={f.name} className="badge bg-light text-dark me-1">{f.name} ({fmtSize(f.size)})</span>)}</div>}
                <div className="d-flex gap-2 align-items-end">
                    {!editing && (
                        <>
                            <input ref={fileInput} type="file" multiple className="d-none" onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 10))} data-testid="chat-file-input" />
                            <button type="button" className="btn btn-light" title="Attach files (encrypted)" onClick={() => fileInput.current?.click()}><FiPaperclip /></button>
                        </>
                    )}
                    <textarea className="form-control" rows={1} placeholder="Write an encrypted message..." value={text} onChange={(e) => onType(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} data-testid="chat-input" style={{ resize: 'none' }} />
                    <button className="btn btn-primary" disabled={sending || (!text.trim() && !files.length)} data-testid="chat-send">{sending ? <span className="spinner-border spinner-border-sm" /> : <FiSend />}</button>
                </div>
            </form>
            {taskOpen && (
                <TaskModal show={taskOpen} onClose={() => setTaskOpen(false)} selectedChat={chat} currentUserId={meId} onTaskCreated={() => { setTaskOpen(false); load() }} />
            )}
        </div>
    )
}

export default ChatWindow
