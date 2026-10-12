import React from 'react'
import ReactApexChart from 'react-apexcharts'
import { FiTrendingUp, FiTrendingDown } from 'react-icons/fi'
import { formatMoney, fmtNum } from '@/components/meta/adsApi'

/** Format one value the way the PDF does (shared section format from the API). */
export const fmtValue = (v, format, currency) => {
    if (v === null || v === undefined || v === '') return '-'
    switch (format) {
        case 'money': return formatMoney(v, currency)
        case 'percent': return `${Number(v).toFixed(2)}%`
        case 'ratio': return `${Number(v).toFixed(2)}x`
        case 'decimal': return fmtNum(v, 2)
        case 'number': return fmtNum(v)
        default: return typeof v === 'number' ? fmtNum(v, 2) : String(v)
    }
}

const Growth = ({ k }) => {
    if (k.growth === null || k.growth === undefined) return null
    if (Math.abs(k.growth) < 0.05) return <span className="fs-11 text-muted">no change</span>
    const up = k.growth > 0
    const good = k.inverse ? !up : up
    return <span className={`fs-11 ${good ? 'text-success' : 'text-danger'}`}>{up ? <FiTrendingUp className="me-1" /> : <FiTrendingDown className="me-1" />}{up ? '+' : ''}{k.growth.toFixed(1)}% vs previous</span>
}

const Chart = ({ c, color }) => {
    const series = [{ name: c.title, data: c.points.map((p) => ({ x: p.x, y: p.y })) }]
    const options = {
        chart: { type: c.kind === 'bar' ? 'bar' : 'line', toolbar: { show: false }, zoom: { enabled: false }, fontFamily: 'inherit' },
        colors: [color],
        stroke: { width: c.kind === 'bar' ? 0 : 2, curve: 'smooth' },
        plotOptions: { bar: { borderRadius: 4, borderRadiusApplication: 'end', columnWidth: '55%' } },
        markers: { size: c.kind === 'bar' || c.points.length > 40 ? 0 : 4, strokeColors: '#fff', strokeWidth: 2, hover: { size: 6 } },
        grid: { borderColor: 'rgba(0,0,0,0.08)', strokeDashArray: 3 },
        xaxis: { type: 'category', labels: { rotate: -45, hideOverlappingLabels: true, style: { fontSize: '11px' } }, tooltip: { enabled: false } },
        yaxis: { labels: { formatter: (v) => fmtValue(v, c.format === 'money' ? 'decimal' : c.format || 'number', c.currency) } },
        tooltip: { y: { formatter: (v) => fmtValue(v, c.format, c.currency) } },
        dataLabels: { enabled: false },
        legend: { show: false },
    }
    return (
        <div className="card mb-3">
            <div className="card-header"><h6 className="mb-0">{c.title}</h6></div>
            <div className="card-body"><ReactApexChart type={options.chart.type} height={240} series={series} options={options} /></div>
        </div>
    )
}

/** The sections of a report snapshot: KPI tiles, charts and tables (same data as the PDF). */
const ReportSections = ({ sections = [], color = '#3454d1' }) => (
    <>
        {sections.map((s, si) => (
            <section key={si} className="mb-4" data-testid="report-section">
                <div className="d-flex align-items-baseline gap-2 mb-2" style={{ borderLeft: `3px solid ${color}`, paddingLeft: 10 }}>
                    <h5 className="mb-0">{s.title}</h5>
                    {s.subtitle && <span className="fs-12 text-muted">{s.subtitle}</span>}
                </div>
                <div className="row">
                    {(s.kpis || []).filter((k) => k.value !== null && k.value !== undefined).map((k) => (
                        <div key={k.key} className="col-6 col-md-4 col-xl-3">
                            <div className="card mb-3" data-testid="report-kpi">
                                <div className="card-body py-3">
                                    <div className="fs-11 text-muted text-uppercase">{k.label}</div>
                                    <div className="fs-5 fw-bold text-dark my-1">{fmtValue(k.value, k.format || 'number', k.currency)}</div>
                                    <Growth k={k} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                {(s.charts || []).filter((c) => c.points?.length > 1).map((c, ci) => <Chart key={ci} c={c} color={color} />)}
                {(s.tables || []).filter((t) => t.rows?.length).map((t, ti) => (
                    <div key={ti} className="card mb-3">
                        <div className="card-header"><h6 className="mb-0">{t.title}</h6></div>
                        <div className="table-responsive">
                            <table className="table table-hover mb-0">
                                <thead><tr>{t.columns.map((col, i) => <th key={i} className={col.align === 'right' ? 'text-end' : ''}>{col.label}</th>)}</tr></thead>
                                <tbody>
                                    {t.rows.map((r, ri) => (
                                        <tr key={ri}>{t.columns.map((col, i) => <td key={i} className={col.align === 'right' ? 'text-end' : ''}>{fmtValue(r[i], col.format, col.currency)}</td>)}</tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
                {(s.notes || []).map((n, ni) => <p key={ni} className="fs-12 text-muted fst-italic mb-1">{n}</p>)}
            </section>
        ))}
    </>
)

/** Excel workbook of a snapshot (F-130): one sheet of KPIs + one per table + chart data. */
export const exportRunExcel = async (run) => {
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()
    const sections = run.data?.sections || []
    const kpis = sections.flatMap((s) => (s.kpis || []).map((k) => ({ Section: s.title, Metric: k.label, Value: k.value, Previous: k.previous, 'Change %': k.growth === null || k.growth === undefined ? null : Number(k.growth.toFixed(2)), Currency: k.currency || '' })))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kpis), 'KPIs')
    const used = new Set(['KPIs'])
    const sheetName = (n) => {
        let base = String(n).replace(/[[\]:*?/\\]/g, ' ').slice(0, 28) || 'Sheet'
        let name = base; let i = 2
        while (used.has(name)) name = `${base.slice(0, 25)} ${i++}`
        used.add(name)
        return name
    }
    for (const s of sections) {
        for (const t of s.tables || []) {
            const rows = t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c.label, r[i]])))
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), sheetName(`${s.type} ${t.title}`))
        }
        for (const c of s.charts || []) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(c.points.map((p) => ({ Date: p.x, Value: p.y }))), sheetName(`${s.type} ${c.title}`))
    }
    XLSX.writeFile(wb, `${String(run.title).replace(/[^A-Za-z0-9 _-]+/g, '').trim().replace(/\s+/g, '-') || 'report'}_${run.period_from}_${run.period_to}.xlsx`)
}

export default ReportSections
