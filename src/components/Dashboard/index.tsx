import React from "react";
import Empty from "./Empty";
import Loading from "./Loading";
import { api } from "~/utils/api";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { iconUrl } from "~/utils/icon";

export default function DashboardBoby() {
  const { data: savedSites, status } = api.chat.getSavedSitesForChat.useQuery();

  
  return (
    <>
      {status === "loading" && <Loading />}
      {status === "success" && savedSites.data.length === 0 && <Empty />}
      {status === "success" && savedSites.data.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {savedSites.data.map((site, idx) => (
            <Link
              href={`/dashboard/chat/${site.id}`}
              key={idx}
              className="bg-panel-header-light  border-panel-border-light  hover:bg-panel-border-light hover:border-panel-border-hover-light  h-30 group relative flex cursor-pointer flex-row rounded-md border px-6 py-4 text-left transition duration-150 ease-in-out hover:border-gray-300"
            >
              <div className="flex h-full w-full flex-col space-y-2 ">
                <div className="text-scale-1200">
                  <div className="flex w-full flex-row justify-between gap-1">
                    <span
                      className={`flex-shrink ${
                        site?.title && site?.title?.length > 50
                          ? "truncate"
                          : ""
                      }`}
                    >
                      {site.title}
                    </span>
                    <ChevronRightIcon className="h-10 w-10 text-gray-400 group-hover:text-gray-500" />
                  </div>
                </div>

                <div className="bottom-0">
                  <div className="flex w-full flex-row gap-1">
                    <img
                      className="h-5 w-5 rounded-md"
                      // @ts-ignore
                      src={iconUrl(site.icon, site.url)}
                      alt=""
                    />
                    <span className="text-scale-1000 ml-3 flex-shrink truncate text-xs text-gray-400">
                      {site.url && new URL(site.url).hostname}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
