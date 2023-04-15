import { useRouter } from "next/router";
import React from "react";
import { api } from "~/utils/api";
import { CahtBox } from "./ChatBox";

export const DashboardChatBody = () => {
  const router = useRouter();

  const { id } = router.query;

  const { data: chat, status } = api.chat.getChatById.useQuery(
    { id: id as string },
    {
      onError: (err) => {
        router.push("/dashboard");
      },
    }
  );

  return (
    <div>
      {status === "loading" && <div>Loading...</div>}
      {status === "success" && <CahtBox {...chat} />}
    </div>
  );
};
