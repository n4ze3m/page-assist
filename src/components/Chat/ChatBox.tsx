import { TrashIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import React from "react";
import { iconUrl } from "~/utils/icon";

type Message = {
  isBot: boolean;
  message: string;
};

type History = {
  bot_response: string;
  human_message: string;
};

type Props = {
  title: string | null;
  id: string;
  created_at: Date | null;
  icon: string | null;
  url: string | null;
};

export const CahtBox = (props: Props) => {
  const [messages, setMessages] = React.useState<Message[]>([
    {
      isBot: true,
      message: "Hi, I'm PageAssist Bot. How can I help you?",
    },
  ]);

  const [history, setHistory] = React.useState<History[]>([]);
  const divRef = React.useRef(null);

  React.useEffect(() => {
    //@ts-ignore
    divRef.current.scrollIntoView({ behavior: "smooth" });
  });

  return (
    <div className="flex flex-col border bg-white">
      {/* header */}
      <div className="bg-grey-lighter  flex flex-row items-center justify-between px-3 py-2">
        <Link
          target="_blank"
          href={props.url ? props.url : "#"}
          className="flex items-center"
        >
          <div>
            <img
              className="h-10 w-10 rounded-full"
              //@ts-ignore
              src={iconUrl(props?.icon, props?.url)}
            />
          </div>
          <div className="ml-4">
            <p className="text-grey-darkest">
              {props?.title && props?.title?.length > 100
                ? props?.title?.slice(0, 100) + "..."
                : props?.title}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {props.url && new URL(props.url).hostname}
            </p>
          </div>
        </Link>

        <div className="flex">
          <button
            type="button"
            className="inline-flex items-center rounded-full border border-transparent bg-red-600 p-1.5 text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            <TrashIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
      {/*  */}
      <div
        style={{ height: "calc(100vh - 260px)" }}
        className="flex-grow overflow-auto"
      >
        <div className="px-3 py-2">
          {messages.map((message, index) => {
            return (
              <div
                key={index}
                className={
                  message.isBot
                    ? "mt-2 flex w-full max-w-xs space-x-3"
                    : "ml-auto mt-2 flex w-full max-w-xs justify-end space-x-3"
                }
              >
                <div>
                  <div
                    className={
                      message.isBot
                        ? "rounded-r-lg rounded-bl-lg bg-gray-300 p-3"
                        : "rounded-l-lg rounded-br-lg bg-blue-600 p-3 text-white"
                    }
                  >
                    <p className="text-sm">
                      {/* <ReactMarkdown>{message.message}</ReactMarkdown> */}
                      {message.message}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={divRef} />
        </div>
      </div>
      <div className="items-center bg-gray-300 px-4  py-4">
        <form
        //   onSubmit={form.onSubmit(async (values) => {
        //     setMessages([...messages, values])
        //     form.reset()
        //     await sendToBotAsync(values.message)
        //   })}
        >
          <div className="flex-grow space-y-6">
            <div className="flex">
              <span className="mr-3">
                <button
                  //   disabled={isSending || isSaving}
                  onClick={() => {
                    setHistory([]);
                    setMessages([
                      {
                        message: "Hi, I'm PageAssist. How can I help you?",
                        isBot: true,
                      },
                    ]);
                  }}
                  className="inline-flex h-10 items-center rounded-md border border-gray-700 bg-white px-3 text-sm font-medium text-gray-700  hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
                  type="button"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    className="h-5 w-5 text-gray-600"
                  >
                    <path d="M18.37 2.63 14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3Z"></path>
                    <path d="M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-7"></path>
                    <path d="M14.5 17.5 4.5 15"></path>
                  </svg>
                </button>
              </span>
              <div className="flex-grow">
                <input
                  //   disabled={isSending || isSaving}
                  className="flex h-10 w-full items-center rounded px-3 text-sm"
                  type="text"
                  required
                  placeholder="Type your message…"
                  //   {...form.getInputProps("message")}
                />
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
