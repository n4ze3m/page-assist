import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  outDir: "output",
  manifest: {
    name: 'Page Action',
    version: '0.0.5',
    description:
      'An extension for Page Assist that adds browser actions on the active tab.',
    permissions: ['debugger', 'tabs', 'tabGroups', 'storage'],
    externally_connectable: {
      ids: [
        'jfgfiigpkhlkbnfnbobbkinehhfdhndo',
        'ogkogooadflifpmmidmhjedogicnhooa',
        'ijokhblbfikokhbbfnndfajaaanmmjdg',
        'mdegghmhjneppdkhefiedfeldioplioo'
      ],
    },
    action: {
      default_title: 'Page Action',
    },
  },
});
