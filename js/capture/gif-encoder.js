// NormieSticker — Minimal GIF89a encoder
// Encodes frames into an animated GIF binary

export class GIFEncoder {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.frames = [];
  }

  addFrame(imageData, delay = 100) {
    this.frames.push({ imageData, delay });
  }

  encode() {
    const { width, height, frames } = this;
    const buf = [];

    // --- Header ---
    writeStr(buf, 'GIF89a');

    // --- Logical Screen Descriptor ---
    writeU16(buf, width);
    writeU16(buf, height);
    // GCT flag=1, color res=7 (8 bits), sort=0, GCT size=7 (256 colors)
    buf.push(0xF7);
    buf.push(0); // bg color index
    buf.push(0); // pixel aspect ratio

    // --- Global Color Table (256 entries) ---
    // Build a quantized palette from all frames
    const palette = this._buildPalette(frames);
    for (let i = 0; i < 256; i++) {
      buf.push(palette[i * 3] || 0);
      buf.push(palette[i * 3 + 1] || 0);
      buf.push(palette[i * 3 + 2] || 0);
    }

    // --- NETSCAPE extension for looping ---
    buf.push(0x21, 0xFF, 0x0B);
    writeStr(buf, 'NETSCAPE2.0');
    buf.push(0x03, 0x01);
    writeU16(buf, 0); // loop forever
    buf.push(0x00);

    // --- Frames ---
    for (const frame of frames) {
      const indices = this._quantize(frame.imageData, palette);

      // Graphic Control Extension
      buf.push(0x21, 0xF9, 0x04);
      buf.push(0x04); // disposal=1 (don't dispose), no transparency → actually 0x04 = restore to bg? Let's use 0x08 = restore to bg, no user input, no transparency
      // Actually: packed byte = disposal<<2 | userInput<<1 | transparencyFlag
      // disposal=2 (restore to bg) = 0x08, no user input, no transparency
      // Let's just use 0x00 for no disposal
      writeU16(buf, Math.round(frame.delay / 10)); // delay in centiseconds
      buf.push(0); // transparent color index (unused)
      buf.push(0); // terminator

      // Image Descriptor
      buf.push(0x2C);
      writeU16(buf, 0); // left
      writeU16(buf, 0); // top
      writeU16(buf, width);
      writeU16(buf, height);
      buf.push(0x00); // no local color table

      // LZW compressed data
      const minCodeSize = 8;
      buf.push(minCodeSize);
      const compressed = this._lzwCompress(indices, minCodeSize);
      // Write in sub-blocks (max 255 bytes each)
      let offset = 0;
      while (offset < compressed.length) {
        const chunk = Math.min(255, compressed.length - offset);
        buf.push(chunk);
        for (let i = 0; i < chunk; i++) {
          buf.push(compressed[offset + i]);
        }
        offset += chunk;
      }
      buf.push(0x00); // block terminator
    }

    // --- Trailer ---
    buf.push(0x3B);

    return new Uint8Array(buf);
  }

  _buildPalette(frames) {
    // Median-cut-lite: sample colors and pick 256 representatives
    const colorMap = new Map();
    for (const frame of frames) {
      const d = frame.imageData.data;
      for (let i = 0; i < d.length; i += 16) { // sample every 4th pixel
        const key = (d[i] >> 2) * 65536 + (d[i+1] >> 2) * 256 + (d[i+2] >> 2);
        colorMap.set(key, [d[i], d[i+1], d[i+2]]);
      }
    }

    const colors = [...colorMap.values()];
    const palette = new Uint8Array(256 * 3);

    if (colors.length <= 256) {
      for (let i = 0; i < colors.length; i++) {
        palette[i * 3] = colors[i][0];
        palette[i * 3 + 1] = colors[i][1];
        palette[i * 3 + 2] = colors[i][2];
      }
    } else {
      // Simple uniform quantization
      for (let i = 0; i < 256; i++) {
        const idx = Math.floor(i * colors.length / 256);
        palette[i * 3] = colors[idx][0];
        palette[i * 3 + 1] = colors[idx][1];
        palette[i * 3 + 2] = colors[idx][2];
      }
    }

    return palette;
  }

  _quantize(imageData, palette) {
    const d = imageData.data;
    const n = imageData.width * imageData.height;
    const indices = new Uint8Array(n);

    // Build palette lookup (simple nearest-color)
    for (let i = 0; i < n; i++) {
      const r = d[i * 4];
      const g = d[i * 4 + 1];
      const b = d[i * 4 + 2];
      let bestIdx = 0;
      let bestDist = Infinity;

      for (let j = 0; j < 256; j++) {
        const dr = r - palette[j * 3];
        const dg = g - palette[j * 3 + 1];
        const db = b - palette[j * 3 + 2];
        const dist = dr * dr + dg * dg + db * db;
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = j;
          if (dist === 0) break;
        }
      }
      indices[i] = bestIdx;
    }
    return indices;
  }

  _lzwCompress(indices, minCodeSize) {
    const clearCode = 1 << minCodeSize;
    const eoiCode = clearCode + 1;
    const output = [];

    let codeSize = minCodeSize + 1;
    let nextCode = eoiCode + 1;
    let table = new Map();

    // Init table
    function resetTable() {
      table = new Map();
      for (let i = 0; i < clearCode; i++) {
        table.set(String(i), i);
      }
      codeSize = minCodeSize + 1;
      nextCode = eoiCode + 1;
    }

    // Bit packer
    let bitBuf = 0;
    let bitCount = 0;

    function writeCode(code) {
      bitBuf |= (code << bitCount);
      bitCount += codeSize;
      while (bitCount >= 8) {
        output.push(bitBuf & 0xFF);
        bitBuf >>= 8;
        bitCount -= 8;
      }
    }

    resetTable();
    writeCode(clearCode);

    let current = String(indices[0]);
    for (let i = 1; i < indices.length; i++) {
      const next = current + ',' + indices[i];
      if (table.has(next)) {
        current = next;
      } else {
        writeCode(table.get(current));
        if (nextCode < 4096) {
          table.set(next, nextCode);
          if (nextCode > (1 << codeSize) - 1 && codeSize < 12) {
            codeSize++;
          }
          nextCode++;
        } else {
          writeCode(clearCode);
          resetTable();
        }
        current = String(indices[i]);
      }
    }

    writeCode(table.get(current));
    writeCode(eoiCode);

    // Flush remaining bits
    if (bitCount > 0) {
      output.push(bitBuf & 0xFF);
    }

    return output;
  }
}

function writeStr(buf, str) {
  for (let i = 0; i < str.length; i++) buf.push(str.charCodeAt(i));
}

function writeU16(buf, val) {
  buf.push(val & 0xFF);
  buf.push((val >> 8) & 0xFF);
}
