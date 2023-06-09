import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";
import { GetServerSideProps, NextPage } from "next";
import Head from "next/head";
import DashboardBoby from "~/components/Dashboard";
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

const DashboardPage: NextPage = () => {
  return (
    <DashboardLayout>
      <Head>
        <title>Dashboard / PageAssist</title>
      </Head>
      <DashboardBoby />
    </DashboardLayout>
  );
};

export default DashboardPage;
