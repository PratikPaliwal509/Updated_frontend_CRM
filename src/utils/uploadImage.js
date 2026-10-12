import { api } from '@/utils/authSession'

/**
 * Upload a profile photo / client logo / workspace logo with a server-signed request
 * (replaces the open Cloudinary upload preset). Returns the image URL to save.
 * purpose: 'avatar' | 'client_logo' | 'workspace_logo'
 */
export const uploadImage = async (file, purpose) => {
    if (!file) throw new Error('Choose an image first')
    const sig = await api('/api/media/image-signature', { method: 'POST', body: { purpose } })
    const ext = (file.name.split('.').pop() || '').toLowerCase()
    if (!sig.allowed_formats.includes(ext)) throw new Error(`Use a ${sig.allowed_formats.join(', ')} image`)
    if (file.size > sig.max_bytes) throw new Error(`Images can be at most ${Math.round(sig.max_bytes / 1048576)} MB`)
    const form = new FormData()
    Object.entries(sig.params).forEach(([k, v]) => form.append(k, v))
    form.append('file', file)
    const res = await fetch(sig.upload_url, { method: 'POST', body: form })
    const up = await res.json().catch(() => ({}))
    if (!res.ok || !up.secure_url) throw new Error(up.error?.message || 'Image upload failed')
    return up.secure_url
}

export default uploadImage
