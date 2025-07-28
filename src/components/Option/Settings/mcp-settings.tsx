import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/dexie/schema';
import { McpServerConfig } from '@/db/dexie/types';
import { McpTool } from '@/mcp/types';
import { McpClient } from '@/mcp/McpClient';
import { Table, Switch, Space, Popconfirm, Empty, Tooltip, Skeleton } from 'antd';
import { McpServerModal } from './mcp-settings-server';
import { generateID } from '@/db';

export const McpSettings = () => {
  const { t } = useTranslation(['settings', 'common']);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<McpServerConfig | null>(null);
  const [serverTools, setServerTools] = useState<Record<string, McpTool[]>>({});
  const [loadingTools, setLoadingTools] = useState<Record<string, boolean>>({});

  const mcpServers = useLiveQuery(() => db.mcpServers.toArray(), []);

  const handleToggleEnabled = async (server: McpServerConfig) => {
    await db.mcpServers.update(server.id, { enabled: !server.enabled });
  };

  const handleAdd = () => {
    setEditingServer(null);
    setIsModalOpen(true);
  };

  const handleEdit = (server: McpServerConfig) => {
    setEditingServer(server);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    await db.mcpServers.delete(id);
  };

  const handleSave = async (serverData: McpServerConfig) => {
    if (editingServer) {
      await db.mcpServers.update(editingServer.id, serverData);
    } else {
      await db.mcpServers.add({ ...serverData, id: generateID(), enabled: true });
    }
  };

  const columns = [
    {
      title: t('mcpSettings.table.status', 'Status'),
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled: boolean, record: McpServerConfig) => (
        <Switch checked={enabled} onChange={() => handleToggleEnabled(record)} />
      ),
    },
    {
      title: t('mcpSettings.table.name', 'Name'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('mcpSettings.table.url', 'URL'),
      dataIndex: 'url',
      key: 'url',
    },
    {
      title: t('mcpSettings.table.actions', 'Actions'),
      key: 'actions',
      render: (_: any, record: McpServerConfig) => (
        <div className="flex gap-4">
          <Tooltip title={t('common.edit', 'Edit')}>
            <button
              onClick={() => handleEdit(record)}
              className="text-gray-700 dark:text-gray-400 disabled:opacity-50">
              <PencilIcon className="w-5 h-5" />
            </button>
          </Tooltip>
          <Popconfirm
            title={t('mcpSettings.deleteConfirm', 'Are you sure you want to delete this server?')}
            onConfirm={() => handleDelete(record.id)}
            okText={t('common.yes', 'Yes')}
            cancelText={t('common.no', 'No')}
          >
            <Tooltip title={t('common.delete', 'Delete')}>
              <button className="text-red-500 dark:text-red-400">
                <Trash2Icon className="w-5 h-5" />
              </button>
            </Tooltip>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div>
      {!mcpServers ? (
        <Skeleton active paragraph={{ rows: 5 }} />
      ) : (
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={handleAdd}
              className="inline-flex items-center rounded-md border border-transparent bg-black px-2 py-2 text-md font-medium leading-4 text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-100 dark:focus:ring-gray-500 dark:focus:ring-offset-gray-100 disabled:opacity-50">
              {t('mcpSettings.addBtn', 'Add New Tools')}
            </button>
          </div>
          <Table
            bordered
            columns={columns}
            dataSource={mcpServers}
            rowKey="id"
            locale={{ emptyText: <Empty description={t('mcpSettings.noServers', 'No MCP servers configured.')} /> }}
            expandable={{
              expandedRowRender: (record) => (
                <div className="p-4 bg-gray-50 dark:bg-gray-800">
                  <h4 className="font-semibold mb-2">{t('mcpSettings.toolsExposed', 'Tools:')}</h4>
                  {loadingTools[record.id] && <p>{t('common.loading', 'Loading...')}</p>}
                  {serverTools[record.id] && (
                    <ul>
                      {serverTools[record.id].map(tool => (
                        <li key={tool.name} className="mb-2">
                          <p className="font-semibold">{tool.name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{tool.description}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ),
              onExpand: async (expanded, record) => {
                if (expanded && !serverTools[record.id]) {
                  setLoadingTools(prev => ({ ...prev, [record.id]: true }));
                  const client = new McpClient(record);
                  try {
                    const tools = await client.connect();
                    setServerTools(prev => ({ ...prev, [record.id]: tools }));
                  } catch (error) {
                    console.error('Failed to fetch tools:', error);
                  } finally {
                    setLoadingTools(prev => ({ ...prev, [record.id]: false }));
                    await client.cleanup();
                  }
                }
              }
            }}
          />
        </>
      )}

      <McpServerModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        server={editingServer}
      />
    </div>
  );
};