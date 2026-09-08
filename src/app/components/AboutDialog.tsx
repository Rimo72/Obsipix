import { Dialog } from './Dialog';
import './AboutDialog.css';

interface AboutDialogProps {
  readonly onClose: () => void;
}

/** The pixel-square mark used in the header. */
function ObsipixMark() {
  return (
    <svg
      className="about__mark"
      viewBox="0 0 48 48"
      role="img"
      aria-label="Obsipix logo"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="0" y="0" width="16" height="16" fill="#4285f4" />
      <rect x="32" y="0" width="16" height="16" fill="#ea4335" />
      <rect x="19" y="19" width="10" height="10" fill="#34a853" />
      <rect x="0" y="32" width="16" height="16" fill="#fbbc05" />
      <rect x="32" y="32" width="16" height="16" fill="#9aa0a6" />
    </svg>
  );
}

/** Help ▸ About Obsipix. */
export function AboutDialog({ onClose }: AboutDialogProps) {
  return (
    <Dialog title="About Obsipix" size="md" onClose={onClose}>
      <div className="about">
        <div className="about__head">
          <ObsipixMark />
          <div className="about__wordmark">
            <strong className="about__name">Obsipix</strong>
            <span className="about__kicker">Pixel Art Editor</span>
          </div>
        </div>

        <p className="about__tagline">Create. Animate. Pixel Perfect.</p>

        <p className="about__lede">
          A personal project built to help artists bring their game worlds to life, one pixel at a
          time.
        </p>

        <p className="about__body">
          Obsipix is a free-to-use pixel art editor created to help artists make pixel art and
          animations for their games. It was built with a focus on simplicity, precision, and a
          workflow that makes creating game-ready pixel art enjoyable and efficient.
        </p>

        <p className="about__meta">Version {__APP_VERSION__}</p>
      </div>
    </Dialog>
  );
}
