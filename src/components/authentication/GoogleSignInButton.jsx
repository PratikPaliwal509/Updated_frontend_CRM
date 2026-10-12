import React, { useEffect, useRef } from 'react'

/**
 * Google Identity Services button. Rendered only when the backend reports a
 * GOOGLE_SSO_CLIENT_ID (GET /api/auth/config). Calls onCredential(idToken).
 */
const GoogleSignInButton = ({ clientId, onCredential }) => {
    const ref = useRef(null)

    useEffect(() => {
        if (!clientId) return
        const init = () => {
            if (!window.google || !window.google.accounts || !ref.current) return
            window.google.accounts.id.initialize({ client_id: clientId, callback: (r) => onCredential(r.credential) })
            window.google.accounts.id.renderButton(ref.current, { theme: 'outline', size: 'large', width: 320, text: 'signin_with' })
        }
        if (window.google && window.google.accounts) return init()
        const s = document.createElement('script')
        s.src = 'https://accounts.google.com/gsi/client'
        s.async = true
        s.onload = init
        document.body.appendChild(s)
    }, [clientId, onCredential])

    if (!clientId) return null
    return <div ref={ref} className="d-flex justify-content-center" />
}

export default GoogleSignInButton
