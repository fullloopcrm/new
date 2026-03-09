export function toCSV(data: Record<string, unknown>[], columns?: string[]): string {
  if (data.length === 0) return ''
  const cols = columns || Object.keys(data[0])
  const header = cols.join(',')
  const rows = data.map(row =>
    cols.map(col => {
      const val = row[col]
      if (val === null || val === undefined) return ''
      const str = String(val)
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str
    }).join(',')
  )
  return [header, ...rows].join('\n')
}

export function downloadCSV(data: Record<string, unknown>[], filename: string, columns?: string[]) {
  const csv = toCSV(data, columns)
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
