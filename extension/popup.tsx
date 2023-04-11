import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router-dom"
import { Routing } from "~routes"
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const queryClient = new QueryClient()

function IndexPopup() {
  return (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <Routing />
        <ToastContainer />
      </QueryClientProvider>
    </MemoryRouter>
  )
}

export default IndexPopup
