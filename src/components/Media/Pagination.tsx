import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  totalItems: number
  itemsPerPage: number
  currentItemsCount: number
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  currentItemsCount
}: PaginationProps) {
  const [jumpToPage, setJumpToPage] = useState('')

  // Handle empty results case
  if (currentItemsCount === 0) {
    return (
      <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-[#171717]">
        <div className="text-xs text-gray-600 dark:text-gray-400 text-center">
          0 of {totalItems} results
        </div>
      </div>
    )
  }

  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = (currentPage - 1) * itemsPerPage + currentItemsCount

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1)
    }
  }

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1)
    }
  }

  const handlePageClick = (page: number) => {
    onPageChange(page)
  }

  const handleJumpToPage = () => {
    const pageNum = parseInt(jumpToPage, 10)
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum)
      setJumpToPage('')
    }
  }

  const handleJumpKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleJumpToPage()
    }
  }

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxPagesToShow = 5

    if (totalPages <= maxPagesToShow) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (currentPage > 3) {
        pages.push('...')
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (currentPage < totalPages - 2) {
        pages.push('...')
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages)
      }
    }

    return pages
  }

  if (totalPages <= 1) {
    return (
      <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-[#171717]">
        <div className="text-xs text-gray-600 dark:text-gray-400 text-center">
          {currentItemsCount} of {totalItems} results
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-[#171717]">
      {/* Items count */}
      <div className="text-xs text-gray-600 dark:text-gray-400 mb-2 text-center">
        Showing {startItem}-{endItem} of {totalItems}
      </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-center gap-1 mb-2">
        {/* Previous button */}
        <button
          onClick={handlePrevious}
          disabled={currentPage === 1}
          className="px-1.5 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
        </button>

        {/* Page numbers */}
        {getPageNumbers().map((page, index) => {
          if (page === '...') {
            return (
              <span
                key={`ellipsis-${index}`}
                className="px-1.5 py-0.5 text-gray-400 dark:text-gray-500 text-xs"
              >
                ...
              </span>
            )
          }

          const pageNum = page as number
          const isActive = pageNum === currentPage

          return (
            <button
              key={pageNum}
              onClick={() => handlePageClick(pageNum)}
              className={`px-2 py-0.5 rounded text-xs transition-colors ${
                isActive
                  ? 'bg-blue-600 dark:bg-blue-600 text-white font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {pageNum}
            </button>
          )
        })}

        {/* Next button */}
        <button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className="px-1.5 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          <ChevronRight className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Jump to page - only show if there are many pages */}
      {totalPages > 5 && (
        <div className="flex items-center justify-center gap-1.5">
          <label htmlFor="jump-to-page" className="text-xs text-gray-600 dark:text-gray-400">
            Page:
          </label>
          <input
            id="jump-to-page"
            type="number"
            min="1"
            max={totalPages}
            value={jumpToPage}
            onChange={(e) => setJumpToPage(e.target.value)}
            onKeyPress={handleJumpKeyPress}
            placeholder={`1-${totalPages}`}
            className="w-16 px-1.5 py-0.5 text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0c0c0c] text-gray-900 dark:text-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent"
          />
          <button
            onClick={handleJumpToPage}
            className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded transition-colors"
          >
            Go
          </button>
        </div>
      )}
    </div>
  )
}
