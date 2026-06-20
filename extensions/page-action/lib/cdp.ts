const PROTOCOL_VERSION = '1.3';
const IDLE_DETACH_MS = 60_000;

const attached = new Set<number>();
const attachInFlight = new Map<number, Promise<void>>();
const idleTimers = new Map<number, ReturnType<typeof setTimeout>>();

export async function getActiveTab(): Promise<chrome.tabs.Tab> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id) throw new Error('No active tab to act on.');
  return tab;
}

function rawSend<T = any>(
  tabId: number,
  method: string,
  params?: { [key: string]: unknown },
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    chrome.debugger.sendCommand({ tabId }, method, params ?? {}, (result) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(`${method} failed: ${err.message}`));
        return;
      }
      resolve(result as T);
    });
  });
}

export function attach(tabId: number): Promise<void> {
  if (attached.has(tabId)) return Promise.resolve();
  const existing = attachInFlight.get(tabId);
  if (existing) return existing;

  const promise = new Promise<void>((resolve, reject) => {
    chrome.debugger.attach({ tabId }, PROTOCOL_VERSION, () => {
      const err = chrome.runtime.lastError;
      if (err && !/already attached/i.test(err.message ?? '')) {
        reject(new Error(`Failed to attach debugger: ${err.message}`));
        return;
      }
      resolve();
    });
  })
    .then(async () => {
      attached.add(tabId);
      await rawSend(tabId, 'Runtime.enable').catch(() => {});
      await rawSend(tabId, 'Page.enable').catch(() => {});
      await rawSend(tabId, 'Log.enable').catch(() => {});
      await rawSend(tabId, 'Network.enable').catch(() => {});
    })
    .finally(() => {
      attachInFlight.delete(tabId);
    });

  attachInFlight.set(tabId, promise);
  return promise;
}

export async function detach(tabId: number): Promise<void> {
  clearIdleTimer(tabId);
  if (!attached.has(tabId)) return;
  attached.delete(tabId);
  await new Promise<void>((resolve) => {
    chrome.debugger.detach({ tabId }, () => {
      void chrome.runtime.lastError;
      resolve();
    });
  });
}

function clearIdleTimer(tabId: number): void {
  const timer = idleTimers.get(tabId);
  if (timer) {
    clearTimeout(timer);
    idleTimers.delete(tabId);
  }
}

function bumpIdle(tabId: number): void {
  clearIdleTimer(tabId);
  idleTimers.set(
    tabId,
    setTimeout(() => {
      void detach(tabId);
    }, IDLE_DETACH_MS),
  );
}

export async function sendCommand<T = any>(
  tabId: number,
  method: string,
  params?: { [key: string]: unknown },
): Promise<T> {
  await attach(tabId);
  bumpIdle(tabId);
  return rawSend<T>(tabId, method, params);
}

export async function callPageFn<T = any>(
  tabId: number,
  fn: (...args: any[]) => any,
  args: unknown[] = [],
): Promise<T> {
  const expression = `(${fn.toString()}).apply(null, ${JSON.stringify(args)})`;
  const res = await sendCommand<any>(tabId, 'Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
    userGesture: true,
  });
  if (res?.exceptionDetails) {
    const detail =
      res.exceptionDetails.exception?.description ||
      res.exceptionDetails.text ||
      'Page evaluation failed';
    throw new Error(detail);
  }
  return res?.result?.value as T;
}

type MousePoint = { x: number; y: number };

type MouseOptions = {
  button?: 'left' | 'right' | 'middle' | 'none';
  buttons?: number;
  clickCount?: number;
};

async function dispatchMouse(
  tabId: number,
  type: 'mouseMoved' | 'mousePressed' | 'mouseReleased',
  x: number,
  y: number,
  options: MouseOptions = {},
): Promise<void> {
  await sendCommand(tabId, 'Input.dispatchMouseEvent', {
    type,
    x,
    y,
    button: options.button ?? 'left',
    buttons: options.buttons ?? 0,
    clickCount: options.clickCount ?? 0,
    pointerType: 'mouse',
  });
}

const BUTTON_MASK: Record<string, number> = { left: 1, right: 2, middle: 4, none: 0 };

export async function evaluateCode(tabId: number, code: string): Promise<unknown> {
  const res = await sendCommand<any>(tabId, 'Runtime.evaluate', {
    expression: code,
    returnByValue: true,
    awaitPromise: true,
    userGesture: true,
  });
  if (res?.exceptionDetails) {
    const detail =
      res.exceptionDetails.exception?.description ||
      res.exceptionDetails.text ||
      'JavaScript evaluation failed';
    throw new Error(detail);
  }
  if (res?.result && 'value' in res.result) return res.result.value;
  return res?.result?.description;
}

export async function dispatchTrustedClick(
  tabId: number,
  x: number,
  y: number,
  options: { button?: 'left' | 'right' | 'middle'; clickCount?: number } = {},
): Promise<void> {
  const button = options.button ?? 'left';
  const clicks = Math.max(1, options.clickCount ?? 1);
  const buttons = BUTTON_MASK[button];
  await dispatchMouse(tabId, 'mouseMoved', x, y);
  for (let count = 1; count <= clicks; count++) {
    await dispatchMouse(tabId, 'mousePressed', x, y, { button, buttons, clickCount: count });
    await dispatchMouse(tabId, 'mouseReleased', x, y, { button, buttons, clickCount: count });
  }
}

export async function moveMouse(tabId: number, x: number, y: number): Promise<void> {
  await dispatchMouse(tabId, 'mouseMoved', x, y);
}

export async function dragMouse(
  tabId: number,
  from: MousePoint,
  to: MousePoint,
  steps = 16,
): Promise<void> {
  await drawAlongPath(tabId, [from, to], steps);
}

export async function drawAlongPath(
  tabId: number,
  points: MousePoint[],
  stepsBetween = 12,
): Promise<void> {
  if (points.length < 2) {
    throw new Error('A path needs at least two points.');
  }
  const segments = Math.max(1, stepsBetween);
  const first = points[0];
  await dispatchMouse(tabId, 'mouseMoved', first.x, first.y);
  await dispatchMouse(tabId, 'mousePressed', first.x, first.y, { buttons: 1, clickCount: 1 });

  let prev = first;
  for (let i = 1; i < points.length; i++) {
    const next = points[i];
    for (let step = 1; step <= segments; step++) {
      const t = step / segments;
      const x = prev.x + (next.x - prev.x) * t;
      const y = prev.y + (next.y - prev.y) * t;
      await dispatchMouse(tabId, 'mouseMoved', x, y, { buttons: 1 });
    }
    prev = next;
  }

  await dispatchMouse(tabId, 'mouseReleased', prev.x, prev.y, { buttons: 1, clickCount: 1 });
}

export async function insertText(tabId: number, text: string): Promise<void> {
  await sendCommand(tabId, 'Input.insertText', { text });
}

export async function captureScreenshot(
  tabId: number,
  options: { fullPage?: boolean } = {},
): Promise<{ data: string; mimeType: string }> {
  const params: { [key: string]: unknown } = {
    format: 'png',
    captureBeyondViewport: Boolean(options.fullPage),
  };
  if (options.fullPage) {
    const metrics = await sendCommand<any>(tabId, 'Page.getLayoutMetrics');
    const size = metrics?.cssContentSize ?? metrics?.contentSize;
    if (size) {
      params.clip = { x: 0, y: 0, width: size.width, height: size.height, scale: 1 };
    }
  }
  const res = await sendCommand<{ data: string }>(tabId, 'Page.captureScreenshot', params);
  return { data: res.data, mimeType: 'image/png' };
}

export async function setFileInputFiles(
  tabId: number,
  index: number,
  paths: string[],
): Promise<void> {
  await attach(tabId);
  const evalRes = await sendCommand<any>(tabId, 'Runtime.evaluate', {
    expression: `(window.__paMcpMap || [])[${index}]`,
    returnByValue: false,
  });
  const objectId = evalRes?.result?.objectId;
  if (!objectId) {
    throw new Error(`No element at index ${index}. Call get_page_state again.`);
  }
  await sendCommand(tabId, 'DOM.enable').catch(() => {});
  await sendCommand(tabId, 'DOM.setFileInputFiles', { files: paths, objectId });
}

export type ConsoleEntry = { level: string; text: string; timestamp: number; url?: string };
export type NetworkEntry = {
  requestId: string;
  url: string;
  method: string;
  status?: number;
  type?: string;
  timestamp: number;
};

const BUFFER_LIMIT = 1000;
const consoleBuffers = new Map<number, ConsoleEntry[]>();
const networkBuffers = new Map<number, NetworkEntry[]>();
const networkIndex = new Map<number, Map<string, NetworkEntry>>();

function pushBounded<T>(map: Map<number, T[]>, tabId: number, entry: T): void {
  const list = map.get(tabId) ?? [];
  list.push(entry);
  if (list.length > BUFFER_LIMIT) list.shift();
  map.set(tabId, list);
}

function remoteObjectToText(arg: any): string {
  if (arg == null) return '';
  if ('value' in arg && arg.value !== undefined) {
    return typeof arg.value === 'string' ? arg.value : JSON.stringify(arg.value);
  }
  if (arg.description) return arg.description;
  if (arg.preview?.properties) {
    return arg.preview.properties.map((p: any) => `${p.name}: ${p.value}`).join(', ');
  }
  return arg.type ?? '';
}

function clearTabBuffers(tabId: number): void {
  consoleBuffers.delete(tabId);
  networkBuffers.delete(tabId);
  networkIndex.delete(tabId);
}

export function getConsoleMessages(
  tabId: number,
  options: { onlyErrors?: boolean; pattern?: string; limit?: number } = {},
): ConsoleEntry[] {
  let list = consoleBuffers.get(tabId) ?? [];
  if (options.onlyErrors) list = list.filter((entry) => entry.level === 'error');
  if (options.pattern) {
    const regex = new RegExp(options.pattern, 'i');
    list = list.filter((entry) => regex.test(entry.text));
  }
  return list.slice(-(options.limit ?? 100));
}

export function clearConsoleMessages(tabId: number): void {
  consoleBuffers.delete(tabId);
}

export function getNetworkRequests(
  tabId: number,
  options: { urlPattern?: string; limit?: number } = {},
): NetworkEntry[] {
  let list = networkBuffers.get(tabId) ?? [];
  if (options.urlPattern) {
    const regex = new RegExp(options.urlPattern, 'i');
    list = list.filter((entry) => regex.test(entry.url));
  }
  return list.slice(-(options.limit ?? 100));
}

export function clearNetworkRequests(tabId: number): void {
  networkBuffers.delete(tabId);
  networkIndex.delete(tabId);
}

let lifecycleReady = false;

export function setupCdpLifecycle(): void {
  if (lifecycleReady) return;
  lifecycleReady = true;

  chrome.debugger.onEvent.addListener((source, method, params: any) => {
    const tabId = source.tabId;
    if (typeof tabId !== 'number') return;

    if (method === 'Runtime.consoleAPICalled') {
      pushBounded(consoleBuffers, tabId, {
        level: params.type ?? 'log',
        text: (params.args ?? []).map(remoteObjectToText).join(' '),
        timestamp: params.timestamp ?? Date.now(),
      });
    } else if (method === 'Runtime.exceptionThrown') {
      const details = params.exceptionDetails;
      pushBounded(consoleBuffers, tabId, {
        level: 'error',
        text: details?.exception?.description ?? details?.text ?? 'Uncaught exception',
        timestamp: details?.timestamp ?? Date.now(),
      });
    } else if (method === 'Log.entryAdded') {
      pushBounded(consoleBuffers, tabId, {
        level: params.entry?.level ?? 'info',
        text: params.entry?.text ?? '',
        timestamp: params.entry?.timestamp ?? Date.now(),
        url: params.entry?.url,
      });
    } else if (method === 'Network.requestWillBeSent') {
      const entry: NetworkEntry = {
        requestId: params.requestId,
        url: params.request?.url ?? '',
        method: params.request?.method ?? '',
        type: params.type,
        timestamp: params.timestamp ?? Date.now(),
      };
      pushBounded(networkBuffers, tabId, entry);
      const idx = networkIndex.get(tabId) ?? new Map<string, NetworkEntry>();
      idx.set(entry.requestId, entry);
      networkIndex.set(tabId, idx);
    } else if (method === 'Network.responseReceived') {
      const entry = networkIndex.get(tabId)?.get(params.requestId);
      if (entry) {
        entry.status = params.response?.status;
        entry.type = params.type ?? entry.type;
      }
    } else if (method === 'Page.frameNavigated' && !params.frame?.parentId) {
      clearTabBuffers(tabId);
    }
  });

  chrome.debugger.onDetach.addListener((source) => {
    if (typeof source.tabId === 'number') {
      attached.delete(source.tabId);
      clearIdleTimer(source.tabId);
      clearTabBuffers(source.tabId);
    }
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    attached.delete(tabId);
    clearIdleTimer(tabId);
    clearTabBuffers(tabId);
  });
}

export function getAttachedTabs(): number[] {
  return [...attached];
}
