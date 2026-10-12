import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '@/utils/authSession'

const LABELS = { assignments: 'task assignments', mentions: '@mentions', comments: 'comments', reminders: 'reminders', approvals: 'client approvals', updates: 'task updates', admin_copies: 'team activity copies' }

/** Public page behind the unsubscribe link in notification emails (no sign-in needed). */
const UnsubscribePage = () => {
    const [params] = useSearchParams()
    const [state, setState] = useState({ loading: true })
    const token = params.get('token')
    const category = params.get('category')

    useEffect(() => {
        if (!token) return setState({ error: 'This unsubscribe link is incomplete.' })
        api('/api/notification/unsubscribe', { method: 'POST', body: { token, category } })
            .then((r) => setState({ done: true, category: r?.category }))
            .catch((e) => setState({ error: e.message }))
    }, [token, category])

    return (
        <div className="container py-5" style={{ maxWidth: 560 }}>
            <div className="card card-body text-center">
                <h4 className="mb-3">Email notifications</h4>
                {state.loading && <p className="text-muted">Updating your settings...</p>}
                {state.done && <p>{state.category ? `You will no longer get emails about ${LABELS[state.category] || state.category}.` : 'You will no longer get notification emails.'}</p>}
                {state.error && <p className="text-danger">{state.error}</p>}
                <p className="fs-12 text-muted mb-0">You can change this at any time in <Link to="/account/notifications">Account &gt; Notifications</Link>.</p>
            </div>
        </div>
    )
}

export default UnsubscribePage
