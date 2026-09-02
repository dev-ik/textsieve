export interface RawSpan {
  readonly start: number;
  readonly end: number;
}

export interface MappedText {
  readonly value: string;
  /** One raw-input span for every UTF-16 code unit in value. */
  readonly map: readonly RawSpan[];
}

const graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

function appendMapped(
  valueParts: string[],
  map: RawSpan[],
  value: string,
  span: RawSpan
): void {
  valueParts.push(value);
  for (let index = 0; index < value.length; index += 1) {
    map.push(span);
  }
}

export function normalizeMapped(input: string): MappedText {
  const parts: string[] = [];
  const map: RawSpan[] = [];

  for (const item of graphemeSegmenter.segment(input)) {
    const rawStart = item.index;
    const rawEnd = rawStart + item.segment.length;
    const normalized = item.segment.normalize("NFKC").toLocaleLowerCase("und");
    appendMapped(parts, map, normalized, { start: rawStart, end: rawEnd });
  }

  return Object.freeze({ value: parts.join(""), map: Object.freeze(map) });
}

export function isZeroWidth(codePoint: number): boolean {
  return (
    codePoint === 0x00ad ||
    codePoint === 0x034f ||
    codePoint === 0x061c ||
    codePoint === 0x180e ||
    (codePoint >= 0x200b && codePoint <= 0x200f) ||
    (codePoint >= 0x2060 && codePoint <= 0x2064) ||
    codePoint === 0xfeff
  );
}

export function isBidiControl(codePoint: number): boolean {
  return (
    (codePoint >= 0x202a && codePoint <= 0x202e) ||
    (codePoint >= 0x2066 && codePoint <= 0x2069)
  );
}

export function isUnsafeControl(codePoint: number): boolean {
  return (
    (codePoint >= 0 && codePoint <= 0x08) ||
    (codePoint >= 0x0b && codePoint <= 0x0c) ||
    (codePoint >= 0x0e && codePoint <= 0x1f) ||
    (codePoint >= 0x7f && codePoint <= 0x9f)
  );
}

export function sanitizeMapped(normalized: MappedText): MappedText {
  const parts: string[] = [];
  const map: RawSpan[] = [];
  let pendingWhitespace: RawSpan | undefined;
  let hasContent = false;

  for (let index = 0; index < normalized.value.length; ) {
    const codePoint = normalized.value.codePointAt(index);
    if (codePoint === undefined) break;

    const character = String.fromCodePoint(codePoint);
    const width = character.length;
    const spans = normalized.map.slice(index, index + width);
    const firstSpan = spans[0];
    const lastSpan = spans.at(-1);
    index += width;

    if (firstSpan === undefined || lastSpan === undefined) continue;
    if (isZeroWidth(codePoint) || isBidiControl(codePoint) || isUnsafeControl(codePoint)) continue;

    if (/\s/u.test(character)) {
      const whitespaceSpan = { start: firstSpan.start, end: lastSpan.end };
      pendingWhitespace = pendingWhitespace
        ? { start: pendingWhitespace.start, end: whitespaceSpan.end }
        : whitespaceSpan;
      continue;
    }

    if (pendingWhitespace && hasContent) {
      appendMapped(parts, map, " ", pendingWhitespace);
    }
    pendingWhitespace = undefined;
    appendMapped(parts, map, character, { start: firstSpan.start, end: lastSpan.end });
    hasContent = true;
  }

  return Object.freeze({ value: parts.join(""), map: Object.freeze(map) });
}

export function rawSpanForRange(mapped: MappedText, start: number, end: number): RawSpan {
  const first = mapped.map[start];
  const last = mapped.map[Math.max(start, end - 1)];
  return {
    start: first?.start ?? 0,
    end: last?.end ?? first?.end ?? 0
  };
}
