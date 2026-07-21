import type { LucideIcon } from 'lucide-react'
import { Database, Inbox, Info } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export type VisualTone = 'blue' | 'green' | 'violet' | 'orange' | 'cyan' | 'slate'

export type VisualMetric = {
  label: string
  value: string | number | null
  unit?: string
  note: string
  icon: LucideIcon
  tone: VisualTone
  href?: string
}

export type VisualChartSeries = {
  label: string
  color: string
  values: number[]
}

export function MetricTile({ item }: { item: VisualMetric }) {
  const Icon = item.icon
  const missing = item.value === null || item.value === undefined || item.value === ''
  const content = (
    <>
      <span className="pxv2-metric-icon"><Icon size={26} strokeWidth={2.05} /></span>
      <div className="pxv2-metric-label">{item.label}</div>
      <div className="pxv2-metric-number">
        <strong>{missing ? '暂无数据' : item.value}</strong>
        {!missing && item.unit && <span>{item.unit}</span>}
      </div>
      <p>{item.note}</p>
    </>
  )
  return item.href && !missing
    ? <Link className={`pxv2-metric pxv2-tone-${item.tone} is-clickable`} to={item.href}>{content}</Link>
    : <article className={`pxv2-metric pxv2-tone-${item.tone} ${missing ? 'is-missing' : ''}`}>{content}</article>
}

export function Panel({ title, note, action, className = '', children }: { title: string; note?: string; action?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={`pxv2-panel ${className}`}>
      <div className="pxv2-panel-head">
        <div><h2>{title}</h2>{note && <span>{note}</span>}</div>
        {action && <div className="pxv2-panel-action">{action}</div>}
      </div>
      <div className="pxv2-panel-body">{children}</div>
    </section>
  )
}

export function ChartLegend({ series }: { series: VisualChartSeries[] }) {
  return (
    <div className="pxv2-chart-legend">
      {series.map(item => <span key={item.label}><i style={{ background: item.color }} />{item.label}</span>)}
    </div>
  )
}

export function LineChartSvg({ labels, series, maxValue, percentage = false }: { labels: string[]; series: VisualChartSeries[]; maxValue: number; percentage?: boolean }) {
  const width = 600
  const height = 220
  const left = 48
  const right = 18
  const top = 16
  const bottom = 36
  const chartWidth = width - left - right
  const chartHeight = height - top - bottom
  const gridValues = [0, .25, .5, .75, 1]
  const x = (index: number) => left + (chartWidth / Math.max(1, labels.length - 1)) * index
  const y = (value: number) => top + chartHeight - (value / Math.max(1, maxValue)) * chartHeight

  return (
    <svg className="pxv2-line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="数据变化趋势">
      {gridValues.map(rate => {
        const value = Math.round(maxValue * rate)
        const gridY = y(value)
        return (
          <g key={rate}>
            <line x1={left} y1={gridY} x2={width - right} y2={gridY} className="pxv2-chart-gridline" />
            <text x={left - 10} y={gridY + 4} textAnchor="end" className="pxv2-axis-text">{percentage ? `${value}%` : value}</text>
          </g>
        )
      })}
      {labels.map((label, index) => <text key={`${label}-${index}`} x={x(index)} y={height - 8} textAnchor="middle" className="pxv2-axis-text">{label}</text>)}
      {series.map(item => {
        const points = item.values.map((value, index) => `${x(index)},${y(value)}`).join(' ')
        return (
          <g key={item.label}>
            <polyline points={points} fill="none" stroke={item.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            {item.values.map((value, index) => <circle key={`${item.label}-${index}`} cx={x(index)} cy={y(value)} r="4" fill="#fff" stroke={item.color} strokeWidth="3" />)}
          </g>
        )
      })}
    </svg>
  )
}

export function EmptyVisual({ title = '暂无数据', description = '当前尚未归集到可展示的数据。', action }: { title?: string; description?: string; action?: ReactNode }) {
  return (
    <div className="pxv2-empty">
      <span><Inbox size={24} /></span>
      <strong>{title}</strong>
      <p>{description}</p>
      {action && <div className="pxv21-empty-action">{action}</div>}
    </div>
  )
}

export function ScopeNote({ children }: { children: ReactNode }) {
  return <div className="pxv2-scope-note"><Info size={16} /><span>{children}</span></div>
}

export function EnvironmentNotice({ demo, status, message }: { demo: boolean; status: string; message: string }) {
  return (
    <div className={`pxv2-environment ${demo ? 'demo' : status === 'error' ? 'error' : 'real'}`}>
      <Database size={17} />
      <strong>{demo ? '演示环境' : '真实环境'}</strong>
      <span>{message}</span>
    </div>
  )
}

export function StatusPill({ value }: { value: string }) {
  const tone = value.includes('完成') || value.includes('通过') || value.includes('复查') || value.includes('闭环') || value.includes('有效')
    ? 'green'
    : value.includes('异常') || value.includes('超期') || value.includes('驳回')
      ? 'orange'
      : value.includes('整改') || value.includes('审批') || value.includes('较少')
        ? 'violet'
        : 'blue'
  return <span className={`pxv2-status pxv2-status-${tone}`}>{value || '暂无状态'}</span>
}

export function PageTitle({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return (
    <section className="pxv2-page-title">
      <div><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>
      {action && <div>{action}</div>}
    </section>
  )
}

export function DataTable({ headers, children, minWidth = 900 }: { headers: string[]; children: ReactNode; minWidth?: number }) {
  return (
    <div className="pxv2-data-table-wrap">
      <table style={{ minWidth }}>
        <thead><tr>{headers.map(header => <th key={header}>{header}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}
