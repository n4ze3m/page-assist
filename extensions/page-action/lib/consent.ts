const ALLOW_KEY = 'pa_mcp_allowed_extensions';
const TOOLS_KEY = 'pa_mcp_tool_toggles';

export const DEFAULT_ALLOWED_EXTENSIONS = [
  'jfgfiigpkhlkbnfnbobbkinehhfdhndo',
  'ogkogooadflifpmmidmhjedogicnhooa',
  'ijokhblbfikokhbbfnndfajaaanmmjdg',
];

async function getStoredAllowedExtensions(): Promise<string[]> {
  const stored = await chrome.storage.local.get(ALLOW_KEY);
  return (stored[ALLOW_KEY] as string[] | undefined) ?? [];
}

export async function getAllowedExtensions(): Promise<string[]> {
  const stored = await getStoredAllowedExtensions();
  return [...new Set([...DEFAULT_ALLOWED_EXTENSIONS, ...stored])];
}

export async function isExtensionAllowed(id: string): Promise<boolean> {
  return (await getAllowedExtensions()).includes(id);
}

export async function addAllowedExtension(id: string): Promise<void> {
  if (DEFAULT_ALLOWED_EXTENSIONS.includes(id)) return;
  const current = await getStoredAllowedExtensions();
  if (!current.includes(id)) {
    await chrome.storage.local.set({ [ALLOW_KEY]: [...current, id] });
  }
}

export async function removeAllowedExtension(id: string): Promise<void> {
  const current = await getStoredAllowedExtensions();
  await chrome.storage.local.set({
    [ALLOW_KEY]: current.filter((value) => value !== id),
  });
}

export async function getToolToggles(): Promise<Record<string, boolean>> {
  const stored = await chrome.storage.local.get(TOOLS_KEY);
  return (stored[TOOLS_KEY] as Record<string, boolean> | undefined) ?? {};
}

export async function isToolEnabled(name: string): Promise<boolean> {
  const toggles = await getToolToggles();
  return toggles[name] !== false;
}

export async function setToolEnabled(name: string, enabled: boolean): Promise<void> {
  const toggles = await getToolToggles();
  toggles[name] = enabled;
  await chrome.storage.local.set({ [TOOLS_KEY]: toggles });
}

export type PendingConsent = {
  id: string;
  extensionId: string;
  createdAt: number;
};

type PendingEntry = PendingConsent & { resolve: (approved: boolean) => void };

const pending = new Map<string, PendingEntry>();
let consentSeq = 0;

function updateBadge(): void {
  const count = pending.size;
  void chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
  if (count > 0) {
    void chrome.action.setBadgeBackgroundColor({ color: '#d9534f' });
  }
}

export function requestConsent(extensionId: string): Promise<boolean> {
  const id = `consent_${++consentSeq}`;
  return new Promise<boolean>((resolve) => {
    pending.set(id, { id, extensionId, createdAt: Date.now(), resolve });
    updateBadge();
    chrome.action.openPopup?.().catch(() => {});
  });
}

export function listPendingConsents(): PendingConsent[] {
  return [...pending.values()].map(({ resolve: _resolve, ...rest }) => rest);
}

export function resolveConsent(id: string, approved: boolean): boolean {
  const entry = pending.get(id);
  if (!entry) return false;
  pending.delete(id);
  updateBadge();
  entry.resolve(approved);
  return true;
}
