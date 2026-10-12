import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import AuthCoverLayout from '@/components/authentication/AuthCoverLayout'
import { api, PASSWORD_HINT, passwordProblem } from '@/utils/authSession'

const ResetPasswordPage = () => {
    const [params] = useSearchParams()
    const token = params.get('token') || ''
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const navigate = useNavigate()

    const submit = async (e) => {
        e.preventDefault()
        const pw = passwordProblem(password)
        if (pw) return setError(pw)
        if (password !== confirm) return setError('Passwords do not match')
        setLoading(true)
        setError('')
        try {
            await api('/api/auth/reset-password', { method: 'POST', body: { token, password } })
            toast.success('Password updated. Please sign in.')
            navigate('/authentication/login', { replace: true })
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <AuthCoverLayout image="/images/auth/auth-cover-reset-bg.svg">
            <h2 className="fs-20 fw-bolder mb-4">Choose a new password</h2>
            {!token ? (
                <div className="alert alert-warning fs-12">This link is missing its token. Request a new reset link.</div>
            ) : (
                <form onSubmit={submit} className="w-100 mt-4 pt-2">
                    <div className="mb-2">
                        <input type="password" className="form-control" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
                    </div>
                    <div className="fs-11 text-muted mb-4">{PASSWORD_HINT}</div>
                    <div className="mb-4">
                        <input type="password" className="form-control" placeholder="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
                    </div>
                    {error && <div className="text-danger fs-12 mb-3">{error}</div>}
                    <button type="submit" className="btn btn-lg btn-primary w-100" disabled={loading}>{loading ? 'Saving...' : 'Save new password'}</button>
                </form>
            )}
            <div className="mt-5 text-muted">
                <Link to="/authentication/reset/cover" className="fw-bold">Request a new link</Link>
            </div>
        </AuthCoverLayout>
    )
}

export default ResetPasswordPage
