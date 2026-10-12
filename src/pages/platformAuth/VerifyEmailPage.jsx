import React, { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import AuthCoverLayout from '@/components/authentication/AuthCoverLayout'
import { api, loadMe } from '@/utils/authSession'

/** /authentication/verify-email?token=... confirms the address; without a token it offers to resend. */
const VerifyEmailPage = () => {
    const [params] = useSearchParams()
    const token = params.get('token')
    const [state, setState] = useState(token ? 'verifying' : 'idle')
    const [message, setMessage] = useState('')
    const ran = useRef(false)
    const signedIn = !!localStorage.getItem('token')

    useEffect(() => {
        if (!token || ran.current) return
        ran.current = true
        api('/api/auth/verify-email', { method: 'POST', body: { token } })
            .then(() => { setState('done'); if (signedIn) loadMe(true).catch(() => {}) })
            .catch((err) => { setState('error'); setMessage(err.message) })
    }, [token])

    const resend = async () => {
        try {
            const r = await api('/api/auth/resend-verification', { method: 'POST' })
            toast.success(r && r.already_verified ? 'Your email is already verified.' : 'Verification email sent.')
        } catch (err) {
            toast.error(err.message)
        }
    }

    return (
        <AuthCoverLayout>
            <h2 className="fs-20 fw-bolder mb-4">Verify your email</h2>
            {state === 'verifying' && <p className="text-muted">Verifying...</p>}
            {state === 'done' && <div className="alert alert-success fs-12">Your email address is verified. Thank you!</div>}
            {state === 'error' && <div className="alert alert-danger fs-12">{message}</div>}
            {(state === 'idle' || state === 'error') && (
                <>
                    <p className="fs-12 text-muted">We sent a verification link to your email address. Click it to confirm your account.</p>
                    {signedIn && <button className="btn btn-primary" onClick={resend}>Resend verification email</button>}
                </>
            )}
            <div className="mt-5">
                <Link to={signedIn ? '/' : '/authentication/login'} className="fw-bold">{signedIn ? 'Go to dashboard' : 'Go to login'}</Link>
            </div>
        </AuthCoverLayout>
    )
}

export default VerifyEmailPage
