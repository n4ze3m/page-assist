import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router-dom"
import {  SidepanelRouting } from "~routes"
import { ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
const queryClient = new QueryClient()
import "./css/tailwind.css"

function IndexOption() {
  return (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <SidepanelRouting />
        <ToastContainer />
      </QueryClientProvider>
    </MemoryRouter>
  )
}

export default IndexOption
