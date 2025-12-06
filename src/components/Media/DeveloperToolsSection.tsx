import { useState } from 'react'
import { ChevronDown, ChevronUp, Code, Copy } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { message } from 'antd'

interface DeveloperToolsSectionProps {
  data: unknown
  label?: string
  defaultExpanded?: boolean
}

export function DeveloperToolsSection({
  data,
  label,
  defaultExpanded = false
}: DeveloperToolsSectionProps) {
  const { t } = useTranslation(['review'])
  const [expanded, setExpanded] = useState(defaultExpanded)

  let jsonString: string | null = null
  if (data != null) {
    try {
      jsonString = JSON.stringify(data, null, 2)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to stringify data in DeveloperToolsSection', err)
      jsonString = null
    }
  }

  const handleCopy = async () => {
    if (!jsonString) return
    if (!navigator.clipboard?.writeText) {
      message.error(
        t(
          'mediaPage.copyNotSupported',
          'Copy is not supported here'
        )
      )
      return
    }
    try {
      await navigator.clipboard.writeText(jsonString)
      message.success(
        t('mediaPage.jsonCopied', 'JSON copied to clipboard')
      )
    } catch {
      message.error(t('mediaPage.copyFailed', 'Failed to copy'))
    }
  }

  return (
    <div className="bg-white dark:bg-[#171717] border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls="developer-tools-panel"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-[#0c0c0c] hover:bg-gray-100 dark:hover:bg-[#151515] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {label || t('mediaPage.developerTools', 'Developer Tools')}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {expanded && (
        <div
          id="developer-tools-panel"
          className="p-3 bg-white dark:bg-[#171717] animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {t('mediaPage.rawJsonData', 'Raw JSON Data')}
            </span>
            {jsonString && (
              <button
                type="button"
                onClick={handleCopy}
                className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                title={t('mediaPage.copyJson', 'Copy JSON')}
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {jsonString ? (
            <div className="rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111] overflow-auto max-h-96">
              <pre className="text-xs p-3 whitespace-pre-wrap break-all text-gray-700 dark:text-gray-300 font-mono">
                {jsonString}
              </pre>
            </div>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              {t('mediaPage.noDataLoaded', 'No data loaded')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
