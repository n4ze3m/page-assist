import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  outDir: "output",
  manifest: {
    name: 'Page Action',
    version: '0.0.1',
    description:
      'An extension for Page Assist that adds browser actions on the active tab.',
    permissions: [
      'debugger',
      'activeTab',
      'tabs',
      'tabGroups',
      'storage',
      'scripting',
    ],
    host_permissions: ['<all_urls>'],
    externally_connectable: {
      ids: [
        'jfgfiigpkhlkbnfnbobbkinehhfdhndo',
        'ogkogooadflifpmmidmhjedogicnhooa',
        'ijokhblbfikokhbbfnndfajaaanmmjdg',
      ],
    },
    action: {
      default_title: 'Page Action',
    },
  },
});
