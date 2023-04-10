import { AppProps, type AppType } from "next/app";

import { api } from "~/utils/api";

import "~/styles/globals.css";

import { Poppins } from "next/font/google";
import {
  createBrowserSupabaseClient,
  Session,
} from "@supabase/auth-helpers-nextjs";
import React from "react";
import { SessionContextProvider } from "@supabase/auth-helpers-react";
const poppins = Poppins({
  weight: ["400", "500", "600", "700", "800", "900"],
  style: ["normal"],
  subsets: ["latin"],
});

function MyApp({
  Component,
  pageProps,
}: AppProps<{
  initialSession: Session;
}>): JSX.Element {
  const [supabaseClient] = React.useState(() => createBrowserSupabaseClient());

  return (
    <>
      <style jsx global>
        {`
          html,
          body {
            font-family: ${poppins.style.fontFamily} !important;
          }
        `}
      </style>
      <SessionContextProvider
        supabaseClient={supabaseClient}
        initialSession={pageProps.initialSession}
      >
        <Component {...pageProps} />
      </SessionContextProvider>
    </>
  );
}

export default api.withTRPC(MyApp);
