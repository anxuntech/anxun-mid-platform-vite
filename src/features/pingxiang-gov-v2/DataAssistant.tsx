import { Bot, ChevronRight, LoaderCircle, Send, ShieldCheck, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authenticatedFetch } from '../../auth'
import type { GovProjectConfig } from '../gov-projects/projectConfig'
import './DataAssistant.css'

type AssistantIntent = {
  intent: string
  params: Record<string, string | number>
}

type AssistantItem = {
  id: string
  companyId: string
  companyName: string
  title: string
  status: string
  occurredAt: string
  recordType: 'hazard' | 'inspection' | 'work_permit' | 'training' | 'company'
}

type AssistantResult = {
  answer: string
  intent: string
  params: Record<string, string | number>
  total: number
  items: AssistantItem[]
  scope: {
    companyName: string
    status: string
    startDate: string
    endDate: string
    sourceEnvironment: string
  }
  remainingToday: number
  modelFallback: boolean
  notice: string
}

const suggestions = [
  { label: '项目运行概况', intent: 'project_summary' },
  { label: '未闭环隐患', intent: 'query_unclosed_hazards' },
  { label: '近期巡检记录', intent: 'query_inspections' },
  { label: '近期无记录企业', intent: 'query_inactive_companies' },
]

const itemHref = (basePath: string, item: AssistantItem) => {
  if (item.recordType === 'company') return `${basePath}/companies/${encodeURIComponent(item.companyId)}`
  const segment = item.recordType === 'hazard'
    ? 'hazards'
    : item.recordType === 'inspection'
      ? 'inspections'
      : item.recordType === 'work_permit'
        ? 'work-permits'
        : 'trainings'
  return `${basePath}/${segment}/${encodeURIComponent(item.id)}`
}

export default function DataAssistant({ config }: { config: GovProjectConfig }) {
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<AssistantResult | null>(null)
  const [previous, setPrevious] = useState<AssistantIntent | null>(null)

  const submit = async (presetIntent?: string) => {
    if (pending || (!presetIntent && !question.trim())) return
    setPending(true)
    setError('')
    try {
      const endpoint = config.projectId === 'pingxiang'
        ? '/api/gov/pingxiang/assistant/query'
        : `/api/gov/projects/${encodeURIComponent(config.projectId)}/assistant/query`
      const response = await authenticatedFetch(
        endpoint,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            presetIntent
              ? { presetIntent, params: { periodDays: 30 } }
              : { question: question.trim(), previous },
          ),
        },
      )
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload.success === false) {
        throw new Error(payload.message || '数据助手暂时不可用')
      }
      setResult(payload as AssistantResult)
      setPrevious({ intent: payload.intent, params: payload.params || {} })
      setQuestion('')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '数据助手暂时不可用')
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <button className="pxai-launcher" type="button" onClick={() => setOpen(true)}>
        <Bot size={20} />
        <span>数据助手</span>
      </button>
      {open && <div className="pxai-backdrop" onClick={() => setOpen(false)} />}
      <aside className={`pxai-panel ${open ? 'open' : ''}`} aria-hidden={!open} aria-label="项目数据助手">
        <header>
          <div className="pxai-heading">
            <span className="pxai-bot"><Bot size={22} /></span>
            <div><strong>项目数据助手</strong><small>{config.countyName} · 管理员灰度</small></div>
          </div>
          <button type="button" aria-label="关闭数据助手" onClick={() => setOpen(false)}><X size={20} /></button>
        </header>

        <div className="pxai-content">
          <div className="pxai-safety">
            <ShieldCheck size={17} />
            <p>当前仅查询本账号已授权项目中的受控测试数据。模型不接触数据库、账号密码或跨县域数据。</p>
          </div>
          <div className="pxai-suggestions">
            {suggestions.map(item => (
              <button key={item.intent} type="button" disabled={pending} onClick={() => submit(item.intent)}>
                {item.label}
              </button>
            ))}
          </div>

          {!result && !error && (
            <div className="pxai-empty">
              <Bot size={32} />
              <strong>可以询问项目运行数据</strong>
              <p>例如：近30天有哪些未闭环隐患？本月巡检记录有多少？</p>
            </div>
          )}
          {error && <div className="pxai-error">{error}</div>}
          {result && (
            <div className="pxai-result">
              <div className="pxai-answer">{result.answer}</div>
              <dl>
                <div><dt>统计范围</dt><dd>{result.scope.startDate} 至 {result.scope.endDate}</dd></div>
                <div><dt>企业范围</dt><dd>{result.scope.companyName}</dd></div>
                <div><dt>状态范围</dt><dd>{result.scope.status}</dd></div>
                <div><dt>数据环境</dt><dd>受控测试数据</dd></div>
              </dl>
              {result.items.length > 0 && (
                <div className="pxai-items">
                  {result.items.map(item => (
                    <Link key={`${item.recordType}-${item.id}`} to={itemHref(config.basePath, item)}>
                      <span><strong>{item.title}</strong><small>{item.companyName} · {item.status}</small></span>
                      <ChevronRight size={17} />
                    </Link>
                  ))}
                </div>
              )}
              <p className="pxai-notice">{result.notice} 今日剩余 {result.remainingToday} 次。</p>
            </div>
          )}
        </div>

        <form onSubmit={event => { event.preventDefault(); submit() }}>
          <textarea
            value={question}
            maxLength={1000}
            rows={3}
            placeholder="请输入企业、隐患、巡检、作业票或培训相关问题"
            onChange={event => setQuestion(event.target.value)}
          />
          <button type="submit" disabled={pending || !question.trim()}>
            {pending ? <LoaderCircle className="pxai-spin" size={18} /> : <Send size={18} />}
            <span>{pending ? '正在查询' : '发送'}</span>
          </button>
        </form>
      </aside>
    </>
  )
}
