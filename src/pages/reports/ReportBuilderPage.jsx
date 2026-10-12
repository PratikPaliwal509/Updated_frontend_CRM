import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { FiPlus, FiTrash2, FiArrowUp, FiArrowDown, FiSave, FiPlay } from 'react-icons/fi'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import { adsApi } from '@/components/meta/adsApi'
import { api } from '@/utils/authSession'

/**
 * Report builder (F-126): client, sections (Meta Ads, Facebook Page, leads, delivered work), period
 * and comparison, branding of the PDF (F-127), schedule and recipients (F-128).
 */
const PRESETS = [['last_7d', 'Last 7 days'], ['last_14d', 'Last 14 days'], ['last_30d', 'Last 30 days'], ['last_90d', 'Last 90 days'], ['last_week', 'Last week (Mon-Sun)'], ['this_month', 'This month'], ['last_month', 'Last month'], ['this_quarter', 'This quarter'], ['last_quarter', 'Last quarter'], ['custom', 'Custom dates']]
const SOURCE_TYPES = [['meta_ads', 'Meta Ads'], ['facebook_page', 'Facebook Page'], ['crm_leads', 'Leads'], ['crm_work', 'Work delivered (tasks and hours)']]
const BREAKDOWNS = [['', 'No breakdown'], ['age', 'Age'], ['gender', 'Gender'], ['age_gender', 'Age and gender'], ['platform', 'Platform'], ['placement', 'Placement'], ['device', 'Device'], ['region', 'Region']]
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const empty = {
    name: '', description: '', client_id: null, date_preset: 'last_30d', custom_from: '', custom_to: '', compare_type: 'previous_period',
    sources: [], branding: { primary_color: '#3454d1', intro: '', footer_text: '', show_agency_logo: true, show_client_logo: true },
    schedule_frequency: 'none', schedule_weekday: 1, schedule_monthday: 1, schedule_hour: 9, recipients: [], include_client_contacts: false, is_active: true,
}

const ReportBuilderPage = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const [form, setForm] = useState(empty)
    const [recipientsText, setRecipientsText] = useState('')
    const [options, setOptions] = useState({ ad_accounts: [], pages: [] })
    const [clients, setClients] = useState([])
    const [saving, setSaving] = useState(false)
    const [addType, setAddType] = useState('meta_ads')

    useEffect(() => {
        adsApi('/api/reports/source-options').then((r) => setOptions(r.data)).catch(() => {})
        api('/api/clients').then((r) => setClients(Array.isArray(r) ? r : r?.clients || r?.data || [])).catch(() => setClients([]))
        if (id) {
            adsApi(`/api/reports/templates/${id}`).then((r) => {
                const t = r.data
                setForm({ ...empty, ...t, description: t.description || '', custom_from: t.custom_from || '', custom_to: t.custom_to || '', branding: { ...empty.branding, ...(t.branding || {}) }, schedule_weekday: t.schedule_weekday || 1, schedule_monthday: t.schedule_monthday || 1 })
                setRecipientsText((t.recipients || []).join(', '))
            }).catch((e) => toast.error(e.message))
        }
    }, [id])

    const set = (patch) => setForm((f) => ({ ...f, ...patch }))
    const setBrand = (patch) => setForm((f) => ({ ...f, branding: { ...f.branding, ...patch } }))
    const setSource = (i, patch) => setForm((f) => ({ ...f, sources: f.sources.map((s, j) => (j === i ? { ...s, ...patch } : s)) }))
    const move = (i, d) => setForm((f) => { const s = [...f.sources]; const [x] = s.splice(i, 1); s.splice(i + d, 0, x); return { ...f, sources: s } })
    const addSource = () => {
        const s = { type: addType }
        if (addType === 'meta_ads') s.meta_ad_account_id = options.ad_accounts[0]?.meta_ad_account_id || null
        if (addType === 'facebook_page') s.meta_page_id = options.pages[0]?.meta_page_id || null
        set({ sources: [...form.sources, s] })
    }

    const payload = () => ({
        ...form,
        client_id: form.client_id ? Number(form.client_id) : null,
        custom_from: form.date_preset === 'custom' ? form.custom_from : null,
        custom_to: form.date_preset === 'custom' ? form.custom_to : null,
        recipients: recipientsText.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean),
        sources: form.sources.map((s) => {
            const out = { type: s.type }
            if (s.title) out.title = s.title
            if (s.type === 'meta_ads') { out.meta_ad_account_id = Number(s.meta_ad_account_id); if (s.breakdown) out.breakdown = s.breakdown }
            if (s.type === 'facebook_page') out.meta_page_id = Number(s.meta_page_id)
            return out
        }),
        branding: { ...form.branding, intro: form.branding.intro || null, footer_text: form.branding.footer_text || null },
        description: form.description || null,
    })

    const save = async (andRun) => {
        setSaving(true)
        try {
            const r = await adsApi(id ? `/api/reports/templates/${id}` : '/api/reports/templates', { method: id ? 'PUT' : 'POST', body: payload() })
            toast.success('Report saved')
            if (andRun) {
                const run = await adsApi(`/api/reports/templates/${r.data.report_template_id}/run`, { method: 'POST', body: {} })
                navigate(`/reports/runs/${run.data.report_run_id}`)
            } else navigate('/reports')
        } catch (e) {
            toast.error(e.message)
        } finally {
            setSaving(false)
        }
    }

    const label = (k, l) => <label className="form-label fw-semibold" htmlFor={k}>{l}</label>
    return (
        <>
            <PageHeader>
                <div className="d-flex gap-2">
                    <button type="button" className="btn btn-light-brand" disabled={saving} onClick={() => save(false)} data-testid="save-report"><FiSave className="me-2" />Save</button>
                    <button type="button" className="btn btn-primary" disabled={saving} onClick={() => save(true)} data-testid="save-run-report"><FiPlay className="me-2" />Save and generate</button>
                </div>
            </PageHeader>
            <div className="main-content">
                <div className="row">
                    <div className="col-xl-8">
                        <div className="card mb-4">
                            <div className="card-header"><h6 className="mb-0">Report</h6></div>
                            <div className="card-body row g-3">
                                <div className="col-md-6">{label('rb-name', 'Name')}<input id="rb-name" className="form-control" value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Monthly performance report" /></div>
                                <div className="col-md-6">{label('rb-client', 'Client')}
                                    <select id="rb-client" className="form-select" value={form.client_id || ''} onChange={(e) => set({ client_id: e.target.value || null })}>
                                        <option value="">No client (agency report)</option>
                                        {clients.map((c) => <option key={c.client_id} value={c.client_id}>{c.company_name}</option>)}
                                    </select>
                                </div>
                                <div className="col-12">{label('rb-desc', 'Description (internal)')}<input id="rb-desc" className="form-control" value={form.description} onChange={(e) => set({ description: e.target.value })} /></div>
                                <div className="col-md-4">{label('rb-period', 'Period')}
                                    <select id="rb-period" className="form-select" value={form.date_preset} onChange={(e) => set({ date_preset: e.target.value })}>
                                        {PRESETS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                                    </select>
                                </div>
                                {form.date_preset === 'custom' && (
                                    <>
                                        <div className="col-md-4">{label('rb-from', 'From')}<input id="rb-from" type="date" className="form-control" value={form.custom_from} onChange={(e) => set({ custom_from: e.target.value })} /></div>
                                        <div className="col-md-4">{label('rb-to', 'To')}<input id="rb-to" type="date" className="form-control" value={form.custom_to} onChange={(e) => set({ custom_to: e.target.value })} /></div>
                                    </>
                                )}
                                <div className="col-md-4">{label('rb-compare', 'Compare with')}
                                    <select id="rb-compare" className="form-select" value={form.compare_type} onChange={(e) => set({ compare_type: e.target.value })}>
                                        <option value="previous_period">Previous period</option><option value="previous_month">Same days last month</option><option value="previous_year">Same days last year</option><option value="none">No comparison</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="card mb-4">
                            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
                                <h6 className="mb-0">Sections</h6>
                                <div className="d-flex gap-2">
                                    <select className="form-select form-select-sm" value={addType} onChange={(e) => setAddType(e.target.value)} aria-label="Section type" data-testid="section-type">
                                        {SOURCE_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                                    </select>
                                    <button type="button" className="btn btn-sm btn-primary text-nowrap" onClick={addSource} data-testid="add-section"><FiPlus className="me-1" />Add</button>
                                </div>
                            </div>
                            <div className="card-body">
                                {form.sources.length === 0 && <p className="text-muted fs-13 mb-0">Add at least one section. Each becomes a page part of the PDF with KPIs, a chart and tables.</p>}
                                {form.sources.map((s, i) => (
                                    <div key={i} className="border rounded p-3 mb-2" data-testid="report-section-editor">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <span className="fw-semibold">{i + 1}. {SOURCE_TYPES.find((x) => x[0] === s.type)[1]}</span>
                                            <div className="d-flex gap-1">
                                                <button type="button" className="btn btn-sm btn-light" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up"><FiArrowUp /></button>
                                                <button type="button" className="btn btn-sm btn-light" disabled={i === form.sources.length - 1} onClick={() => move(i, 1)} aria-label="Move down"><FiArrowDown /></button>
                                                <button type="button" className="btn btn-sm btn-light-danger" onClick={() => set({ sources: form.sources.filter((_, j) => j !== i) })} aria-label="Remove section"><FiTrash2 /></button>
                                            </div>
                                        </div>
                                        <div className="row g-2">
                                            {s.type === 'meta_ads' && (
                                                <>
                                                    <div className="col-md-6">
                                                        <select className="form-select form-select-sm" value={s.meta_ad_account_id || ''} onChange={(e) => setSource(i, { meta_ad_account_id: e.target.value })} aria-label="Ad account">
                                                            <option value="">Choose an ad account</option>
                                                            {options.ad_accounts.map((a) => <option key={a.meta_ad_account_id} value={a.meta_ad_account_id}>{a.name} ({a.currency})</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="col-md-6">
                                                        <select className="form-select form-select-sm" value={s.breakdown || ''} onChange={(e) => setSource(i, { breakdown: e.target.value || null })} aria-label="Breakdown">
                                                            {BREAKDOWNS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                                                        </select>
                                                    </div>
                                                </>
                                            )}
                                            {s.type === 'facebook_page' && (
                                                <div className="col-md-6">
                                                    <select className="form-select form-select-sm" value={s.meta_page_id || ''} onChange={(e) => setSource(i, { meta_page_id: e.target.value })} aria-label="Facebook Page">
                                                        <option value="">Choose a Page</option>
                                                        {options.pages.map((p) => <option key={p.meta_page_id} value={p.meta_page_id}>{p.name}</option>)}
                                                    </select>
                                                </div>
                                            )}
                                            {(s.type === 'crm_leads' || s.type === 'crm_work') && <div className="col-md-6 fs-12 text-muted d-flex align-items-center">{form.client_id ? 'Only this client\'s data' : 'All data of the workspace'}</div>}
                                            <div className="col-md-6"><input className="form-control form-control-sm" placeholder="Section title (optional)" value={s.title || ''} onChange={(e) => setSource(i, { title: e.target.value })} /></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="col-xl-4">
                        <div className="card mb-4">
                            <div className="card-header"><h6 className="mb-0">PDF branding</h6></div>
                            <div className="card-body row g-3">
                                <div className="col-12 d-flex align-items-center gap-2">
                                    <input type="color" className="form-control form-control-color" value={form.branding.primary_color || '#3454d1'} onChange={(e) => setBrand({ primary_color: e.target.value })} aria-label="Brand colour" />
                                    <span className="fs-13">Brand colour</span>
                                </div>
                                <div className="col-12">{label('rb-intro', 'Intro text')}<textarea id="rb-intro" className="form-control" rows="3" maxLength={1000} value={form.branding.intro || ''} onChange={(e) => setBrand({ intro: e.target.value })} /></div>
                                <div className="col-12">{label('rb-footer', 'Footer text')}<input id="rb-footer" className="form-control" maxLength={200} value={form.branding.footer_text || ''} onChange={(e) => setBrand({ footer_text: e.target.value })} placeholder="Prepared by your agency" /></div>
                                <div className="col-12">
                                    <label className="form-check"><input type="checkbox" className="form-check-input" checked={form.branding.show_agency_logo !== false} onChange={(e) => setBrand({ show_agency_logo: e.target.checked })} /><span className="form-check-label">Agency logo</span></label>
                                    <label className="form-check"><input type="checkbox" className="form-check-input" checked={form.branding.show_client_logo !== false} onChange={(e) => setBrand({ show_client_logo: e.target.checked })} /><span className="form-check-label">Client logo</span></label>
                                </div>
                            </div>
                        </div>
                        <div className="card mb-4">
                            <div className="card-header"><h6 className="mb-0">Schedule and email</h6></div>
                            <div className="card-body row g-3">
                                <div className="col-12">{label('rb-freq', 'Send automatically')}
                                    <select id="rb-freq" className="form-select" value={form.schedule_frequency} onChange={(e) => set({ schedule_frequency: e.target.value })} data-testid="schedule-frequency">
                                        <option value="none">No, only when I generate it</option><option value="weekly">Every week</option><option value="monthly">Every month</option>
                                    </select>
                                </div>
                                {form.schedule_frequency === 'weekly' && (
                                    <div className="col-6">{label('rb-wd', 'Day')}<select id="rb-wd" className="form-select" value={form.schedule_weekday} onChange={(e) => set({ schedule_weekday: Number(e.target.value) })}>{WEEKDAYS.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}</select></div>
                                )}
                                {form.schedule_frequency === 'monthly' && (
                                    <div className="col-6">{label('rb-md', 'Day of month')}<select id="rb-md" className="form-select" value={form.schedule_monthday} onChange={(e) => set({ schedule_monthday: Number(e.target.value) })}>{Array.from({ length: 28 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select></div>
                                )}
                                {form.schedule_frequency !== 'none' && (
                                    <div className="col-6">{label('rb-hour', 'Time (workspace time zone)')}<select id="rb-hour" className="form-select" value={form.schedule_hour} onChange={(e) => set({ schedule_hour: Number(e.target.value) })}>{Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>)}</select></div>
                                )}
                                <div className="col-12">{label('rb-rec', 'Recipients')}<textarea id="rb-rec" className="form-control" rows="2" value={recipientsText} onChange={(e) => setRecipientsText(e.target.value)} placeholder="name@client.com, boss@agency.com" /></div>
                                <div className="col-12"><label className="form-check"><input type="checkbox" className="form-check-input" checked={form.include_client_contacts} onChange={(e) => set({ include_client_contacts: e.target.checked })} /><span className="form-check-label">Also send to the client's contacts</span></label></div>
                                <div className="col-12"><label className="form-check"><input type="checkbox" className="form-check-input" checked={form.is_active} onChange={(e) => set({ is_active: e.target.checked })} /><span className="form-check-label">Schedule active</span></label></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    )
}

export default ReportBuilderPage
