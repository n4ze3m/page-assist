import { Dropdown, Tooltip, ConfigProvider, Modal } from "antd"
import {
  CopyCheckIcon,
  CopyIcon,
  DownloadIcon,
  TableIcon,
  ExpandIcon,
  XIcon
} from "lucide-react"
import { FC, useState, useMemo, useRef } from "react"
import { useTranslation } from "react-i18next"

interface TableProps {
  children: React.ReactNode
}

interface TableData {
  headers: string[]
  rows: string[][]
}

export const TableBlock: FC<TableProps> = ({ children }) => {
  const [copyStatus, setCopyStatus] = useState<string>("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { t } = useTranslation("common")
  const ref = useRef<HTMLDivElement>(null)

  const parseData = () => {
    // get table from ref
    const table = ref.current
    if (!table) return

    const headers: string[] = []
    const rows: string[][] = []

    const headerCells = table.querySelectorAll("thead th")
    headerCells.forEach((cell) => {
      headers.push(cell.textContent || "")
    })

    const bodyRows = table.querySelectorAll("tbody tr")
    bodyRows.forEach((row) => {
      const rowData: string[] = []
      const cells = row.querySelectorAll("td")
      cells.forEach((cell) => {
        rowData.push(cell.textContent || "")
      })
      rows.push(rowData)
    })

    return { headers, rows }
  }

  const convertToCSV = () => {
    const tableData = parseData()
    if (!tableData) return

    const escapeCSV = (value: string): string => {
      if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    }

    const csvRows = []

    // Add headers
    if (tableData.headers.length > 0) {
      csvRows.push(tableData.headers.map(escapeCSV).join(","))
    }

    // Add data rows
    tableData.rows.forEach((row) => {
      csvRows.push(row.map(escapeCSV).join(","))
    })

    return csvRows.join("\n")
  }

  const handleCopyCSV = () => {
    const csvContent = convertToCSV()
    navigator.clipboard.writeText(csvContent)
    setCopyStatus("csv")
    setTimeout(() => setCopyStatus(""), 3000)
  }

  const handleDownloadCSV = () => {
    const csvContent = convertToCSV()
    downloadFile(csvContent, `table-${Date.now()}.csv`, "text/csv")
  }

  const handleExpandTable = () => {
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  const downloadFile = (
    content: string,
    filename: string,
    mimeType: string
  ) => {
    const blob = new Blob([content], { type: mimeType })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="my-4 bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex flex-row px-4 py-2 rounded-t-xl bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 flex-1">
            <TableIcon className="size-4 text-gray-600 dark:text-gray-300" />
            <span className="font-mono text-xs text-gray-700 dark:text-gray-300">
              Table
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Tooltip title="Copy as CSV">
              <button
                onClick={handleCopyCSV}
                className="flex gap-1.5 items-center rounded bg-none p-1 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-gray-800 dark:hover:text-gray-100 focus:outline-none transition-colors">
                {copyStatus === "csv" ? (
                  <CopyCheckIcon className="size-4 text-green-500" />
                ) : (
                  <CopyIcon className="size-4" />
                )}
              </button>
            </Tooltip>

            <ConfigProvider
              theme={{
                components: {
                  Dropdown: {
                    colorBgElevated: "#1a1a1a",
                    colorText: "#ffffff",
                    colorBgTextHover: "#2a2a2a",
                    borderRadiusOuter: 8,
                    boxShadowSecondary:
                      "0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)"
                  }
                }
              }}>
              <Tooltip title="Download CSV">
                <button
                  onClick={handleDownloadCSV}
                  className="flex gap-1.5 items-center rounded bg-none p-1 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-gray-800 dark:hover:text-gray-100 focus:outline-none transition-colors">
                  <DownloadIcon className="size-4" />
                </button>
              </Tooltip>
            </ConfigProvider>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div
            ref={ref}
            className={`prose prose-gray dark:prose-invert max-w-none [&_table]:table-fixed [&_table]:w-full [&_table]:border-collapse [&_thead]:bg-neutral-50 [&_thead]:dark:bg-[#2a2a2a] [&_th]:px-6 [&_th]:py-4 [&_th]:text-left [&_th]:font-semibold [&_th]:text-gray-900 [&_th]:dark:text-gray-100 [&_th]:uppercase [&_th]:tracking-wider [&_th]:whitespace-nowrap [&_th:nth-child(1)]:w-1/2 [&_th:nth-child(2)]:w-1/2 [&_th:nth-child(3)]:w-1/3 [&_th]:border-b [&_th]:border-gray-200 [&_th]:dark:border-gray-700 [&_td]:px-6 [&_td]:py-4 [&_td]:text-gray-700 [&_td]:dark:text-gray-300 [&_td]:text-left [&_td]:whitespace-nowrap  [&_td]:border-b [&_td]:border-gray-200 [&_td]:dark:border-gray-700 [&_tr:last-child_td]:border-b-0`}
            style={{
              fontSize: `calc(0.875rem * var(--font-scale, 1))`
            }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
