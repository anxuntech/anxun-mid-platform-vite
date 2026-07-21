import { useMemo, useState } from 'react'
import type { VisualChartSeries } from './VisualComponents'

export type ChartTooltipExtra = { label: string; value: string }

export function InteractiveTrendChart({ labels, periods, series, extras, maxValue, onPointClick }: {
  labels: string[]
  periods: string[]
  series: VisualChartSeries[]
  extras?: ChartTooltipExtra[][]
  maxValue: number
  onPointClick: (period: string, seriesLabel?: string) => void
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [activeSeries, setActiveSeries] = useState<string | null>(null)
  const width = 640
  const height = 250
  const left = 48
  const right = 20
  const top = 18
  const bottom = 42
  const chartWidth = width - left - right
  const chartHeight = height - top - bottom
  const x = (index: number) => left + (chartWidth / Math.max(1, labels.length - 1)) * index
  const y = (value: number) => top + chartHeight - (value / Math.max(1, maxValue)) * chartHeight
  const tooltipLeft = useMemo(() => hoverIndex === null ? 0 : Math.min(76, Math.max(8, (x(hoverIndex) / width) * 100)), [hoverIndex])

  return (
    <div className="pxv21-chart-interactive" onMouseLeave={() => setHoverIndex(null)}>
      <div className="pxv2-chart-legend is-interactive">
        {series.map(item => <button key={item.label} type="button" className={activeSeries === item.label ? 'active' : ''} onClick={() => setActiveSeries(value => value === item.label ? null : item.label)}><i style={{ background: item.color }} />{item.label}</button>)}
      </div>
      <svg className="pxv2-line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="可下钻数据变化趋势">
        {[0, .25, .5, .75, 1].map(rate => {
          const value = Math.round(maxValue * rate)
          const gridY = y(value)
          return <g key={rate}><line x1={left} y1={gridY} x2={width - right} y2={gridY} className="pxv2-chart-gridline" /><text x={left - 10} y={gridY + 4} textAnchor="end" className="pxv2-axis-text">{value}</text></g>
        })}
        {labels.map((label, index) => <text key={label} x={x(index)} y={height - 10} textAnchor="middle" className="pxv2-axis-text">{label}</text>)}
        {series.map(item => {
          const muted = activeSeries && activeSeries !== item.label
          const points = item.values.map((value, index) => `${x(index)},${y(value)}`).join(' ')
          return <g key={item.label} opacity={muted ? .18 : 1}><polyline points={points} fill="none" stroke={item.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />{item.values.map((value, index) => <circle key={`${item.label}-${index}`} cx={x(index)} cy={y(value)} r="4.5" fill="#fff" stroke={item.color} strokeWidth="3" />)}</g>
        })}
        {labels.map((label, index) => <rect key={`hit-${label}`} x={x(index) - chartWidth / Math.max(2, labels.length * 2)} y={top} width={chartWidth / Math.max(1, labels.length - 1)} height={chartHeight + 24} fill="transparent" tabIndex={0} role="button" aria-label={`查看${label}数据`} onMouseEnter={() => setHoverIndex(index)} onFocus={() => setHoverIndex(index)} onClick={() => onPointClick(periods[index], activeSeries || undefined)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') onPointClick(periods[index], activeSeries || undefined) }} />)}
      </svg>
      {hoverIndex !== null && (
        <div className="pxv21-chart-tooltip" style={{ left: `${tooltipLeft}%` }} role="status">
          <strong>{labels[hoverIndex]}运行数据</strong>
          {series.map(item => <span key={item.label}><i style={{ background: item.color }} />{item.label}<b>{item.values[hoverIndex]}</b></span>)}
          {(extras?.[hoverIndex] || []).map(item => <span key={item.label} className="extra">{item.label}<b>{item.value}</b></span>)}
          <small>点击进入对应清单</small>
        </div>
      )}
    </div>
  )
}
