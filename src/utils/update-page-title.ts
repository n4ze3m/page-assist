export const updatePageTitle = (title: string = 'tldw Assistant') => {
  const pageTitle = document.querySelector("title")
  if (pageTitle) {
    pageTitle.textContent = title
  } else {
    console.warn("No title element found to update.")
  }
}
