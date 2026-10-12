import React, { useEffect, useState } from 'react'
import { FiX, FiShield, FiUserPlus, FiLogOut, FiTrash2, FiKey, FiMonitor, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi'
import { toast } from 'react-toastify'
import { api, nameOf } from './chatApi'
import { RecoveryKeyCard } from './SecuritySetup'
import { removeThisBrowser } from '../../e2ee/browserE2ee'

/** Safety number of one contact, with "mark as verified" and "accept new key". */
const SafetyNumber = ({ client, person, onChanged }) => {
    const [sn, setSn] = useState(null)
    const [open, setOpen] = useState(false)
    const load = async () => setSn(await client.safetyNumber(person.user_id).catch(() => null))
    useEffect(() => { if (open) load() }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
    return (
        <div className="mt-1">
            <button type="button" className="btn btn-link p-0 fs-11" onClick={() => setOpen((v) => !v)} data-testid={`safety-${person.user_id}`}>{open ? 'Hide safety number' : 'Safety number'}</button>
            {open && (
                <div className="border rounded p-2 mt-1 fs-12">
                    {!sn ? <span className="text-muted">{person.user?.full_name} has not turned on secure chat yet.</span> : (
                        <>
                            <div className="font-monospace" data-testid="safety-digits">{sn.digits}</div>
                            <div className="text-muted fs-11 my-1">Compare these numbers with {person.user?.full_name} in person or on a call. If they match, your chat cannot be intercepted.</div>
                            {sn.changed && <div className="text-danger"><FiAlertTriangle className="me-1" />Their security key changed since you last checked.</div>}
                            {sn.verified && !sn.changed ? <span className="text-success" data-testid="verified-badge"><FiCheckCircle className="me-1" />Verified</span> : (
                                <div className="d-flex gap-2 mt-1">
                                    {sn.changed && <button type="button" className="btn btn-sm btn-light" onClick={async () => { await client.acceptIdentityChange(person.user_id); await load(); onChanged?.() }}>Accept new key</button>}
                                    <button type="button" className="btn btn-sm btn-success" onClick={async () => { try { await client.markVerified(person.user_id); await load(); toast.success('Marked as verified'); onChanged?.() } catch (e) { toast.error(e.message) } }}>Numbers match - mark verified</button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    )
}

/** Side panel: members, admin actions, safety numbers, this account's devices and recovery key. */
const ChatInfo = ({ client, me, chat, onClose, onChanged, onLeft }) => {
    const meId = me.user_id
    const myRole = (chat.participants || []).find((p) => p.user_id === meId)?.role
    const isAdmin = myRole === 'admin' && chat.chat_type !== 'direct' && me.user_type !== 'client'
    const [users, setUsers] = useState([])
    const [adding, setAdding] = useState('')
    const [devices, setDevices] = useState([])
    const [newKey, setNewKey] = useState(null)
    const [name, setName] = useState(chat.chat_name || '')

    const loadDevices = () => client.status().then((s) => setDevices(s.devices || [])).catch(() => {})
    useEffect(() => {
        loadDevices()
        if (isAdmin) api('/api/users/user').then((l) => setUsers((l || []).filter((u) => u.user_type !== 'client' && u.is_active !== false))).catch(() => {})
    }, [chat.chat_id]) // eslint-disable-line react-hooks/exhaustive-deps

    const act = async (fn, msg) => { try { await fn(); if (msg) toast.success(msg); onChanged?.() } catch (e) { toast.error(e.message) } }
    const memberIds = (chat.participants || []).map((p) => p.user_id)

    return (
        <div className="border-start bg-white h-100 overflow-auto p-3" style={{ width: 340, flex: '0 0 340px' }} data-testid="chat-info">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="mb-0">{nameOf(chat, meId)}</h6>
                <button type="button" className="btn btn-sm btn-light" onClick={onClose}><FiX /></button>
            </div>
            <div className="alert alert-success fs-12 py-2"><FiShield className="me-1" />Messages and files in this chat are end-to-end encrypted. Task cards, reactions and who talks to whom are not.</div>

            {isAdmin && (
                <div className="mb-3">
                    <label className="form-label fs-12">Chat name</label>
                    <div className="input-group input-group-sm">
                        <input className="form-control" value={name} onChange={(e) => setName(e.target.value)} />
                        <button type="button" className="btn btn-light" onClick={() => act(() => api(`/api/chats/${chat.chat_id}`, { method: 'PUT', body: { chat_name: name } }), 'Renamed')}>Save</button>
                    </div>
                </div>
            )}

            <h6 className="fs-13 mt-3">People ({(chat.participants || []).length})</h6>
            {(chat.participants || []).map((p) => (
                <div key={p.user_id} className="py-2 border-bottom" data-testid="chat-member">
                    <div className="d-flex justify-content-between align-items-center">
                        <span className="fs-13">
                            <span className={`d-inline-block rounded-circle me-2 ${p.online ? 'bg-success' : 'bg-secondary'}`} style={{ width: 8, height: 8 }} title={p.online ? 'Online' : 'Offline'} />
                            {p.user?.full_name}{p.user_id === meId ? ' (you)' : ''}
                            {p.role === 'admin' && <span className="badge bg-soft-primary text-primary ms-1">admin</span>}
                            {p.user?.user_type === 'client' && <span className="badge bg-soft-info text-info ms-1">client</span>}
                        </span>
                        {isAdmin && p.user_id !== meId && (
                            <span className="d-flex gap-1">
                                {p.user?.user_type !== 'client' && <button type="button" className="btn btn-sm btn-link p-0 fs-11" onClick={() => act(() => api(`/api/chats/${chat.chat_id}/participants/${p.user_id}`, { method: 'PATCH', body: { role: p.role === 'admin' ? 'member' : 'admin' } }), 'Role updated')}>{p.role === 'admin' ? 'Make member' : 'Make admin'}</button>}
                                {p.user?.user_type !== 'client' && <button type="button" className="btn btn-sm btn-link p-0 text-danger fs-11" onClick={() => window.confirm(`Remove ${p.user?.full_name}? They will not be able to read new messages.`) && act(async () => { await api(`/api/chats/${chat.chat_id}/participants/${p.user_id}`, { method: 'DELETE' }); await client.rotateRoom(chat.room_id) }, 'Removed')}>Remove</button>}
                            </span>
                        )}
                    </div>
                    {p.user_id !== meId && <SafetyNumber client={client} person={p} onChanged={onChanged} />}
                </div>
            ))}
            {isAdmin && (
                <div className="input-group input-group-sm mt-2">
                    <select className="form-select" value={adding} onChange={(e) => setAdding(e.target.value)} aria-label="Add someone">
                        <option value="">Add someone...</option>
                        {users.filter((u) => !memberIds.includes(u.user_id)).map((u) => <option key={u.user_id} value={u.user_id}>{u.full_name}</option>)}
                    </select>
                    <button type="button" className="btn btn-light" disabled={!adding} onClick={() => act(async () => { await api(`/api/chats/${chat.chat_id}/participants`, { method: 'POST', body: { user_ids: [Number(adding)] } }); setAdding('') }, 'Added')}><FiUserPlus /></button>
                </div>
            )}
            <div className="d-flex gap-2 mt-3">
                {chat.chat_type !== 'direct' && !(me.user_type === 'client') && (
                    <button type="button" className="btn btn-sm btn-light" onClick={() => window.confirm('Leave this chat?') && act(async () => { await api(`/api/chats/${chat.chat_id}/participants/${meId}`, { method: 'DELETE' }); onLeft?.() })}><FiLogOut className="me-1" />Leave</button>
                )}
                {isAdmin && (
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => window.confirm('Delete this chat for everyone?') && act(async () => { await api(`/api/chats/${chat.chat_id}`, { method: 'DELETE' }); onLeft?.() })}><FiTrash2 className="me-1" />Delete chat</button>
                )}
            </div>

            <h6 className="fs-13 mt-4">My secure devices</h6>
            {devices.map((d) => (
                <div key={d.device_id} className="d-flex justify-content-between align-items-center py-1 fs-12" data-testid="my-device">
                    <span><FiMonitor className="me-1" />{d.display_name}{d.device_id === client.deviceId ? ' (this browser)' : ''}<span className="text-muted d-block fs-11">last seen {new Date(d.last_seen_at).toLocaleString()}</span></span>
                    {d.device_id !== client.deviceId && <button type="button" className="btn btn-sm btn-link text-danger p-0" onClick={() => window.confirm(`Remove ${d.display_name}? It will stop receiving your messages.`) && act(async () => { await api(`/api/e2ee/devices/${d.device_id}`, { method: 'DELETE' }); loadDevices() }, 'Device removed')}>Remove</button>}
                </div>
            ))}
            {newKey ? <div className="mt-2"><RecoveryKeyCard title="Your new recovery key" recoveryKey={newKey} onDone={() => setNewKey(null)} /></div> : (
                <div className="d-grid gap-2 mt-2">
                    <button type="button" className="btn btn-sm btn-light" onClick={() => window.confirm('Create a new recovery key? The old one stops working.') && act(async () => setNewKey(await client.rotateRecoveryKey()))}><FiKey className="me-1" />Create a new recovery key</button>
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => window.confirm('Remove secure chat from this browser? You will need your recovery key or another device to read messages here again.') && act(async () => { await removeThisBrowser(meId); window.location.reload() })}>Remove secure chat from this browser</button>
                </div>
            )}
        </div>
    )
}

export default ChatInfo
