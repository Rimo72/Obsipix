import type { EditorSession } from '../EditorSession';
import './BrushControls.css';

const SIZES = [1, 2, 3, 4, 5, 8] as const;

interface BrushControlsProps {
  readonly session: EditorSession;
}

export function BrushControls({ session }: BrushControlsProps) {
  const { size, shape } = session.brush;
  return (
    <div className="brush-controls" role="group" aria-label="Brush">
      <span className="brush-controls__label">Brush</span>
      {SIZES.map((value) => (
        <button
          key={value}
          type="button"
          className={
            size === value
              ? 'brush-controls__size brush-controls__size--active'
              : 'brush-controls__size'
          }
          aria-label={`Brush size ${String(value)}`}
          aria-pressed={size === value}
          onClick={() => {
            session.setBrushSize(value);
          }}
        >
          {value}
        </button>
      ))}
      <button
        type="button"
        className="brush-controls__shape"
        aria-label={shape === 'square' ? 'Square brush' : 'Circle brush'}
        aria-pressed={shape === 'circle'}
        title={shape === 'square' ? 'Square brush' : 'Circle brush'}
        onClick={() => {
          session.setBrushShape(shape === 'square' ? 'circle' : 'square');
        }}
      >
        {shape === 'square' ? '■' : '●'}
      </button>
    </div>
  );
}
