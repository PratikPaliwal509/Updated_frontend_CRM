import { useCallback, useEffect, useState } from 'react'
import { getE2ee } from '../../e2ee/browserE2ee'

/**
 * State of secure chat on this browser:
 *  loading        - starting the crypto engine
 *  needs-identity - first device of this account: create identity + recovery key
 *  new-device     - account has an identity but this browser is not trusted yet
 *  ready          - this browser can send / read encrypted messages
 *  error          - could not start (message in `error`)
 */
export const useE2ee = (userId) => {
  const [client, setClient] = useState(null)
  const [phase, setPhase] = useState('loading')
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!userId) return
    try {
      const c = await getE2ee(userId)
      setClient(c)
      const s = await c.status()
      setStatus(s)
      if (!s.has_identity) setPhase('needs-identity')
      else setPhase((await c.isDeviceTrusted()) ? 'ready' : 'new-device')
    } catch (err) {
      setError(err.message || 'Secure chat could not start in this browser.')
      setPhase('error')
    }
  }, [userId])

  useEffect(() => { refresh() }, [refresh])

  return { client, phase, status, error, refresh, setPhase }
}

export default useE2ee
