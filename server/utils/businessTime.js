const defaultTimeZone = 'Asia/Shanghai'

const formatterFor = timeZone => new Intl.DateTimeFormat('en-CA', {
  timeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

export const getBusinessTimeZone = () =>
  String(process.env.BUSINESS_TIME_ZONE || defaultTimeZone).trim() || defaultTimeZone

const normalizeDateInput = value => {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  const naiveDateTime = trimmed.match(
    /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?)$/,
  )
  if (naiveDateTime && getBusinessTimeZone() === defaultTimeZone) {
    return `${naiveDateTime[1]}T${naiveDateTime[2]}+08:00`
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed) && getBusinessTimeZone() === defaultTimeZone) {
    return `${trimmed}T00:00:00+08:00`
  }
  return trimmed
}

export const toMysqlDateTime = (value, fallback = new Date()) => {
  const date = value ? new Date(normalizeDateInput(value)) : fallback
  const safeDate = Number.isNaN(date.getTime()) ? fallback : date
  const parts = Object.fromEntries(
    formatterFor(getBusinessTimeZone())
      .formatToParts(safeDate)
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, part.value]),
  )
  const milliseconds = String(safeDate.getMilliseconds()).padStart(3, '0')
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}.${milliseconds}`
}
