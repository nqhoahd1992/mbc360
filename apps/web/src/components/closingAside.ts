import { createContext, useContext } from 'react';
import '../styles/scrollFlash.css';

// The sidebar element of a <ClosingLayout>, for the closing blocks to render into.
export const ClosingAsideContext = createContext<HTMLElement | null>(null);
export const useClosingAside = () => useContext(ClosingAsideContext);

// Scroll to the register a closing block belongs to (every register table carries id="register-<key>") and pulse a ring around it.
export function scrollToRegister(registerKey: string) {
  const el = document.getElementById(`register-${registerKey}`);
  if (!el) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  window.setTimeout(
    () => {
      el.classList.remove('sf-flash');
      void el.offsetWidth;
      el.classList.add('sf-flash');
      window.setTimeout(() => el.classList.remove('sf-flash'), 1200);
    },
    reduceMotion ? 0 : 500,
  );
}
