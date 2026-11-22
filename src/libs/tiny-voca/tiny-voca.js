export function readGGUF(buffer) {
  const view = new DataView(buffer), bytes = new Uint8Array(buffer), decoder = new TextDecoder();
  let at = 0;
  const u32 = () => (at += 4, view.getUint32(at - 4, true));
  const u64 = () => (at += 8, Number(view.getBigUint64(at - 8, true)));
  const string = () => { const size = u64(); at += size; return decoder.decode(bytes.subarray(at - size, at)); };
  const numbers = { 0: [1, "getUint8"], 1: [1, "getInt8"], 2: [2, "getUint16"], 3: [2, "getInt16"], 4: [4, "getUint32"],
                    5: [4, "getInt32"], 6: [4, "getFloat32"], 7: [1, "getUint8"], 10: [8, "getBigUint64"],
                    11: [8, "getBigInt64"], 12: [8, "getFloat64"] };
  const value = (type) => {
    if (type === 8) return string();
    if (type === 9) {
      const inner = u32(), count = u64();
      if (inner < 2) { at += count; return bytes.subarray(at - count, at); }
      return Array.from({ length: count }, () => value(inner));
    }
    const [size, read] = numbers[type];
    at += size;
    return Number(view[read](at - size, true));
  };

  if (u32() !== 0x46554747) throw new Error("not a GGUF file");
  u32();
  const tensorCount = u64(), keyCount = u64(), meta = {}, list = [], keysStart = at;
  const keys = {};
  for (let i = 0; i < keyCount; i++) {
    const from = at, key = string();
    meta[key] = value(u32());
    keys[key] = bytes.subarray(from, at);
  }
  for (let i = 0; i < tensorCount; i++) {
    const name = string(), shape = Array.from({ length: u32() }, u64).reverse();
    list.push({ name, shape, type: u32(), offset: u64() });
  }
  const align = meta["general.alignment"] || 32, start = Math.ceil(at / align) * align;
  const tensors = {};
  for (const { name, shape, type, offset } of list) {
    tensors[name] = { shape, type, data: unpack(buffer, start + offset, type, shape.reduce((a, b) => a * b, 1)) };
  }
  const files = {}, names = meta["audiocpp.embedded_files.names"] || [], offsets = meta["audiocpp.embedded_files.offsets"];
  names.forEach((name, i) => { files[name] = meta["audiocpp.embedded_files.data"].subarray(offsets[i], offsets[i + 1]); });
  return { meta, tensors, files, keys };
}

function unpack(buffer, start, type, count) {
  if (type === 0) return new Float32Array(buffer, start, count);
  const view = new DataView(buffer, start), out = new Float32Array(count);
  if (type === 1) {
    for (let i = 0; i < count; i++) out[i] = half(view.getUint16(2 * i, true));
  } else if (type === 8) {
    for (let i = 0; i < count; i++) {
      const block = (i >> 5) * 34;
      out[i] = half(view.getUint16(block, true)) * view.getInt8(block + 2 + (i & 31));
    }
  } else if (type === 2) {
    for (let i = 0; i < count; i++) {
      const block = (i >> 5) * 18, byte = view.getUint8(block + 2 + (i & 15));
      out[i] = half(view.getUint16(block, true)) * (((i & 16) ? byte >> 4 : byte & 15) - 8);
    }
  } else {
    throw new Error(`tensor type ${type} is not supported`);
  }
  return out;
}

function half(bits) {
  const exponent = (bits >> 10) & 31, fraction = bits & 1023, sign = bits >> 15 ? -1 : 1;
  if (exponent === 0) return sign * fraction * 2 ** -24;
  if (exponent === 31) return fraction ? NaN : sign * Infinity;
  return sign * (1 + fraction / 1024) * 2 ** (exponent - 15);
}

export const spent = {};
const now = () => performance.now();
const tick = (name, since) => { spent[name] = (spent[name] || 0) + now() - since; };

let lent = [], spare = new Map();
function floats(count) {
  const array = spare.get(count)?.pop() || new Float32Array(count);
  lent.push(array);
  return array;
}

function giveBack(mark) {
  for (const array of lent.splice(mark)) {
    if (!spare.has(array.length)) spare.set(array.length, []);
    spare.get(array.length).push(array);
  }
}

function multiply(x, count, weight, bias, outputs, inputs) {
  const y = floats(count * outputs), four = new Float64Array(4 * inputs);
  for (let t = 0; t < count; t += 4) {
    const t1 = Math.min(t + 1, count - 1), t2 = Math.min(t + 2, count - 1), t3 = Math.min(t + 3, count - 1);
    for (let i = 0; i < inputs; i++) {
      four[4 * i] = x[t * inputs + i]; four[4 * i + 1] = x[t1 * inputs + i];
      four[4 * i + 2] = x[t2 * inputs + i]; four[4 * i + 3] = x[t3 * inputs + i];
    }
    for (let o = 0; o < outputs; o += 2) {
      const p = Math.min(o + 1, outputs - 1);
      let a0 = bias[o], a1 = a0, a2 = a0, a3 = a0, b0 = bias[p], b1 = b0, b2 = b0, b3 = b0;
      for (let i = 0, w = o * inputs, u = p * inputs; i < 4 * inputs; i += 4, w++, u++) {
        const v = weight[w], z = weight[u], x0 = four[i], x1 = four[i + 1], x2 = four[i + 2], x3 = four[i + 3];
        a0 += v * x0; a1 += v * x1; a2 += v * x2; a3 += v * x3;
        b0 += z * x0; b1 += z * x1; b2 += z * x2; b3 += z * x3;
      }
      y[t * outputs + o] = a0; y[t1 * outputs + o] = a1; y[t2 * outputs + o] = a2; y[t3 * outputs + o] = a3;
      y[t * outputs + p] = b0; y[t1 * outputs + p] = b1; y[t2 * outputs + p] = b2; y[t3 * outputs + p] = b3;
    }
  }
  return y;
}

function linear(x, count, { weight, bias, shape: [outputs, inputs] }) {
  const since = now(), y = multiply(x, count, weight, bias, outputs, inputs);
  tick("linear", since);
  return y;
}

function normalize(x, count, { weight, bias }) {
  const since = now(), width = weight.length, y = floats(x.length);
  for (let t = 0; t < count; t++) {
    const row = t * width;
    let mean = 0, spread = 0;
    for (let i = 0; i < width; i++) mean += x[row + i];
    mean /= width;
    for (let i = 0; i < width; i++) spread += (x[row + i] - mean) ** 2;
    const scale = 1 / Math.sqrt(spread / width + 1e-5);
    for (let i = 0; i < width; i++) y[row + i] = (x[row + i] - mean) * scale * weight[i] + bias[i];
  }
  tick("norm", since);
  return y;
}

function erf(x) {
  if (Math.abs(x) > 6) return Math.sign(x);
  let term = x, sum = x;
  for (let n = 1; Math.abs(term) > 1e-17 * Math.abs(sum); n++) sum += term *= 2 * x * x / (2 * n + 1);
  return 2 / Math.sqrt(Math.PI) * Math.exp(-x * x) * sum;
}

const GELU = Float64Array.from({ length: 16 * 4096 + 1 }, (_, n) => 0.5 * (n / 4096 - 8) * (1 + erf((n / 4096 - 8) / Math.SQRT2)));
function gelu(x) {
  const since = now();
  for (let i = 0; i < x.length; i++) {
    if (x[i] >= 8) continue;
    const at = (Math.max(x[i], -8) + 8) * 4096, low = Math.floor(at);
    x[i] = GELU[low] + (at - low) * (GELU[low + 1] - GELU[low]);
  }
  tick("gelu", since);
  return x;
}

function convolve(x, count, { weight, bias, shape: [outputs, inputs, taps] }) {
  const since = now(), y = floats(count * outputs), reach = taps >> 1;
  for (let t = 0; t < count; t++) {
    const first = Math.max(0, reach - t), end = Math.min(taps, count + reach - t);
    for (let o = 0; o < outputs; o++) {
      let sum = bias[o];
      for (let k = first; k < end; k++) {
        const row = (t + k - reach) * inputs;
        for (let i = 0; i < inputs; i++) sum += weight[(o * inputs + i) * taps + k] * x[row + i];
      }
      y[t * outputs + o] = sum;
    }
  }
  tick("convolution", since);
  return y;
}

function depthwise(x, count, { weight, bias, shape: [channels, , taps] }) {
  const since = now(), y = floats(count * channels), reach = taps >> 1;
  for (let t = 0; t < count; t++) {
    const first = Math.max(0, reach - t), end = Math.min(taps, count + reach - t);
    for (let c = 0; c < channels; c++) {
      let sum = bias[c];
      for (let k = first; k < end; k++) sum += weight[c * taps + k] * x[(t + k - reach) * channels + c];
      y[t * channels + c] = sum;
    }
  }
  tick("convolution", since);
  return y;
}

function attention(x, count, block, heads, turn) {
  const channels = block.out.shape[0], width = channels / heads, none = new Float32Array(Math.max(count, width));
  const qkv = linear(x, count, block.qkv);
  const since = now(), mixed = floats(count * channels), scale = 1 / Math.sqrt(width);
  const queries = floats(count * width), keys = floats(count * width), values = floats(width * count);
  for (let h = 0; h < heads; h++) {
    const mark = lent.length;
    for (let t = 0; t < count; t++) {
      const q = t * 3 * channels + h * width, k = q + channels, v = k + channels, row = t * width;
      for (let i = 0; i < width; i += 2) {
        const cos = turn[row + i], sin = turn[row + i + 1];
        queries[row + i] = qkv[q + i] * cos - qkv[q + i + 1] * sin;
        queries[row + i + 1] = qkv[q + i] * sin + qkv[q + i + 1] * cos;
        keys[row + i] = qkv[k + i] * cos - qkv[k + i + 1] * sin;
        keys[row + i + 1] = qkv[k + i] * sin + qkv[k + i + 1] * cos;
      }
      for (let i = 0; i < width; i++) values[i * count + t] = qkv[v + i];
    }
    const share = multiply(queries, count, keys, none, count, width);
    for (let t = 0; t < count; t++) {
      const row = t * count;
      let top = -Infinity, total = 0;
      for (let j = 0; j < count; j++) top = Math.max(top, share[row + j]);
      for (let j = 0; j < count; j++) total += share[row + j] = Math.exp((share[row + j] - top) * scale);
      for (let j = 0; j < count; j++) share[row + j] /= total;
    }
    const mix = multiply(share, count, values, none, width, count);
    for (let t = 0; t < count; t++) mixed.set(mix.subarray(t * width, (t + 1) * width), t * channels + h * width);
    giveBack(mark);
  }
  tick("attention", since);
  return linear(mixed, count, block.out);
}

function add(x, y) {
  for (let i = 0; i < x.length; i++) x[i] += y[i];
  return x;
}

function transformer(x, count, stack, heads) {
  const width = stack.norm.weight.length / heads, turn = new Float64Array(count * width);
  for (let t = 0; t < count; t++) {
    for (let i = 0; i < width; i += 2) {
      turn[t * width + i] = Math.cos(t / 10000 ** (i / width));
      turn[t * width + i + 1] = Math.sin(t / 10000 ** (i / width));
    }
  }
  for (const block of stack.blocks) {
    const mark = lent.length;
    add(x, attention(normalize(x, count, block.norm1), count, block, heads, turn));
    const near = depthwise(normalize(x, count, block.norm2), count, block.depthwise);
    add(x, linear(gelu(linear(near, count, block.expand)), count, block.project));
    giveBack(mark);
  }
  return normalize(x, count, stack.norm);
}

const TURNS = {};
function turns(size) {
  return TURNS[size] ||= { cos: Float64Array.from({ length: size / 2 }, (_, k) => Math.cos(-2 * Math.PI * k / size)),
                           sin: Float64Array.from({ length: size / 2 }, (_, k) => Math.sin(-2 * Math.PI * k / size)) };
}

function fft(re, im) {
  const size = re.length, table = turns(size);
  for (let i = 1, j = 0; i < size; i++) {
    let bit = size >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let span = 2; span <= size; span *= 2) {
    for (let k = 0; k < span / 2; k++) {
      const cos = table.cos[k * size / span], sin = table.sin[k * size / span];
      for (let a = k; a < size; a += span) {
        const b = a + span / 2, x = re[b] * cos - im[b] * sin, y = re[b] * sin + im[b] * cos;
        re[b] = re[a] - x; im[b] = im[a] - y;
        re[a] += x; im[a] += y;
      }
    }
  }
}

function filtered(source, size, hop, frames, cepstrum) {
  const since = now(), half = size / 2;
  const window = Float64Array.from({ length: size }, (_, n) => 0.5 - 0.5 * Math.cos(2 * Math.PI * n / size));
  const re = new Float64Array(size), im = new Float64Array(size), cr = new Float64Array(size), ci = new Float64Array(size);
  const sum = new Float64Array(frames * hop + size), weight = new Float64Array(sum.length);
  for (let f = 0; f < frames; f++) {
    const first = f * hop - half;
    for (let n = 0; n < size; n++) {
      const at = first + n;
      re[n] = at >= 0 && at < source.length ? source[at] * window[n] : 0;
      im[n] = 0;
    }
    fft(re, im);
    cr.fill(0); ci.fill(0);
    cepstrum(f, cr);
    fft(cr, ci);
    for (let k = 0; k <= half; k++) {
      const gain = Math.exp(Math.min(Math.max(cr[k], -14), 6));
      const cos = gain * Math.cos(ci[k]), sin = gain * Math.sin(ci[k]), a = re[k], b = im[k];
      re[k] = a * cos - b * sin;
      im[k] = -(a * sin + b * cos);
      if (k > 0 && k < half) { re[size - k] = re[k]; im[size - k] = -im[k]; }
    }
    fft(re, im);
    for (let n = 0; n < size; n++) {
      sum[f * hop + n] += re[n] / size * window[n];
      weight[f * hop + n] += window[n] * window[n];
    }
  }
  const out = new Float32Array(source.length);
  for (let n = 0; n < out.length; n++) out[n] = sum[n + half] / weight[n + half];
  tick("filters", since);
  return out;
}

function pulseTrain(f0, hop, sampleRate, limit) {
  const since = now(), frames = f0.length, out = new Float32Array(frames * hop);
  const knots = Float64Array.from({ length: frames + 1 }, (_, i) => Math.log(Math.max(f0[Math.min(i, frames - 1)], 1)));
  let turns = 0;
  for (let n = 0; n < out.length; n++) {
    const low = Math.floor(n / hop), weight = n / hop - low;
    const frequency = Math.exp(knots[low] * (1 - weight) + knots[low + 1] * weight);
    turns += frequency / sampleRate;
    const theta = (2 * Math.PI * turns) % (2 * Math.PI);
    const harmonics = Math.max(limit * sampleRate / frequency, 1), whole = Math.floor(harmonics);
    const below = 2 * Math.sin(theta / 2);
    const core = Math.abs(below) < 1e-7 ? whole : Math.sin((whole + 0.5) * theta) / below - 0.5;
    out[n] = (core + (harmonics - whole) * Math.cos((whole + 1) * theta)) * Math.sqrt(2 / harmonics);
  }
  tick("pulses", since);
  return out;
}

export function gaussianNoise(count, seed = 0) {
  let state = (seed + 0x9E3779B9) >>> 0;
  const uniform = () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let z = Math.imul(state ^ (state >>> 15), state | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
  const out = new Float32Array(count);
  for (let i = 0; i < count; i += 2) {
    const radius = Math.sqrt(-2 * Math.log(1 - uniform())), angle = 2 * Math.PI * uniform();
    out[i] = radius * Math.cos(angle);
    if (i + 1 < count) out[i + 1] = radius * Math.sin(angle);
  }
  return out;
}

function roundEven(x) {
  const down = Math.floor(x), rest = x - down;
  return rest > 0.5 || (rest === 0.5 && down % 2) ? down + 1 : down;
}

const clamp = (x, low, high) => Math.min(Math.max(x, low), high);
const lifter = (n) => (n === 0 ? 2 : 1 / (1 + n / 4));

const VOWELS = ["ə", "ɐ", "ɚ", "ᵻ", "ɪ", "i", "iː", "ɛ", "æ", "ʌ", "ɑː", "ɔ", "ɔː", "ʊ", "uː", "ɜː", "eɪ", "aɪ", "ɔɪ", "oʊ",
                "aʊ", "iə", "oː", "ɑːɹ", "ɔːɹ", "oːɹ", "ɪɹ", "ɛɹ", "ʊɹ", "aɪɚ", "aɪə", "əl", "n̩"];
const PAUSES = ["<pad>", "<bos>", "<eos>", "<sp>", ",", ".", "?", "!", ";", ":", '"', "'", "(", ")", "—", "…"];

export class TinyVoca {
  constructor(file) {
    const settings = JSON.parse(new TextDecoder().decode(file.files["config.json"]));
    const c = this.config = settings.model;
    this.voices = c.speakers;
    this.symbols = Object.entries(settings.vocab).sort((a, b) => a[1] - b[1]).map(([symbol]) => symbol);
    this.isVowel = this.symbols.map((symbol) => VOWELS.includes(symbol));
    this.isPause = this.symbols.map((symbol) => PAUSES.includes(symbol));

    const tensor = (name) => file.tensors["model/" + name];
    const layer = (name) => ({ weight: tensor(name + ".weight").data, bias: tensor(name + ".bias").data, shape: tensor(name + ".weight").shape });
    const stack = (name, layers) => ({
      norm: layer(name + ".norm"),
      blocks: Array.from({ length: layers }, (_, i) => {
        const at = `${name}.blocks.${i}.`;
        return { norm1: layer(at + "norm1"), qkv: layer(at + "attention.qkv"), out: layer(at + "attention.out"), norm2: layer(at + "norm2"),
                 depthwise: layer(at + "depthwise"), expand: layer(at + "expand"), project: layer(at + "project") };
      }),
    });
    this.tokens = tensor("tokens.weight").data;
    this.stress = tensor("stress.weight").data;
    this.voiceRows = tensor("voices.weight").data;
    this.frameVoices = tensor("frame_voices.weight").data;
    this.encoder = stack("encoder", c.encoder_layers);
    this.duration = { conv1: layer("duration.conv1"), norm1: layer("duration.norm1"), conv2: layer("duration.conv2"),
                      norm2: layer("duration.norm2"), out: layer("duration.out") };
    this.framePosition = layer("frame_position");
    this.prosodyStack = stack("prosody_stack", c.prosody_layers);
    this.prosodyHead = layer("prosody_head");
    this.prosodyProjection = layer("prosody_projection");
    this.acousticStack = stack("acoustic_stack", c.acoustic_layers);
    this.harmonic = layer("vocoder.harmonic");
    this.noise = layer("vocoder.noise");
  }

  synthesize(ids, stress, { voice = 0, speed = 1, pitchShift = 0, pitchRange = 1, seed = 0, noise = null } = {}) {
    const c = this.config, width = c.channels, count = ids.length;
    if (typeof voice === "string") voice = this.voices.indexOf(voice);
    if (count < 1 || count > c.max_tokens || stress.length !== count || !(voice >= 0 && voice < this.voices.length)) {
      throw new Error("expected 1 to max_tokens phoneme ids, as many stress values, and a known voice");
    }

    lent = [];
    spare = new Map();
    let x = new Float32Array(count * width);
    for (let n = 0; n < count; n++) {
      for (let i = 0; i < width; i++) {
        x[n * width + i] = this.tokens[ids[n] * width + i] + this.stress[stress[n] * width + i] + this.voiceRows[voice * width + i];
      }
    }
    const hidden = transformer(x, count, this.encoder, c.heads);

    const d = this.duration;
    x = normalize(gelu(convolve(hidden, count, d.conv1)), count, d.norm1);
    x = linear(normalize(gelu(convolve(x, count, d.conv2)), count, d.norm2), count, d.out);
    const durations = new Int32Array(count);
    let frames = 0;
    for (let n = 0; n < count; n++) {
      const length = Math.fround(Math.expm1(clamp(x[2 * n], 0, Math.log1p(400))));
      const present = !this.isPause[ids[n]] || x[2 * n + 1] > 0;
      frames += durations[n] = present ? Math.max(roundEven(length / speed), 1) : 0;
    }
    if (frames < 1 || frames > c.max_frames) throw new Error("the utterance is too long or empty: split the text");

    const owner = new Int32Array(frames), place = new Float32Array(frames * 3);
    for (let n = 0, t = 0; n < count; n++) {
      for (let k = 0; k < durations[n]; k++, t++) {
        owner[t] = n;
        place.set([(k + 0.5) / durations[n], 1 - (k + 0.5) / durations[n], Math.log1p(durations[n]) / 4], 3 * t);
      }
    }
    x = linear(place, frames, this.framePosition);
    for (let t = 0; t < frames; t++) {
      for (let i = 0; i < width; i++) x[t * width + i] += hidden[owner[t] * width + i] + this.frameVoices[voice * width + i];
    }

    const melody = transformer(x, frames, this.prosodyStack, c.heads);
    const prosody = linear(melody, frames, this.prosodyHead);
    let voicedSum = 0, voicedCount = 0;
    for (let t = 0; t < frames; t++) {
      if (this.isVowel[ids[owner[t]]]) prosody[3 * t + 1] = Math.max(prosody[3 * t + 1], 2);
      if (prosody[3 * t + 1] > 0) { voicedSum += prosody[3 * t]; voicedCount++; }
    }
    const mean = voicedSum / Math.max(voicedCount, 1), f0 = new Float32Array(frames), told = new Float32Array(frames * 3);
    for (let t = 0; t < frames; t++) {
      const pitch = pitchRange === 1 ? prosody[3 * t] : mean + (prosody[3 * t] - mean) * pitchRange;
      told.set([clamp(pitch, -2, 1.5), prosody[3 * t + 1] > 0 ? 1 : 0, clamp(prosody[3 * t + 2], -4.5, 3)], 3 * t);
      f0[t] = clamp(c.pitch_reference_hz * Math.exp(pitch + pitchShift), c.f0_min, c.f0_max);
    }

    const acoustic = transformer(add(linear(told, frames, this.prosodyProjection), melody), frames, this.acousticStack, c.heads);

    const samples = frames * c.hop;
    const h = linear(acoustic, frames, this.harmonic), hw = this.harmonic.shape[0], hSteps = c.hop / c.synth_hop;
    const voicedPart = filtered(pulseTrain(f0, c.hop, c.sample_rate, c.harmonic_limit), c.synth_fft, c.synth_hop, hSteps * frames + 3, (f, cepstrum) => {
      const sub = Math.min(f, hSteps * frames - 1), here = Math.floor(sub / hSteps), next = Math.min(Math.floor((sub + 1) / hSteps), frames - 1);
      for (let i = 0; i < c.cep_causal; i++) cepstrum[i] = 0.5 * (h[here * hw + i] + h[next * hw + i]) * lifter(i);
      for (let i = 0; i < c.cep_anti; i++) {
        const at = c.cep_causal + i;
        cepstrum[c.synth_fft - 1 - i] = 0.5 * (h[here * hw + at] + h[next * hw + at]) * lifter(i + 1);
      }
      cepstrum[0] += h[here * hw + c.cep_causal + c.cep_anti + sub % hSteps];
    });
    const g = linear(acoustic, frames, this.noise), gw = this.noise.shape[0], gSteps = c.hop / c.noise_hop;
    const noisePart = filtered(noise || gaussianNoise(samples, seed), c.noise_fft, c.noise_hop, gSteps * frames + 3, (f, cepstrum) => {
      const sub = Math.min(f, gSteps * frames - 1), here = Math.floor(sub / gSteps);
      for (let i = 0; i < c.noise_cep; i++) cepstrum[i] = g[here * gw + i] * lifter(i);
      cepstrum[0] += g[here * gw + c.noise_cep + sub % gSteps];
    });
    lent = [];
    spare = new Map();
    return { audio: add(voicedPart, noisePart), durations, f0 };
  }
}
