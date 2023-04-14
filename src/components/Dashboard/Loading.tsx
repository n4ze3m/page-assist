import React from "react";

export default function Loading() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* create skelon loadinf */}
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <div
          className="flex h-35 cursor-pointer rounded-md shadow-sm transition-shadow duration-300 ease-in-out hover:shadow-lg"
          key={item}
        >
          <div className="flex flex-1  items-center justify-between truncate rounded-md border border-gray-200 bg-white">
            <div className="flex-1 truncate px-4 py-4 text-sm">
              <h3 className="h-10 animate-pulse bg-gray-400 font-medium text-gray-900 hover:text-gray-600" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
