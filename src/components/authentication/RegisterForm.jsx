import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { api, saveSession, PASSWORD_HINT, passwordProblem } from '@/utils/authSession'

/** Creates a NEW workspace and its owner account (POST /api/auth/signup). */
const RegisterForm = ({ path }) => {
    const [form, setForm] = useState({ agency_name: '', first_name: '', last_name: '', email: '', password: '', confirm: '', terms: false })
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()
    const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

    const submit = async (e) => {
        e.preventDefault()
        const pw = passwordProblem(form.password)
        if (pw) return toast.error(pw)
        if (form.password !== form.confirm) return toast.error('Passwords do not match')
        setLoading(true)
        try {
            const data = await api('/api/auth/signup', {
                method: 'POST',
                body: { agency_name: form.agency_name, first_name: form.first_name, last_name: form.last_name, email: form.email, password: form.password },
            })
            await saveSession(data)
            toast.success('Workspace created! Check your inbox to verify your email.')
            navigate('/onboarding', { replace: true })
        } catch (err) {
            toast.error(err.message || 'Could not create your account')
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <h2 className="fs-20 fw-bolder mb-4">Create your workspace</h2>
            <p className="fs-12 fw-medium text-muted">Set up your company workspace. You can invite your team in the next step.</p>
            <form onSubmit={submit} className="w-100 mt-4 pt-2">
                <div className="mb-4">
                    <input className="form-control" placeholder="Company / workspace name" value={form.agency_name} onChange={set('agency_name')} required maxLength={255} />
                </div>
                <div className="row">
                    <div className="col-6 mb-4">
                        <input className="form-control" placeholder="First name" value={form.first_name} onChange={set('first_name')} required maxLength={100} />
                    </div>
                    <div className="col-6 mb-4">
                        <input className="form-control" placeholder="Last name" value={form.last_name} onChange={set('last_name')} required maxLength={100} />
                    </div>
                </div>
                <div className="mb-4">
                    <input type="email" className="form-control" placeholder="Work email" value={form.email} onChange={set('email')} autoComplete="username" required />
                </div>
                <div className="mb-2">
                    <input type="password" className="form-control" placeholder="Password" value={form.password} onChange={set('password')} autoComplete="new-password" required />
                </div>
                <div className="fs-11 text-muted mb-4">{PASSWORD_HINT}</div>
                <div className="mb-4">
                    <input type="password" className="form-control" placeholder="Confirm password" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" required />
                </div>
                <div className="custom-control custom-checkbox">
                    <input type="checkbox" className="custom-control-input" id="termsCondition" checked={form.terms} onChange={set('terms')} required />
                    <label className="custom-control-label c-pointer text-muted" htmlFor="termsCondition">I agree to the Terms &amp; Conditions.</label>
                </div>
                <div className="mt-5">
                    <button type="submit" className="btn btn-lg btn-primary w-100" disabled={loading}>{loading ? 'Creating...' : 'Create Account'}</button>
                </div>
            </form>
            <div className="mt-5 text-muted">
                <span>Already have an account?</span>
                <Link to={path} className="fw-bold"> Login</Link>
            </div>
        </>
    )
}

export default RegisterForm
