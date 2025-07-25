import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Form, Input, message } from 'antd';
import { McpServerConfig } from '@/db/dexie/types';
import { McpClient } from '@/mcp/McpClient';

interface McpServerModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (server: McpServerConfig) => void;
  server?: McpServerConfig | null;
}

const SpinnerIcon = () => (
  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

export const McpServerModal: React.FC<McpServerModalProps> = ({ open, onClose, onSave, server }) => {
  const { t } = useTranslation(['mcpserver', 'settings', 'common']);
  const [form] = Form.useForm();
  const [isTesting, setIsTesting] = useState(false);
  const [isConnectionSuccessful, setIsConnectionSuccessful] = useState(false);

  // Define button styles here for consistency and reusability
  const primaryButtonClasses = "inline-flex items-center justify-center rounded-md border border-transparent bg-black px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-100 dark:focus:ring-gray-500 dark:focus:ring-offset-gray-100 disabled:opacity-50";

  const secondaryButtonClasses = "inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-600 disabled:opacity-50";


  useEffect(() => {
    if (server) {
      form.setFieldsValue(server);
    } else {
      form.resetFields();
    }
    setIsConnectionSuccessful(false);
  }, [server, open]);

  const handleTestConnection = async () => {
    try {
      const values = await form.validateFields();
      setIsTesting(true);
      const client = new McpClient(values as McpServerConfig);
      try {
        const tools = await client.connect();
        message.success(t('mcpSettings.testSuccess', { count: tools.length }));
        setIsConnectionSuccessful(true);
      } finally {
        await client.cleanup();
      }
    } catch (error) {
      message.error(t('mcpSettings.testFailure', 'Connection failed. Please check the URL and API key.'));
      setIsConnectionSuccessful(false);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      onSave({ ...server, ...values });
      onClose();
    } catch (error) {
      console.error('Failed to save server:', error);
    }
  };

  return (
    <Modal
      title={server ? t('mcpSettings.editServer', 'Edit MCP Server') : t('mcpSettings.addServer', 'Add MCP Server')}
      open={open}
      onCancel={onClose}
      // Set footer to null to use our own custom footer
      footer={null}
    >
      <Form form={form} layout="vertical" name="mcp_server_form">
        <Form.Item
          name="name"
          label={t('mcpSettings.form.name', 'Name')}
          rules={[{ required: true, message: t('mcpSettings.form.nameRequired', 'Please enter a server name') }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="url"
          label={t('mcpSettings.form.url', 'URL')}
          rules={[{ required: true, type: 'url', message: t('mcpSettings.form.urlRequired', 'Please enter a valid URL') }]}
        >
          <Input placeholder="http://localhost:8000" />
        </Form.Item>
        <Form.Item
          name="apiKey"
          label={t('mcpSettings.form.apiKey', 'API Key (Optional)')}
        >
          <Input.Password />
        </Form.Item>
      </Form>
      
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button type="button" onClick={onClose} className={secondaryButtonClasses}>
          {t('common.cancel', 'Cancel')}
        </button>
        <button type="button" onClick={handleTestConnection} className={secondaryButtonClasses} disabled={isTesting}>
          {isTesting && <SpinnerIcon />}
          {t('mcpSettings.testConnection', 'Test Connection')}
        </button>
        <button type="submit" onClick={handleSave} className={primaryButtonClasses} disabled={!isConnectionSuccessful && !server}>
          {t('common.save', 'Save')}
        </button>
      </div>
    </Modal>
  );
};