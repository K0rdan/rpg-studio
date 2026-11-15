/**
 * Exact palette reduction (median cut, no dithering).
 *
 * sharp's `png({ palette: true, colours: N })` only honours N up to a bit
 * depth: every N from 17 to 256 produces a full 8-bit palette. A "32 colour"
 * tile therefore keeps up to 256 colours. This quantiser really stops at N.
 */

interface WeightedColour {
  key: number;
  count: number;
}

type Rgb = [number, number, number];

function unpack(key: number): Rgb {
  return [(key >> 16) & 255, (key >> 8) & 255, key & 255];
}

function channelRange(colours: WeightedColour[], channel: 0 | 1 | 2): number {
  let low = 255;
  let high = 0;
  for (const colour of colours) {
    const value = unpack(colour.key)[channel];
    low = Math.min(low, value);
    high = Math.max(high, value);
  }
  return high - low;
}

function widestChannel(colours: WeightedColour[]): { channel: 0 | 1 | 2; range: number } {
  const ranges = ([0, 1, 2] as const).map((channel) => channelRange(colours, channel));
  const range = Math.max(...ranges);
  return { channel: ranges.indexOf(range) as 0 | 1 | 2, range };
}

function split(colours: WeightedColour[], channel: 0 | 1 | 2): [WeightedColour[], WeightedColour[]] {
  const sorted = [...colours].sort((left, right) => (
    unpack(left.key)[channel] - unpack(right.key)[channel]
  ));
  const total = sorted.reduce((sum, colour) => sum + colour.count, 0);
  let seen = 0;
  let cut = 1;
  for (let index = 0; index < sorted.length - 1; index += 1) {
    seen += sorted[index].count;
    cut = index + 1;
    if (seen >= total / 2) {
      break;
    }
  }
  return [sorted.slice(0, cut), sorted.slice(cut)];
}

function average(colours: WeightedColour[]): Rgb {
  let total = 0;
  const sum = [0, 0, 0];
  for (const colour of colours) {
    const rgb = unpack(colour.key);
    total += colour.count;
    sum[0] += rgb[0] * colour.count;
    sum[1] += rgb[1] * colour.count;
    sum[2] += rgb[2] * colour.count;
  }
  return [
    Math.round(sum[0] / total),
    Math.round(sum[1] / total),
    Math.round(sum[2] / total),
  ];
}

export function buildPalette(rgba: Uint8Array | Buffer, maxColours: number): Rgb[] {
  const histogram = new Map<number, number>();
  for (let offset = 0; offset < rgba.length; offset += 4) {
    const key = (rgba[offset] << 16) | (rgba[offset + 1] << 8) | rgba[offset + 2];
    histogram.set(key, (histogram.get(key) ?? 0) + 1);
  }
  const all = [...histogram].map(([key, count]) => ({ key, count }));
  if (all.length <= maxColours) {
    return all.map((colour) => unpack(colour.key));
  }

  const boxes: WeightedColour[][] = [all];
  while (boxes.length < maxColours) {
    let target = -1;
    let targetScore = 0;
    boxes.forEach((box, index) => {
      if (box.length < 2) {
        return;
      }
      const population = box.reduce((sum, colour) => sum + colour.count, 0);
      const score = widestChannel(box).range * Math.sqrt(population);
      if (score > targetScore) {
        target = index;
        targetScore = score;
      }
    });
    if (target < 0) {
      break;
    }
    const [low, high] = split(boxes[target], widestChannel(boxes[target]).channel);
    boxes.splice(target, 1, low, high);
  }
  return boxes.map(average);
}

/** Replaces every pixel with its nearest palette colour. Alpha is preserved. */
export function quantiseRgba(
  rgba: Uint8Array | Buffer,
  maxColours: number,
): Buffer {
  const palette = buildPalette(rgba, maxColours);
  const output = Buffer.from(rgba);
  const cache = new Map<number, Rgb>();
  for (let offset = 0; offset < output.length; offset += 4) {
    const key = (output[offset] << 16) | (output[offset + 1] << 8) | output[offset + 2];
    let match = cache.get(key);
    if (!match) {
      let best = Infinity;
      match = palette[0];
      for (const candidate of palette) {
        const distance = (candidate[0] - output[offset]) ** 2
          + (candidate[1] - output[offset + 1]) ** 2
          + (candidate[2] - output[offset + 2]) ** 2;
        if (distance < best) {
          best = distance;
          match = candidate;
        }
      }
      cache.set(key, match);
    }
    output[offset] = match[0];
    output[offset + 1] = match[1];
    output[offset + 2] = match[2];
  }
  return output;
}
