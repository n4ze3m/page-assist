# Prompts

There are two types of prompts in Page Assist: 

1. Custom Prompts
2. Copilot Prompts (Check out the [Copilot Prompts](/sidebar/copilot.md) page for more information)


## Custom Prompts

Custom Prompts are prompts that you can create and use in Page Assist. You can create custom prompts by going to the `Settings` page and clicking on `Manage Prompts`.

![Custom Prompts](https://pub-35424b4473484be483c0afa08c69e7da.r2.dev/Screenshot%202025-02-19%20205135.png)

There are two types of custom prompts:

1. System Prompts
2. Quick Prompts


### System Prompts

System prompts will be set as the `system` type of prompt in the LLM. This means that the prompt will be sent to the LLM as a system prompt. This is useful for setting the context of the conversation.

#### Supported System Prompt Variables

You can use the following variables in your system prompts:

- `{current_date_time}` - The current date and time in local format
- `{current_year}` - The current year
- `{current_month}` - The current month (0-11)
- `{current_day}` - The current day of the month
- `{current_hour}` - The current hour (0-23)
- `{current_minute}` - The current minute (0-59)

These variables will be automatically replaced with their respective values when the prompt is sent to the LLM.

### Quick Prompts

Quick prompts are quick prompts that you can use to quickly send a prompt to the LLM. You can use quick prompts by clicking on the `Quick Prompts` button in the input box.

If you put variables in the `{}` brackets, they will be selected automatically.