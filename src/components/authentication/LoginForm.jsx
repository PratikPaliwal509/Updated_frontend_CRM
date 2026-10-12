import React, { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { api, saveSession, landingPath, safeNext } from '@/utils/authSession'
import GoogleSignInButton from './GoogleSignInButton'

const REASONS = {
    SESSION_REVOKED: 'Your session has ended. Please sign in again.',
    ACCOUNT_DISABLED: 'Your account has been deactivated.',
    WORKSPACE_SUSPENDED: 'This workspace is suspended or closed.',
    TOKEN_INVALID: 'Please sign in again.',
}

const LoginForm = ({ registerPath, resetPath }) => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [remember, setRemember] = useState(false)
    const [loading, setLoading] = useState(false)
    const [mfaToken, setMfaToken] = useState(null)
    const [code, setCode] = useState('')
    const [useBackup, setUseBackup] = useState(false)
    const [ssoClientId, setSsoClientId] = useState(null)
    const [params] = useSearchParams()
    const navigate = useNavigate()

    useEffect(() => {
        api('/api/auth/config').then((c) => setSsoClientId(c?.sso?.google_client_id || null)).catch(() => {})
        const reason = params.get('reason')
        if (reason && REASONS[reason]) toast.info(REASONS[reason])
    }, [])

    const finish = async (data) => {
        const me = await saveSession(data)
        toast.success('Login successful!')
        navigate(safeNext(params.get('next')) && me.user.user_type !== 'client' ? safeNext(params.get('next')) : landingPath(me), { replace: true })
    }

    const handleResult = async (data) => {
        if (data.mfa_required) {
            setMfaToken(data.mfa_token)
            setCode('')
            return
        }
        await finish(data)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            await handleResult(await api('/api/auth/login', { method: 'POST', body: { email, password, remember } }))
        } catch (err) {
            toast.error(err.message || 'Invalid credentials')
        } finally {
            setLoading(false)
        }
    }

    const handleMfa = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            const body = useBackup ? { mfa_token: mfaToken, backup_code: code } : { mfa_token: mfaToken, code }
            await finish(await api('/api/auth/mfa/login', { method: 'POST', body }))
        } catch (err) {
            if (err.code === 'MFA_TOKEN_INVALID') setMfaToken(null)
            toast.error(err.message || 'Invalid code')
        } finally {
            setLoading(false)
        }
    }

    const handleGoogle = useCallback(async (credential) => {
        try {
            await handleResult(await api('/api/auth/sso/google', { method: 'POST', body: { credential, remember } }))
        } catch (err) {
            toast.error(err.message || 'Google sign-in failed')
        }
    }, [remember])

    if (mfaToken) {
        return (
            <>
                <h2 className="fs-20 fw-bolder mb-4">Two-factor authentication</h2>
                <p className="fs-12 fw-medium text-muted">
                    {useBackup ? 'Enter one of your backup codes.' : 'Enter the 6-digit code from your authenticator app.'}
                </p>
                <form onSubmit={handleMfa} className="w-100 mt-4 pt-2">
                    <div className="mb-4">
                        <input
                            className="form-control"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder={useBackup ? 'XXXX-XXXX' : '123456'}
                            inputMode={useBackup ? 'text' : 'numeric'}
                            autoComplete="one-time-code"
                            autoFocus
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-lg btn-primary w-100" disabled={loading}>
                        {loading ? 'Verifying...' : 'Verify'}
                    </button>
                </form>
                <div className="mt-4 d-flex justify-content-between">
                    <a href="#" className="fs-12" onClick={(e) => { e.preventDefault(); setUseBackup(!useBackup); setCode('') }}>
                        {useBackup ? 'Use authenticator code' : 'Use a backup code'}
                    </a>
                    <a href="#" className="fs-12 text-muted" onClick={(e) => { e.preventDefault(); setMfaToken(null) }}>Back to sign in</a>
                </div>
            </>
        )
    }

    return (
        <>
            <h2 className="fs-20 fw-bolder mb-4">Login</h2>
            <h4 className="fs-13 fw-bold mb-2">Login to your account</h4>
            <p className="fs-12 fw-medium text-muted">Welcome back. Sign in to continue to your workspace.</p>
            <form onSubmit={handleSubmit} className="w-100 mt-4 pt-2">
                <div className="mb-4">
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="form-control" placeholder="Email" autoComplete="username" required />
                </div>
                <div className="mb-3">
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="form-control" placeholder="Password" autoComplete="current-password" required />
                </div>
                <div className="d-flex align-items-center justify-content-between">
                    <div className="custom-control custom-checkbox">
                        <input type="checkbox" className="custom-control-input" id="rememberMe" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                        <label className="custom-control-label c-pointer" htmlFor="rememberMe">Remember me</label>
                    </div>
                    <Link to={resetPath} className="fs-11 text-primary">Forgot password?</Link>
                </div>
                <div className="mt-5">
                    <button type="submit" className="btn btn-lg btn-primary w-100" disabled={loading}>
                        {loading ? (<><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />Logging in...</>) : 'Login'}
                    </button>
                </div>
            </form>
            {ssoClientId && (
                <div className="w-100 mt-5 text-center mx-auto">
                    <div className="mb-4 border-bottom position-relative"><span className="small py-1 px-3 text-uppercase text-muted bg-white position-absolute translate-middle">or</span></div>
                    <GoogleSignInButton clientId={ssoClientId} onCredential={handleGoogle} />
                </div>
            )}
            <div className="mt-5 text-muted">
                <span> Don't have an account?</span>
                <Link to={registerPath} className="fw-bold"> Create an Account</Link>
            </div>
        </>
    )
}

export default LoginForm
