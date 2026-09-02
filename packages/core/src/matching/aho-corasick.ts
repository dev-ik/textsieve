interface Node {
  readonly next: Map<string, number>;
  fail: number;
  readonly outputs: number[];
}

export interface PatternMatch<T> {
  readonly pattern: string;
  readonly metadata: T;
  readonly start: number;
  readonly end: number;
}

export class AhoCorasick<T> {
  readonly #nodes: Node[] = [{ next: new Map(), fail: 0, outputs: [] }];
  readonly #patterns: readonly string[];
  readonly #metadata: readonly T[];

  constructor(entries: readonly { readonly pattern: string; readonly metadata: T }[]) {
    this.#patterns = Object.freeze(entries.map((entry) => entry.pattern));
    this.#metadata = Object.freeze(entries.map((entry) => entry.metadata));
    entries.forEach((entry, index) => this.#insert(entry.pattern, index));
    this.#buildFailureLinks();
  }

  #insert(pattern: string, patternIndex: number): void {
    let state = 0;
    for (const character of pattern) {
      const existing = this.#nodes[state]?.next.get(character);
      if (existing !== undefined) {
        state = existing;
        continue;
      }
      const nextState = this.#nodes.length;
      this.#nodes.push({ next: new Map(), fail: 0, outputs: [] });
      this.#nodes[state]?.next.set(character, nextState);
      state = nextState;
    }
    this.#nodes[state]?.outputs.push(patternIndex);
  }

  #buildFailureLinks(): void {
    const queue: number[] = [];
    for (const child of this.#nodes[0]?.next.values() ?? []) {
      queue.push(child);
    }

    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const state = queue[cursor];
      if (state === undefined) continue;
      const node = this.#nodes[state];
      if (!node) continue;

      for (const [character, child] of node.next) {
        queue.push(child);
        let fallback = node.fail;
        while (fallback !== 0 && !this.#nodes[fallback]?.next.has(character)) {
          fallback = this.#nodes[fallback]?.fail ?? 0;
        }
        const target = this.#nodes[fallback]?.next.get(character);
        this.#nodes[child]!.fail = target !== undefined && target !== child ? target : 0;
        const inherited = this.#nodes[this.#nodes[child]!.fail]?.outputs ?? [];
        this.#nodes[child]!.outputs.push(...inherited);
      }
    }
  }

  search(value: string): PatternMatch<T>[] {
    const matches: PatternMatch<T>[] = [];
    let state = 0;
    let offset = 0;

    for (const character of value) {
      while (state !== 0 && !this.#nodes[state]?.next.has(character)) {
        state = this.#nodes[state]?.fail ?? 0;
      }
      state = this.#nodes[state]?.next.get(character) ?? 0;
      offset += character.length;

      for (const patternIndex of this.#nodes[state]?.outputs ?? []) {
        const pattern = this.#patterns[patternIndex];
        const metadata = this.#metadata[patternIndex];
        if (pattern === undefined || metadata === undefined) continue;
        matches.push({
          pattern,
          metadata,
          start: offset - pattern.length,
          end: offset
        });
      }
    }

    return matches;
  }
}
