import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import { api, loadMe, logout, PASSWORD_HINT, passwordProblem } from '@/utils/authSession'

const fmt = (d) => (d ? new Date(d).toLocaleString() : '-')
const device = (ua) => {
    if (!ua) return 'Unknown device'
    const b = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser'
    const os = /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'macOS' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Linux/.test(ua) ? 'Linux' : ''
    return `${b}${os ? ` on ${os}` : ''}`
}

/** Account → Security: email verification, password, two-factor auth, active sessions. */
const AccountSecurityPage = () => {
    const [me, setMe] = useState(null)
    const [sessions, setSessions] = useState([])
    const [pw, setPw] = useState({ current_password: '', new_password: '', confirm: '' })
    const [mfaSetup, setMfaSetup] = useState(null)
    const [mfaCode, setMfaCode] = useState('')
    const [backupCodes, setBackupCodes] = useState(null)
    const [disable, setDisable] = useState({ password: '', code: '' })
    const [busy, setBusy] = useState(false)
    const [params] = useSearchParams()
    const navigate = useNavigate()

    const refresh = async () => {
        try {
            setMe(await loadMe(true))
            setSessions(await api('/api/auth/sessions'))
        } catch (err) {
            toast.error(err.message)
        }
    }
    useEffect(() => {
        refresh()
        if (params.get('setup') === 'mfa') toast.info('Your workspace requires two-factor authentication. Set it up below to continue.')
    }, [])

    const run = async (fn) => {
        setBusy(true)
        try { await fn() } catch (err) { toast.error(err.message) } finally { setBusy(false) }
    }

    const changePassword = (e) => {
        e.preventDefault()
        const p = passwordProblem(pw.new_password)
        if (p) return toast.error(p)
        if (pw.new_password !== pw.confirm) return toast.error('Passwords do not match')
        run(async () => {
            await api('/api/auth/change-password', { method: 'POST', body: { current_password: pw.current_password, new_password: pw.new_password } })
            toast.success('Password changed. Other devices were signed out.')
            setPw({ current_password: '', new_password: '', confirm: '' })
            setSessions(await api('/api/auth/sessions'))
        })
    }

    const startMfa = () => run(async () => setMfaSetup(await api('/api/auth/mfa/setup', { method: 'POST' })))
    const enableMfa = (e) => {
        e.preventDefault()
        run(async () => {
            const r = await api('/api/auth/mfa/enable', { method: 'POST', body: { code: mfaCode } })
            setBackupCodes(r.backup_codes)
            setMfaSetup(null)
            setMfaCode('')
            toast.success('Two-factor authentication is on')
            await refresh()
        })
    }
    const disableMfa = (e) => {
        e.preventDefault()
        run(async () => {
            await api('/api/auth/mfa/disable', { method: 'POST', body: disable })
            setDisable({ password: '', code: '' })
            toast.success('Two-factor authentication turned off')
            await refresh()
        })
    }
    const regenerate = () => {
        const code = window.prompt('Enter a current 6-digit code from your authenticator app')
        if (!code) return
        run(async () => setBackupCodes((await api('/api/auth/mfa/backup-codes', { method: 'POST', body: { code } })).backup_codes))
    }
    const revoke = (id) => run(async () => {
        await api(`/api/auth/sessions/${id}`, { method: 'DELETE' })
        setSessions(await api('/api/auth/sessions'))
    })
    const signOutEverywhere = () => run(async () => {
        if (!window.confirm('Sign out of every device, including this one?')) return
        await api('/api/auth/logout-all', { method: 'POST' })
        await logout()
        navigate('/authentication/login', { replace: true })
    })
    const resend = () => run(async () => {
        await api('/api/auth/resend-verification', { method: 'POST' })
        toast.success('Verification email sent')
    })

    const user = me?.user
    return (
        <>
            <PageHeader />
            <div className="main-content">
                <div className="row">
                    <div className="col-lg-6">
                        {user && !user.is_verified && (
                            <div className="alert alert-warning d-flex justify-content-between align-items-center">
                                <span>Your email address is not verified yet.</span>
                                <button className="btn btn-sm btn-warning" onClick={resend} disabled={busy}>Resend email</button>
                            </div>
                        )}
                        <div className="card stretch">
                            <div className="card-header"><h5 className="card-title mb-0">Change password</h5></div>
                            <div className="card-body">
                                <form onSubmit={changePassword}>
                                    <div className="mb-3"><label className="form-label">Current password</label>
                                        <input type="password" className="form-control" value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} autoComplete="current-password" required /></div>
                                    <div className="mb-1"><label className="form-label">New password</label>
                                        <input type="password" className="form-control" value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} autoComplete="new-password" required /></div>
                                    <div className="fs-11 text-muted mb-3">{PASSWORD_HINT}</div>
                                    <div className="mb-3"><label className="form-label">Confirm new password</label>
                                        <input type="password" className="form-control" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} autoComplete="new-password" required /></div>
                                    <button className="btn btn-primary" disabled={busy}>Update password</button>
                                </form>
                            </div>
                        </div>
                    </div>

                    <div className="col-lg-6">
                        <div className="card stretch">
                            <div className="card-header d-flex justify-content-between align-items-center">
                                <h5 className="card-title mb-0">Two-factor authentication</h5>
                                {user && <span className={`badge ${user.two_factor_enabled ? 'bg-soft-success text-success' : 'bg-soft-warning text-warning'}`}>{user.two_factor_enabled ? 'On' : 'Off'}</span>}
                            </div>
                            <div className="card-body">
                                {backupCodes && (
                                    <div className="alert alert-info">
                                        <div className="fw-semibold mb-2">Save these backup codes now - each works once and they will not be shown again.</div>
                                        <div className="row">{backupCodes.map((c) => <div className="col-6 font-monospace" key={c}>{c}</div>)}</div>
                                        <button className="btn btn-sm btn-light mt-2" onClick={() => { navigator.clipboard?.writeText(backupCodes.join('\n')); toast.success('Copied') }}>Copy</button>
                                    </div>
                                )}
                                {user && !user.two_factor_enabled && !mfaSetup && (
                                    <>
                                        <p className="text-muted fs-12">Protect your account with a 6-digit code from an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password...).</p>
                                        <button className="btn btn-primary" onClick={startMfa} disabled={busy}>Set up two-factor authentication</button>
                                    </>
                                )}
                                {mfaSetup && (
                                    <form onSubmit={enableMfa}>
                                        <p className="fs-12">1. Scan this QR code with your authenticator app.</p>
                                        {mfaSetup.qr_data_url && <img src={mfaSetup.qr_data_url} alt="QR code" width={180} height={180} className="mb-2" />}
                                        <p className="fs-11 text-muted">Can't scan? Enter this key manually: <span className="font-monospace">{mfaSetup.secret}</span></p>
                                        <p className="fs-12">2. Enter the 6-digit code it shows.</p>
                                        <div className="d-flex gap-2">
                                            <input className="form-control" style={{ maxWidth: 160 }} value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} inputMode="numeric" placeholder="123456" required />
                                            <button className="btn btn-primary" disabled={busy}>Turn on</button>
                                        </div>
                                    </form>
                                )}
                                {user && user.two_factor_enabled && (
                                    <>
                                        <button className="btn btn-light mb-4" onClick={regenerate} disabled={busy}>Generate new backup codes</button>
                                        {me?.workspace?.mfa_required ? (
                                            <p className="fs-12 text-muted mb-0">Your workspace requires two-factor authentication, so it cannot be turned off.</p>
                                        ) : (
                                            <form onSubmit={disableMfa}>
                                                <div className="fs-12 fw-semibold mb-2">Turn off two-factor authentication</div>
                                                <div className="d-flex gap-2 flex-wrap">
                                                    <input type="password" className="form-control" style={{ maxWidth: 200 }} placeholder="Password" value={disable.password} onChange={(e) => setDisable({ ...disable, password: e.target.value })} required />
                                                    <input className="form-control" style={{ maxWidth: 140 }} placeholder="Code" value={disable.code} onChange={(e) => setDisable({ ...disable, code: e.target.value })} required />
                                                    <button className="btn btn-outline-danger" disabled={busy}>Turn off</button>
                                                </div>
                                            </form>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="col-12">
                        <div className="card stretch">
                            <div className="card-header d-flex justify-content-between align-items-center">
                                <h5 className="card-title mb-0">Where you're signed in</h5>
                                <button className="btn btn-sm btn-outline-danger" onClick={signOutEverywhere} disabled={busy}>Sign out everywhere</button>
                            </div>
                            <div className="card-body p-0">
                                <table className="table mb-0">
                                    <thead><tr><th>Device</th><th>IP address</th><th>Signed in</th><th>Last active</th><th /></tr></thead>
                                    <tbody>
                                        {sessions.length === 0 && <tr><td colSpan={5} className="text-muted">No active sessions.</td></tr>}
                                        {sessions.map((s) => (
                                            <tr key={s.session_id}>
                                                <td>{device(s.user_agent)} {s.current && <span className="badge bg-soft-primary text-primary ms-2">This device</span>}</td>
                                                <td>{s.ip_address || '-'}</td>
                                                <td>{fmt(s.created_at)}</td>
                                                <td>{fmt(s.last_used_at)}</td>
                                                <td className="text-end">{!s.current && <button className="btn btn-sm btn-light" onClick={() => revoke(s.session_id)} disabled={busy}>Sign out</button>}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    )
}

export default AccountSecurityPage
