import { createPortal } from 'react-dom';
import './MarketSwitch.css';

// Shown while a switch of gate or market is still being drawn. It waits a moment before it appears (CSS delay), so a quick switch shows
// no flash, and it is animated with CSS only, which keeps moving while the page is busy. It also stops a second click landing mid-switch.
export default function SwitchOverlay({ label }: { label: string }) {
  return createPortal(
    <div className="concept-tokens ms-overlay" role="status" aria-live="polite">
      <div className="ms-overlay-box">
        <span className="ms-spinner" aria-hidden />
        {label}
      </div>
    </div>,
    document.body,
  );
}
