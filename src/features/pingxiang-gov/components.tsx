import { Link } from 'react-router-dom'
import { ArrowLeft, Database, Inbox, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export type Tone = 'green' | 'blue' | 'amber' | 'red' | 'slate'

export const toneOf = (value: string): Tone => {
  if (value.includes('超期') || value.includes('异常') || value.includes('不合格') || value.includes('漏检')) return 'red'
  if (value.includes('较少') || value.includes('待') || value.includes('审批中') || value.includes('整改中') || value.includes('未完成') || value.includes('更新事项')) return 'amber'
  if (value.includes('正常') || value.includes('已开通') || value.includes('有效记录')) return 'blue'
  if (value.includes('已') || value.includes('合格') || value.includes('完成')) return 'green'
  return 'slate'
}

export const StatusTag = ({ value }: { value: string }) => (
  <span className={`pxgov-status pxgov-status-${toneOf(value)}`}>{value}</span>
)

export const SourceTag = ({ real }: { real: boolean }) => (
  <span className={`pxgov-source ${real ? 'pxgov-source-real' : 'pxgov-source-demo'}`}>
    <Database size={15} />
    {real ? '企业端归集' : '演示环境'}
  </span>
)

export const PageHeader = ({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: ReactNode }) => (
  <div className="pxgov-page-header">
    <div>
      {eyebrow && <div className="pxgov-page-eyebrow">{eyebrow}</div>}
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
    {action && <div className="pxgov-page-header-action">{action}</div>}
  </div>
)

export const DataNotice = ({ demo = false, compact = false }: { demo?: boolean; compact?: boolean }) => (
  <div className={`pxgov-data-notice ${demo ? 'pxgov-data-notice-demo' : ''} ${compact ? 'compact' : ''}`}>
    <Database size={18} />
    <div>
      <strong>{demo ? '当前为演示环境' : '数据使用说明'}</strong>
      <span>
        {demo
          ? '页面数据仅用于功能和业务流程展示。'
          : '数据来源于试点企业端实际记录及项目归集数据，仅用于了解试点运行情况，不替代企业安全管理，也不作为监管执法认定依据。'}
      </span>
    </div>
  </div>
)

export const MetricCard = ({ label, value, unit, note, icon: Icon, tone = 'blue' }: { label: string; value: string | number; unit?: string; note?: string; icon?: LucideIcon; tone?: Tone }) => (
  <div className={`pxgov-metric pxgov-metric-${tone}`}>
    <div className="pxgov-metric-top">
      <div className="pxgov-metric-label">{label}</div>
      {Icon && <span className="pxgov-metric-icon"><Icon size={20} /></span>}
    </div>
    <div className="pxgov-metric-value">{value}{unit && <span>{unit}</span>}</div>
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
      {action && <div className="pxgov-panel-action">{action}</div>}
    </div>
    <div className="pxgov-panel-body">{children}</div>
  </section>
)

export const EmptyState = ({ title, description, action }: { title: string; description?: string; action?: ReactNode }) => (
  <div className="pxgov-empty-state">
    <span className="pxgov-empty-icon"><Inbox size={22} /></span>
    <strong>{title}</strong>
    {description && <span>{description}</span>}
    {action}
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
    <ArrowLeft size={17} />
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
