import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/utils/authSession'

/** "Forgot password" - requests a reset link (POST /api/auth/forgot-password). */
const ResetForm = ({ path }) => {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)
    const [error, setError] = useState('')

    const submit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            await api('/api/auth/forgot-password', { method: 'POST', body: { email } })
            setSent(true)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <h2 className="fs-20 fw-bolder mb-4">Forgot password</h2>
            {sent ? (
                <div className="alert alert-success fs-12">
                    If an account exists for <strong>{email}</strong>, we have sent a link to reset your password. The link is valid for 30 minutes.
                </div>
            ) : (
                <>
                    <p className="fs-12 fw-medium text-muted">Enter your email and we will send you a link to choose a new password.</p>
                    <form onSubmit={submit} className="w-100 mt-4 pt-2">
                        <div className="mb-4">
                            <input type="email" className="form-control" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        </div>
                        {error && <div className="text-danger fs-12 mb-3">{error}</div>}
                        <button type="submit" className="btn btn-lg btn-primary w-100" disabled={loading}>{loading ? 'Sending...' : 'Send reset link'}</button>
                    </form>
                </>
            )}
            <div className="mt-5 text-muted">
                <Link to="/authentication/login" className="fw-bold">Back to login</Link>
                <span className="mx-2">·</span>
                <Link to={path} className="fw-bold">Create an Account</Link>
            </div>
        </>
    )
}

export default ResetForm
