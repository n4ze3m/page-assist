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
  paFindElements,
  paFormInput,
  paFocusForInput,
  paGetPageText,
  paGetDropdownOptions,
  paJsClick,
  paReadPage,
  paResolveClickTarget,
  paScroll,
  paScrollRefIntoView,
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
const CLICK_MODIFIERS: Record<string, number> = {
  alt: 1,
  control: 2,
  ctrl: 2,
  meta: 4,
  cmd: 4,
  command: 4,
  shift: 8,
  win: 4,
  windows: 4,
};

const capturedImages = new Map<string, { base64: string; mimeType: string }>();

async function targetTabId(tabId?: number): Promise<number> {
  return tabId ?? (await activeTabId());
}

function normalizeUrl(url: string): string {
  if (url === 'back' || url === 'forward') return url;
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return url;
  return `https://${url}`;
}

function clickModifiers(value?: string): number {
  if (!value) return 0;
  return value
    .toLowerCase()
    .split('+')
    .map((part) => part.trim())
    .reduce((mask, part) => mask | (CLICK_MODIFIERS[part] ?? 0), 0);
}

async function dispatchClick(
  tabId: number,
  x: number,
  y: number,
  button: 'left' | 'right' | 'middle',
  clickCount: number,
  modifiers = 0,
): Promise<void> {
  await sendCommand(tabId, 'Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x,
    y,
    button: 'none',
    buttons: 0,
    modifiers,
    pointerType: 'mouse',
  });
  for (let count = 1; count <= clickCount; count++) {
    await sendCommand(tabId, 'Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x,
      y,
      button,
      buttons: button === 'left' ? 1 : button === 'right' ? 2 : 4,
      clickCount: count,
      modifiers,
      pointerType: 'mouse',
    });
    await sendCommand(tabId, 'Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x,
      y,
      button,
      buttons: 0,
      clickCount: count,
      modifiers,
      pointerType: 'mouse',
    });
  }
}

async function dispatchKeySequence(tabId: number, text: string, repeat = 1): Promise<void> {
  const tokens = text.split(/\s+/).filter(Boolean);
  const sequence = tokens.length > 1 ? tokens : [text];
  for (let r = 0; r < repeat; r++) {
    for (const token of sequence) {
      const parts = token.split('+').map((part) => part.trim()).filter(Boolean);
      const keyName = parts.pop() ?? '';
      let modifiers = 0;
      for (const mod of parts) modifiers |= MODIFIERS[mod.toLowerCase()] ?? CLICK_MODIFIERS[mod.toLowerCase()] ?? 0;
      const mapped = KEY_MAP[keyName.toLowerCase()];
      const descriptor = mapped ?? {
        key: keyName,
        code: keyName.length === 1 ? `Key${keyName.toUpperCase()}` : keyName,
        keyCode: keyName.length === 1 ? keyName.toUpperCase().charCodeAt(0) : 0,
        text: keyName.length === 1 && modifiers === 0 ? keyName : undefined,
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
    }
  }
}

async function resolveRefOrCoordinate(
  tabId: number,
  ref?: string,
  coordinate?: number[],
): Promise<{ x: number; y: number; source: string }> {
  if (ref) {
    const target = await callPageFn(tabId, paScrollRefIntoView, [ref]);
    if (!target.ok) throw new Error(target.error);
    return { x: target.x, y: target.y, source: `element ${ref}` };
  }
  if (coordinate && coordinate.length >= 2) {
    return { x: coordinate[0], y: coordinate[1], source: `(${Math.round(coordinate[0])}, ${Math.round(coordinate[1])})` };
  }
  throw new Error('Provide either ref or coordinate.');
}

export const TOOLS: ToolDef<any>[] = [
  defineTool({
    name: 'inspect_page',
    description:
      'Get an accessibility tree representation of elements on the page. By default returns all elements including non-visible ones. Output is limited to 50000 characters. If the output exceeds this limit, specify a smaller depth or focus on a specific element using ref_id.',
    inputSchema: {
      filter: z.enum(['interactive', 'all']).optional(),
      tabId: z.number(),
      depth: z.number().optional(),
      ref_id: z.string().optional(),
      max_chars: z.number().optional(),
    },
    handler: async ({ filter, tabId, depth, ref_id, max_chars }) => {
      const result = await callPageFn(tabId, paReadPage, [filter ?? 'all', depth ?? null, max_chars ?? 50000, ref_id ?? null]);
      if (result.error) throw new Error(result.error);
      return `${result.pageContent}\n\nViewport: ${result.viewport.width}x${result.viewport.height}`;
    },
  }),
  defineTool({
    name: 'locate_element',
    description:
      'Find elements on the page using natural language or text content. Returns up to 20 matching elements with references that can be used with other tools.',
    inputSchema: {
      query: z.string(),
      tabId: z.number(),
    },
    handler: async ({ query, tabId }) => {
      const result = await callPageFn(tabId, paFindElements, [query]);
      return result.output;
    },
  }),
  defineTool({
    name: 'set_field_value',
    description:
      'Set values in form elements using an element reference ID from inspect_page or locate_element.',
    inputSchema: {
      ref: z.string(),
      value: z.union([z.string(), z.boolean(), z.number()]),
      tabId: z.number(),
    },
    handler: async ({ ref, value, tabId }) => {
      const result = await callPageFn(tabId, paFormInput, [ref, value]);
      if (!result.ok) throw new Error(result.error);
      return result.message;
    },
  }),
  defineTool({
    name: 'browser_input',
    description:
      'Use a mouse and keyboard to interact with a web browser, and take screenshots. If you do not have a valid tab ID, use current_tabs first to get available tabs.',
    inputSchema: {
      action: z.enum([
        'left_click',
        'right_click',
        'type',
        'screenshot',
        'wait',
        'scroll',
        'key',
        'left_click_drag',
        'double_click',
        'triple_click',
        'zoom',
        'scroll_to',
        'hover',
      ]),
      coordinate: z.array(z.number()).length(2).optional(),
      text: z.string().optional(),
      duration: z.number().min(0).max(10).optional(),
      scroll_direction: z.enum(['up', 'down', 'left', 'right']).optional(),
      scroll_amount: z.number().min(1).max(10).optional(),
      start_coordinate: z.array(z.number()).length(2).optional(),
      region: z.array(z.number()).length(4).optional(),
      repeat: z.number().min(1).max(100).optional(),
      ref: z.string().optional(),
      modifiers: z.string().optional(),
      tabId: z.number(),
    },
    handler: async (args) => {
      const tabId = args.tabId;
      switch (args.action) {
        case 'left_click':
        case 'right_click':
        case 'double_click':
        case 'triple_click': {
          const target = await resolveRefOrCoordinate(tabId, args.ref, args.coordinate);
          const clickCount = args.action === 'double_click' ? 2 : args.action === 'triple_click' ? 3 : 1;
          const button = args.action === 'right_click' ? 'right' : 'left';
          await dispatchClick(tabId, target.x, target.y, button, clickCount, clickModifiers(args.modifiers));
          return `${clickCount === 1 ? 'Clicked' : clickCount === 2 ? 'Double-clicked' : 'Triple-clicked'} ${target.source}.`;
        }
        case 'hover': {
          const target = await resolveRefOrCoordinate(tabId, args.ref, args.coordinate);
          await moveMouse(tabId, target.x, target.y);
          return `Hovered over ${target.source}.`;
        }
        case 'type':
          if (args.text === undefined) throw new Error('text is required for type.');
          await insertText(tabId, args.text);
          return `Typed ${JSON.stringify(args.text)}.`;
        case 'key':
          if (!args.text) throw new Error('text is required for key.');
          await dispatchKeySequence(tabId, args.text, args.repeat ?? 1);
          return `Pressed key sequence: ${args.text}.`;
        case 'wait':
          await new Promise((resolve) => setTimeout(resolve, Math.min(args.duration ?? 1, 10) * 1000));
          return `Waited ${args.duration ?? 1}s.`;
        case 'scroll': {
          if (!args.coordinate) throw new Error('coordinate is required for scroll.');
          const [x, y] = args.coordinate;
          const direction = args.scroll_direction ?? 'down';
          const amount = args.scroll_amount ?? 3;
          const delta = 120 * amount;
          await sendCommand(tabId, 'Input.dispatchMouseEvent', {
            type: 'mouseWheel',
            x,
            y,
            deltaX: direction === 'left' ? -delta : direction === 'right' ? delta : 0,
            deltaY: direction === 'up' ? -delta : direction === 'down' ? delta : 0,
          });
          return `Scrolled ${direction} at (${Math.round(x)}, ${Math.round(y)}).`;
        }
        case 'scroll_to': {
          if (!args.ref) throw new Error('ref is required for scroll_to.');
          const target = await callPageFn(tabId, paScrollRefIntoView, [args.ref]);
          if (!target.ok) throw new Error(target.error);
          return `Scrolled ${args.ref} into view.`;
        }
        case 'left_click_drag':
          if (!args.start_coordinate || !args.coordinate) throw new Error('start_coordinate and coordinate are required for left_click_drag.');
          await dragMouse(
            tabId,
            { x: args.start_coordinate[0], y: args.start_coordinate[1] },
            { x: args.coordinate[0], y: args.coordinate[1] },
            16,
          );
          return `Dragged from (${Math.round(args.start_coordinate[0])}, ${Math.round(args.start_coordinate[1])}) to (${Math.round(args.coordinate[0])}, ${Math.round(args.coordinate[1])}).`;
        case 'screenshot': {
          const shot = await captureScreenshot(tabId);
          const imageId = `ss_${Date.now().toString(36)}`;
          capturedImages.set(imageId, { base64: shot.data, mimeType: shot.mimeType });
          return {
            content: [
              { type: 'text', text: `Successfully captured screenshot - ID: ${imageId}` },
              { type: 'image', data: shot.data, mimeType: shot.mimeType },
            ],
          };
        }
        case 'zoom': {
          if (!args.region) throw new Error('region is required for zoom.');
          const [x0, y0, x1, y1] = args.region;
          const shot = await sendCommand<{ data: string }>(tabId, 'Page.captureScreenshot', {
            format: 'png',
            clip: { x: x0, y: y0, width: Math.max(1, x1 - x0), height: Math.max(1, y1 - y0), scale: 1 },
          });
          const imageId = `zoom_${Date.now().toString(36)}`;
          capturedImages.set(imageId, { base64: shot.data, mimeType: 'image/png' });
          return {
            content: [
              { type: 'text', text: `Successfully captured zoom region - ID: ${imageId}` },
              { type: 'image', data: shot.data, mimeType: 'image/png' },
            ],
          };
        }
        default:
          throw new Error(`Unsupported action: ${args.action}`);
      }
    },
  }),
  defineTool({
    name: 'run_browser_steps',
    description:
      'Execute a sequence of browser tool calls in one round trip. Actions execute sequentially and stop on the first error. run_browser_steps cannot be nested.',
    inputSchema: {
      actions: z.array(z.object({ name: z.string(), input: z.any() })).min(1),
    },
    handler: async ({ actions }) => {
      const outputs: string[] = [];
      for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        if (action.name === 'run_browser_steps') throw new Error('run_browser_steps cannot be nested.');
        const tool = TOOL_BY_NAME.get(action.name);
        if (!tool) throw new Error(`Unknown tool in batch at index ${i}: ${action.name}`);
        if (!(await isToolEnabled(action.name))) throw new Error(`Tool "${action.name}" is disabled.`);
        const args = z.object(tool.inputSchema).parse(action.input ?? {});
        outputs.push(`# ${i + 1} ${action.name}\n${resultToText(await tool.handler(args))}`);
      }
      return outputs.join('\n\n');
    },
  }),
  defineTool({
    name: 'extract_page_text',
    description:
      'Extract raw text content from the page, prioritizing article content. Output is limited to 50000 characters by default.',
    inputSchema: {
      tabId: z.number(),
      max_chars: z.number().optional(),
    },
    handler: async ({ tabId, max_chars }) => {
      const result = await callPageFn(tabId, paGetPageText, [max_chars ?? 50000]);
      if (result.error) throw new Error(result.error);
      return result.text || '(no text found)';
    },
  }),
  defineTool({
    name: 'current_tabs',
    description: 'Get context information about all tabs in the current window.',
    inputSchema: {},
    handler: async () => {
      const active = await getActiveTab();
      const tabs = await chrome.tabs.query({ windowId: active.windowId });
      return [
        `Current tab ID: ${active.id}`,
        `Tabs: ${tabs.length}`,
        ...tabs.map((tab) => `${tab.id}${tab.active ? '*' : ''}: ${tab.title ?? ''} | ${tab.url ?? ''}`),
      ].join('\n');
    },
  }),
  defineTool({
    name: 'attach_image',
    description:
      'Upload a previously captured screenshot image to a file input or drag/drop target. Provide either ref or coordinate, not both.',
    inputSchema: {
      imageId: z.string(),
      ref: z.string().optional(),
      coordinate: z.array(z.number()).length(2).optional(),
      tabId: z.number(),
      filename: z.string().optional(),
    },
    handler: async ({ imageId, ref, coordinate, tabId, filename }) => {
      if ((ref && coordinate) || (!ref && !coordinate)) throw new Error('Provide either ref or coordinate, not both.');
      const image = capturedImages.get(imageId);
      if (!image) throw new Error(`Image not found with ID: ${imageId}. Capture a screenshot first.`);
      const result = await callPageFn(
        tabId,
        function (targetRef: string | null, targetCoordinate: number[] | null, base64: string, mimeType: string, fileName: string) {
          var target: Element | null = null;
          if (targetRef) {
            var map = (window as any).__paRefMap || {};
            target = map[targetRef] || null;
          } else if (targetCoordinate) {
            target = document.elementFromPoint(targetCoordinate[0], targetCoordinate[1]);
          }
          if (!target) return { ok: false, error: 'Upload target not found.' };
          var binary = atob(base64);
          var bytes = new Uint8Array(binary.length);
          for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          var file = new File([bytes], fileName, { type: mimeType, lastModified: Date.now() });
          var data = new DataTransfer();
          data.items.add(file);
          if (target instanceof HTMLInputElement && target.type === 'file') {
            target.files = data.files;
            target.dispatchEvent(new Event('input', { bubbles: true }));
            target.dispatchEvent(new Event('change', { bubbles: true }));
            return { ok: true, message: 'Uploaded image to file input.' };
          }
          var rect = target.getBoundingClientRect();
          var x = targetCoordinate ? targetCoordinate[0] : rect.left + rect.width / 2;
          var y = targetCoordinate ? targetCoordinate[1] : rect.top + rect.height / 2;
          target.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer: data, clientX: x, clientY: y }));
          target.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: data, clientX: x, clientY: y }));
          target.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: data, clientX: x, clientY: y }));
          return { ok: true, message: 'Dropped image on target.' };
        },
        [ref ?? null, coordinate ?? null, image.base64, image.mimeType, filename ?? 'image.png'],
      );
      if (!result.ok) throw new Error(result.error);
      return result.message;
    },
  }),
  defineTool({
    name: 'set_window_size',
    description: 'Resize the current browser window to specified dimensions.',
    inputSchema: {
      width: z.number(),
      height: z.number(),
      tabId: z.number(),
    },
    handler: async ({ width, height, tabId }) => {
      const tab = await chrome.tabs.get(tabId);
      await chrome.windows.update(tab.windowId, { width: Math.floor(width), height: Math.floor(height) });
      return `Resized window containing tab ${tabId} to ${Math.floor(width)}x${Math.floor(height)}.`;
    },
  }),
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
    description: 'Navigate to a URL, or go forward/back in browser history.',
    inputSchema: {
      url: z.string(),
      tabId: z.number(),
      force: z.boolean().optional(),
    },
    handler: async ({ url, tabId }) => {
      const resolved = normalizeUrl(url);
      if (resolved === 'back') {
        await chrome.tabs.goBack(tabId);
        return `Navigated tab ${tabId} back.`;
      }
      if (resolved === 'forward') {
        await chrome.tabs.goForward(tabId);
        return `Navigated tab ${tabId} forward.`;
      }
      await chrome.tabs.update(tabId, { url: resolved });
      return `Navigating tab ${tabId} to ${resolved}.`;
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
      "Execute JavaScript code in the context of the current page. The code runs in the page's context and can interact with the DOM, window object, and page variables.",
    inputSchema: {
      action: z.literal('javascript_exec').optional(),
      text: z.string(),
      tabId: z.number().optional(),
      tab_id: z.number().int().optional(),
    },
    handler: async ({ action, text, tabId, tab_id }) => {
      if (action && action !== 'javascript_exec') throw new Error("'javascript_exec' is the only supported action.");
      const resolvedTabId = await targetTabId(tabId ?? tab_id);
      const value = await evaluateCode(resolvedTabId, text);
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
      'Read browser console messages (console.log, console.error, console.warn, etc.) from a specific tab.',
    inputSchema: {
      tabId: z.number().optional(),
      tab_id: z.number().int().optional(),
      onlyErrors: z.boolean().optional(),
      only_errors: z.boolean().optional(),
      clear: z.boolean().optional(),
      pattern: z.string().optional(),
      limit: z.number().int().positive().optional(),
    },
    handler: async ({ tabId, tab_id, onlyErrors, only_errors, clear, pattern, limit }) => {
      const resolvedTabId = await targetTabId(tabId ?? tab_id);
      await attach(resolvedTabId);
      const messages = getConsoleMessages(resolvedTabId, {
        onlyErrors: onlyErrors ?? only_errors,
        pattern,
        limit: limit ?? 100,
      });
      if (clear) clearConsoleMessages(resolvedTabId);
      if (messages.length === 0) return 'No console messages captured yet.';
      return messages.map((entry) => `[${entry.level}] ${entry.text}`).join('\n');
    },
  }),
  defineTool({
    name: 'read_network_requests',
    description:
      'Read HTTP network requests (XHR, Fetch, documents, images, etc.) from a specific tab.',
    inputSchema: {
      tabId: z.number().optional(),
      tab_id: z.number().int().optional(),
      urlPattern: z.string().optional(),
      url_pattern: z.string().optional(),
      clear: z.boolean().optional(),
      limit: z.number().int().positive().optional(),
    },
    handler: async ({ tabId, tab_id, urlPattern, url_pattern, clear, limit }) => {
      const resolvedTabId = await targetTabId(tabId ?? tab_id);
      await attach(resolvedTabId);
      const requests = getNetworkRequests(resolvedTabId, { urlPattern: urlPattern ?? url_pattern, limit: limit ?? 100 });
      if (clear) clearNetworkRequests(resolvedTabId);
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
