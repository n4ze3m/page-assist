import { ChatOpenAI } from "@langchain/openai";

export class ChatGoogleAI extends ChatOpenAI {

    frequencyPenalty: number = undefined;
    presencePenalty: number = undefined;

    static lc_name() {
        return "ChatGoogleAI";
    }
}