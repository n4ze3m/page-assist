import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, Skeleton, Tag } from 'antd'
import { tldwClient } from '@/services/tldw/TldwApiClient'
import { ProviderIcons } from '@/components/Common/ProviderIcon'

type ProviderMap = Record<string, Array<{ id: string, context_length?: number, capabilities?: string[] }>>

export const AvailableModelsList: React.FC = () => {
  const { data, status } = useQuery({
    queryKey: ['tldw-providers-models'],
    queryFn: async () => {
      await tldwClient.initialize()
      // Prefer flattened metadata; then group by provider
      const meta = await tldwClient.getModelsMetadata().catch(() => [])
      const normalized: ProviderMap = {}
      for (const item of (meta as any[])) {
        const provider = String(item.provider || 'unknown')
        const id = String(item.id || item.model || item.name)
        const context_length = typeof item.context_length === 'number' ? item.context_length : (typeof item.contextLength === 'number' ? item.contextLength : undefined)
        const capabilities = Array.isArray(item.capabilities) ? item.capabilities : (Array.isArray(item.features) ? item.features : undefined)
        if (!normalized[provider]) normalized[provider] = []
        // Avoid duplicates
        if (!normalized[provider].some((m) => m.id === id)) {
          normalized[provider].push({ id, context_length, capabilities })
        }
      }
      // Sort each provider list and providers alphabetically
      for (const p of Object.keys(normalized)) {
        normalized[p] = normalized[p].sort((a, b) => a.id.localeCompare(b.id))
      }
      return normalized
    }
  })

  if (status === 'pending') {
    return <Skeleton paragraph={{ rows: 6 }} />
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Object.entries(data || {}).map(([provider, models]) => (
        <Card
          key={provider}
          title={
            <div className="flex items-center gap-2">
              <ProviderIcons provider={provider} className="h-4 w-4" />
              <span className="capitalize">{provider}</span>
              <Tag>{(models as any[]).length}</Tag>
            </div>
          }
        >
          <div className="flex flex-col gap-2">
            {(models as any[]).map((m: any) => (
              <div key={m.id} className="flex items-center gap-2 text-xs flex-wrap">
                <Tag bordered>{m.id}</Tag>
                {typeof m.context_length === 'number' && (
                  <Tag color="blue" bordered>ctx {m.context_length}</Tag>
                )}
                {Array.isArray(m.capabilities) && m.capabilities.slice(0,4).map((c: string) => (
                  <Tag key={c} color="green" bordered>{c}</Tag>
                ))}
              </div>
            ))}
          </div>
        </Card>
      ))}
      {Object.keys(data || {}).length === 0 && (
        <div className="text-sm text-gray-600 dark:text-gray-300">No providers available.</div>
      )}
    </div>
  )}

export default AvailableModelsList
