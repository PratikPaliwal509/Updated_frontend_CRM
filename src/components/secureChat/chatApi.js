/** Small helpers shared by the secure chat screens. */
import { api } from '@/utils/authSession'
import { roomIdOf } from '../../e2ee/E2eeClient'

export { api, roomIdOf }

export const nameOf = (chat, meId) => {
    if (!chat) return ''
    if (chat.chat_type === 'direct') {
        const other = (chat.participants || []).find((p) => p.user_id !== meId)
        return other?.user?.full_name || 'Direct chat'
    }
    if (chat.chat_type === 'client') return chat.chat_name || chat.client?.company_name || 'Client chat'
    return chat.chat_name || chat.project?.project_name || 'Group'
}

export const othersOf = (chat, meId) => (chat?.participants || []).filter((p) => p.user_id !== meId)

/** Decrypted-content cache shared by list previews and the open chat (key: message id + edit time). */
const cache = new Map()
export const cacheKey = (m) => `${m.message_id}:${m.edited_at || ''}`

/**
 * Turns an API message into something displayable:
 *  { kind: 'deleted' | 'legacy' | 'task' | 'encrypted' | 'error', text, files, error, shield }
 */
export const readMessage = async (client, chatId, m) => {
    if (m.is_deleted) return { kind: 'deleted', text: 'This message was deleted' }
    if (m.message_type === 'task') return { kind: 'task', text: m.message_text, task: m.task }
    if (!m.ciphertext) return { kind: 'legacy', text: m.message_text || '', files: (m.attachments || []).filter((a) => !a.is_encrypted) }
    const k = cacheKey(m)
    if (cache.has(k)) return cache.get(k)
    try {
        const r = await client.decrypt(roomIdOf(chatId), m)
        const out = { kind: 'encrypted', text: r.content?.body || '', files: r.content?.files || [], replyTo: r.content?.reply_to || null, shield: r.shield, verified: r.verified }
        cache.set(k, out)
        return out
    } catch (err) {
        return { kind: 'error', text: err.message, code: err.code }
    }
}

export const forgetCached = (m) => cache.delete(cacheKey(m))

export const fmtTime = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
export const fmtSize = (b) => (b == null ? '' : b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)
