import React from "react";
import Empty from "./Empty";

export default function DashboardBoby() {
  return (
    <>
      {/* align to center of the screen */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className=" px-4 py-8 sm:px-10">
          <Empty />
        </div>
      </div>
    </>
  );
}
