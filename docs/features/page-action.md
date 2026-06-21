# Page Action

Page Action lets Page Assist act on the page you are viewing. Your local model can read the current tab and then click, type, scroll, navigate, fill forms, draw on a canvas, and more, on your behalf.

It works as a companion extension that Page Assist connects to. The companion runs the actions on your active tab and reports back to Page Assist.

## Why it is a separate extension

Page Action is shipped as its own extension instead of being built into Page Assist. There are a few reasons for this.

- **Powerful permission, kept opt in.** Page Action needs the `debugger` permission to read the page and send trusted input through the Chrome DevTools Protocol. That is a strong permission. Bundling it into Page Assist would force every user to grant it, even people who only want to chat with their local model. Keeping it separate means only users who actually want browser actions install it.

- **Page Assist stays lean.** The main extension keeps a small, easy to understand permission set. The heavier automation permission lives in the companion, so the core app is not affected.

- **Simpler, safer reviews.** Extensions that use `debugger` and broad access get a deeper Chrome Web Store review. Isolating that into a dedicated extension keeps the main Page Assist review simple and its permissions minimal.

- **Clear security boundary.** Page Action only accepts connections from extensions you approve, and it only acts on the active tab when asked. Keeping it separate limits what it can touch.

- **Independent updates.** Page Action can be released and updated on its own without waiting on a Page Assist release.

::: tip
While Page Action is working, Chrome shows a "Page Action started debugging this browser" banner on the tab. This is expected and is how the trusted input works.
:::

## Installing

Page Action is available for Chromium based browsers (Chrome, Brave, Edge). It is not available on Firefox.

1. Install the Page Action extension from the Chrome Web Store.
2. Open Page Assist.

When you first enable Page Action in the chat sidebar, Page Assist checks if the companion is installed. If it is not, it shows an install prompt. After you install it, the prompt closes on its own and the option turns on.

## Using it

1. Open the Page Assist sidebar on any page.
2. Turn on the **Page Action** option (the cursor icon).
3. Ask the model to do something on the page, for example "summarize this page", "fill this form with my details", or "find the cheapest option and add it to the cart".

The model starts by reading the page, then performs the actions one step at a time.

::: tip
Page Action works alongside your other MCP servers. When it is on, the model can use both the page action tools and any MCP tools you have enabled.
:::

## Settings

Open `Settings > Page Action` to manage it. This page is only shown on Chromium based browsers.

- **Enable Page Action.** Show or hide the Page Action option in the chat sidebar. On by default.
- **Require approval before each action.** Ask for confirmation before Page Action clicks, types, or navigates. On by default, and recommended.
- **System prompt.** The instructions sent to the model in Page Action mode. Edit it to change how the model reads and acts on your pages, then `Save`. Use `Reset to default` to restore it. You can use variables like `{current_date_time}`.
- **Tools.** Turn individual page action tools on or off, and refresh the tool list.

## Privacy

Page Action does not collect, store, or transmit your data to any server. It only acts on the active tab when an approved extension requests it, and everything stays on your device.
