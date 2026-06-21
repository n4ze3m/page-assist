import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  attach,
  callPageFn,
  captureScreenshot,
  clearConsoleMessages,
  clearNetworkRequests,
  evaluateCode,
  dispatchTrustedClick,
  dragMouse,
  drawAlongPath,
  getActiveTab,
  getConsoleMessages,
  getNetworkRequests,
  insertText,
  moveMouse,
  sendCommand,
  setFileInputFiles,
} from './cdp';
import {
  paBuildPageState,
  paExtract,
  paFocusForInput,
  paGetDropdownOptions,
  paJsClick,
  paResolveClickTarget,
  paScroll,
  paSelectDropdownOption,
  paWaitForSettle,
} from './page-scripts';
import { isToolEnabled } from './consent';

type ToolContent =
  | { type: 'text'; text: string }
  | { type: 'image'; data: string; mimeType: string };

type ToolResult = string | { content: ToolContent[] };

type ToolDef<S extends z.ZodRawShape> = {
  name: string;
  description: string;
  inputSchema: S;
  handler: (args: { [K in keyof S]: z.infer<S[K]> }) => Promise<ToolResult>;
};

function defineTool<S extends z.ZodRawShape>(def: ToolDef<S>): ToolDef<S> {
  return def;
}

async function activeTabId(): Promise<number> {
  const tab = await getActiveTab();
  return tab.id!;
}

const KEY_MAP: Record<string, { key: string; code: string; keyCode: number; text?: string }> = {
  enter: { key: 'Enter', code: 'Enter', keyCode: 13, text: '\r' },
  tab: { key: 'Tab', code: 'Tab', keyCode: 9 },
  escape: { key: 'Escape', code: 'Escape', keyCode: 27 },
  backspace: { key: 'Backspace', code: 'Backspace', keyCode: 8 },
  delete: { key: 'Delete', code: 'Delete', keyCode: 46 },
  arrowup: { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
  arrowdown: { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
  arrowleft: { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
  arrowright: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
  home: { key: 'Home', code: 'Home', keyCode: 36 },
  end: { key: 'End', code: 'End', keyCode: 35 },
  pageup: { key: 'PageUp', code: 'PageUp', keyCode: 33 },
  pagedown: { key: 'PageDown', code: 'PageDown', keyCode: 34 },
};

const MODIFIERS: Record<string, number> = { alt: 1, control: 2, ctrl: 2, meta: 4, cmd: 4, shift: 8 };

export const TOOLS: ToolDef<any>[] = [
  defineTool({
    name: 'get_page_state',
    description:
      'Capture the active tab: URL, title, and a numbered list of interactive elements ([index]<tag attrs>text</tag>). Call this before acting; element indexes come from here.',
    inputSchema: {},
    handler: async () => {
      const tabId = await activeTabId();
      const state = await callPageFn(tabId, paBuildPageState);
      return [
        `URL: ${state.url}`,
        `Title: ${state.title}`,
        `Viewport: ${state.viewportWidth}x${state.viewportHeight}`,
        `Interactive elements (${state.count}):`,
        state.elements || '(none found)',
      ].join('\n');
    },
  }),
  defineTool({
    name: 'move_mouse',
    description: 'Move the mouse pointer to viewport coordinates without pressing (hover).',
    inputSchema: { x: z.number(), y: z.number() },
    handler: async ({ x, y }) => {
      const tabId = await activeTabId();
      await moveMouse(tabId, x, y);
      return `Moved to (${Math.round(x)}, ${Math.round(y)}).`;
    },
  }),
  defineTool({
    name: 'drag',
    description:
      'Press at (from_x,from_y), drag to (to_x,to_y), release. Use for sliders, drag-and-drop, or a straight stroke on a canvas.',
    inputSchema: {
      from_x: z.number(),
      from_y: z.number(),
      to_x: z.number(),
      to_y: z.number(),
      steps: z.number().int().positive().optional(),
    },
    handler: async ({ from_x, from_y, to_x, to_y, steps }) => {
      const tabId = await activeTabId();
      await dragMouse(tabId, { x: from_x, y: from_y }, { x: to_x, y: to_y }, steps ?? 16);
      return `Dragged (${Math.round(from_x)}, ${Math.round(from_y)}) to (${Math.round(to_x)}, ${Math.round(to_y)}).`;
    },
  }),
  defineTool({
    name: 'draw_path',
    description:
      'Draw a continuous freehand stroke through a list of viewport points: presses at the first point, moves through each (interpolated), then releases. Use for drawing shapes on a canvas. Select the draw tool first.',
    inputSchema: {
      points: z
        .array(z.object({ x: z.number(), y: z.number() }))
        .min(2),
      steps_between: z.number().int().positive().optional(),
    },
    handler: async ({ points, steps_between }) => {
      const tabId = await activeTabId();
      await drawAlongPath(tabId, points, steps_between ?? 12);
      return `Drew a stroke through ${points.length} points.`;
    },
  }),
  defineTool({
    name: 'click',
    description:
      'Click on the page. Provide either index (from get_page_state) or x/y viewport coordinates. button defaults to left; set double=true for a double-click.',
    inputSchema: {
      index: z.number().int().min(0).optional(),
      x: z.number().optional(),
      y: z.number().optional(),
      button: z.enum(['left', 'right', 'middle']).optional(),
      double: z.boolean().optional(),
    },
    handler: async ({ index, x, y, button, double }) => {
      const tabId = await activeTabId();
      const clickButton = button ?? 'left';
      const clickCount = double ? 2 : 1;
      const prefix = `${double ? 'Double-' : ''}${clickButton !== 'left' ? `${clickButton}-` : ''}clicked`;

      if (typeof index === 'number') {
        const target = await callPageFn(tabId, paResolveClickTarget, [index]);
        if (!target.ok) throw new Error(target.error);
        try {
          await dispatchTrustedClick(tabId, target.x, target.y, { button: clickButton, clickCount });
        } catch (error) {
          if (clickButton === 'left' && !double) {
            const fallback = await callPageFn(tabId, paJsClick, [index]);
            if (!fallback.ok) throw error;
            return `Clicked [${index}] <${target.tag}> via fallback.`;
          }
          throw error;
        }
        return `${prefix} [${index}] <${target.tag}>${target.text ? ` "${target.text}"` : ''}.`;
      }

      if (typeof x === 'number' && typeof y === 'number') {
        await dispatchTrustedClick(tabId, x, y, { button: clickButton, clickCount });
        return `${prefix} at (${Math.round(x)}, ${Math.round(y)}).`;
      }

      throw new Error('Provide either index or both x and y coordinates.');
    },
  }),
  defineTool({
    name: 'input_text',
    description: 'Type text into an input/textarea/contenteditable element by its index.',
    inputSchema: {
      index: z.number().int().min(0),
      text: z.string(),
      clear: z.boolean().optional(),
    },
    handler: async ({ index, text, clear }) => {
      const tabId = await activeTabId();
      const focus = await callPageFn(tabId, paFocusForInput, [index, clear !== false]);
      if (!focus.ok) throw new Error(focus.error);
      await insertText(tabId, text);
      return `Typed ${JSON.stringify(text)} into [${index}].`;
    },
  }),
  defineTool({
    name: 'navigate',
    description: 'Navigate the active tab to a URL.',
    inputSchema: { url: z.string().url() },
    handler: async ({ url }) => {
      const tabId = await activeTabId();
      await chrome.tabs.update(tabId, { url });
      return `Navigating to ${url}.`;
    },
  }),
  defineTool({
    name: 'scroll',
    description: 'Scroll the page. down=true scrolls down; pages is the number of viewport heights (0.5 = half).',
    inputSchema: {
      down: z.boolean().optional(),
      pages: z.number().positive().optional(),
    },
    handler: async ({ down, pages }) => {
      const tabId = await activeTabId();
      const result = await callPageFn(tabId, paScroll, [down !== false, pages ?? 1]);
      return `Scrolled ${down !== false ? 'down' : 'up'}. Position ${Math.round(result.scrollY)} / ${Math.round(result.maxY)}.`;
    },
  }),
  defineTool({
    name: 'wait_for_load',
    description:
      'Wait until the active tab finishes loading and the DOM settles (no changes for a short period). Pass seconds to wait a fixed time instead. Use after navigate or a click that triggers loading, before get_page_state.',
    inputSchema: {
      seconds: z.number().positive().optional(),
      timeout_seconds: z.number().positive().optional(),
    },
    handler: async ({ seconds, timeout_seconds }) => {
      const tabId = await activeTabId();
      if (typeof seconds === 'number') {
        await new Promise((resolve) => setTimeout(resolve, Math.min(seconds, 30) * 1000));
        return `Waited ${seconds}s.`;
      }
      const timeoutMs = Math.min(timeout_seconds ?? 10, 30) * 1000;
      try {
        const result = await callPageFn(tabId, paWaitForSettle, [timeoutMs, 500]);
        return `Page ${result.reason === 'timeout' ? 'wait timed out' : 'settled'} (readyState: ${result.readyState}).`;
      } catch (error) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return 'Waited for navigation (page context was reloading).';
      }
    },
  }),
  defineTool({
    name: 'go_back',
    description: 'Go back one entry in the active tab history.',
    inputSchema: {},
    handler: async () => {
      const tabId = await activeTabId();
      await chrome.tabs.goBack(tabId);
      return 'Navigated back.';
    },
  }),
  defineTool({
    name: 'send_keys',
    description:
      'Send a key or shortcut to the page, e.g. "Enter", "Escape", "Control+a". Modifiers: Control, Alt, Shift, Meta.',
    inputSchema: { keys: z.string() },
    handler: async ({ keys }) => {
      const tabId = await activeTabId();
      const parts = keys.split('+').map((part: string) => part.trim()).filter(Boolean);
      const keyName = parts.pop() ?? '';
      let modifiers = 0;
      for (const mod of parts) modifiers |= MODIFIERS[mod.toLowerCase()] ?? 0;
      const mapped = KEY_MAP[keyName.toLowerCase()];
      const descriptor = mapped ?? {
        key: keyName,
        code: keyName.length === 1 ? `Key${keyName.toUpperCase()}` : keyName,
        keyCode: keyName.length === 1 ? keyName.toUpperCase().charCodeAt(0) : 0,
        text: keyName.length === 1 ? keyName : undefined,
      };
      const base = {
        modifiers,
        key: descriptor.key,
        code: descriptor.code,
        windowsVirtualKeyCode: descriptor.keyCode,
        nativeVirtualKeyCode: descriptor.keyCode,
      };
      await sendCommand(tabId, 'Input.dispatchKeyEvent', {
        type: descriptor.text ? 'keyDown' : 'rawKeyDown',
        ...base,
        text: descriptor.text,
      });
      await sendCommand(tabId, 'Input.dispatchKeyEvent', { type: 'keyUp', ...base });
      return `Sent keys: ${keys}.`;
    },
  }),
  defineTool({
    name: 'extract_content',
    description: 'Return the readable text content of the active tab (truncated).',
    inputSchema: {},
    handler: async () => {
      const tabId = await activeTabId();
      const result = await callPageFn(tabId, paExtract);
      return [`URL: ${result.url}`, `Title: ${result.title}`, '', result.text].join('\n');
    },
  }),
  defineTool({
    name: 'javascript_tool',
    description:
      "Execute JavaScript in the context of the page. The code runs in the page's context and can interact with the DOM, window object, and page variables. The value of the last expression is returned (await a promise to return its resolved value).",
    inputSchema: {
      text: z.string(),
      tab_id: z.number().int().optional(),
    },
    handler: async ({ text, tab_id }) => {
      const tabId = tab_id ?? (await activeTabId());
      const value = await evaluateCode(tabId, text);
      if (value === undefined) return 'undefined';
      if (typeof value === 'string') return value;
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return String(value);
      }
    },
  }),
  defineTool({
    name: 'read_console_messages',
    description:
      'Read console messages (log, warn, error, ...) captured from the active tab since the debugger attached. Cleared on navigation.',
    inputSchema: {
      tab_id: z.number().int().optional(),
      only_errors: z.boolean().optional(),
      clear: z.boolean().optional(),
      pattern: z.string().optional(),
      limit: z.number().int().positive().optional(),
    },
    handler: async ({ tab_id, only_errors, clear, pattern, limit }) => {
      const tabId = tab_id ?? (await activeTabId());
      await attach(tabId);
      const messages = getConsoleMessages(tabId, {
        onlyErrors: only_errors,
        pattern,
        limit: limit ?? 100,
      });
      if (clear) clearConsoleMessages(tabId);
      if (messages.length === 0) return 'No console messages captured yet.';
      return messages.map((entry) => `[${entry.level}] ${entry.text}`).join('\n');
    },
  }),
  defineTool({
    name: 'read_network_requests',
    description:
      'Read HTTP requests (XHR, fetch, documents, images, ...) captured from the active tab since the debugger attached. Cleared on navigation.',
    inputSchema: {
      tab_id: z.number().int().optional(),
      url_pattern: z.string().optional(),
      clear: z.boolean().optional(),
      limit: z.number().int().positive().optional(),
    },
    handler: async ({ tab_id, url_pattern, clear, limit }) => {
      const tabId = tab_id ?? (await activeTabId());
      await attach(tabId);
      const requests = getNetworkRequests(tabId, { urlPattern: url_pattern, limit: limit ?? 100 });
      if (clear) clearNetworkRequests(tabId);
      if (requests.length === 0) return 'No network requests captured yet.';
      return requests
        .map(
          (entry) =>
            `${entry.method} ${entry.status ?? '...'} ${entry.type ?? ''} ${entry.url}`.trim(),
        )
        .join('\n');
    },
  }),
  defineTool({
    name: 'file_upload',
    description:
      'Upload local files to a file input element by its index from get_page_state. Do not click the upload button (that opens a native picker you cannot control); use this instead.',
    inputSchema: {
      index: z.number().int().min(0),
      paths: z.array(z.string()).min(1),
      tab_id: z.number().int().optional(),
    },
    handler: async ({ index, paths, tab_id }) => {
      const tabId = tab_id ?? (await activeTabId());
      await setFileInputFiles(tabId, index, paths);
      return `Set ${paths.length} file(s) on input [${index}].`;
    },
  }),
  defineTool({
    name: 'capture_screenshot',
    description:
      'Capture a PNG screenshot of the active tab (viewport by default, full_page optional). Use only if you have vision support; otherwise the image cannot be interpreted.',
    inputSchema: { full_page: z.boolean().optional() },
    handler: async ({ full_page }) => {
      const tabId = await activeTabId();
      const shot = await captureScreenshot(tabId, { fullPage: full_page });
      return {
        content: [
          {
            type: 'text',
            text: `Screenshot of the active tab (${full_page ? 'full page' : 'viewport'}).`,
          },
          { type: 'image', data: shot.data, mimeType: shot.mimeType },
        ],
      };
    },
  }),
  defineTool({
    name: 'get_dropdown_options',
    description: 'List the options of a <select> element by its index.',
    inputSchema: { index: z.number().int().min(0) },
    handler: async ({ index }) => {
      const tabId = await activeTabId();
      const result = await callPageFn(tabId, paGetDropdownOptions, [index]);
      if (!result.ok) throw new Error(result.error);
      return result.options
        .map(
          (opt: { index: number; text: string; selected: boolean }) =>
            `${opt.index}: ${opt.text}${opt.selected ? ' (selected)' : ''}`,
        )
        .join('\n');
    },
  }),
  defineTool({
    name: 'select_dropdown_option',
    description: 'Select an option in a <select> element by index and visible option text.',
    inputSchema: { index: z.number().int().min(0), text: z.string() },
    handler: async ({ index, text }) => {
      const tabId = await activeTabId();
      const result = await callPageFn(tabId, paSelectDropdownOption, [index, text]);
      if (!result.ok) throw new Error(result.error);
      return `Selected "${result.selected}" in [${index}].`;
    },
  }),
  defineTool({
    name: 'open_tab',
    description:
      'Open a new tab and activate it, optionally navigating to a URL. Returns the new tab id.',
    inputSchema: { url: z.string().url().optional() },
    handler: async ({ url }) => {
      const tab = await chrome.tabs.create({ url, active: true });
      return `Opened tab ${tab.id}${url ? ` at ${url}` : ''}.`;
    },
  }),
  defineTool({
    name: 'list_tabs',
    description: 'List open tabs in the current window with their ids, titles and URLs.',
    inputSchema: {},
    handler: async () => {
      const tabs = await chrome.tabs.query({ currentWindow: true });
      return tabs
        .map((tab) => `${tab.id}${tab.active ? '*' : ''}: ${tab.title ?? ''} | ${tab.url ?? ''}`)
        .join('\n');
    },
  }),
  defineTool({
    name: 'switch_tab',
    description: 'Activate a tab by its id.',
    inputSchema: { tab_id: z.number().int() },
    handler: async ({ tab_id }) => {
      await chrome.tabs.update(tab_id, { active: true });
      return `Switched to tab ${tab_id}.`;
    },
  }),
  defineTool({
    name: 'close_tab',
    description: 'Close a tab by its id.',
    inputSchema: { tab_id: z.number().int() },
    handler: async ({ tab_id }) => {
      await chrome.tabs.remove(tab_id);
      return `Closed tab ${tab_id}.`;
    },
  }),
  defineTool({
    name: 'group_tabs',
    description:
      'Group tabs together. Pass group_id to add to an existing group, otherwise a new group is created. Optionally set a title and color.',
    inputSchema: {
      tab_ids: z.array(z.number().int()).min(1),
      group_id: z.number().int().optional(),
      title: z.string().optional(),
      color: z
        .enum(['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'])
        .optional(),
    },
    handler: async ({ tab_ids, group_id, title, color }) => {
      const tabIds = tab_ids as [number, ...number[]];
      const groupId: number = await chrome.tabs.group(
        group_id ? { tabIds, groupId: group_id } : { tabIds },
      );
      if (title !== undefined || color !== undefined) {
        await chrome.tabGroups.update(groupId, {
          ...(title !== undefined ? { title } : {}),
          ...(color !== undefined ? { color } : {}),
        });
      }
      return `Grouped ${tab_ids.length} tab(s) into group ${groupId}.`;
    },
  }),
  defineTool({
    name: 'ungroup_tabs',
    description: 'Remove tabs from their group.',
    inputSchema: { tab_ids: z.array(z.number().int()).min(1) },
    handler: async ({ tab_ids }) => {
      await chrome.tabs.ungroup(tab_ids as [number, ...number[]]);
      return `Ungrouped ${tab_ids.length} tab(s).`;
    },
  }),
];

const TOOL_BY_NAME = new Map(TOOLS.map((tool) => [tool.name, tool]));

function resultToText(result: ToolResult): string {
  if (typeof result === 'string') return result;
  return result.content
    .map((item) =>
      item.type === 'text'
        ? item.text
        : `[image ${item.mimeType}, ~${Math.round((item.data.length * 3) / 4)} bytes]`,
    )
    .join('\n');
}

export async function callTool(name: string, rawArgs: unknown): Promise<string> {
  const tool = TOOL_BY_NAME.get(name);
  if (!tool) throw new Error(`Unknown tool: ${name}`);
  if (!(await isToolEnabled(name))) throw new Error(`Tool "${name}" is disabled.`);
  const args = z.object(tool.inputSchema).parse(rawArgs ?? {});
  return resultToText(await tool.handler(args));
}

export function registerTools(server: McpServer): void {
  for (const tool of TOOLS) {
    server.registerTool(
      tool.name,
      { description: tool.description, inputSchema: tool.inputSchema },
      async (args: unknown) => {
        if (!(await isToolEnabled(tool.name))) {
          return {
            isError: true,
            content: [{ type: 'text' as const, text: `Tool "${tool.name}" is disabled.` }],
          };
        }
        try {
          const result = await tool.handler(args as never);
          const content =
            typeof result === 'string'
              ? [{ type: 'text' as const, text: result }]
              : result.content;
          return { content };
        } catch (error) {
          return {
            isError: true,
            content: [
              { type: 'text' as const, text: error instanceof Error ? error.message : String(error) },
            ],
          };
        }
      },
    );
  }
}
