import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router-dom"
import { ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
const queryClient = new QueryClient()
import "./css/tailwind.css"

function IndexOption() {
  return (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <ToastContainer />
      </QueryClientProvider>
    </MemoryRouter>
  )
}

export default IndexOption
