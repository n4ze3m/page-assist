# Copilot

Sidebar Copilot is a feature that allows you to select text from any webpage and perform AI-powered actions on it.

## Built-in Copilot Prompts

Page Assist comes with 5 built-in copilot prompts:

- **Summarize** - Get a concise summary of selected text
- **Rephrase** - Rewrite text with alternative vocabulary
- **Translate** - Translate text to English
- **Explain** - Get a detailed explanation of the text
- **Custom** - Use a custom prompt template

::: warning Deprecation Notice
The built-in "Custom" prompt will be removed in a future version. Please migrate to **Custom Copilot Prompts** (see below) for better flexibility and multiple custom prompts.
:::

### Disabling Built-in Prompts

You can now disable any built-in copilot prompt to reduce context menu clutter:

1. Go to `Settings` → `Manage Prompts` → `Copilot` tab
2. Toggle the switch next to any prompt to enable/disable it
3. Disabled prompts will not appear in the context menu

![Built-in Copilot Prompts with Enable/Disable Toggle](https://pub-35424b4473484be483c0afa08c69e7da.r2.dev/Screenshot%202025-02-15%20120628.png)

## Custom Copilot Prompts

::: tip New Feature
You can now create unlimited custom copilot prompts! This is the recommended way to create your own prompts instead of using the built-in "Custom" prompt.
:::

Custom Copilot Prompts allow you to create your own AI-powered actions that appear in the context menu when you select text.

### Creating Custom Copilot Prompts

1. Go to `Settings` → `Manage Prompts` → `Custom Copilot` tab
2. Click the `Add` button
3. Fill in the form:
   - **Title**: The name that will appear in the context menu (e.g., "Simplify Text", "Find Grammar Errors")
   - **Prompt Template**: Your prompt with `{text}` as a placeholder for selected text

4. Click `Save`

### How to Use Custom Copilot Prompts

1. Select text on any webpage
2. Right-click on the selected text
3. Find your custom prompt in the `Page Assist` context menu
4. Click it to process the selected text

### Writing Good Prompts

::: tip Prompt Writing Best Practices
The quality of your results depends heavily on how well you write your prompts. Follow these guidelines:
:::

#### 1. **Be Specific and Clear**
```
❌ Bad: Make this better
✅ Good: Rewrite the following text to be more professional and formal:

{text}
```

#### 2. **Provide Context**
```
❌ Bad: {text}
✅ Good: You are a technical writing expert. Review the following text and suggest improvements for clarity and conciseness:

{text}
```

#### 3. **Specify the Output Format**
```
❌ Bad: Check grammar: {text}
✅ Good: Review the following text for grammar and spelling errors.
List each error with:
- Original text
- Corrected text
- Explanation

Text:
{text}
```

#### 4. **Use the {text} Placeholder**
Always include `{text}` in your prompt. This will be replaced with the selected text.

```
Example: Analyze the sentiment of the following text and classify it as Positive, Negative, or Neutral. Provide reasoning for your classification.

Text:
{text}
```

#### 5. **Set Constraints When Needed**
```
Summarize the following article in exactly 3 bullet points. Each bullet point should be no more than 20 words.

Article:
{text}
```

### Example Custom Copilot Prompts

Here are some useful custom prompts you can create:

#### Grammar and Style
```
Title: Fix Grammar
Prompt: Review the following text for grammar, spelling, and punctuation errors. Provide the corrected version.

{text}
```

#### Simplification
```
Title: Simplify Text
Prompt: Rewrite the following text to be understood by a 10-year-old. Use simple words and short sentences.

{text}
```

#### Code Review
```
Title: Review Code
Prompt: Review the following code for:
- Potential bugs
- Performance issues
- Best practices
- Readability improvements

Code:
{text}
```

#### Tone Adjustment
```
Title: Make Professional
Prompt: Rewrite the following text in a professional, formal tone suitable for business communication.

{text}
```

#### Fact Checking
```
Title: Extract Facts
Prompt: Extract all factual claims from the following text. List each claim and note if it needs verification.

{text}
```

### Managing Custom Copilot Prompts

- **Edit**: Click the edit icon to modify the title or prompt
- **Delete**: Click the delete icon to remove a prompt
- **Enable/Disable**: Toggle the switch to show/hide a prompt in the context menu

Changes are applied immediately without requiring a browser restart!

## How to Update Built-in Prompts

You can customize the default built-in prompts:

1. Go to `Settings` → `Manage Prompts` → `Copilot` tab
2. Click the edit icon next to the prompt you want to change
3. Modify the prompt template (must include `{text}` placeholder)
4. Click `Save`

::: warning
Editing built-in prompts changes them for all future uses. Consider creating a Custom Copilot Prompt instead if you want to keep the original.
:::