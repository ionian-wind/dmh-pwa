/** Reload the current page. Isolated so tests can mock browser navigation. */
export function reloadPage(): void {
  window.location.reload();
}
