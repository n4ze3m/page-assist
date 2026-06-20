export type PopupRequest =
  | { type: 'pa:getStatus' }
  | { type: 'pa:resolveConsent'; id: string; approve: boolean }
  | { type: 'pa:addAllowed'; id: string }
  | { type: 'pa:removeAllowed'; id: string }
  | { type: 'pa:setTool'; name: string; enabled: boolean };

export type StatusResponse = {
  allowed: string[];
  defaultAllowed: string[];
  pending: { id: string; extensionId: string; createdAt: number }[];
  toggles: Record<string, boolean>;
  tools: { name: string; description: string }[];
  attachedTabs: number[];
};
