import { useState, type ReactNode } from 'react';
import { ClosingAsideContext } from './closingAside';
import './ClosingLayout.css';

// Page layout of every register page that carries closing signatures: the register(s) in the main column and ALL the closing blocks in a
// sidebar that stays in view while the tables are worked on. The blocks are still rendered by RegisterClosurePanel wherever a page puts
// it; the panel finds this sidebar through context and renders into it, so a page only wraps its body in <ClosingLayout>.

export default function ClosingLayout({ children }: { children: ReactNode }) {
  const [aside, setAside] = useState<HTMLElement | null>(null);
  return (
    <ClosingAsideContext.Provider value={aside}>
      <div className="cl">
        <div className="cl-main">{children}</div>
        <aside className="cl-aside" ref={setAside} aria-label="Closing signatures" />
      </div>
    </ClosingAsideContext.Provider>
  );
}
