import React from "react";
import { ClipboardIcon } from "@heroicons/react/24/outline";
import { api } from "~/utils/api";

export default function SettingsBody() {
  const { data, status } = api.settings.getAccessToken.useQuery();
  const [isCopied, setIsCopied] = React.useState(false);

  return (
    <>
      {status === "loading" && <div>Loading...</div>}
      {status === "success" && (
        <div className="divide-ylg:col-span-9">
          <div className="px-4 py-6 sm:p-6 lg:pb-8">
            <div>
              <h2 className="text-lg font-medium leading-6 text-gray-900">
                Chrom Extension
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Copy the following code and paste it into the extension.
              </p>
            </div>
            <div className="mt-6 flex flex-col lg:flex-row">
              <div className="flex-grow space-y-6">
                <div className="flex">
                  <div className="flex-grow">
                    <input
                      type="password"
                      readOnly
                      defaultValue={data?.accessToken || ""}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
                    />
                  </div>
                  <span className="ml-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCopied(false);
                        navigator.clipboard.writeText(data?.accessToken || "");
                        setIsCopied(true);
                      }}
                      className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
                    >
                      <ClipboardIcon
                        className="h-5 w-5 text-gray-500"
                        aria-hidden="true"
                      />
                      <span className="ml-2">
                        {isCopied ? "Copied" : "Copy"}
                      </span>
                    </button>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
