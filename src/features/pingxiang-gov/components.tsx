import { Link } from 'react-router-dom'
import { ArrowLeft, Database, ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'

export type Tone = 'green' | 'blue' | 'amber' | 'red' | 'slate'

export const toneOf = (value: string): Tone => {
  if (value.includes('重点') || value.includes('超期') || value.includes('异常') || value.includes('不合格') || value.includes('漏检')) return 'red'
  if (value.includes('需关注') || value.includes('待') || value.includes('审批中') || value.includes('整改中') || value.includes('未完成')) return 'amber'
  if (value.includes('正常') || value.includes('已启用')) return 'blue'
  if (value.includes('良好') || value.includes('已') || value.includes('合格')) return 'green'
  return 'slate'
}

export const StatusTag = ({ value }: { value: string }) => (
  <span className={`pxgov-status pxgov-status-${toneOf(value)}`}>{value}</span>
)

export const SourceTag = ({ real }: { real: boolean }) => (
  <span className={`pxgov-source ${real ? 'pxgov-source-real' : 'pxgov-source-demo'}`}>
    <Database size={13} />
    {real ? '真实数据' : '演示数据'}
  </span>
)

export const MetricCard = ({ label, value, note }: { label: string; value: string | number; note?: string }) => (
  <div className="pxgov-metric">
    <div className="pxgov-metric-label">{label}</div>
    <div className="pxgov-metric-value">{value}</div>
    {note && <div className="pxgov-metric-note">{note}</div>}
  </div>
)

export const Panel = ({ title, subtitle, action, children, className = '' }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) => (
  <section className={`pxgov-panel ${className}`}>
    <div className="pxgov-panel-head">
      <div>
        <div className="pxgov-panel-title">{title}</div>
        {subtitle && <div className="pxgov-panel-subtitle">{subtitle}</div>}
      </div>
      {action}
    </div>
    <div className="pxgov-panel-body">{children}</div>
  </section>
)

export const EmptyState = ({ title, description }: { title: string; description?: string }) => (
  <div className="pxgov-empty-state">
    <ShieldCheck size={20} />
    <strong>{title}</strong>
    {description && <span>{description}</span>}
  </div>
)

export const DataTable = ({ columns, children, empty }: { columns: string[]; children: ReactNode; empty?: ReactNode }) => (
  <div className="pxgov-table-wrap">
    <table className="pxgov-table">
      <thead>
        <tr>{columns.map(column => <th key={column}>{column}</th>)}</tr>
      </thead>
      <tbody>{children || <tr><td className="pxgov-empty-cell" colSpan={columns.length}>{empty || '暂无记录'}</td></tr>}</tbody>
    </table>
  </div>
)

export const FlowSteps = ({ steps }: { steps: Array<[string, string | number]> }) => (
  <div className="pxgov-flow">
    {steps.map(([label, value], index) => (
      <div key={label}>
        <span>{index + 1}</span>
        <strong>{value}</strong>
        {label}
      </div>
    ))}
  </div>
)

export const BackLink = ({ to, label = '返回总览' }: { to: string; label?: string }) => (
  <Link className="pxgov-back-link" to={to}>
    <ArrowLeft size={16} />
    {label}
  </Link>
)

export const FeatureEntry = ({ to, title, summary, metrics }: { to: string; title: string; summary: string; metrics: Array<[string, string | number]> }) => (
  <Link className="pxgov-feature-entry" to={to}>
    <div>
      <div className="pxgov-feature-title">{title}</div>
      <div className="pxgov-feature-summary">{summary}</div>
    </div>
    <div className="pxgov-feature-metrics">
      {metrics.map(([label, value]) => (
        <span key={label}><strong>{value}</strong>{label}</span>
      ))}
    </div>
  </Link>
)
