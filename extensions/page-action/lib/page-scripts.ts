export type PageState = {
  url: string;
  title: string;
  viewportWidth: number;
  viewportHeight: number;
  count: number;
  elements: string;
};

type PageTreeResult = {
  pageContent: string;
  viewport: { width: number; height: number };
  error?: string;
};

type RefResult =
  | { ok: true; x: number; y: number; tag: string; text: string }
  | { ok: false; error: string };

const INTERACTIVE_TAGS: Record<string, number> = {
  A: 1, BUTTON: 1, INPUT: 1, SELECT: 1, TEXTAREA: 1,
  SUMMARY: 1, DETAILS: 1, LABEL: 1, OPTION: 1,
};

const INTERACTIVE_ROLES: Record<string, number> = {
  button: 1, link: 1, checkbox: 1, radio: 1, menuitem: 1,
  menuitemcheckbox: 1, menuitemradio: 1, tab: 1, switch: 1,
  textbox: 1, combobox: 1, searchbox: 1, slider: 1, option: 1, treeitem: 1,
};

function paIsVisible(el: Element): boolean {
  var rect = el.getBoundingClientRect();
  var style = window.getComputedStyle(el);
  return rect.width > 0 &&
    rect.height > 0 &&
    style.visibility !== 'hidden' &&
    style.display !== 'none' &&
    style.opacity !== '0';
}

function paIsInteractive(el: Element): boolean {
  if (INTERACTIVE_TAGS[el.tagName]) return !(el as HTMLInputElement).disabled;
  var role = el.getAttribute('role');
  if (role && INTERACTIVE_ROLES[role.toLowerCase()]) return true;
  if (el.hasAttribute('onclick')) return true;
  var tabindex = el.getAttribute('tabindex');
  if (tabindex !== null && parseInt(tabindex, 10) >= 0) return true;
  return (el as HTMLElement).isContentEditable;
}

function paElementName(el: Element): string {
  var labelledBy = el.getAttribute('aria-labelledby');
  var labelledText = '';
  if (labelledBy) {
    labelledText = labelledBy
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent || '')
      .join(' ')
      .trim();
  }
  var text = labelledText ||
    el.getAttribute('aria-label') ||
    el.getAttribute('alt') ||
    el.getAttribute('title') ||
    el.getAttribute('placeholder') ||
    ((el as HTMLInputElement).value && ['BUTTON', 'SUBMIT', 'RESET'].indexOf((el as HTMLInputElement).type?.toUpperCase()) >= 0
      ? (el as HTMLInputElement).value
      : '') ||
    ((el as HTMLElement).innerText || el.textContent || '');
  return String(text).replace(/\s+/g, ' ').trim();
}

function paRole(el: Element): string {
  var explicit = el.getAttribute('role');
  if (explicit) return explicit;
  var tag = el.tagName.toLowerCase();
  if (tag === 'a' && el.getAttribute('href')) return 'link';
  if (tag === 'button') return 'button';
  if (tag === 'select') return 'combobox';
  if (tag === 'textarea') return 'textbox';
  if (tag === 'input') {
    var type = ((el as HTMLInputElement).type || 'text').toLowerCase();
    if (type === 'checkbox' || type === 'radio' || type === 'button') return type;
    if (type === 'submit' || type === 'reset') return 'button';
    return 'textbox';
  }
  return tag;
}

function paRefMap(): Record<string, Element> {
  var win = window as any;
  win.__paRefMap = win.__paRefMap || {};
  return win.__paRefMap;
}

function paGetRef(ref: string): Element | null {
  var el = paRefMap()[ref];
  if (!el || !document.contains(el)) return null;
  return el;
}

function paSetRef(ref: string, el: Element): void {
  paRefMap()[ref] = el;
}

function paResolveRefElement(ref: string): RefResult {
  var el = paGetRef(ref);
  if (!el) return { ok: false, error: 'No element found with reference: ' + ref + '. Call inspect_page or locate_element again.' };
  el.scrollIntoView({ block: 'center', inline: 'center' });
  var rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return { ok: false, error: 'Element is not visible.' };
  return {
    ok: true,
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
    tag: el.tagName.toLowerCase(),
    text: paElementName(el).slice(0, 120),
  };
}

export function paReadPage(
  filter?: 'interactive' | 'all' | null,
  depth?: number | null,
  maxChars?: number | null,
  refId?: string | null,
): PageTreeResult {
  var maxDepth = typeof depth === 'number' ? Math.max(0, depth) : 15;
  var limit = typeof maxChars === 'number' ? maxChars : 50000;
  var onlyInteractive = filter === 'interactive';
  var root: Element = document.body || document.documentElement;
  if (refId) {
    var focused = paGetRef(refId);
    if (!focused) return { pageContent: '', viewport: { width: window.innerWidth, height: window.innerHeight }, error: 'No element found with reference: ' + refId };
    root = focused;
  } else {
    (window as any).__paRefMap = {};
  }

  var counter = 1;
  var lines: string[] = [];

  function describe(el: Element, level: number): void {
    if (level > maxDepth) return;
    var visible = paIsVisible(el);
    var interactive = paIsInteractive(el);
    if ((!onlyInteractive || interactive) && (filter === 'all' || visible || interactive)) {
      var ref = 'ref_' + counter++;
      paSetRef(ref, el);
      var name = paElementName(el).slice(0, 180);
      var extras = [];
      var type = el.getAttribute('type');
      var value = (el as HTMLInputElement).value;
      if (type) extras.push('type=' + type);
      if (value && ['INPUT', 'TEXTAREA', 'SELECT'].indexOf(el.tagName) >= 0) extras.push('value=' + String(value).slice(0, 80));
      if (!visible) extras.push('hidden');
      lines.push(
        '  '.repeat(level) +
          ref + ' | ' + paRole(el) + ' | ' + el.tagName.toLowerCase() +
          (name ? ' | ' + name : '') +
          (extras.length ? ' | ' + extras.join(' ') : ''),
      );
    }
    for (var i = 0; i < el.children.length; i++) describe(el.children[i], level + 1);
  }

  describe(root, 0);
  var pageContent = lines.join('\n') || '(no elements found)';
  if (pageContent.length > limit) {
    return {
      pageContent: '',
      viewport: { width: window.innerWidth, height: window.innerHeight },
      error: 'Output exceeds ' + limit + ' character limit (' + pageContent.length + ' characters). Try using a smaller depth or ref_id.',
    };
  }
  return { pageContent: pageContent, viewport: { width: window.innerWidth, height: window.innerHeight } };
}

export function paFindElements(query: string): { output: string; count: number } {
  if (!(window as any).__paRefMap) (window as any).__paRefMap = {};
  var terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  var matches: { score: number; line: string }[] = [];
  var all = Array.prototype.slice.call(document.querySelectorAll('*')) as Element[];
  var next = Object.keys(paRefMap()).length + 1;
  for (var i = 0; i < all.length; i++) {
    var el = all[i];
    var haystack = [
      paRole(el),
      el.tagName,
      paElementName(el),
      el.getAttribute('id') || '',
      el.getAttribute('name') || '',
      el.getAttribute('placeholder') || '',
      el.getAttribute('type') || '',
    ].join(' ').toLowerCase();
    var score = 0;
    for (var j = 0; j < terms.length; j++) if (haystack.indexOf(terms[j]) >= 0) score++;
    if (score <= 0) continue;
    var ref = 'ref_' + next++;
    paSetRef(ref, el);
    matches.push({
      score: score + (paIsInteractive(el) ? 0.5 : 0),
      line: ref + ' | ' + paRole(el) + ' | ' + paElementName(el).slice(0, 160) + ' | ' + el.tagName.toLowerCase(),
    });
  }
  matches.sort((a, b) => b.score - a.score);
  var shown = matches.slice(0, 20);
  var lines = ['FOUND: ' + matches.length, 'SHOWING: ' + shown.length, '---'].concat(shown.map((m) => m.line));
  if (matches.length > 20) lines.push('MORE: Use a more specific query to see additional results');
  if (matches.length === 0) return { output: 'FOUND: 0\nERROR: No elements matched "' + query + '".', count: 0 };
  return { output: lines.join('\n'), count: matches.length };
}

export function paFormInput(ref: string, value: string | number | boolean): { ok: true; message: string } | { ok: false; error: string } {
  var el = paGetRef(ref) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLElement | null;
  if (!el) return { ok: false, error: 'No element found with reference: ' + ref + '. Call inspect_page or locate_element again.' };
  el.scrollIntoView({ block: 'center', inline: 'center' });
  el.focus();
  if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) {
    el.checked = Boolean(value);
  } else if (el instanceof HTMLSelectElement) {
    var needle = String(value).toLowerCase();
    for (var i = 0; i < el.options.length; i++) {
      var opt = el.options[i];
      if (opt.value.toLowerCase() === needle || opt.text.toLowerCase() === needle) {
        el.selectedIndex = i;
        break;
      }
    }
  } else if ('value' in el) {
    (el as HTMLInputElement | HTMLTextAreaElement).value = String(value);
  } else if ((el as HTMLElement).isContentEditable) {
    el.textContent = String(value);
  } else {
    return { ok: false, error: 'Referenced element is not a supported form control.' };
  }
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return { ok: true, message: 'Set ' + ref + ' to ' + JSON.stringify(value) + '.' };
}

export function paScrollRefIntoView(ref: string): RefResult {
  return paResolveRefElement(ref);
}

export function paGetPageText(maxChars?: number | null): { text: string; error?: string } {
  var limit = maxChars ?? 50000;
  var selectors = ['article', 'main', '[role="main"]'];
  var source: Element | null = null;
  for (var i = 0; i < selectors.length; i++) {
    source = document.querySelector(selectors[i]);
    if (source) break;
  }
  var text = ((source || document.body || document.documentElement) as HTMLElement).innerText || '';
  text = text.replace(/\n{3,}/g, '\n\n').trim();
  if (text.length > limit) return { text: '', error: 'Output exceeds ' + limit + ' character limit (' + text.length + ' characters).' };
  return { text: text };
}

export function paBuildPageState(): PageState {
  var INTERACTIVE_TAGS: Record<string, number> = {
    A: 1, BUTTON: 1, INPUT: 1, SELECT: 1, TEXTAREA: 1,
    SUMMARY: 1, DETAILS: 1, LABEL: 1, OPTION: 1,
  };
  var INTERACTIVE_ROLES: Record<string, number> = {
    button: 1, link: 1, checkbox: 1, radio: 1, menuitem: 1,
    menuitemcheckbox: 1, menuitemradio: 1, tab: 1, switch: 1,
    textbox: 1, combobox: 1, searchbox: 1, slider: 1, option: 1, treeitem: 1,
  };
  var ATTRS = ['type', 'placeholder', 'aria-label', 'name', 'id', 'value', 'role', 'title', 'alt', 'href'];

  var map: Element[] = [];
  var lines: string[] = [];

  function isVisible(el: Element): boolean {
    var rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    var style = window.getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0') {
      return false;
    }
    return true;
  }

  function isInteractive(el: Element): boolean {
    if (INTERACTIVE_TAGS[el.tagName]) {
      if ((el as HTMLInputElement).disabled) return false;
      return true;
    }
    var role = el.getAttribute('role');
    if (role && INTERACTIVE_ROLES[role.toLowerCase()]) return true;
    if (el.hasAttribute('onclick')) return true;
    var tabindex = el.getAttribute('tabindex');
    if (tabindex !== null && parseInt(tabindex, 10) >= 0) return true;
    if ((el as HTMLElement).isContentEditable) return true;
    return false;
  }

  function textOf(el: Element): string {
    var raw = ((el as HTMLElement).innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
    return raw.length > 120 ? raw.slice(0, 120) + '…' : raw;
  }

  function attrsOf(el: Element): string {
    var out = '';
    for (var i = 0; i < ATTRS.length; i++) {
      var key = ATTRS[i];
      var value = el.getAttribute(key);
      if (value == null || value === '') continue;
      if (key === 'href') value = value.slice(0, 80);
      value = String(value).replace(/"/g, "'").slice(0, 80);
      out += ' ' + key + '="' + value + '"';
    }
    return out;
  }

  function walk(root: Document | ShadowRoot): void {
    var all = root.querySelectorAll('*');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if ((el as HTMLElement).shadowRoot) walk((el as HTMLElement).shadowRoot as ShadowRoot);
      if (!isInteractive(el)) continue;
      if (!isVisible(el)) continue;
      var index = map.length;
      map.push(el);
      var tag = el.tagName.toLowerCase();
      var text = textOf(el);
      lines.push('[' + index + ']<' + tag + attrsOf(el) + '>' + text + '</' + tag + '>');
    }
  }

  (window as any).__paMcpMap = map;
  walk(document);

  return {
    url: location.href,
    title: document.title,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    count: map.length,
    elements: lines.join('\n'),
  };
}

type ResolveResult =
  | { ok: true; x: number; y: number; tag: string; text: string }
  | { ok: false; error: string };

export function paResolveClickTarget(index: number): ResolveResult {
  var map: Element[] = (window as any).__paMcpMap || [];
  var el = map[index];
  if (!el) return { ok: false, error: 'No element at index ' + index + '. Call get_page_state again.' };
  el.scrollIntoView({ block: 'center', inline: 'center' });
  var rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return { ok: false, error: 'Element is not visible.' };
  return {
    ok: true,
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
    tag: el.tagName.toLowerCase(),
    text: ((el as HTMLElement).innerText || '').trim().slice(0, 80),
  };
}

export function paJsClick(index: number): { ok: true } | { ok: false; error: string } {
  var map: Element[] = (window as any).__paMcpMap || [];
  var el = map[index] as HTMLElement | undefined;
  if (!el) return { ok: false, error: 'No element at index ' + index + '. Call get_page_state again.' };
  try {
    el.click();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

type FocusResult = { ok: true; editable: boolean } | { ok: false; error: string };

export function paFocusForInput(index: number, clear: boolean): FocusResult {
  var map: Element[] = (window as any).__paMcpMap || [];
  var el = map[index] as HTMLElement | undefined;
  if (!el) return { ok: false, error: 'No element at index ' + index + '. Call get_page_state again.' };
  el.scrollIntoView({ block: 'center' });
  el.focus();
  var hasValue = 'value' in el;
  if (clear) {
    if (hasValue) {
      try { (el as HTMLInputElement).select(); } catch (e) {}
      (el as HTMLInputElement).value = '';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (el.isContentEditable) {
      el.textContent = '';
    }
  }
  return { ok: true, editable: hasValue || el.isContentEditable };
}

export function paScroll(down: boolean, pages: number): { ok: true; scrollY: number; maxY: number } {
  var delta = (down ? 1 : -1) * Math.round(window.innerHeight * pages);
  window.scrollBy({ top: delta, left: 0, behavior: 'auto' });
  return {
    ok: true,
    scrollY: window.scrollY,
    maxY: Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
  };
}

export function paWaitForSettle(
  timeoutMs: number,
  quietMs: number,
): Promise<{ reason: string; readyState: string }> {
  return new Promise((resolve) => {
    var start = Date.now();
    var settled = false;

    function finish(reason: string) {
      if (settled) return;
      settled = true;
      resolve({ reason: reason, readyState: document.readyState });
    }

    function waitQuiet() {
      var lastChange = Date.now();
      var observer = new MutationObserver(function () {
        lastChange = Date.now();
      });
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      });
      var interval = setInterval(function () {
        var now = Date.now();
        if (now - lastChange >= quietMs) {
          clearInterval(interval);
          observer.disconnect();
          finish('settled');
        } else if (now - start >= timeoutMs) {
          clearInterval(interval);
          observer.disconnect();
          finish('timeout');
        }
      }, 100);
    }

    if (document.readyState === 'complete') {
      waitQuiet();
    } else {
      window.addEventListener('load', waitQuiet, { once: true });
      setTimeout(function () {
        if (!settled) finish('timeout');
      }, timeoutMs);
    }
  });
}

export function paExtract(): { url: string; title: string; text: string } {
  var text = ((document.body && (document.body as HTMLElement).innerText) || '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return { url: location.href, title: document.title, text: text.slice(0, 12000) };
}

type DropdownResult =
  | { ok: true; options: { index: number; text: string; value: string; selected: boolean }[] }
  | { ok: false; error: string };

export function paGetDropdownOptions(index: number): DropdownResult {
  var el = ((window as any).__paMcpMap || [])[index] as HTMLSelectElement | undefined;
  if (!el) return { ok: false, error: 'No element at index ' + index };
  if (el.tagName !== 'SELECT') return { ok: false, error: 'Element at index ' + index + ' is not a <select>.' };
  var options = [];
  for (var i = 0; i < el.options.length; i++) {
    var opt = el.options[i];
    options.push({ index: i, text: (opt.text || '').trim(), value: opt.value, selected: opt.selected });
  }
  return { ok: true, options };
}

export function paSelectDropdownOption(
  index: number,
  text: string,
): { ok: true; selected: string } | { ok: false; error: string } {
  var el = ((window as any).__paMcpMap || [])[index] as HTMLSelectElement | undefined;
  if (!el) return { ok: false, error: 'No element at index ' + index };
  if (el.tagName !== 'SELECT') return { ok: false, error: 'Element at index ' + index + ' is not a <select>.' };
  var needle = String(text).trim().toLowerCase();
  var found = -1;
  for (var i = 0; i < el.options.length; i++) {
    if ((el.options[i].text || '').trim().toLowerCase() === needle) { found = i; break; }
  }
  if (found < 0) {
    for (var j = 0; j < el.options.length; j++) {
      if ((el.options[j].text || '').toLowerCase().indexOf(needle) >= 0) { found = j; break; }
    }
  }
  if (found < 0) return { ok: false, error: 'No option matching "' + text + '".' };
  el.selectedIndex = found;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return { ok: true, selected: el.options[found].text };
}
