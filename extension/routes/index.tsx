import { Route, Routes } from "react-router-dom"
import Settings from "./settings"
import Home from "./home"

export const Routing = () => (
    <Routes>
        <Route path="/" element={<Home />} />     
        <Route path="/settings" element={<Settings />} />   
    </Routes>
)