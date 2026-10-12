import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import AuthCoverLayout from '@/components/authentication/AuthCoverLayout'
import { api, saveSession, landingPath, PASSWORD_HINT, passwordProblem } from '@/utils/authSession'

const AcceptInvitePage = () => {
    const [params] = useSearchParams()
    const token = params.get('token') || ''
    const [invite, setInvite] = useState(null)
    const [error, setError] = useState('')
    const [form, setForm] = useState({ first_name: '', last_name: '', password: '', confirm: '' })
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()
    const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

    useEffect(() => {
        if (!token) return setError('This invitation link is incomplete.')
        api(`/api/invitations/lookup?token=${encodeURIComponent(token)}`).then(setInvite).catch((err) => setError(err.message))
    }, [token])

    const submit = async (e) => {
        e.preventDefault()
        const pw = passwordProblem(form.password)
        if (pw) return toast.error(pw)
        if (form.password !== form.confirm) return toast.error('Passwords do not match')
        setLoading(true)
        try {
            const data = await api('/api/invitations/accept', { method: 'POST', body: { token, first_name: form.first_name, last_name: form.last_name, password: form.password } })
            const me = await saveSession(data)
            toast.success(`Welcome to ${invite.agency_name}!`)
            navigate(landingPath(me), { replace: true })
        } catch (err) {
            toast.error(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <AuthCoverLayout image="/images/auth/auth-cover-register-bg.svg">
            <h2 className="fs-20 fw-bolder mb-4">Join your team</h2>
            {error && <div className="alert alert-danger fs-12">{error}</div>}
            {!error && !invite && <p className="text-muted">Loading invitation...</p>}
            {invite && (
                <>
                    <p className="fs-12 text-muted">
                        You were invited to <strong>{invite.agency_name}</strong>
                        {invite.is_client ? <> client portal{invite.client_name ? ` (${invite.client_name})` : ''}</> : <> as <strong>{invite.role_name}</strong></>}.
                        Your account email will be <strong>{invite.email}</strong>.
                    </p>
                    <form onSubmit={submit} className="w-100 mt-4 pt-2">
                        <div className="row">
                            <div className="col-6 mb-4"><input className="form-control" placeholder="First name" value={form.first_name} onChange={set('first_name')} required /></div>
                            <div className="col-6 mb-4"><input className="form-control" placeholder="Last name" value={form.last_name} onChange={set('last_name')} required /></div>
                        </div>
                        <div className="mb-2"><input type="password" className="form-control" placeholder="Password" value={form.password} onChange={set('password')} autoComplete="new-password" required /></div>
                        <div className="fs-11 text-muted mb-4">{PASSWORD_HINT}</div>
                        <div className="mb-4"><input type="password" className="form-control" placeholder="Confirm password" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" required /></div>
                        <button type="submit" className="btn btn-lg btn-primary w-100" disabled={loading}>{loading ? 'Joining...' : 'Accept invitation'}</button>
                    </form>
                </>
            )}
            <div className="mt-5 text-muted"><Link to="/authentication/login" className="fw-bold">Already have an account? Login</Link></div>
        </AuthCoverLayout>
    )
}

export default AcceptInvitePage
