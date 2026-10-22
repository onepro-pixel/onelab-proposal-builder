/**
 * Opens the browser's print dialog with a meaningful document title. Browsers
 * use the title as the default file name when the user picks "Save as PDF",
 * so the customer gets "OneLab offert - Kundnamn.pdf" instead of the page name.
 */
export function printDocument(title: string): void {
  const previous = document.title;
  const restore = () => {
    document.title = previous;
    window.removeEventListener("afterprint", restore);
  };
  document.title = title;
  window.addEventListener("afterprint", restore);
  window.print();
}

export function offerFileTitle(customerName: string): string {
  const clean = customerName.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim();
  return clean ? `OneLab offert - ${clean}` : "OneLab offert";
}
