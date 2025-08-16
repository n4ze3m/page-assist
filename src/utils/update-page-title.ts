export const updatePageTitle = (title: string = 'Page Assist - A Web UI for Local AI Models') => {
  const pageTitle = document.querySelector("title")
  if (pageTitle) {
    pageTitle.textContent = title
  } else {
    console.warn("No title element found to update.")
  }
}
