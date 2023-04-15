import { TrashIcon } from "@heroicons/react/24/outline";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import Link from "next/link";
import { useRouter } from "next/router";
import React from "react";
import { api } from "~/utils/api";
import { iconUrl } from "~/utils/icon";

import { useForm } from "@mantine/form";
import axios from "axios";
import { useMutation } from "@tanstack/react-query";

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
  const supabase = useSupabaseClient();

  const form = useForm({
    initialValues: {
      message: "",
      isBot: false,
    },
  });

  const sendToBot = async (message: string) => {
    const { data } = await supabase.auth.getSession();

    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_PAGEASSIST_URL}/api/v1/chat/app`,
      {
        user_message: message,
        history: history,
        url: props.url,
        id: props.id,
      },
      {
        headers: {
          "X-Auth-Token": data.session?.access_token,
        },
      }
    );

    return response.data;
  };

  const { mutateAsync: sendToBotAsync, isLoading: isSending } = useMutation(
    sendToBot,
    {
      onSuccess: (data) => {
        setMessages([...messages, { isBot: true, message: data.bot_response }]);
        setHistory([...history, data]);
      },
      onError: (error) => {
        setMessages([
          ...messages,
          { isBot: true, message: "Something went wrong" },
        ]);
      },
    }
  );
  const [messages, setMessages] = React.useState<Message[]>([
    {
      isBot: true,
      message: "Hi, I'm PageAssist Bot. How can I help you?",
    },
  ]);

  // const fetchSession = async () => {

  // const {data}= await supabase.auth.getSession();
  // data.session?.access_token
  // }

  const [history, setHistory] = React.useState<History[]>([]);
  const divRef = React.useRef(null);

  React.useEffect(() => {
    //@ts-ignore
    divRef.current.scrollIntoView({ behavior: "smooth" });
  });

  const router = useRouter();

  const { mutateAsync: deleteChatByIdAsync, isLoading: isDeleting } =
    api.chat.deleteChatById.useMutation({
      onSuccess: () => {
        router.push("/dashboard");
      },
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
            onClick={async () => {
              const isOk = confirm(
                "Are you sure you want to delete this chat?"
              );

              if (isOk) {
                await deleteChatByIdAsync({
                  id: props.id,
                });
              }
            }}
            disabled={isDeleting}
            type="button"
            className="inline-flex items-center rounded-full border border-transparent bg-red-600 p-1.5 text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            {isDeleting ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                className="h-5 w-5 animate-spin fill-white text-white dark:text-gray-600"
                viewBox="0 0 100 101"
              >
                <path
                  fill="currentColor"
                  d="M100 50.59c0 27.615-22.386 50.001-50 50.001s-50-22.386-50-50 22.386-50 50-50 50 22.386 50 50zm-90.919 0c0 22.6 18.32 40.92 40.919 40.92 22.599 0 40.919-18.32 40.919-40.92 0-22.598-18.32-40.918-40.919-40.918-22.599 0-40.919 18.32-40.919 40.919z"
                ></path>
                <path
                  fill="currentFill"
                  d="M93.968 39.04c2.425-.636 3.894-3.128 3.04-5.486A50 50 0 0041.735 1.279c-2.474.414-3.922 2.919-3.285 5.344.637 2.426 3.12 3.849 5.6 3.484a40.916 40.916 0 0144.131 25.769c.902 2.34 3.361 3.802 5.787 3.165z"
                ></path>
              </svg>
            ) : (
              <TrashIcon className="h-5 w-5" aria-hidden="true" />
            )}
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
          {isSending && (
            <div className="mt-2 flex w-full max-w-xs space-x-3">
              <div>
                <div className="rounded-r-lg rounded-bl-lg bg-gray-300 p-3">
                  <p className="text-sm">Hold on, I'm looking...</p>
                </div>
              </div>
            </div>
          )}
          <div ref={divRef} />
        </div>
      </div>
      <div className="items-center bg-gray-300 px-4  py-4">
        <form
          onSubmit={form.onSubmit(async (values) => {
            setMessages([...messages, values]);
            form.reset();
            await sendToBotAsync(values.message);
          })}
        >
          <div className="flex-grow space-y-6">
            <div className="flex">
              <span className="mr-3">
                <button
                  disabled={isSending}
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
                  disabled={isSending}
                  className="flex h-10 w-full items-center rounded px-3 text-sm"
                  type="text"
                  required
                  placeholder="Type your message…"
                  {...form.getInputProps("message")}
                />
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
