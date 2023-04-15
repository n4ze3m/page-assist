import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";
import { GetServerSideProps, NextPage } from "next";
import Head from "next/head";
import { DashboardChatBody } from "~/components/Chat";
import DashboardLayout from "~/components/Layouts/DashboardLayout";

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const supabase = createServerSupabaseClient(ctx);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return {
      redirect: {
        destination: "/auth",
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
};

const DashboardChatPage: NextPage = () => {
  return (
    <DashboardLayout>
      <Head>
        <title>Chat / PageAssist</title>
      </Head>
      <DashboardChatBody />
    </DashboardLayout>
  );
};

export default DashboardChatPage;
