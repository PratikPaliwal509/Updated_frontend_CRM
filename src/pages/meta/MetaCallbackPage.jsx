import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { api } from '@/utils/authSession'

/**
 * Facebook sends the browser here after "Connect Facebook" (META_REDIRECT_URI):
 * ?code&state on success, ?error&error_description when the person cancelled.
 * The code is exchanged on the server; this page never sees a token.
 */
const MetaCallbackPage = () => {
    const [params] = useSearchParams()
    const navigate = useNavigate()
    const [message, setMessage] = useState('Finishing the Facebook connection...')
    const done = useRef(false)

    useEffect(() => {
        if (done.current) return
        done.current = true
        const code = params.get('code')
        const state = params.get('state')
        const error = params.get('error_description') || params.get('error')
        if (error || !code) {
            toast.error(error ? `Facebook: ${error}` : 'Facebook did not return an authorization code')
            navigate('/settings/integrations', { replace: true })
            return
        }
        api('/api/integrations/meta/callback', { method: 'POST', body: { code, state } })
            .then((r) => {
                const ads = r.ad_accounts || 0
                toast.success(`Facebook connected - ${r.pages} Page${r.pages === 1 ? '' : 's'}${ads ? ` and ${ads} ad account${ads === 1 ? '' : 's'}` : ''} found`)
                if (r.declined_scopes?.length) toast.warn(`You declined: ${r.declined_scopes.join(', ')}. Related features will not work until you re-request them in Settings → Integrations.`, { autoClose: 12000 })
                else if (r.missing_scopes?.length) toast.warn(`Some permissions were not granted: ${r.missing_scopes.join(', ')}. Related features will not work until you reconnect and allow them.`, { autoClose: 12000 })
                // next step: choose the Pages / ad accounts this workspace uses
                const selection = r.selection_required ? { connection_id: r.connection_id, pages: r.discovered?.pages || [], ad_accounts: r.discovered?.ad_accounts || [] } : null
                navigate('/settings/integrations', { replace: true, state: selection ? { selection } : null })
            })
            .catch((e) => {
                setMessage(e.message)
                toast.error(e.message)
                setTimeout(() => navigate('/settings/integrations', { replace: true }), 2500)
            })
    }, [params, navigate])

    return (
        <div className="content-area">
            <div className="content-area-body d-flex align-items-center justify-content-center" style={{ minHeight: 300 }}>
                <div className="text-center">
                    <div className="spinner-border text-primary mb-3" role="status" />
                    <p className="mb-0" data-testid="meta-callback-message">{message}</p>
                </div>
            </div>
        </div>
    )
}

export default MetaCallbackPage
