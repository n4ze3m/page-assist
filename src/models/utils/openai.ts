import {
    APIConnectionTimeoutError,
    APIUserAbortError,
    OpenAI as OpenAIClient,
  } from "openai";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function wrapOpenAIClientError(e: any) {
    let error;
    if (e.constructor.name === APIConnectionTimeoutError.name) {
      error = new Error(e.message);
      error.name = "TimeoutError";
    } else if (e.constructor.name === APIUserAbortError.name) {
      error = new Error(e.message);
      error.name = "AbortError";
    } else {
      error = e;
    }
    return error;
  }

  export type OpenAIToolChoice =
    | OpenAIClient.ChatCompletionToolChoiceOption
    | "any"
    | string;

  export function formatToOpenAIToolChoice(
    toolChoice?: OpenAIToolChoice
  ): OpenAIClient.ChatCompletionToolChoiceOption | undefined {
    if (!toolChoice) {
      return undefined;
    } else if (toolChoice === "any" || toolChoice === "required") {
      return "required";
    } else if (toolChoice === "auto") {
      return "auto";
    } else if (toolChoice === "none") {
      return "none";
    } else if (typeof toolChoice === "string") {
      return {
        type: "function",
        function: {
          name: toolChoice,
        },
      };
    } else {
      return toolChoice;
    }
  }
