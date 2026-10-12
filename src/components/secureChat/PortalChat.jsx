import React, { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { toast } from 'react-toastify'
import { SOCKET_URL } from '../../config/api'
import useE2ee from './useE2ee'
import SecuritySetup from './SecuritySetup'
import DeviceApproval from './DeviceApproval'
import ChatWindow from './ChatWindow'
import ChatInfo from './ChatInfo'
import { api } from './chatApi'

/** Client portal: the client's end-to-end encrypted conversation with the agency team. */
const PortalChat = ({ me }) => {
    const e2ee = useE2ee(me?.user_id)
    const [chat, setChat] = useState(null)
    const [socket, setSocket] = useState(null)
    const [info, setInfo] = useState(false)

    const load = () => api('/api/portal/chat').then(setChat).catch((e) => toast.error(e.message))

    useEffect(() => {
        if (e2ee.phase !== 'ready') return undefined
        load()
        const s = io(SOCKET_URL, { auth: { token: localStorage.getItem('token') }, transports: ['websocket'] })
        s.on('e2ee:sync', () => e2ee.client.sync().catch(() => {}))
        s.on('e2ee:devices-changed', () => e2ee.client.sync().catch(() => {}))
        s.on('chat:members-changed', async ({ chat_id }) => { await e2ee.client.rotateRoom(`!c${chat_id}:techleela`).catch(() => {}); load() })
        s.on('connect', () => e2ee.client.sync().catch(() => {}))
        setSocket(s)
        return () => s.disconnect()
    }, [e2ee.phase]) // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="card mt-4" data-testid="portal-chat">
            <div className="card-header"><h6 className="mb-0">Message your team</h6></div>
            {e2ee.phase !== 'ready' ? <SecuritySetup e2ee={e2ee} /> : !chat ? <p className="text-muted p-3 mb-0">Loading...</p> : (
                <div className="d-flex" style={{ height: 520 }}>
                    <DeviceApproval client={e2ee.client} />
                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                        <ChatWindow client={e2ee.client} me={me} chat={chat} socket={socket} onShowInfo={() => setInfo((v) => !v)} />
                    </div>
                    {info && <ChatInfo client={e2ee.client} me={me} chat={chat} onClose={() => setInfo(false)} onChanged={load} />}
                </div>
            )}
        </div>
    )
}

export default PortalChat
