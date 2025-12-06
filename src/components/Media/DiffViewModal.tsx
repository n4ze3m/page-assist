import { useState, useMemo } from 'react'
import { Modal, Radio } from 'antd'
import { useTranslation } from 'react-i18next'

interface DiffViewModalProps {
  open: boolean
  onClose: () => void
  leftText: string
  rightText: string
  leftLabel?: string
  rightLabel?: string
}

type DiffLine = { type: 'same' | 'add' | 'del'; text: string }

// Compute line-by-line diff using LCS algorithm
function computeDiff(oldStr: string, newStr: string): DiffLine[] {
  const a = String(oldStr || '').split('\n')
  const b = String(newStr || '').split('\n')
  const n = a.length
  const m = b.length

  // Build LCS length table
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  // Trace back to build diff
  const out: DiffLine[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ type: 'same', text: a[i] })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: 'del', text: a[i] })
      i++
    } else {
      out.push({ type: 'add', text: b[j] })
      j++
    }
  }
  while (i < n) {
    out.push({ type: 'del', text: a[i++] })
  }
  while (j < m) {
    out.push({ type: 'add', text: b[j++] })
  }
  return out
}

export function DiffViewModal({
  open,
  onClose,
  leftText,
  rightText,
  leftLabel = 'Left',
  rightLabel = 'Right'
}: DiffViewModalProps) {
  const { t } = useTranslation(['review'])
  const [viewMode, setViewMode] = useState<'unified' | 'sideBySide'>('unified')

  const diffLines = useMemo(() => computeDiff(leftText, rightText), [leftText, rightText])

  // Build side-by-side view data
  const sideBySideData = useMemo(() => {
    const left: Array<{ num: number; text: string; type: 'same' | 'del' | 'empty' }> = []
    const right: Array<{ num: number; text: string; type: 'same' | 'add' | 'empty' }> = []

    let leftNum = 1
    let rightNum = 1

    for (const line of diffLines) {
      if (line.type === 'same') {
        left.push({ num: leftNum++, text: line.text, type: 'same' })
        right.push({ num: rightNum++, text: line.text, type: 'same' })
      } else if (line.type === 'del') {
        left.push({ num: leftNum++, text: line.text, type: 'del' })
        right.push({ num: 0, text: '', type: 'empty' })
      } else {
        left.push({ num: 0, text: '', type: 'empty' })
        right.push({ num: rightNum++, text: line.text, type: 'add' })
      }
    }

    return { left, right }
  }, [diffLines])

  const getLineClass = (type: string) => {
    switch (type) {
      case 'add':
        return 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
      case 'del':
        return 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
      case 'empty':
        return 'bg-gray-50 dark:bg-gray-800/50'
      default:
        return 'text-gray-700 dark:text-gray-300'
    }
  }

  const getLinePrefix = (type: string) => {
    switch (type) {
      case 'add':
        return '+'
      case 'del':
        return '-'
      default:
        return ' '
    }
  }

  return (
    <Modal
      title={t('mediaPage.diffView', 'Diff View')}
      open={open}
      onCancel={onClose}
      footer={null}
      width={900}
      className="diff-modal"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            <span className="font-medium text-red-600 dark:text-red-400">{leftLabel}</span>
            {' → '}
            <span className="font-medium text-green-600 dark:text-green-400">{rightLabel}</span>
          </span>
        </div>
        <Radio.Group
          value={viewMode}
          onChange={e => setViewMode(e.target.value)}
          size="small"
        >
          <Radio.Button value="unified">{t('mediaPage.unified', 'Unified')}</Radio.Button>
          <Radio.Button value="sideBySide">{t('mediaPage.sideBySide', 'Side by Side')}</Radio.Button>
        </Radio.Group>
      </div>

      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden max-h-[60vh] overflow-y-auto">
        {viewMode === 'unified' ? (
          <div className="font-mono text-xs">
            {diffLines.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                {t('mediaPage.noDifferences', 'No differences found')}
              </div>
            ) : (
              diffLines.map((line, idx) => (
                <div
                  key={idx}
                  className={`px-3 py-0.5 ${getLineClass(line.type)}`}
                >
                  <span className="select-none text-gray-400 dark:text-gray-500 mr-2">
                    {getLinePrefix(line.type)}
                  </span>
                  <span className="whitespace-pre-wrap break-all">{line.text || ' '}</span>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="flex font-mono text-xs">
            {/* Left side */}
            <div className="flex-1 border-r border-gray-200 dark:border-gray-700">
              <div className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium border-b border-gray-200 dark:border-gray-700">
                {leftLabel}
              </div>
              {sideBySideData.left.map((line, idx) => (
                <div
                  key={idx}
                  className={`px-3 py-0.5 flex ${getLineClass(line.type)}`}
                >
                  <span className="w-8 text-right text-gray-400 dark:text-gray-500 mr-2 select-none flex-shrink-0">
                    {line.num > 0 ? line.num : ''}
                  </span>
                  <span className="whitespace-pre-wrap break-all flex-1">{line.text || ' '}</span>
                </div>
              ))}
            </div>
            {/* Right side */}
            <div className="flex-1">
              <div className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium border-b border-gray-200 dark:border-gray-700">
                {rightLabel}
              </div>
              {sideBySideData.right.map((line, idx) => (
                <div
                  key={idx}
                  className={`px-3 py-0.5 flex ${getLineClass(line.type)}`}
                >
                  <span className="w-8 text-right text-gray-400 dark:text-gray-500 mr-2 select-none flex-shrink-0">
                    {line.num > 0 ? line.num : ''}
                  </span>
                  <span className="whitespace-pre-wrap break-all flex-1">{line.text || ' '}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-100 dark:bg-red-900/30"></span>
          {t('mediaPage.removed', 'Removed')}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-green-100 dark:bg-green-900/30"></span>
          {t('mediaPage.added', 'Added')}
        </span>
      </div>
    </Modal>
  )
}
