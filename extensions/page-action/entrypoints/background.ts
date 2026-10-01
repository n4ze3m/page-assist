import { createMcpServer } from '@/lib/mcp-server';
import { PortTransport } from '@/lib/port-transport';
import {
  addAllowedExtension,
  DEFAULT_ALLOWED_EXTENSIONS,
  getAllowedExtensions,
  getToolToggles,
  isExtensionAllowed,
  listPendingConsents,
  removeAllowedExtension,
  requestConsent,
  resolveConsent,
  setToolEnabled,
} from '@/lib/consent';
import { getAttachedTabs, setupCdpLifecycle } from '@/lib/cdp';
import { TOOLS } from '@/lib/tools';
import type { PopupRequest, StatusResponse } from '@/lib/messages';

export default defineBackground(() => {
  setupCdpLifecycle();

  chrome.runtime.onConnectExternal.addListener(handleExternalConnect);
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    handlePopupMessage(message as PopupRequest)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error: unknown) =>
        sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) }),
      );
    return true;
  });
});

async function handleExternalConnect(port: chrome.runtime.Port): Promise<void> {
  if (port.name !== 'mcp') {
    port.disconnect();
    return;
  }

  const extensionId = port.sender?.id;
  const transport = new PortTransport(port);

  try {
    let allowed = extensionId ? await isExtensionAllowed(extensionId) : false;

    if (!allowed && extensionId) {
      allowed = await requestConsent(extensionId);
      if (allowed) await addAllowedExtension(extensionId);
    }

    if (!allowed) {
      port.postMessage({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32001, message: 'Connection denied by the user.' },
      });
      await transport.close();
      return;
    }

    const server = createMcpServer();
    await server.connect(transport);
    port.onDisconnect.addListener(() => {
      void server.close().catch(() => {});
    });
  } catch {
    await transport.close();
  }
}

async function handlePopupMessage(message: PopupRequest): Promise<unknown> {
  switch (message.type) {
    case 'pa:getStatus': {
      const status: StatusResponse = {
        allowed: await getAllowedExtensions(),
        defaultAllowed: DEFAULT_ALLOWED_EXTENSIONS,
        pending: listPendingConsents(),
        toggles: await getToolToggles(),
        tools: TOOLS.map((tool) => ({ name: tool.name, description: tool.description })),
        attachedTabs: getAttachedTabs(),
      };
      return status;
    }
    case 'pa:resolveConsent':
      return resolveConsent(message.id, message.approve);
    case 'pa:addAllowed':
      await addAllowedExtension(message.id);
      return true;
    case 'pa:removeAllowed':
      await removeAllowedExtension(message.id);
      return true;
    case 'pa:setTool':
      await setToolEnabled(message.name, message.enabled);
      return true;
    default:
      throw new Error('Unknown message');
  }
}
