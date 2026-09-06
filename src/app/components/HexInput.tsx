import { useEffect, useState } from 'react';

import type { RGBA } from '@core/types/color';

import { hexToRgba, rgbaToHex } from '../hexColor';

interface HexInputProps {
  readonly value: RGBA;
  readonly onChange: (color: RGBA) => void;
}

/** A text field for a `#RRGGBB[AA]` colour that commits only valid values. */
export function HexInput({ value, onChange }: HexInputProps) {
  const [text, setText] = useState(() => rgbaToHex(value));

  useEffect(() => {
    setText(rgbaToHex(value));
  }, [value]);

  const commit = (raw: string): void => {
    const parsed = hexToRgba(raw);
    if (parsed) {
      onChange(parsed);
    } else {
      setText(rgbaToHex(value));
    }
  };

  return (
    <input
      type="text"
      className="hex-input"
      inputMode="text"
      autoComplete="off"
      spellCheck={false}
      aria-label="Hex colour"
      value={text}
      onChange={(event) => {
        setText(event.target.value);
      }}
      onBlur={(event) => {
        commit(event.target.value);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          commit(event.currentTarget.value);
        }
      }}
    />
  );
}
