import React from "react"

import { useStorage } from "@plasmohq/storage/hook"

import Chat from "./chat"
import Login from "./login"

export default function Home() {
  const [token] = useStorage("pa-token", null)

  return <>{token ? <Chat /> : <Login />}</>
}
