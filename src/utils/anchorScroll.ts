export function setupAnchorScrollHandler() {
  function handlePopState() {
    const { hash } = window.location;
    if (hash) {
      const anchorId = hash.slice(1);
      const anchor = document.getElementById(anchorId);
      if (anchor) {
        anchor.scrollIntoView({ behavior: 'auto', block: 'center' });
      }
    }
  }
  window.addEventListener('popstate', handlePopState);
  // Optionally, handle initial load with hash
  if (window.location.hash) {
    const anchorId = window.location.hash.slice(1);
    let attempts = 0;
    const maxAttempts = 20; // 2 seconds
    const interval = setInterval(() => {
      const anchor = document.getElementById(anchorId);
      if (anchor) {
        anchor.scrollIntoView({ behavior: 'smooth', block: 'center' });
        clearInterval(interval);
      } else if (++attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 100);
  }
}
