import React, { useCallback, useEffect, useMemo, useState } from 'react'
import ReactApexChart from 'react-apexcharts'
import { FiDownload, FiRefreshCw, FiTrendingUp, FiTrendingDown } from 'react-icons/fi'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import { AdAccountPicker, AdConnectHint, useAdAccounts } from '@/components/meta/AdAccountPicker'
import { adsApi, formatMoney, fmtNum, fmtPct } from '@/components/meta/adsApi'

/**
 * Meta Ads insights (F-087): totals with comparison, exact reach / frequency, results and cost per
 * result by objective, ROAS, breakdowns (age, gender, placement, device, region), attribution
 * windows and a trend. Numbers come live from Meta for the selected ad account.
 */
const PRESETS = [['last_7d', 'Last 7 days'], ['last_14d', 'Last 14 days'], ['last_30d', 'Last 30 days'], ['last_90d', 'Last 90 days'], ['this_month', 'This month'], ['last_month', 'Last month'], ['this_quarter', 'This quarter'], ['last_quarter', 'Last quarter'], ['custom', 'Custom range']]
const BREAKDOWNS = [['', 'No breakdown'], ['age', 'Age'], ['gender', 'Gender'], ['age_gender', 'Age and gender'], ['platform', 'Platform'], ['placement', 'Placement'], ['device', 'Device'], ['country', 'Country'], ['region', 'Region']]
const WINDOWS = [['1d_click', '1-day click'], ['7d_click', '7-day click'], ['28d_click', '28-day click'], ['1d_view', '1-day view']]
const TREND_METRICS = [['spend', 'Spend'], ['results', 'Results'], ['impressions', 'Impressions'], ['clicks', 'Clicks'], ['ctr', 'CTR']]

const Growth = ({ v, inverse }) => {
    if (v === null || v === undefined) return <span className="fs-11 text-muted">new</span>
    if (Math.abs(v) < 0.05) return <span className="fs-11 text-muted">±0%</span>
    const good = inverse ? v < 0 : v > 0
    return (
        <span className={`fs-11 ${good ? 'text-success' : 'text-danger'}`}>
            {v > 0 ? <FiTrendingUp className="me-1" /> : <FiTrendingDown className="me-1" />}{v > 0 ? '+' : ''}{v.toFixed(1)}%
        </span>
    )
}

const AdsInsightsPage = () => {
    const ads = useAdAccounts()
    const [preset, setPreset] = useState('last_30d')
    const [from, setFrom] = useState('')
    const [to, setTo] = useState('')
    const [compare, setCompare] = useState('previous_period')
    const [level, setLevel] = useState('campaign')
    const [breakdown, setBreakdown] = useState('')
    const [windows, setWindows] = useState([])
    const [trendMetric, setTrendMetric] = useState('spend')
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const load = useCallback(async () => {
        if (!ads.selected) return
        if (preset === 'custom' && (!from || !to)) return
        setLoading(true)
        setError(null)
        const q = new URLSearchParams({ compare, level })
        if (preset === 'custom') { q.set('from', from); q.set('to', to) } else q.set('date_preset', preset)
        if (breakdown) q.set('breakdown', breakdown)
        if (windows.length) q.set('attribution', windows.join(','))
        try {
            setData((await adsApi(`/api/meta-ads/insights?${q}`)).data)
        } catch (e) {
            setError(e)
            setData(null)
        } finally {
            setLoading(false)
        }
    }, [ads.selected, preset, from, to, compare, level, breakdown, windows])
    useEffect(() => { load() }, [load])

    const cur = data?.currency
    const t = data?.totals?.current
    const g = data?.totals?.growth || {}
    const tiles = t ? [
        ['Spend', formatMoney(t.spend, cur), 'spend', true],
        [t.resultLabel || 'Results', fmtNum(t.results), 'results'],
        ['Cost per result', formatMoney(t.costPerResult, cur), 'costPerResult', true],
        ['ROAS', t.roas ? `${t.roas.toFixed(2)}x` : '-', 'roas'],
        ['Impressions', fmtNum(t.impressions), 'impressions'],
        ['Reach', fmtNum(t.reach), 'reach'],
        ['Frequency', fmtNum(t.frequency, 2), 'frequency', true],
        ['CTR', fmtPct(t.ctr), 'ctr'],
        ['CPC', formatMoney(t.cpc, cur), 'cpc', true],
        ['CPM', formatMoney(t.cpm, cur), 'cpm', true],
        ['Conversion value', formatMoney(t.conversionValue, cur), 'conversionValue'],
        ['Link clicks', fmtNum(t.linkClicks), 'linkClicks'],
    ] : []

    const chart = useMemo(() => {
        const points = (data?.trend || []).map((d) => ({ x: d.date, y: Number((d[trendMetric] || 0).toFixed(2)) }))
        const label = TREND_METRICS.find((m) => m[0] === trendMetric)[1]
        return {
            series: [{ name: label, data: points }],
            options: {
                chart: { type: 'line', toolbar: { show: false }, zoom: { enabled: false }, fontFamily: 'inherit' },
                stroke: { width: 2, curve: 'smooth' },
                colors: ['#3454d1'],
                markers: { size: points.length < 40 ? 4 : 0, strokeWidth: 2, strokeColors: '#fff', hover: { size: 6 } },
                grid: { borderColor: 'rgba(0,0,0,0.08)', strokeDashArray: 3 },
                xaxis: { type: 'category', labels: { rotate: -45, hideOverlappingLabels: true, style: { fontSize: '11px' } }, tooltip: { enabled: false } },
                yaxis: { labels: { formatter: (v) => (trendMetric === 'spend' ? formatMoney(v, cur) : trendMetric === 'ctr' ? `${v.toFixed(2)}%` : fmtNum(v)) } },
                tooltip: { shared: true, intersect: false },
                dataLabels: { enabled: false },
                legend: { show: false },
            },
        }
    }, [data, trendMetric, cur])

    const exportExcel = async () => {
        if (!data) return
        const XLSX = await import('xlsx')
        const wb = XLSX.utils.book_new()
        const totals = Object.entries(t).filter(([, v]) => typeof v === 'number').map(([k, v]) => ({ Metric: k, Current: v, Previous: data.totals.previous ? data.totals.previous[k] : null, 'Change %': g[k] ?? null }))
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(totals), 'Totals')
        if (data.rows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.rows), data.level)
        if (data.breakdown) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.breakdown.rows), 'Breakdown')
        if (data.trend.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.trend), 'Trend')
        XLSX.writeFile(wb, `meta-insights-${data.period.from}-${data.period.to}.xlsx`)
    }

    return (
        <>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 flex-wrap justify-content-end">
                    <AdAccountPicker accounts={ads.accounts} selected={ads.selected} onChange={(id) => ads.setSelected(id)} />
                    <button type="button" className="btn btn-light-brand" onClick={load} disabled={loading} title="Refresh"><FiRefreshCw /></button>
                    <button type="button" className="btn btn-light-brand" onClick={exportExcel} disabled={!data} data-testid="insights-export"><FiDownload className="me-2" />Excel</button>
                </div>
            </PageHeader>
            <div className="main-content">
                <div className="row">
                    {!ads.loading && (ads.notConnected || ads.error) ? <AdConnectHint error={ads.error} /> : (
                        <>
                            <div className="col-12">
                                <div className="card mb-3">
                                    <div className="card-body d-flex flex-wrap gap-3 align-items-end">
                                        <div>
                                            <label className="form-label fs-12 mb-1" htmlFor="ins-period">Period</label>
                                            <select id="ins-period" className="form-select form-select-sm" value={preset} onChange={(e) => setPreset(e.target.value)}>
                                                {PRESETS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                                            </select>
                                        </div>
                                        {preset === 'custom' && (
                                            <>
                                                <div><label className="form-label fs-12 mb-1" htmlFor="ins-from">From</label><input id="ins-from" type="date" className="form-control form-control-sm" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
                                                <div><label className="form-label fs-12 mb-1" htmlFor="ins-to">To</label><input id="ins-to" type="date" className="form-control form-control-sm" value={to} onChange={(e) => setTo(e.target.value)} /></div>
                                            </>
                                        )}
                                        <div>
                                            <label className="form-label fs-12 mb-1" htmlFor="ins-compare">Compare with</label>
                                            <select id="ins-compare" className="form-select form-select-sm" value={compare} onChange={(e) => setCompare(e.target.value)}>
                                                <option value="previous_period">Previous period</option><option value="previous_month">Same days last month</option><option value="previous_year">Same days last year</option><option value="none">No comparison</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="form-label fs-12 mb-1" htmlFor="ins-level">Rows</label>
                                            <select id="ins-level" className="form-select form-select-sm" value={level} onChange={(e) => setLevel(e.target.value)}>
                                                <option value="campaign">Campaigns</option><option value="adset">Ad sets</option><option value="ad">Ads</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="form-label fs-12 mb-1" htmlFor="ins-breakdown">Breakdown</label>
                                            <select id="ins-breakdown" className="form-select form-select-sm" value={breakdown} onChange={(e) => setBreakdown(e.target.value)} data-testid="insights-breakdown">
                                                {BREAKDOWNS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <span className="form-label fs-12 mb-1 d-block">Attribution</span>
                                            <div className="d-flex gap-2 flex-wrap">
                                                {WINDOWS.map(([k, l]) => (
                                                    <label key={k} className="form-check-label fs-12 d-flex align-items-center gap-1">
                                                        <input type="checkbox" className="form-check-input mt-0" checked={windows.includes(k)} onChange={(e) => setWindows((w) => (e.target.checked ? [...w, k] : w.filter((x) => x !== k)))} />{l}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {error && <div className="col-12"><div className="alert alert-danger">{error.message}</div></div>}
                            {loading && !data && <div className="col-12 text-center py-5"><div className="spinner-border text-primary" role="status" /></div>}

                            {data && (
                                <>
                                    <div className="col-12 fs-12 text-muted mb-2" data-testid="insights-period">
                                        {data.account.name} · {data.period.from} to {data.period.to} ({data.period.days} days)
                                        {data.comparison ? ` · compared with ${data.comparison.from} to ${data.comparison.to}` : ''} · attribution: {data.attribution.join(', ')}
                                    </div>
                                    {tiles.map(([label, value, key, inverse]) => (
                                        <div key={key} className="col-6 col-md-4 col-xl-2">
                                            <div className="card stretch mb-3" data-testid="insights-tile">
                                                <div className="card-body py-3">
                                                    <div className="fs-11 text-muted text-uppercase">{label}</div>
                                                    <div className="fs-5 fw-bold text-dark my-1">{value}</div>
                                                    {data.totals.growth && <Growth v={g[key]} inverse={inverse} />}
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {data.trend.length > 1 && (
                                        <div className="col-12">
                                            <div className="card mb-3">
                                                <div className="card-header d-flex justify-content-between align-items-center">
                                                    <h6 className="mb-0">{TREND_METRICS.find((m) => m[0] === trendMetric)[1]} over time</h6>
                                                    <select className="form-select form-select-sm w-auto" value={trendMetric} onChange={(e) => setTrendMetric(e.target.value)} aria-label="Trend metric">
                                                        {TREND_METRICS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                                                    </select>
                                                </div>
                                                <div className="card-body"><ReactApexChart type="line" height={280} series={chart.series} options={chart.options} /></div>
                                            </div>
                                        </div>
                                    )}

                                    <div className={data.breakdown ? 'col-xl-7' : 'col-12'}>
                                        <div className="card mb-3">
                                            <div className="card-header"><h6 className="mb-0">{{ campaign: 'Campaigns', adset: 'Ad sets', ad: 'Ads' }[data.level]} by spend</h6></div>
                                            <div className="table-responsive">
                                                <table className="table table-hover mb-0" data-testid="insights-rows">
                                                    <thead><tr><th>Name</th><th className="text-end">Spend</th><th className="text-end">Results</th><th className="text-end">Cost / result</th><th className="text-end">CTR</th><th className="text-end">ROAS</th></tr></thead>
                                                    <tbody>
                                                        {data.rows.length === 0 && <tr><td colSpan={6} className="text-muted text-center py-4">No delivery in this period</td></tr>}
                                                        {data.rows.map((r) => (
                                                            <tr key={r.id}>
                                                                <td><div className="fw-semibold">{r.name}</div>{data.level !== 'campaign' && <div className="fs-11 text-muted">{r.campaign_name}</div>}</td>
                                                                <td className="text-end">{formatMoney(r.spend, cur)}</td>
                                                                <td className="text-end">{fmtNum(r.results)} <span className="fs-11 text-muted">{r.resultLabel}</span></td>
                                                                <td className="text-end">{r.results ? formatMoney(r.costPerResult, cur) : '-'}</td>
                                                                <td className="text-end">{fmtPct(r.ctr)}</td>
                                                                <td className="text-end">{r.roas ? `${r.roas.toFixed(2)}x` : '-'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                    {data.breakdown && (
                                        <div className="col-xl-5">
                                            <div className="card mb-3">
                                                <div className="card-header"><h6 className="mb-0">By {BREAKDOWNS.find((b) => b[0] === data.breakdown.dimension)[1].toLowerCase()}</h6></div>
                                                <div className="table-responsive">
                                                    <table className="table table-hover mb-0" data-testid="insights-breakdown-table">
                                                        <thead><tr><th>Segment</th><th className="text-end">Spend</th><th className="text-end">Share</th><th className="text-end">Impr.</th><th className="text-end">CTR</th></tr></thead>
                                                        <tbody>
                                                            {data.breakdown.rows.map((r) => (
                                                                <tr key={r.key}>
                                                                    <td className="text-capitalize">{r.key}</td>
                                                                    <td className="text-end">{formatMoney(r.spend, cur)}</td>
                                                                    <td className="text-end" style={{ minWidth: 90 }}>
                                                                        <div className="progress" style={{ height: 6 }} title={fmtPct(t.spend ? (r.spend / t.spend) * 100 : 0, 1)}>
                                                                            <div className="progress-bar" style={{ width: `${t.spend ? (r.spend / t.spend) * 100 : 0}%` }} />
                                                                        </div>
                                                                        <span className="fs-11 text-muted">{fmtPct(t.spend ? (r.spend / t.spend) * 100 : 0, 1)}</span>
                                                                    </td>
                                                                    <td className="text-end">{fmtNum(r.impressions)}</td>
                                                                    <td className="text-end">{fmtPct(r.ctr)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
            <Footer />
        </>
    )
}

export default AdsInsightsPage
