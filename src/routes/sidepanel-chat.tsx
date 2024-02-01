import { SidePanelBody } from "~components/Sidepanel/body"
import { SidepanelForm } from "~components/Sidepanel/form"
import { SidepanelHeader } from "~components/Sidepanel/header"

export const SidepanelChat = () => {
  return (
    <div className="flex bg-white dark:bg-black flex-col min-h-screen mx-auto max-w-7xl">
      <div className="sticky top-0 z-10">
        <SidepanelHeader />
      </div>
      <SidePanelBody />

      <div className="bottom-0 w-full bg-transparent border-0 fixed pt-2">
        <div className="stretch mx-2 flex flex-row gap-3 md:mx-4 lg:mx-auto lg:max-w-2xl xl:max-w-3xl">
          <div className="relative flex flex-col h-full flex-1 items-stretch md:flex-col">
            <SidepanelForm />
          </div>
        </div>
      </div>
    </div>
  )
}
