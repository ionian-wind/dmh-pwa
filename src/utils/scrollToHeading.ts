import type { Router } from 'vue-router';

export const scrollToHeading = async (id: string, router: Router, heading?: HTMLElement) => {
  console.log({ scrollToHeading: id });

  // Also update the hash in the browser using router
  if (window.location.hash !== `#${id}`) {
    await router.replace({ hash: `#${id}` });
  }

  if (heading) {
    (heading as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Add highlight class for transition
    heading.classList.add('highlight-anchor');
    setTimeout(() => heading.classList.remove('highlight-anchor'), 1200);
  }
}
