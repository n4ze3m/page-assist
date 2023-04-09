import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router-dom"
import { Routing } from "~routes"


const queryClient = new QueryClient()

function IndexPopup() {
  return (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <Routing />
      </QueryClientProvider>
    </MemoryRouter>
  )
}

export default IndexPopup
