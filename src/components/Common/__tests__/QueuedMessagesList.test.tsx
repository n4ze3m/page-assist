import { useState } from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { expect, it } from "vitest"
import { QueuedMessagesList } from "../QueuedMessagesList"

it("edits, sends and deletes the selected queued message", () => {
  function Queue() {
    const [items, setItems] = useState([
      {
        id: "first",
        message: "first question",
        images: ["data:image/png;base64,image"]
      },
      { id: "second", message: "second question", images: [] }
    ])
    const [sent, setSent] = useState("")
    return (
      <>
        <div>{sent}</div>
        <QueuedMessagesList
          queuedMessages={items}
          onDelete={(id) =>
            setItems((prev) => prev.filter((item) => item.id !== id))
          }
          onEdit={(id) =>
            setItems((prev) =>
              prev.map((item) =>
                item.id === id ? { ...item, message: "edited question" } : item
              )
            )
          }
          onSend={(id) => {
            setSent(items.find((item) => item.id === id).message)
            setItems((prev) => prev.filter((item) => item.id !== id))
          }}
        />
      </>
    )
  }
  render(<Queue />)
  fireEvent.click(screen.getAllByRole("button")[1])
  expect(screen.getByText("edited question")).toBeVisible()
  expect(screen.getByText("second question")).toBeVisible()
  fireEvent.click(screen.getAllByRole("button")[2])
  expect(screen.getByText("edited question")).toBeVisible()
  expect(screen.getAllByRole("button")).toHaveLength(3)
  fireEvent.click(screen.getAllByRole("button")[0])
  expect(screen.queryByText("second question")).not.toBeInTheDocument()
  expect(screen.queryByRole("button")).not.toBeInTheDocument()
})
