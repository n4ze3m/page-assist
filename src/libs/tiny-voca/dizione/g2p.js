const sigmoid = (x) => 1 / (1 + Math.exp(-x));

function affine(x, rows, { data, shape: [outputs, inputs] }, bias) {
  const y = new Float64Array(rows * outputs);
  for (let t = 0; t < rows; t++) {
    for (let o = 0; o < outputs; o++) {
      let sum = bias ? bias.data[o] : 0;
      for (let i = 0; i < inputs; i++) sum += data[o * inputs + i] * x[t * inputs + i];
      y[t * outputs + o] = sum;
    }
  }
  return y;
}

function layerNorm(x, rows, weight, bias) {
  const width = weight.data.length, y = new Float64Array(x.length);
  for (let t = 0; t < rows; t++) {
    let mean = 0, variance = 0;
    for (let i = 0; i < width; i++) mean += x[t * width + i] / width;
    for (let i = 0; i < width; i++) variance += (x[t * width + i] - mean) ** 2 / width;
    for (let i = 0; i < width; i++) y[t * width + i] = (x[t * width + i] - mean) / Math.sqrt(variance + 1e-5) * weight.data[i] + bias.data[i];
  }
  return y;
}

function conv(x, rows, { data, shape: [outputs, inputs, kernel] }, bias) {
  const y = new Float64Array(rows * outputs), pad = kernel >> 1;
  for (let t = 0; t < rows; t++) {
    for (let o = 0; o < outputs; o++) {
      let sum = bias.data[o];
      for (let k = 0; k < kernel; k++) {
        const from = t + k - pad;
        if (from < 0 || from >= rows) continue;
        for (let i = 0; i < inputs; i++) sum += data[(o * inputs + i) * kernel + k] * x[from * inputs + i];
      }
      y[t * outputs + o] = sum;
    }
  }
  return y;
}

function gru(x, rows, inputWeight, stateWeight, inputBias, stateBias, reverse) {
  const size = stateWeight.shape[1], inputs = affine(x, rows, inputWeight, inputBias), out = new Float64Array(rows * size);
  let state = new Float64Array(size);
  for (let n = 0; n < rows; n++) {
    const t = reverse ? rows - 1 - n : n, at = t * 3 * size, recurrent = affine(state, 1, stateWeight, stateBias), next = new Float64Array(size);
    for (let i = 0; i < size; i++) {
      const reset = sigmoid(inputs[at + i] + recurrent[i]), update = sigmoid(inputs[at + size + i] + recurrent[size + i]);
      const candidate = Math.tanh(inputs[at + 2 * size + i] + reset * recurrent[2 * size + i]);
      next[i] = (1 - update) * candidate + update * state[i];
    }
    state = next;
    out.set(state, t * size);
  }
  return out;
}

export class Model {
  constructor(settings, tensor) {
    this.settings = settings;
    this.tensor = tensor;
    this.letters = new Map([...settings.letters].map((letter, index) => [letter, index + 1]));
    this.symbols = settings.symbols;
  }

  spellable(word) {
    return [...word.toLowerCase().normalize("NFKD")].filter((letter) => this.letters.has(letter)).join("").replace(/^'+|'+$/g, "");
  }

  logits(word) {
    const w = this.tensor, { slots, convs, layers } = this.settings, ids = [...word].map((letter) => this.letters.get(letter));
    const embed = w("embed__weight"), slot = w("slot"), width = embed.shape[1], rows = ids.length * slots;
    let x = new Float64Array(rows * width);
    ids.forEach((id, n) => {
      for (let s = 0; s < slots; s++) {
        for (let i = 0; i < width; i++) x[(n * slots + s) * width + i] = embed.data[id * width + i] + slot.data[s * width + i];
      }
    });
    for (let block = 0; block < convs; block++) {
      const normed = layerNorm(x, rows, w(`norms__${block}__weight`), w(`norms__${block}__bias`));
      const y = conv(normed, rows, w(`convs__${block}__weight`), w(`convs__${block}__bias`));
      x = x.map((value, i) => value + Math.max(y[i], 0));
    }
    for (let layer = 0; layer < layers; layer++) {
      const both = ["", "_reverse"].map((suffix) => gru(x, rows, w(`gru__weight_ih_l${layer}${suffix}`), w(`gru__weight_hh_l${layer}${suffix}`),
                                                        w(`gru__bias_ih_l${layer}${suffix}`), w(`gru__bias_hh_l${layer}${suffix}`), suffix !== ""));
      const size = both[0].length / rows;
      x = new Float64Array(rows * 2 * size);
      for (let t = 0; t < rows; t++) {
        x.set(both[0].subarray(t * size, (t + 1) * size), t * 2 * size);
        x.set(both[1].subarray(t * size, (t + 1) * size), t * 2 * size + size);
      }
    }
    return { rows, values: affine(x, rows, w("out__weight"), w("out__bias")) };
  }

  predict(word) {
    word = this.spellable(word);
    if (!word) return [];
    const { rows, values } = this.logits(word), labels = values.length / rows, out = [];
    let previous = 0;
    for (let t = 0; t < rows; t++) {
      let label = 0;
      for (let i = 1; i < labels; i++) if (values[t * labels + i] > values[t * labels + label]) label = i;
      if (label !== previous && label !== 0) out.push(this.symbols[label - 1]);
      previous = label;
    }
    return out;
  }
}
