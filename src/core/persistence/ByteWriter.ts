/** Grows-as-needed little-endian byte buffer for building a binary file. */
export class ByteWriter {
  #buffer: Uint8Array;
  #length = 0;

  constructor(initialCapacity = 1024) {
    this.#buffer = new Uint8Array(Math.max(16, initialCapacity));
  }

  get length(): number {
    return this.#length;
  }

  #ensure(extra: number): void {
    const needed = this.#length + extra;
    if (needed <= this.#buffer.length) {
      return;
    }
    let capacity = this.#buffer.length * 2;
    while (capacity < needed) {
      capacity *= 2;
    }
    const grown = new Uint8Array(capacity);
    grown.set(this.#buffer.subarray(0, this.#length));
    this.#buffer = grown;
  }

  u8(value: number): void {
    this.#ensure(1);
    this.#buffer[this.#length] = value & 0xff;
    this.#length += 1;
  }

  u16(value: number): void {
    this.#ensure(2);
    this.#buffer[this.#length] = value & 0xff;
    this.#buffer[this.#length + 1] = (value >>> 8) & 0xff;
    this.#length += 2;
  }

  u32(value: number): void {
    this.#ensure(4);
    const v = value >>> 0;
    this.#buffer[this.#length] = v & 0xff;
    this.#buffer[this.#length + 1] = (v >>> 8) & 0xff;
    this.#buffer[this.#length + 2] = (v >>> 16) & 0xff;
    this.#buffer[this.#length + 3] = (v >>> 24) & 0xff;
    this.#length += 4;
  }

  /** Big-endian u32 — for formats (like PNG) that specify network byte order. */
  u32be(value: number): void {
    this.#ensure(4);
    const v = value >>> 0;
    this.#buffer[this.#length] = (v >>> 24) & 0xff;
    this.#buffer[this.#length + 1] = (v >>> 16) & 0xff;
    this.#buffer[this.#length + 2] = (v >>> 8) & 0xff;
    this.#buffer[this.#length + 3] = v & 0xff;
    this.#length += 4;
  }

  /** Unsigned LEB128. */
  varint(value: number): void {
    let v = value >>> 0;
    while (v >= 0x80) {
      this.u8((v & 0x7f) | 0x80);
      v >>>= 7;
    }
    this.u8(v);
  }

  bytes(source: Uint8Array): void {
    this.#ensure(source.length);
    this.#buffer.set(source, this.#length);
    this.#length += source.length;
  }

  toUint8Array(): Uint8Array {
    return this.#buffer.slice(0, this.#length);
  }
}

/** Sequential little-endian reader with bounds checking. */
export class ByteReader {
  readonly #view: DataView;
  readonly #bytes: Uint8Array;
  #offset = 0;

  constructor(bytes: Uint8Array) {
    this.#bytes = bytes;
    this.#view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  get offset(): number {
    return this.#offset;
  }

  get remaining(): number {
    return this.#bytes.length - this.#offset;
  }

  #need(count: number): void {
    if (this.#offset + count > this.#bytes.length) {
      throw new RangeError(`Unexpected end of data at offset ${this.#offset}`);
    }
  }

  u8(): number {
    this.#need(1);
    const value = this.#view.getUint8(this.#offset);
    this.#offset += 1;
    return value;
  }

  u16(): number {
    this.#need(2);
    const value = this.#view.getUint16(this.#offset, true);
    this.#offset += 2;
    return value;
  }

  u32(): number {
    this.#need(4);
    const value = this.#view.getUint32(this.#offset, true);
    this.#offset += 4;
    return value;
  }

  varint(): number {
    let result = 0;
    let shift = 0;
    for (;;) {
      const byte = this.u8();
      result |= (byte & 0x7f) << shift;
      if ((byte & 0x80) === 0) {
        break;
      }
      shift += 7;
      if (shift > 35) {
        throw new RangeError('Varint is too long');
      }
    }
    return result >>> 0;
  }

  bytes(count: number): Uint8Array {
    this.#need(count);
    const slice = this.#bytes.slice(this.#offset, this.#offset + count);
    this.#offset += count;
    return slice;
  }
}
