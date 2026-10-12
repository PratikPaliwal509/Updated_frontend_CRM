import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import AuthCoverLayout from '@/components/authentication/AuthCoverLayout'
import { api, loadMe } from '@/utils/authSession'

const TIMEZONES = ['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Asia/Kolkata', 'Asia/Dubai', 'Australia/Sydney']

/** 3-step wizard after signup: company details -> invite team -> done. */
const OnboardingPage = () => {
    const [step, setStep] = useState(1)
    const [ws, setWs] = useState(null)
    const [roles, setRoles] = useState([])
    const [invites, setInvites] = useState([{ email: '', role_id: '' }])
    const [saving, setSaving] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        api('/api/workspace').then(setWs).catch((e) => toast.error(e.message))
        api('/api/roles').then((r) => {
            const list = (r || []).filter((x) => x.role_name !== 'Client')
            setRoles(list)
            const emp = list.find((x) => x.role_name === 'Employee') || list[0]
            if (emp) setInvites([{ email: '', role_id: emp.role_id }])
        }).catch(() => {})
    }, [])

    const saveCompany = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            setWs(await api('/api/workspace', { method: 'PUT', body: { agency_name: ws.agency_name, industry: ws.industry, website: ws.website, phone: ws.phone, country: ws.country, timezone: ws.timezone, currency: ws.currency } }))
            setStep(2)
        } catch (err) {
            toast.error(err.message)
        } finally {
            setSaving(false)
        }
    }

    const sendInvites = async (e) => {
        e.preventDefault()
        setSaving(true)
        let sent = 0
        for (const inv of invites.filter((i) => i.email.trim())) {
            try {
                await api('/api/invitations', { method: 'POST', body: { email: inv.email.trim(), role_id: Number(inv.role_id) } })
                sent++
            } catch (err) {
                toast.error(`${inv.email}: ${err.message}`)
            }
        }
        if (sent) toast.success(`${sent} invitation(s) sent`)
        setSaving(false)
        setStep(3)
    }

    const finish = async () => {
        setSaving(true)
        try {
            await api('/api/workspace/onboarding/complete', { method: 'POST' })
            await loadMe(true)
            navigate('/', { replace: true })
        } catch (err) {
            toast.error(err.message)
            setSaving(false)
        }
    }

    const field = (k) => ({ value: (ws && ws[k]) || '', onChange: (e) => setWs({ ...ws, [k]: e.target.value }) })

    return (
        <AuthCoverLayout image="/images/auth/auth-cover-register-bg.svg">
            <div className="fs-11 text-muted text-uppercase mb-2">Step {step} of 3</div>
            {step === 1 && (
                <>
                    <h2 className="fs-20 fw-bolder mb-4">Your company</h2>
                    {!ws ? <p className="text-muted">Loading...</p> : (
                        <form onSubmit={saveCompany}>
                            <div className="mb-3"><label className="form-label">Workspace name</label><input className="form-control" required {...field('agency_name')} /></div>
                            <div className="mb-3"><label className="form-label">Industry</label><input className="form-control" placeholder="e.g. Marketing agency" {...field('industry')} /></div>
                            <div className="mb-3"><label className="form-label">Website</label><input className="form-control" placeholder="https://" {...field('website')} /></div>
                            <div className="row">
                                <div className="col-6 mb-3"><label className="form-label">Country</label><input className="form-control" {...field('country')} /></div>
                                <div className="col-6 mb-3"><label className="form-label">Phone</label><input className="form-control" {...field('phone')} /></div>
                            </div>
                            <div className="row">
                                <div className="col-7 mb-4"><label className="form-label">Time zone</label>
                                    <select className="form-select" {...field('timezone')}>{TIMEZONES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
                                </div>
                                <div className="col-5 mb-4"><label className="form-label">Currency</label>
                                    <select className="form-select" {...field('currency')}>{['USD', 'INR', 'EUR', 'GBP', 'AUD'].map((c) => <option key={c}>{c}</option>)}</select>
                                </div>
                            </div>
                            <button className="btn btn-primary w-100" disabled={saving}>{saving ? 'Saving...' : 'Continue'}</button>
                        </form>
                    )}
                </>
            )}
            {step === 2 && (
                <>
                    <h2 className="fs-20 fw-bolder mb-2">Invite your team</h2>
                    <p className="fs-12 text-muted mb-4">They will receive an email to join. You can skip this and invite people later from Users → Invitations.</p>
                    <form onSubmit={sendInvites}>
                        {invites.map((inv, i) => (
                            <div className="d-flex gap-2 mb-2" key={i}>
                                <input type="email" className="form-control" placeholder="teammate@company.com" value={inv.email}
                                    onChange={(e) => setInvites(invites.map((x, j) => (j === i ? { ...x, email: e.target.value } : x)))} />
                                <select className="form-select" style={{ maxWidth: 150 }} value={inv.role_id}
                                    onChange={(e) => setInvites(invites.map((x, j) => (j === i ? { ...x, role_id: e.target.value } : x)))}>
                                    {roles.map((r) => <option key={r.role_id} value={r.role_id}>{r.role_name}</option>)}
                                </select>
                            </div>
                        ))}
                        <button type="button" className="btn btn-light btn-sm mb-4" onClick={() => setInvites([...invites, { email: '', role_id: invites[0]?.role_id || '' }])}>+ Add another</button>
                        <div className="d-flex gap-2">
                            <button type="button" className="btn btn-light w-50" onClick={() => setStep(3)}>Skip</button>
                            <button className="btn btn-primary w-50" disabled={saving}>{saving ? 'Sending...' : 'Send invitations'}</button>
                        </div>
                    </form>
                </>
            )}
            {step === 3 && (
                <>
                    <h2 className="fs-20 fw-bolder mb-3">You're all set</h2>
                    <p className="fs-12 text-muted mb-4">Next steps: add your first client, create a project, and turn on two-factor authentication under Account → Security.</p>
                    <button className="btn btn-primary w-100" onClick={finish} disabled={saving}>Go to dashboard</button>
                </>
            )}
        </AuthCoverLayout>
    )
}

export default OnboardingPage
