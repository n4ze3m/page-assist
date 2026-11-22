const MAX_RUN = 4, UNSEEN = -14.0;

export const base = (symbol) => symbol.replace(/[012]+$/, "");

export class Aligner {
  constructor(table) {
    this.table = new Map(Object.entries(table).map(([phone, runs]) => [phone, new Map(Object.entries(runs))]));
  }

  score(phone, run) {
    const value = this.table.get(phone)?.get(run);
    return value !== undefined && value !== null ? value : UNSEEN - 2.0 * Math.abs(run.length - 1);
  }

  align(word, symbols) {
    const phones = symbols.map(base), letters = word.length, count = phones.length;
    if (!count || letters > MAX_RUN * count) return null;
    const low = -1e18;
    const best = Array.from({ length: count + 1 }, () => new Array(letters + 1).fill(low));
    const step = Array.from({ length: count + 1 }, () => new Array(letters + 1).fill(0));
    best[0][0] = 0.0;
    for (let j = 1; j <= count; j++) {
      const phone = phones[j - 1], previous = best[j - 1], row = best[j], trace = step[j];
      for (let i = 0; i <= letters; i++) {
        for (let k = 0; k <= Math.min(MAX_RUN, i); k++) {
          if (previous[i - k] > low) {
            const value = previous[i - k] + this.score(phone, word.slice(i - k, i));
            if (value > row[i]) { row[i] = value; trace[i] = k; }
          }
        }
      }
    }
    if (best[count][letters] <= low) return null;
    const runs = [];
    for (let j = count, i = letters; j > 0; j--) {
      const k = step[j][i];
      runs.push(word.slice(i - k, i));
      i -= k;
    }
    return runs.reverse();
  }
}
