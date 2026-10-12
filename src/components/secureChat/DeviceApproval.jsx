import React, { useEffect, useState } from 'react'
import { FiSmartphone } from 'react-icons/fi'
import { toast } from 'react-toastify'
import { EmojiCompare } from './SecuritySetup'

/**
 * On a trusted device: when another browser of the same account asks to be approved,
 * show a prompt, then the emoji comparison. Approving shares the account secrets with it.
 */
const DeviceApproval = ({ client }) => {
    const [request, setRequest] = useState(null)
    const [sas, setSas] = useState(null)
    const [busy, setBusy] = useState(false)
    const [, rerender] = useState(0) // the engine's request / SAS objects change state without React knowing

    useEffect(() => {
        if (!client) return undefined
        const check = async () => {
            try {
                if (!request) {
                    const [r] = client.incomingSelfRequests()
                    if (r) setRequest(r)
                    return
                }
                if (request.isCancelled() || request.isDone()) {
                    if (request.isDone()) toast.success('New device approved')
                    setRequest(null); setSas(null)
                    return
                }
                const s = client.sasOf(request)
                if (s && !sas) {
                    if (!s.hasBeenAccepted() && !s.weStarted()) await client.acceptSas(s)
                    setSas(s)
                }
                rerender((n) => n + 1)
            } catch (e) { /* ignore and retry */ }
        }
        const off = client.on((type) => { if (type === 'to-device') check() })
        const t = setInterval(() => { client.sync().then(check).catch(() => {}) }, request ? 1500 : 15000)
        check()
        return () => { off(); clearInterval(t) }
    }, [client, request, sas])

    if (!request) return null
    const name = request.otherDeviceId ? request.otherDeviceId.toString() : 'a new device'
    const run = async (fn) => { setBusy(true); try { await fn() } catch (e) { toast.error(e.message) } finally { setBusy(false) } }

    return (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ background: 'rgba(0,0,0,.45)', zIndex: 2000 }} data-testid="device-approval">
            <div className="card card-body" style={{ maxWidth: 520 }}>
                <h5 className="d-flex align-items-center gap-2"><FiSmartphone /> Approve a new device?</h5>
                {!sas || !sas.emoji?.() ? (
                    <>
                        <p className="fs-13">A browser ({name}) signed in to your account and wants to read your encrypted messages. Only approve it if it is yours.</p>
                        <div className="d-flex gap-2">
                            <button type="button" className="btn btn-primary" disabled={busy || request.isReady()} onClick={() => run(() => client.acceptRequest(request))}>{request.isReady() ? 'Waiting for the other device...' : 'It’s me - continue'}</button>
                            <button type="button" className="btn btn-light" disabled={busy} onClick={() => run(async () => { await client.cancelVerification(request); setRequest(null) })}>Decline</button>
                        </div>
                    </>
                ) : (
                    <EmojiCompare sas={sas} busy={busy}
                        onConfirm={() => run(async () => { await client.confirmSas(sas); toast.info('Confirmed - finishing on the new device') })}
                        onCancel={() => run(async () => { await client.cancelVerification(sas); setRequest(null); setSas(null) })} />
                )}
            </div>
        </div>
    )
}

export default DeviceApproval
