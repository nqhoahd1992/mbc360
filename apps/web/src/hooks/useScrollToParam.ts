import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import '../styles/scrollFlash.css';

// Deep link into a section of a page: `?scrollTo=<element id>`. Once the page has rendered (`ready`), scrolls to that element,
// pulses a ring around it so the person can see where they were taken, then drops the parameter so a refresh does not repeat it.
// The same convention the phase page uses for its "What's blocking this gate" links; a page that is not the phase page uses this.
export function useScrollToParam(ready: boolean) {
  const [searchParams, setSearchParams] = useSearchParams();
  const targetId = searchParams.get('scrollTo');

  useEffect(() => {
    if (!ready || !targetId) return;
    const el = document.getElementById(targetId);
    if (el) {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      // Flash once the scroll has had time to arrive, so the ring is seen on the section and not while it travels past.
      window.setTimeout(() => {
        el.classList.remove('sf-flash');
        void el.offsetWidth;
        el.classList.add('sf-flash');
        window.setTimeout(() => el.classList.remove('sf-flash'), 1200);
      }, reduceMotion ? 0 : 500);
    }
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('scrollTo');
        return next;
      },
      { replace: true },
    );
  }, [ready, targetId, setSearchParams]);
}
