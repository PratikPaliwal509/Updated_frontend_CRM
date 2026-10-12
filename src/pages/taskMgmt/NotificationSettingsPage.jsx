import React, { useEffect, useState } from 'react'
import PerfectScrollbar from 'react-perfect-scrollbar'
import { toast } from 'react-toastify'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import { api } from '@/utils/authSession'

/** Account > Notifications: choose which notifications appear in the app and which are emailed. */
const NotificationSettingsPage = () => {
    const [prefs, setPrefs] = useState(null)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        api('/api/notification/preferences').then(setPrefs).catch((e) => toast.error(e.message))
    }, [])

    const toggle = (field, key) => {
        const list = new Set(prefs[field])
        if (list.has(key)) list.delete(key); else list.add(key)
        setPrefs({ ...prefs, [field]: [...list] })
    }
    const save = async () => {
        setSaving(true)
        try {
            setPrefs(await api('/api/notification/preferences', { method: 'PUT', body: { email_enabled: prefs.email_enabled, muted_email_categories: prefs.muted_email_categories, muted_in_app_categories: prefs.muted_in_app_categories } }))
            toast.success('Notification settings saved')
        } catch (e) { toast.error(e.message) } finally { setSaving(false) }
    }

    return (
        <>
            <PageHeader />
            <div className="main-content">
                <div className="row">
                    <div className="col-xl-8">
                        <div className="card stretch stretch-full">
                            <div className="card-header"><h5 className="card-title mb-0">Notifications</h5></div>
                            <div className="card-body">
                                {!prefs ? <p className="text-muted">Loading...</p> : (<>
                                    <div className="form-check form-switch mb-4">
                                        <input className="form-check-input" type="checkbox" id="emailEnabled" checked={prefs.email_enabled} onChange={(e) => setPrefs({ ...prefs, email_enabled: e.target.checked })} />
                                        <label className="form-check-label fw-semibold" htmlFor="emailEnabled">Send me notification emails</label>
                                        <div className="fs-12 text-muted">Account emails (password reset, security alerts, invitations) are always sent.</div>
                                    </div>
                                    <table className="table align-middle" data-testid="notification-prefs">
                                        <thead><tr><th>Notify me about</th><th className="text-center">In the app</th><th className="text-center">By email</th></tr></thead>
                                        <tbody>
                                            {prefs.categories.map((c) => (
                                                <tr key={c.key}>
                                                    <td>{c.label}</td>
                                                    <td className="text-center"><input type="checkbox" className="form-check-input" aria-label={`${c.label} in the app`} checked={!prefs.muted_in_app_categories.includes(c.key)} onChange={() => toggle('muted_in_app_categories', c.key)} /></td>
                                                    <td className="text-center"><input type="checkbox" className="form-check-input" aria-label={`${c.label} by email`} disabled={!prefs.email_enabled} checked={prefs.email_enabled && !prefs.muted_email_categories.includes(c.key)} onChange={() => toggle('muted_email_categories', c.key)} /></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save settings'}</button>
                                </>)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    )
}

export default NotificationSettingsPage
