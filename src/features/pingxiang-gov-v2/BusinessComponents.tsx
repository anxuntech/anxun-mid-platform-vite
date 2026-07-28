import {
  ArrowLeft,
  Camera,
  ChevronLeft,
  ChevronRight,
  FileImage,
  Maximize2,
  Printer,
  X,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import type { EvidenceFile, TimelineNode } from '../pingxiang-gov/types'
import { StatusPill } from './VisualComponents'

export const buildQueryHref = (pathname: string, search: string, updates: Record<string, string | number | null | undefined>) => {
  const params = new URLSearchParams(search)
  Object.entries(updates).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '' || value === '全部') params.delete(key)
    else params.set(key, String(value))
  })
  const nextSearch = params.toString()
  return `${pathname}${nextSearch ? `?${nextSearch}` : ''}`
}

export function SourceFilterTags({ labels, values = {} }: { labels: Record<string, string>; values?: Record<string, string> }) {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const active = Object.entries(labels).filter(([key]) => {
    const value = params.get(key)
    return value && !(key === 'source' && ['test', 'real'].includes(value))
  })
  if (!active.length) return null
  return (
    <div className="pxv21-source-filters" aria-label="当前来源筛选">
      <strong>当前筛选</strong>
      {active.map(([key, label]) => <span key={key}>{label}：{values[key] || params.get(key)}</span>)}
      <Link to={location.pathname}>清除全部</Link>
    </div>
  )
}

export function InfoGrid({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="pxv21-info-grid">
      {items.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.value || '未提供'}</dd></div>)}
    </dl>
  )
}

export function DetailSection({ title, note, action, children }: { title: string; note?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="pxv21-detail-section">
      <div className="pxv21-detail-section-head"><div><h3>{title}</h3>{note && <p>{note}</p>}</div>{action}</div>
      <div>{children}</div>
    </section>
  )
}

export function ProcessTimeline({ nodes = [] }: { nodes?: TimelineNode[] }) {
  if (!nodes.length) return <div className="pxv21-inline-empty">暂无流程记录</div>
  return (
    <ol className="pxv21-timeline">
      {nodes.map(node => (
        <li key={node.id} className={node.status}>
          <i />
          <div><div><strong>{node.title}</strong><span>{node.time}</span></div><p>{node.note}</p><small>经办人：{node.person || '未提供'}</small></div>
        </li>
      ))}
    </ol>
  )
}

export function EvidenceGallery({ files = [], emptyText = '未归集照片' }: { files?: EvidenceFile[]; emptyText?: string }) {
  const [active, setActive] = useState<EvidenceFile | null>(null)
  if (!files.length) return <div className="pxv21-evidence-empty"><FileImage size={30} /><strong>{emptyText}</strong><span>当前记录未提供可展示的现场影像。</span></div>
  return (
    <>
      <div className="pxv21-evidence-grid">
        {files.map(file => (
          <button key={file.id} type="button" className={`pxv21-evidence-card tone-${file.tone || 'blue'}`} onClick={() => setActive(file)}>
            <span className="pxv21-evidence-preview">
              {file.url ? <img src={file.url} alt={file.name} loading="lazy" /> : <Camera size={28} />}
            </span>
            <strong>{file.name}</strong><small>{file.kind}</small><Maximize2 size={16} />
          </button>
        ))}
      </div>
      {active && createPortal(
        <div className="pxv21-lightbox" role="dialog" aria-modal="true" aria-label={active.name} onClick={() => setActive(null)}>
          <button type="button" aria-label="关闭图片" onClick={() => setActive(null)}><X /></button>
          <div className={`pxv21-lightbox-image tone-${active.tone || 'blue'}`} onClick={event => event.stopPropagation()}>
            {active.url ? <img src={active.url} alt={active.name} /> : <Camera size={72} />}
            <strong>{active.name}</strong><span>{active.kind} · 现场影像</span>
          </div>
        </div>, document.body,
      )}
    </>
  )
}

export function WideDrawer({ title, enterprise, status, time, fullHref, children }: {
  title: string
  enterprise: string
  status: string
  time: string
  fullHref: string
  children: ReactNode
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const close = () => {
    if (location.state && (location.state as { drawer?: boolean }).drawer) navigate(-1)
    else navigate(buildQueryHref(location.pathname, location.search, { preview: null }), { replace: true })
  }

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') close() }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  })

  return createPortal(
    <div className="pxv21-drawer-layer" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) close() }}>
      <aside className="pxv21-drawer" role="dialog" aria-modal="true" aria-label={`${title}快速详情`}>
        <header>
          <div><span className="pxv21-drawer-kicker">快速查看</span><h2>{title}</h2><p>{enterprise} · {time || '时间未提供'}</p></div>
          <StatusPill value={status} />
          <Link className="pxv21-primary-action" to={fullHref}>查看完整记录 <ChevronRight size={17} /></Link>
          <button type="button" className="pxv21-icon-button" onClick={close} aria-label="关闭详情"><X /></button>
        </header>
        <div className="pxv21-drawer-content">{children}</div>
      </aside>
    </div>, document.body,
  )
}

export function DetailPageShell({ eyebrow, title, enterprise, status, time, backHref, children, onPrint }: {
  eyebrow: string
  title: string
  enterprise: string
  status: string
  time: string
  backHref: string
  children: ReactNode
  onPrint?: () => void
}) {
  return (
    <div className="pxv2-page-stack pxv21-detail-page">
      <div className="pxv21-detail-hero">
        <div><Link to={backHref}><ArrowLeft size={17} />返回原清单</Link><span>{eyebrow}</span><h1>{title}</h1><p>{enterprise} · {time || '时间未提供'}</p></div>
        <div><StatusPill value={status} /><button type="button" onClick={onPrint || (() => window.print())}><Printer size={17} />打印 / 导出</button></div>
      </div>
      {children}
    </div>
  )
}

export function Pager({ page, totalPages, total, pageSize, onPage }: { page: number; totalPages: number; total: number; pageSize: number; onPage: (page: number) => void }) {
  return (
    <div className="pxv2-pagination">
      <span>共 {total} 条 · 每页 {pageSize} 条</span>
      <div>
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft size={15} />上一页</button>
        <strong>第 {page} / {totalPages} 页</strong>
        <button type="button" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>下一页<ChevronRight size={15} /></button>
      </div>
    </div>
  )
}
