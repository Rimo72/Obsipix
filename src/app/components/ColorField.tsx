import {
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import { hsvToRgb, type HSV } from '@core/colors/convert';
import { rgba, type RGBA } from '@core/types/color';

import './ColorField.css';

interface ColorFieldProps {
  readonly value: RGBA;
  /** Current hue in degrees (owned by the parent so it survives greys — see useRetainedHue). */
  readonly hue: number;
  /** Saturation + value derived from `value`, with `hue` substituted in. */
  readonly hsv: HSV;
  readonly onColorChange: (color: RGBA) => void;
  readonly onHueChange: (hue: number) => void;
  /** Show visible "Hue" / "Opacity" captions above the bars. */
  readonly labels?: boolean;
}

type Kind = 'sv' | 'hue' | 'alpha';

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

/** Normalised pointer position (0–1, clamped) within `element`. */
function localPosition(
  element: HTMLElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const rect = element.getBoundingClientRect();
  return {
    x: clamp01((clientX - rect.left) / rect.width),
    y: clamp01((clientY - rect.top) / rect.height),
  };
}

/**
 * The visual colour selector shared by the options-bar popover and the Color
 * Management dialog (PROJECT_CORE §14.3): a saturation/value square, a hue bar
 * and an alpha bar. Pure presentation — it owns no colour state.
 */
export function ColorField({
  value,
  hue,
  hsv,
  onColorChange,
  onHueChange,
  labels = false,
}: ColorFieldProps) {
  const setSV = (s: number, v: number): void => {
    onColorChange({ ...hsvToRgb({ h: hue, s, v }), a: value.a });
  };
  const setHue = (h: number): void => {
    onHueChange(h);
    onColorChange({ ...hsvToRgb({ h, s: hsv.s, v: hsv.v }), a: value.a });
  };
  const setAlpha = (a01: number): void => {
    onColorChange(rgba(value.r, value.g, value.b, Math.round(clamp01(a01) * 255)));
  };

  // The live handlers close over the latest props; refresh the ref every render.
  const applyRef = useRef<(kind: Kind, x: number, y: number) => void>(() => undefined);
  applyRef.current = (kind, x, y) => {
    if (kind === 'sv') {
      setSV(x, 1 - y);
    } else if (kind === 'hue') {
      setHue(x * 360);
    } else {
      setAlpha(x);
    }
  };

  const startDrag =
    (kind: Kind) =>
    (event: ReactPointerEvent<HTMLElement>): void => {
      const target = event.currentTarget;
      const run = (clientX: number, clientY: number): void => {
        const pos = localPosition(target, clientX, clientY);
        applyRef.current(kind, pos.x, pos.y);
      };
      run(event.clientX, event.clientY);
      const move = (e: PointerEvent): void => {
        run(e.clientX, e.clientY);
      };
      const up = (): void => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    };

  const arrowKey =
    (kind: Kind) =>
    (event: ReactKeyboardEvent<HTMLElement>): void => {
      const d = event.shiftKey ? 10 : 1;
      const dx = event.key === 'ArrowRight' ? d : event.key === 'ArrowLeft' ? -d : 0;
      const dy = event.key === 'ArrowUp' ? d : event.key === 'ArrowDown' ? -d : 0;
      if (dx === 0 && dy === 0) {
        return;
      }
      event.preventDefault();
      if (kind === 'hue') {
        setHue((((hue + dx) % 360) + 360) % 360);
      } else if (kind === 'alpha') {
        setAlpha(value.a / 255 + dx / 100);
      } else {
        setSV(clamp01(hsv.s + dx / 100), clamp01(hsv.v + dy / 100));
      }
    };

  const hueColor = `hsl(${String(Math.round(hue))}, 100%, 50%)`;
  const alpha = value.a / 255;

  return (
    <div className="color-field">
      <div
        className="color-field__sv"
        style={{ backgroundColor: hueColor }}
        onPointerDown={startDrag('sv')}
        onKeyDown={arrowKey('sv')}
        role="slider"
        aria-label="Saturation and value"
        aria-valuetext={`saturation ${String(Math.round(hsv.s * 100))}%, value ${String(
          Math.round(hsv.v * 100),
        )}%`}
        tabIndex={0}
      >
        <div className="color-field__sv-white" />
        <div className="color-field__sv-black" />
        <div
          className="color-field__thumb"
          style={{ left: `${String(hsv.s * 100)}%`, top: `${String((1 - hsv.v) * 100)}%` }}
        />
      </div>

      {labels && <span className="color-field__label">Hue</span>}
      <div
        className="color-field__bar color-field__bar--hue"
        onPointerDown={startDrag('hue')}
        onKeyDown={arrowKey('hue')}
        role="slider"
        aria-label="Hue"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(hue)}
        tabIndex={0}
      >
        <div className="color-field__thumb" style={{ left: `${String((hue / 360) * 100)}%` }} />
      </div>

      {labels && <span className="color-field__label">Opacity</span>}
      <div
        className="color-field__bar color-field__bar--alpha"
        onPointerDown={startDrag('alpha')}
        onKeyDown={arrowKey('alpha')}
        role="slider"
        aria-label="Opacity"
        aria-valuemin={0}
        aria-valuemax={255}
        aria-valuenow={value.a}
        tabIndex={0}
      >
        <div
          className="color-field__alpha-fill"
          style={{
            background: `linear-gradient(to right, rgba(${String(value.r)},${String(
              value.g,
            )},${String(value.b)},0), rgb(${String(value.r)},${String(value.g)},${String(
              value.b,
            )}))`,
          }}
        />
        <div className="color-field__thumb" style={{ left: `${String(alpha * 100)}%` }} />
      </div>
    </div>
  );
}
