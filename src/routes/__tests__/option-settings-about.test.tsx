import { describe, it, expect, vi } from "vitest"
import { render } from "@testing-library/react"
import OptionAbout from "@/routes/settings/option-settings-about"

vi.mock("@/components/Layouts/Layout", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="option-layout">{children}</div>
  )
}))

vi.mock("@/components/Option/Settings/about", () => ({
  AboutApp: () => <div data-testid="about-app">About App</div>
}))

vi.mock("@/components/Layouts/SettingsOptionLayout", () => ({
  SettingsLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="settings-layout">{children}</div>
  )
}))

describe("OptionAbout", () => {
  it("renders the about page with layout", () => {
    const { getByTestId } = render(<OptionAbout />)

    expect(getByTestId("option-layout")).toBeInTheDocument()
    expect(getByTestId("settings-layout")).toBeInTheDocument()
    expect(getByTestId("about-app")).toBeInTheDocument()
  })
})
