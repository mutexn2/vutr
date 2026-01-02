var NostrGadgets = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod2) => __copyProps(__defProp({}, "__esModule", { value: true }), mod2);
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // all-gadgets.js
  var all_gadgets_exports = {};
  __export(all_gadgets_exports, {
    defaults: () => defaults_exports,
    global: () => global_exports,
    hints: () => hints_exports,
    lists: () => lists_exports,
    metadata: () => metadata_exports,
    outbox: () => outbox_exports,
    sets: () => sets_exports,
    store: () => store_exports,
    utils: () => utils_exports2,
    wot: () => wot_exports
  });

  // node_modules/@nostr/gadgets/global.js
  var global_exports = {};
  __export(global_exports, {
    hints: () => hints,
    pool: () => pool,
    setPool: () => setPool
  });

  // node_modules/@noble/curves/node_modules/@noble/hashes/esm/_assert.js
  function number(n) {
    if (!Number.isSafeInteger(n) || n < 0)
      throw new Error(`Wrong positive integer: ${n}`);
  }
  function bytes(b, ...lengths) {
    if (!(b instanceof Uint8Array))
      throw new Error("Expected Uint8Array");
    if (lengths.length > 0 && !lengths.includes(b.length))
      throw new Error(`Expected Uint8Array of length ${lengths}, not of length=${b.length}`);
  }
  function hash(hash3) {
    if (typeof hash3 !== "function" || typeof hash3.create !== "function")
      throw new Error("Hash should be wrapped by utils.wrapConstructor");
    number(hash3.outputLen);
    number(hash3.blockLen);
  }
  function exists(instance, checkFinished = true) {
    if (instance.destroyed)
      throw new Error("Hash instance has been destroyed");
    if (checkFinished && instance.finished)
      throw new Error("Hash#digest() has already been called");
  }
  function output(out, instance) {
    bytes(out);
    const min = instance.outputLen;
    if (out.length < min) {
      throw new Error(`digestInto() expects output buffer of length at least ${min}`);
    }
  }

  // node_modules/@noble/curves/node_modules/@noble/hashes/esm/crypto.js
  var crypto = typeof globalThis === "object" && "crypto" in globalThis ? globalThis.crypto : void 0;

  // node_modules/@noble/curves/node_modules/@noble/hashes/esm/utils.js
  var u8a = (a) => a instanceof Uint8Array;
  var createView = (arr) => new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
  var rotr = (word, shift) => word << 32 - shift | word >>> shift;
  var isLE = new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68;
  if (!isLE)
    throw new Error("Non little-endian hardware is not supported");
  function utf8ToBytes(str) {
    if (typeof str !== "string")
      throw new Error(`utf8ToBytes expected string, got ${typeof str}`);
    return new Uint8Array(new TextEncoder().encode(str));
  }
  function toBytes(data) {
    if (typeof data === "string")
      data = utf8ToBytes(data);
    if (!u8a(data))
      throw new Error(`expected Uint8Array, got ${typeof data}`);
    return data;
  }
  function concatBytes(...arrays) {
    const r = new Uint8Array(arrays.reduce((sum, a) => sum + a.length, 0));
    let pad = 0;
    arrays.forEach((a) => {
      if (!u8a(a))
        throw new Error("Uint8Array expected");
      r.set(a, pad);
      pad += a.length;
    });
    return r;
  }
  var Hash = class {
    // Safe version that clones internal state
    clone() {
      return this._cloneInto();
    }
  };
  var toStr = {}.toString;
  function wrapConstructor(hashCons) {
    const hashC = (msg) => hashCons().update(toBytes(msg)).digest();
    const tmp = hashCons();
    hashC.outputLen = tmp.outputLen;
    hashC.blockLen = tmp.blockLen;
    hashC.create = () => hashCons();
    return hashC;
  }
  function randomBytes(bytesLength = 32) {
    if (crypto && typeof crypto.getRandomValues === "function") {
      return crypto.getRandomValues(new Uint8Array(bytesLength));
    }
    throw new Error("crypto.getRandomValues must be defined");
  }

  // node_modules/@noble/curves/node_modules/@noble/hashes/esm/_sha2.js
  function setBigUint64(view, byteOffset, value, isLE3) {
    if (typeof view.setBigUint64 === "function")
      return view.setBigUint64(byteOffset, value, isLE3);
    const _32n = BigInt(32);
    const _u32_max = BigInt(4294967295);
    const wh = Number(value >> _32n & _u32_max);
    const wl = Number(value & _u32_max);
    const h = isLE3 ? 4 : 0;
    const l = isLE3 ? 0 : 4;
    view.setUint32(byteOffset + h, wh, isLE3);
    view.setUint32(byteOffset + l, wl, isLE3);
  }
  var SHA2 = class extends Hash {
    constructor(blockLen, outputLen, padOffset, isLE3) {
      super();
      this.blockLen = blockLen;
      this.outputLen = outputLen;
      this.padOffset = padOffset;
      this.isLE = isLE3;
      this.finished = false;
      this.length = 0;
      this.pos = 0;
      this.destroyed = false;
      this.buffer = new Uint8Array(blockLen);
      this.view = createView(this.buffer);
    }
    update(data) {
      exists(this);
      const { view, buffer, blockLen } = this;
      data = toBytes(data);
      const len = data.length;
      for (let pos = 0; pos < len; ) {
        const take = Math.min(blockLen - this.pos, len - pos);
        if (take === blockLen) {
          const dataView = createView(data);
          for (; blockLen <= len - pos; pos += blockLen)
            this.process(dataView, pos);
          continue;
        }
        buffer.set(data.subarray(pos, pos + take), this.pos);
        this.pos += take;
        pos += take;
        if (this.pos === blockLen) {
          this.process(view, 0);
          this.pos = 0;
        }
      }
      this.length += data.length;
      this.roundClean();
      return this;
    }
    digestInto(out) {
      exists(this);
      output(out, this);
      this.finished = true;
      const { buffer, view, blockLen, isLE: isLE3 } = this;
      let { pos } = this;
      buffer[pos++] = 128;
      this.buffer.subarray(pos).fill(0);
      if (this.padOffset > blockLen - pos) {
        this.process(view, 0);
        pos = 0;
      }
      for (let i2 = pos; i2 < blockLen; i2++)
        buffer[i2] = 0;
      setBigUint64(view, blockLen - 8, BigInt(this.length * 8), isLE3);
      this.process(view, 0);
      const oview = createView(out);
      const len = this.outputLen;
      if (len % 4)
        throw new Error("_sha2: outputLen should be aligned to 32bit");
      const outLen = len / 4;
      const state = this.get();
      if (outLen > state.length)
        throw new Error("_sha2: outputLen bigger than state");
      for (let i2 = 0; i2 < outLen; i2++)
        oview.setUint32(4 * i2, state[i2], isLE3);
    }
    digest() {
      const { buffer, outputLen } = this;
      this.digestInto(buffer);
      const res = buffer.slice(0, outputLen);
      this.destroy();
      return res;
    }
    _cloneInto(to) {
      to || (to = new this.constructor());
      to.set(...this.get());
      const { blockLen, buffer, length, finished, destroyed, pos } = this;
      to.length = length;
      to.pos = pos;
      to.finished = finished;
      to.destroyed = destroyed;
      if (length % blockLen)
        to.buffer.set(buffer);
      return to;
    }
  };

  // node_modules/@noble/curves/node_modules/@noble/hashes/esm/sha256.js
  var Chi = (a, b, c) => a & b ^ ~a & c;
  var Maj = (a, b, c) => a & b ^ a & c ^ b & c;
  var SHA256_K = /* @__PURE__ */ new Uint32Array([
    1116352408,
    1899447441,
    3049323471,
    3921009573,
    961987163,
    1508970993,
    2453635748,
    2870763221,
    3624381080,
    310598401,
    607225278,
    1426881987,
    1925078388,
    2162078206,
    2614888103,
    3248222580,
    3835390401,
    4022224774,
    264347078,
    604807628,
    770255983,
    1249150122,
    1555081692,
    1996064986,
    2554220882,
    2821834349,
    2952996808,
    3210313671,
    3336571891,
    3584528711,
    113926993,
    338241895,
    666307205,
    773529912,
    1294757372,
    1396182291,
    1695183700,
    1986661051,
    2177026350,
    2456956037,
    2730485921,
    2820302411,
    3259730800,
    3345764771,
    3516065817,
    3600352804,
    4094571909,
    275423344,
    430227734,
    506948616,
    659060556,
    883997877,
    958139571,
    1322822218,
    1537002063,
    1747873779,
    1955562222,
    2024104815,
    2227730452,
    2361852424,
    2428436474,
    2756734187,
    3204031479,
    3329325298
  ]);
  var IV = /* @__PURE__ */ new Uint32Array([
    1779033703,
    3144134277,
    1013904242,
    2773480762,
    1359893119,
    2600822924,
    528734635,
    1541459225
  ]);
  var SHA256_W = /* @__PURE__ */ new Uint32Array(64);
  var SHA256 = class extends SHA2 {
    constructor() {
      super(64, 32, 8, false);
      this.A = IV[0] | 0;
      this.B = IV[1] | 0;
      this.C = IV[2] | 0;
      this.D = IV[3] | 0;
      this.E = IV[4] | 0;
      this.F = IV[5] | 0;
      this.G = IV[6] | 0;
      this.H = IV[7] | 0;
    }
    get() {
      const { A, B, C, D, E, F, G, H } = this;
      return [A, B, C, D, E, F, G, H];
    }
    // prettier-ignore
    set(A, B, C, D, E, F, G, H) {
      this.A = A | 0;
      this.B = B | 0;
      this.C = C | 0;
      this.D = D | 0;
      this.E = E | 0;
      this.F = F | 0;
      this.G = G | 0;
      this.H = H | 0;
    }
    process(view, offset) {
      for (let i2 = 0; i2 < 16; i2++, offset += 4)
        SHA256_W[i2] = view.getUint32(offset, false);
      for (let i2 = 16; i2 < 64; i2++) {
        const W15 = SHA256_W[i2 - 15];
        const W2 = SHA256_W[i2 - 2];
        const s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ W15 >>> 3;
        const s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ W2 >>> 10;
        SHA256_W[i2] = s1 + SHA256_W[i2 - 7] + s0 + SHA256_W[i2 - 16] | 0;
      }
      let { A, B, C, D, E, F, G, H } = this;
      for (let i2 = 0; i2 < 64; i2++) {
        const sigma1 = rotr(E, 6) ^ rotr(E, 11) ^ rotr(E, 25);
        const T1 = H + sigma1 + Chi(E, F, G) + SHA256_K[i2] + SHA256_W[i2] | 0;
        const sigma0 = rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22);
        const T2 = sigma0 + Maj(A, B, C) | 0;
        H = G;
        G = F;
        F = E;
        E = D + T1 | 0;
        D = C;
        C = B;
        B = A;
        A = T1 + T2 | 0;
      }
      A = A + this.A | 0;
      B = B + this.B | 0;
      C = C + this.C | 0;
      D = D + this.D | 0;
      E = E + this.E | 0;
      F = F + this.F | 0;
      G = G + this.G | 0;
      H = H + this.H | 0;
      this.set(A, B, C, D, E, F, G, H);
    }
    roundClean() {
      SHA256_W.fill(0);
    }
    destroy() {
      this.set(0, 0, 0, 0, 0, 0, 0, 0);
      this.buffer.fill(0);
    }
  };
  var sha256 = /* @__PURE__ */ wrapConstructor(() => new SHA256());

  // node_modules/@noble/curves/esm/abstract/utils.js
  var utils_exports = {};
  __export(utils_exports, {
    bitGet: () => bitGet,
    bitLen: () => bitLen,
    bitMask: () => bitMask,
    bitSet: () => bitSet,
    bytesToHex: () => bytesToHex,
    bytesToNumberBE: () => bytesToNumberBE,
    bytesToNumberLE: () => bytesToNumberLE,
    concatBytes: () => concatBytes2,
    createHmacDrbg: () => createHmacDrbg,
    ensureBytes: () => ensureBytes,
    equalBytes: () => equalBytes,
    hexToBytes: () => hexToBytes,
    hexToNumber: () => hexToNumber,
    numberToBytesBE: () => numberToBytesBE,
    numberToBytesLE: () => numberToBytesLE,
    numberToHexUnpadded: () => numberToHexUnpadded,
    numberToVarBytesBE: () => numberToVarBytesBE,
    utf8ToBytes: () => utf8ToBytes2,
    validateObject: () => validateObject
  });
  var _0n = BigInt(0);
  var _1n = BigInt(1);
  var _2n = BigInt(2);
  var u8a2 = (a) => a instanceof Uint8Array;
  var hexes = /* @__PURE__ */ Array.from({ length: 256 }, (_, i2) => i2.toString(16).padStart(2, "0"));
  function bytesToHex(bytes3) {
    if (!u8a2(bytes3))
      throw new Error("Uint8Array expected");
    let hex2 = "";
    for (let i2 = 0; i2 < bytes3.length; i2++) {
      hex2 += hexes[bytes3[i2]];
    }
    return hex2;
  }
  function numberToHexUnpadded(num) {
    const hex2 = num.toString(16);
    return hex2.length & 1 ? `0${hex2}` : hex2;
  }
  function hexToNumber(hex2) {
    if (typeof hex2 !== "string")
      throw new Error("hex string expected, got " + typeof hex2);
    return BigInt(hex2 === "" ? "0" : `0x${hex2}`);
  }
  function hexToBytes(hex2) {
    if (typeof hex2 !== "string")
      throw new Error("hex string expected, got " + typeof hex2);
    const len = hex2.length;
    if (len % 2)
      throw new Error("padded hex string expected, got unpadded hex of length " + len);
    const array = new Uint8Array(len / 2);
    for (let i2 = 0; i2 < array.length; i2++) {
      const j = i2 * 2;
      const hexByte = hex2.slice(j, j + 2);
      const byte = Number.parseInt(hexByte, 16);
      if (Number.isNaN(byte) || byte < 0)
        throw new Error("Invalid byte sequence");
      array[i2] = byte;
    }
    return array;
  }
  function bytesToNumberBE(bytes3) {
    return hexToNumber(bytesToHex(bytes3));
  }
  function bytesToNumberLE(bytes3) {
    if (!u8a2(bytes3))
      throw new Error("Uint8Array expected");
    return hexToNumber(bytesToHex(Uint8Array.from(bytes3).reverse()));
  }
  function numberToBytesBE(n, len) {
    return hexToBytes(n.toString(16).padStart(len * 2, "0"));
  }
  function numberToBytesLE(n, len) {
    return numberToBytesBE(n, len).reverse();
  }
  function numberToVarBytesBE(n) {
    return hexToBytes(numberToHexUnpadded(n));
  }
  function ensureBytes(title, hex2, expectedLength) {
    let res;
    if (typeof hex2 === "string") {
      try {
        res = hexToBytes(hex2);
      } catch (e) {
        throw new Error(`${title} must be valid hex string, got "${hex2}". Cause: ${e}`);
      }
    } else if (u8a2(hex2)) {
      res = Uint8Array.from(hex2);
    } else {
      throw new Error(`${title} must be hex string or Uint8Array`);
    }
    const len = res.length;
    if (typeof expectedLength === "number" && len !== expectedLength)
      throw new Error(`${title} expected ${expectedLength} bytes, got ${len}`);
    return res;
  }
  function concatBytes2(...arrays) {
    const r = new Uint8Array(arrays.reduce((sum, a) => sum + a.length, 0));
    let pad = 0;
    arrays.forEach((a) => {
      if (!u8a2(a))
        throw new Error("Uint8Array expected");
      r.set(a, pad);
      pad += a.length;
    });
    return r;
  }
  function equalBytes(b1, b2) {
    if (b1.length !== b2.length)
      return false;
    for (let i2 = 0; i2 < b1.length; i2++)
      if (b1[i2] !== b2[i2])
        return false;
    return true;
  }
  function utf8ToBytes2(str) {
    if (typeof str !== "string")
      throw new Error(`utf8ToBytes expected string, got ${typeof str}`);
    return new Uint8Array(new TextEncoder().encode(str));
  }
  function bitLen(n) {
    let len;
    for (len = 0; n > _0n; n >>= _1n, len += 1)
      ;
    return len;
  }
  function bitGet(n, pos) {
    return n >> BigInt(pos) & _1n;
  }
  var bitSet = (n, pos, value) => {
    return n | (value ? _1n : _0n) << BigInt(pos);
  };
  var bitMask = (n) => (_2n << BigInt(n - 1)) - _1n;
  var u8n = (data) => new Uint8Array(data);
  var u8fr = (arr) => Uint8Array.from(arr);
  function createHmacDrbg(hashLen, qByteLen, hmacFn) {
    if (typeof hashLen !== "number" || hashLen < 2)
      throw new Error("hashLen must be a number");
    if (typeof qByteLen !== "number" || qByteLen < 2)
      throw new Error("qByteLen must be a number");
    if (typeof hmacFn !== "function")
      throw new Error("hmacFn must be a function");
    let v = u8n(hashLen);
    let k = u8n(hashLen);
    let i2 = 0;
    const reset = () => {
      v.fill(1);
      k.fill(0);
      i2 = 0;
    };
    const h = (...b) => hmacFn(k, v, ...b);
    const reseed = (seed = u8n()) => {
      k = h(u8fr([0]), seed);
      v = h();
      if (seed.length === 0)
        return;
      k = h(u8fr([1]), seed);
      v = h();
    };
    const gen = () => {
      if (i2++ >= 1e3)
        throw new Error("drbg: tried 1000 values");
      let len = 0;
      const out = [];
      while (len < qByteLen) {
        v = h();
        const sl = v.slice();
        out.push(sl);
        len += v.length;
      }
      return concatBytes2(...out);
    };
    const genUntil = (seed, pred) => {
      reset();
      reseed(seed);
      let res = void 0;
      while (!(res = pred(gen())))
        reseed();
      reset();
      return res;
    };
    return genUntil;
  }
  var validatorFns = {
    bigint: (val) => typeof val === "bigint",
    function: (val) => typeof val === "function",
    boolean: (val) => typeof val === "boolean",
    string: (val) => typeof val === "string",
    stringOrUint8Array: (val) => typeof val === "string" || val instanceof Uint8Array,
    isSafeInteger: (val) => Number.isSafeInteger(val),
    array: (val) => Array.isArray(val),
    field: (val, object) => object.Fp.isValid(val),
    hash: (val) => typeof val === "function" && Number.isSafeInteger(val.outputLen)
  };
  function validateObject(object, validators, optValidators = {}) {
    const checkField = (fieldName, type, isOptional) => {
      const checkVal = validatorFns[type];
      if (typeof checkVal !== "function")
        throw new Error(`Invalid validator "${type}", expected function`);
      const val = object[fieldName];
      if (isOptional && val === void 0)
        return;
      if (!checkVal(val, object)) {
        throw new Error(`Invalid param ${String(fieldName)}=${val} (${typeof val}), expected ${type}`);
      }
    };
    for (const [fieldName, type] of Object.entries(validators))
      checkField(fieldName, type, false);
    for (const [fieldName, type] of Object.entries(optValidators))
      checkField(fieldName, type, true);
    return object;
  }

  // node_modules/@noble/curves/esm/abstract/modular.js
  var _0n2 = BigInt(0);
  var _1n2 = BigInt(1);
  var _2n2 = BigInt(2);
  var _3n = BigInt(3);
  var _4n = BigInt(4);
  var _5n = BigInt(5);
  var _8n = BigInt(8);
  var _9n = BigInt(9);
  var _16n = BigInt(16);
  function mod(a, b) {
    const result = a % b;
    return result >= _0n2 ? result : b + result;
  }
  function pow(num, power, modulo) {
    if (modulo <= _0n2 || power < _0n2)
      throw new Error("Expected power/modulo > 0");
    if (modulo === _1n2)
      return _0n2;
    let res = _1n2;
    while (power > _0n2) {
      if (power & _1n2)
        res = res * num % modulo;
      num = num * num % modulo;
      power >>= _1n2;
    }
    return res;
  }
  function pow2(x, power, modulo) {
    let res = x;
    while (power-- > _0n2) {
      res *= res;
      res %= modulo;
    }
    return res;
  }
  function invert(number3, modulo) {
    if (number3 === _0n2 || modulo <= _0n2) {
      throw new Error(`invert: expected positive integers, got n=${number3} mod=${modulo}`);
    }
    let a = mod(number3, modulo);
    let b = modulo;
    let x = _0n2, y = _1n2, u = _1n2, v = _0n2;
    while (a !== _0n2) {
      const q = b / a;
      const r = b % a;
      const m = x - u * q;
      const n = y - v * q;
      b = a, a = r, x = u, y = v, u = m, v = n;
    }
    const gcd2 = b;
    if (gcd2 !== _1n2)
      throw new Error("invert: does not exist");
    return mod(x, modulo);
  }
  function tonelliShanks(P) {
    const legendreC = (P - _1n2) / _2n2;
    let Q, S, Z;
    for (Q = P - _1n2, S = 0; Q % _2n2 === _0n2; Q /= _2n2, S++)
      ;
    for (Z = _2n2; Z < P && pow(Z, legendreC, P) !== P - _1n2; Z++)
      ;
    if (S === 1) {
      const p1div4 = (P + _1n2) / _4n;
      return function tonelliFast(Fp2, n) {
        const root = Fp2.pow(n, p1div4);
        if (!Fp2.eql(Fp2.sqr(root), n))
          throw new Error("Cannot find square root");
        return root;
      };
    }
    const Q1div2 = (Q + _1n2) / _2n2;
    return function tonelliSlow(Fp2, n) {
      if (Fp2.pow(n, legendreC) === Fp2.neg(Fp2.ONE))
        throw new Error("Cannot find square root");
      let r = S;
      let g = Fp2.pow(Fp2.mul(Fp2.ONE, Z), Q);
      let x = Fp2.pow(n, Q1div2);
      let b = Fp2.pow(n, Q);
      while (!Fp2.eql(b, Fp2.ONE)) {
        if (Fp2.eql(b, Fp2.ZERO))
          return Fp2.ZERO;
        let m = 1;
        for (let t2 = Fp2.sqr(b); m < r; m++) {
          if (Fp2.eql(t2, Fp2.ONE))
            break;
          t2 = Fp2.sqr(t2);
        }
        const ge2 = Fp2.pow(g, _1n2 << BigInt(r - m - 1));
        g = Fp2.sqr(ge2);
        x = Fp2.mul(x, ge2);
        b = Fp2.mul(b, g);
        r = m;
      }
      return x;
    };
  }
  function FpSqrt(P) {
    if (P % _4n === _3n) {
      const p1div4 = (P + _1n2) / _4n;
      return function sqrt3mod4(Fp2, n) {
        const root = Fp2.pow(n, p1div4);
        if (!Fp2.eql(Fp2.sqr(root), n))
          throw new Error("Cannot find square root");
        return root;
      };
    }
    if (P % _8n === _5n) {
      const c1 = (P - _5n) / _8n;
      return function sqrt5mod8(Fp2, n) {
        const n2 = Fp2.mul(n, _2n2);
        const v = Fp2.pow(n2, c1);
        const nv = Fp2.mul(n, v);
        const i2 = Fp2.mul(Fp2.mul(nv, _2n2), v);
        const root = Fp2.mul(nv, Fp2.sub(i2, Fp2.ONE));
        if (!Fp2.eql(Fp2.sqr(root), n))
          throw new Error("Cannot find square root");
        return root;
      };
    }
    if (P % _16n === _9n) {
    }
    return tonelliShanks(P);
  }
  var FIELD_FIELDS = [
    "create",
    "isValid",
    "is0",
    "neg",
    "inv",
    "sqrt",
    "sqr",
    "eql",
    "add",
    "sub",
    "mul",
    "pow",
    "div",
    "addN",
    "subN",
    "mulN",
    "sqrN"
  ];
  function validateField(field) {
    const initial = {
      ORDER: "bigint",
      MASK: "bigint",
      BYTES: "isSafeInteger",
      BITS: "isSafeInteger"
    };
    const opts = FIELD_FIELDS.reduce((map, val) => {
      map[val] = "function";
      return map;
    }, initial);
    return validateObject(field, opts);
  }
  function FpPow(f, num, power) {
    if (power < _0n2)
      throw new Error("Expected power > 0");
    if (power === _0n2)
      return f.ONE;
    if (power === _1n2)
      return num;
    let p = f.ONE;
    let d = num;
    while (power > _0n2) {
      if (power & _1n2)
        p = f.mul(p, d);
      d = f.sqr(d);
      power >>= _1n2;
    }
    return p;
  }
  function FpInvertBatch(f, nums) {
    const tmp = new Array(nums.length);
    const lastMultiplied = nums.reduce((acc, num, i2) => {
      if (f.is0(num))
        return acc;
      tmp[i2] = acc;
      return f.mul(acc, num);
    }, f.ONE);
    const inverted = f.inv(lastMultiplied);
    nums.reduceRight((acc, num, i2) => {
      if (f.is0(num))
        return acc;
      tmp[i2] = f.mul(acc, tmp[i2]);
      return f.mul(acc, num);
    }, inverted);
    return tmp;
  }
  function nLength(n, nBitLength) {
    const _nBitLength = nBitLength !== void 0 ? nBitLength : n.toString(2).length;
    const nByteLength = Math.ceil(_nBitLength / 8);
    return { nBitLength: _nBitLength, nByteLength };
  }
  function Field(ORDER, bitLen2, isLE3 = false, redef = {}) {
    if (ORDER <= _0n2)
      throw new Error(`Expected Field ORDER > 0, got ${ORDER}`);
    const { nBitLength: BITS, nByteLength: BYTES } = nLength(ORDER, bitLen2);
    if (BYTES > 2048)
      throw new Error("Field lengths over 2048 bytes are not supported");
    const sqrtP = FpSqrt(ORDER);
    const f = Object.freeze({
      ORDER,
      BITS,
      BYTES,
      MASK: bitMask(BITS),
      ZERO: _0n2,
      ONE: _1n2,
      create: (num) => mod(num, ORDER),
      isValid: (num) => {
        if (typeof num !== "bigint")
          throw new Error(`Invalid field element: expected bigint, got ${typeof num}`);
        return _0n2 <= num && num < ORDER;
      },
      is0: (num) => num === _0n2,
      isOdd: (num) => (num & _1n2) === _1n2,
      neg: (num) => mod(-num, ORDER),
      eql: (lhs, rhs) => lhs === rhs,
      sqr: (num) => mod(num * num, ORDER),
      add: (lhs, rhs) => mod(lhs + rhs, ORDER),
      sub: (lhs, rhs) => mod(lhs - rhs, ORDER),
      mul: (lhs, rhs) => mod(lhs * rhs, ORDER),
      pow: (num, power) => FpPow(f, num, power),
      div: (lhs, rhs) => mod(lhs * invert(rhs, ORDER), ORDER),
      // Same as above, but doesn't normalize
      sqrN: (num) => num * num,
      addN: (lhs, rhs) => lhs + rhs,
      subN: (lhs, rhs) => lhs - rhs,
      mulN: (lhs, rhs) => lhs * rhs,
      inv: (num) => invert(num, ORDER),
      sqrt: redef.sqrt || ((n) => sqrtP(f, n)),
      invertBatch: (lst) => FpInvertBatch(f, lst),
      // TODO: do we really need constant cmov?
      // We don't have const-time bigints anyway, so probably will be not very useful
      cmov: (a, b, c) => c ? b : a,
      toBytes: (num) => isLE3 ? numberToBytesLE(num, BYTES) : numberToBytesBE(num, BYTES),
      fromBytes: (bytes3) => {
        if (bytes3.length !== BYTES)
          throw new Error(`Fp.fromBytes: expected ${BYTES}, got ${bytes3.length}`);
        return isLE3 ? bytesToNumberLE(bytes3) : bytesToNumberBE(bytes3);
      }
    });
    return Object.freeze(f);
  }
  function getFieldBytesLength(fieldOrder) {
    if (typeof fieldOrder !== "bigint")
      throw new Error("field order must be bigint");
    const bitLength = fieldOrder.toString(2).length;
    return Math.ceil(bitLength / 8);
  }
  function getMinHashLength(fieldOrder) {
    const length = getFieldBytesLength(fieldOrder);
    return length + Math.ceil(length / 2);
  }
  function mapHashToField(key, fieldOrder, isLE3 = false) {
    const len = key.length;
    const fieldLen = getFieldBytesLength(fieldOrder);
    const minLen = getMinHashLength(fieldOrder);
    if (len < 16 || len < minLen || len > 1024)
      throw new Error(`expected ${minLen}-1024 bytes of input, got ${len}`);
    const num = isLE3 ? bytesToNumberBE(key) : bytesToNumberLE(key);
    const reduced = mod(num, fieldOrder - _1n2) + _1n2;
    return isLE3 ? numberToBytesLE(reduced, fieldLen) : numberToBytesBE(reduced, fieldLen);
  }

  // node_modules/@noble/curves/esm/abstract/curve.js
  var _0n3 = BigInt(0);
  var _1n3 = BigInt(1);
  function wNAF(c, bits) {
    const constTimeNegate = (condition, item) => {
      const neg = item.negate();
      return condition ? neg : item;
    };
    const opts = (W) => {
      const windows = Math.ceil(bits / W) + 1;
      const windowSize = 2 ** (W - 1);
      return { windows, windowSize };
    };
    return {
      constTimeNegate,
      // non-const time multiplication ladder
      unsafeLadder(elm, n) {
        let p = c.ZERO;
        let d = elm;
        while (n > _0n3) {
          if (n & _1n3)
            p = p.add(d);
          d = d.double();
          n >>= _1n3;
        }
        return p;
      },
      /**
       * Creates a wNAF precomputation window. Used for caching.
       * Default window size is set by `utils.precompute()` and is equal to 8.
       * Number of precomputed points depends on the curve size:
       * 2^(𝑊−1) * (Math.ceil(𝑛 / 𝑊) + 1), where:
       * - 𝑊 is the window size
       * - 𝑛 is the bitlength of the curve order.
       * For a 256-bit curve and window size 8, the number of precomputed points is 128 * 33 = 4224.
       * @returns precomputed point tables flattened to a single array
       */
      precomputeWindow(elm, W) {
        const { windows, windowSize } = opts(W);
        const points = [];
        let p = elm;
        let base = p;
        for (let window = 0; window < windows; window++) {
          base = p;
          points.push(base);
          for (let i2 = 1; i2 < windowSize; i2++) {
            base = base.add(p);
            points.push(base);
          }
          p = base.double();
        }
        return points;
      },
      /**
       * Implements ec multiplication using precomputed tables and w-ary non-adjacent form.
       * @param W window size
       * @param precomputes precomputed tables
       * @param n scalar (we don't check here, but should be less than curve order)
       * @returns real and fake (for const-time) points
       */
      wNAF(W, precomputes, n) {
        const { windows, windowSize } = opts(W);
        let p = c.ZERO;
        let f = c.BASE;
        const mask = BigInt(2 ** W - 1);
        const maxNumber = 2 ** W;
        const shiftBy = BigInt(W);
        for (let window = 0; window < windows; window++) {
          const offset = window * windowSize;
          let wbits = Number(n & mask);
          n >>= shiftBy;
          if (wbits > windowSize) {
            wbits -= maxNumber;
            n += _1n3;
          }
          const offset1 = offset;
          const offset2 = offset + Math.abs(wbits) - 1;
          const cond1 = window % 2 !== 0;
          const cond2 = wbits < 0;
          if (wbits === 0) {
            f = f.add(constTimeNegate(cond1, precomputes[offset1]));
          } else {
            p = p.add(constTimeNegate(cond2, precomputes[offset2]));
          }
        }
        return { p, f };
      },
      wNAFCached(P, precomputesMap, n, transform) {
        const W = P._WINDOW_SIZE || 1;
        let comp = precomputesMap.get(P);
        if (!comp) {
          comp = this.precomputeWindow(P, W);
          if (W !== 1) {
            precomputesMap.set(P, transform(comp));
          }
        }
        return this.wNAF(W, comp, n);
      }
    };
  }
  function validateBasic(curve) {
    validateField(curve.Fp);
    validateObject(curve, {
      n: "bigint",
      h: "bigint",
      Gx: "field",
      Gy: "field"
    }, {
      nBitLength: "isSafeInteger",
      nByteLength: "isSafeInteger"
    });
    return Object.freeze({
      ...nLength(curve.n, curve.nBitLength),
      ...curve,
      ...{ p: curve.Fp.ORDER }
    });
  }

  // node_modules/@noble/curves/esm/abstract/weierstrass.js
  function validatePointOpts(curve) {
    const opts = validateBasic(curve);
    validateObject(opts, {
      a: "field",
      b: "field"
    }, {
      allowedPrivateKeyLengths: "array",
      wrapPrivateKey: "boolean",
      isTorsionFree: "function",
      clearCofactor: "function",
      allowInfinityPoint: "boolean",
      fromBytes: "function",
      toBytes: "function"
    });
    const { endo, Fp: Fp2, a } = opts;
    if (endo) {
      if (!Fp2.eql(a, Fp2.ZERO)) {
        throw new Error("Endomorphism can only be defined for Koblitz curves that have a=0");
      }
      if (typeof endo !== "object" || typeof endo.beta !== "bigint" || typeof endo.splitScalar !== "function") {
        throw new Error("Expected endomorphism with beta: bigint and splitScalar: function");
      }
    }
    return Object.freeze({ ...opts });
  }
  var { bytesToNumberBE: b2n, hexToBytes: h2b } = utils_exports;
  var DER = {
    // asn.1 DER encoding utils
    Err: class DERErr extends Error {
      constructor(m = "") {
        super(m);
      }
    },
    _parseInt(data) {
      const { Err: E } = DER;
      if (data.length < 2 || data[0] !== 2)
        throw new E("Invalid signature integer tag");
      const len = data[1];
      const res = data.subarray(2, len + 2);
      if (!len || res.length !== len)
        throw new E("Invalid signature integer: wrong length");
      if (res[0] & 128)
        throw new E("Invalid signature integer: negative");
      if (res[0] === 0 && !(res[1] & 128))
        throw new E("Invalid signature integer: unnecessary leading zero");
      return { d: b2n(res), l: data.subarray(len + 2) };
    },
    toSig(hex2) {
      const { Err: E } = DER;
      const data = typeof hex2 === "string" ? h2b(hex2) : hex2;
      if (!(data instanceof Uint8Array))
        throw new Error("ui8a expected");
      let l = data.length;
      if (l < 2 || data[0] != 48)
        throw new E("Invalid signature tag");
      if (data[1] !== l - 2)
        throw new E("Invalid signature: incorrect length");
      const { d: r, l: sBytes } = DER._parseInt(data.subarray(2));
      const { d: s, l: rBytesLeft } = DER._parseInt(sBytes);
      if (rBytesLeft.length)
        throw new E("Invalid signature: left bytes after parsing");
      return { r, s };
    },
    hexFromSig(sig) {
      const slice = (s2) => Number.parseInt(s2[0], 16) & 8 ? "00" + s2 : s2;
      const h = (num) => {
        const hex2 = num.toString(16);
        return hex2.length & 1 ? `0${hex2}` : hex2;
      };
      const s = slice(h(sig.s));
      const r = slice(h(sig.r));
      const shl = s.length / 2;
      const rhl = r.length / 2;
      const sl = h(shl);
      const rl = h(rhl);
      return `30${h(rhl + shl + 4)}02${rl}${r}02${sl}${s}`;
    }
  };
  var _0n4 = BigInt(0);
  var _1n4 = BigInt(1);
  var _2n3 = BigInt(2);
  var _3n2 = BigInt(3);
  var _4n2 = BigInt(4);
  function weierstrassPoints(opts) {
    const CURVE = validatePointOpts(opts);
    const { Fp: Fp2 } = CURVE;
    const toBytes3 = CURVE.toBytes || ((_c, point, _isCompressed) => {
      const a = point.toAffine();
      return concatBytes2(Uint8Array.from([4]), Fp2.toBytes(a.x), Fp2.toBytes(a.y));
    });
    const fromBytes = CURVE.fromBytes || ((bytes3) => {
      const tail = bytes3.subarray(1);
      const x = Fp2.fromBytes(tail.subarray(0, Fp2.BYTES));
      const y = Fp2.fromBytes(tail.subarray(Fp2.BYTES, 2 * Fp2.BYTES));
      return { x, y };
    });
    function weierstrassEquation(x) {
      const { a, b } = CURVE;
      const x2 = Fp2.sqr(x);
      const x3 = Fp2.mul(x2, x);
      return Fp2.add(Fp2.add(x3, Fp2.mul(x, a)), b);
    }
    if (!Fp2.eql(Fp2.sqr(CURVE.Gy), weierstrassEquation(CURVE.Gx)))
      throw new Error("bad generator point: equation left != right");
    function isWithinCurveOrder(num) {
      return typeof num === "bigint" && _0n4 < num && num < CURVE.n;
    }
    function assertGE(num) {
      if (!isWithinCurveOrder(num))
        throw new Error("Expected valid bigint: 0 < bigint < curve.n");
    }
    function normPrivateKeyToScalar(key) {
      const { allowedPrivateKeyLengths: lengths, nByteLength, wrapPrivateKey, n } = CURVE;
      if (lengths && typeof key !== "bigint") {
        if (key instanceof Uint8Array)
          key = bytesToHex(key);
        if (typeof key !== "string" || !lengths.includes(key.length))
          throw new Error("Invalid key");
        key = key.padStart(nByteLength * 2, "0");
      }
      let num;
      try {
        num = typeof key === "bigint" ? key : bytesToNumberBE(ensureBytes("private key", key, nByteLength));
      } catch (error) {
        throw new Error(`private key must be ${nByteLength} bytes, hex or bigint, not ${typeof key}`);
      }
      if (wrapPrivateKey)
        num = mod(num, n);
      assertGE(num);
      return num;
    }
    const pointPrecomputes = /* @__PURE__ */ new Map();
    function assertPrjPoint(other) {
      if (!(other instanceof Point2))
        throw new Error("ProjectivePoint expected");
    }
    class Point2 {
      constructor(px, py, pz) {
        this.px = px;
        this.py = py;
        this.pz = pz;
        if (px == null || !Fp2.isValid(px))
          throw new Error("x required");
        if (py == null || !Fp2.isValid(py))
          throw new Error("y required");
        if (pz == null || !Fp2.isValid(pz))
          throw new Error("z required");
      }
      // Does not validate if the point is on-curve.
      // Use fromHex instead, or call assertValidity() later.
      static fromAffine(p) {
        const { x, y } = p || {};
        if (!p || !Fp2.isValid(x) || !Fp2.isValid(y))
          throw new Error("invalid affine point");
        if (p instanceof Point2)
          throw new Error("projective point not allowed");
        const is0 = (i2) => Fp2.eql(i2, Fp2.ZERO);
        if (is0(x) && is0(y))
          return Point2.ZERO;
        return new Point2(x, y, Fp2.ONE);
      }
      get x() {
        return this.toAffine().x;
      }
      get y() {
        return this.toAffine().y;
      }
      /**
       * Takes a bunch of Projective Points but executes only one
       * inversion on all of them. Inversion is very slow operation,
       * so this improves performance massively.
       * Optimization: converts a list of projective points to a list of identical points with Z=1.
       */
      static normalizeZ(points) {
        const toInv = Fp2.invertBatch(points.map((p) => p.pz));
        return points.map((p, i2) => p.toAffine(toInv[i2])).map(Point2.fromAffine);
      }
      /**
       * Converts hash string or Uint8Array to Point.
       * @param hex short/long ECDSA hex
       */
      static fromHex(hex2) {
        const P = Point2.fromAffine(fromBytes(ensureBytes("pointHex", hex2)));
        P.assertValidity();
        return P;
      }
      // Multiplies generator point by privateKey.
      static fromPrivateKey(privateKey) {
        return Point2.BASE.multiply(normPrivateKeyToScalar(privateKey));
      }
      // "Private method", don't use it directly
      _setWindowSize(windowSize) {
        this._WINDOW_SIZE = windowSize;
        pointPrecomputes.delete(this);
      }
      // A point on curve is valid if it conforms to equation.
      assertValidity() {
        if (this.is0()) {
          if (CURVE.allowInfinityPoint && !Fp2.is0(this.py))
            return;
          throw new Error("bad point: ZERO");
        }
        const { x, y } = this.toAffine();
        if (!Fp2.isValid(x) || !Fp2.isValid(y))
          throw new Error("bad point: x or y not FE");
        const left = Fp2.sqr(y);
        const right = weierstrassEquation(x);
        if (!Fp2.eql(left, right))
          throw new Error("bad point: equation left != right");
        if (!this.isTorsionFree())
          throw new Error("bad point: not in prime-order subgroup");
      }
      hasEvenY() {
        const { y } = this.toAffine();
        if (Fp2.isOdd)
          return !Fp2.isOdd(y);
        throw new Error("Field doesn't support isOdd");
      }
      /**
       * Compare one point to another.
       */
      equals(other) {
        assertPrjPoint(other);
        const { px: X1, py: Y1, pz: Z1 } = this;
        const { px: X2, py: Y2, pz: Z2 } = other;
        const U1 = Fp2.eql(Fp2.mul(X1, Z2), Fp2.mul(X2, Z1));
        const U2 = Fp2.eql(Fp2.mul(Y1, Z2), Fp2.mul(Y2, Z1));
        return U1 && U2;
      }
      /**
       * Flips point to one corresponding to (x, -y) in Affine coordinates.
       */
      negate() {
        return new Point2(this.px, Fp2.neg(this.py), this.pz);
      }
      // Renes-Costello-Batina exception-free doubling formula.
      // There is 30% faster Jacobian formula, but it is not complete.
      // https://eprint.iacr.org/2015/1060, algorithm 3
      // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
      double() {
        const { a, b } = CURVE;
        const b3 = Fp2.mul(b, _3n2);
        const { px: X1, py: Y1, pz: Z1 } = this;
        let X3 = Fp2.ZERO, Y3 = Fp2.ZERO, Z3 = Fp2.ZERO;
        let t0 = Fp2.mul(X1, X1);
        let t1 = Fp2.mul(Y1, Y1);
        let t2 = Fp2.mul(Z1, Z1);
        let t3 = Fp2.mul(X1, Y1);
        t3 = Fp2.add(t3, t3);
        Z3 = Fp2.mul(X1, Z1);
        Z3 = Fp2.add(Z3, Z3);
        X3 = Fp2.mul(a, Z3);
        Y3 = Fp2.mul(b3, t2);
        Y3 = Fp2.add(X3, Y3);
        X3 = Fp2.sub(t1, Y3);
        Y3 = Fp2.add(t1, Y3);
        Y3 = Fp2.mul(X3, Y3);
        X3 = Fp2.mul(t3, X3);
        Z3 = Fp2.mul(b3, Z3);
        t2 = Fp2.mul(a, t2);
        t3 = Fp2.sub(t0, t2);
        t3 = Fp2.mul(a, t3);
        t3 = Fp2.add(t3, Z3);
        Z3 = Fp2.add(t0, t0);
        t0 = Fp2.add(Z3, t0);
        t0 = Fp2.add(t0, t2);
        t0 = Fp2.mul(t0, t3);
        Y3 = Fp2.add(Y3, t0);
        t2 = Fp2.mul(Y1, Z1);
        t2 = Fp2.add(t2, t2);
        t0 = Fp2.mul(t2, t3);
        X3 = Fp2.sub(X3, t0);
        Z3 = Fp2.mul(t2, t1);
        Z3 = Fp2.add(Z3, Z3);
        Z3 = Fp2.add(Z3, Z3);
        return new Point2(X3, Y3, Z3);
      }
      // Renes-Costello-Batina exception-free addition formula.
      // There is 30% faster Jacobian formula, but it is not complete.
      // https://eprint.iacr.org/2015/1060, algorithm 1
      // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
      add(other) {
        assertPrjPoint(other);
        const { px: X1, py: Y1, pz: Z1 } = this;
        const { px: X2, py: Y2, pz: Z2 } = other;
        let X3 = Fp2.ZERO, Y3 = Fp2.ZERO, Z3 = Fp2.ZERO;
        const a = CURVE.a;
        const b3 = Fp2.mul(CURVE.b, _3n2);
        let t0 = Fp2.mul(X1, X2);
        let t1 = Fp2.mul(Y1, Y2);
        let t2 = Fp2.mul(Z1, Z2);
        let t3 = Fp2.add(X1, Y1);
        let t4 = Fp2.add(X2, Y2);
        t3 = Fp2.mul(t3, t4);
        t4 = Fp2.add(t0, t1);
        t3 = Fp2.sub(t3, t4);
        t4 = Fp2.add(X1, Z1);
        let t5 = Fp2.add(X2, Z2);
        t4 = Fp2.mul(t4, t5);
        t5 = Fp2.add(t0, t2);
        t4 = Fp2.sub(t4, t5);
        t5 = Fp2.add(Y1, Z1);
        X3 = Fp2.add(Y2, Z2);
        t5 = Fp2.mul(t5, X3);
        X3 = Fp2.add(t1, t2);
        t5 = Fp2.sub(t5, X3);
        Z3 = Fp2.mul(a, t4);
        X3 = Fp2.mul(b3, t2);
        Z3 = Fp2.add(X3, Z3);
        X3 = Fp2.sub(t1, Z3);
        Z3 = Fp2.add(t1, Z3);
        Y3 = Fp2.mul(X3, Z3);
        t1 = Fp2.add(t0, t0);
        t1 = Fp2.add(t1, t0);
        t2 = Fp2.mul(a, t2);
        t4 = Fp2.mul(b3, t4);
        t1 = Fp2.add(t1, t2);
        t2 = Fp2.sub(t0, t2);
        t2 = Fp2.mul(a, t2);
        t4 = Fp2.add(t4, t2);
        t0 = Fp2.mul(t1, t4);
        Y3 = Fp2.add(Y3, t0);
        t0 = Fp2.mul(t5, t4);
        X3 = Fp2.mul(t3, X3);
        X3 = Fp2.sub(X3, t0);
        t0 = Fp2.mul(t3, t1);
        Z3 = Fp2.mul(t5, Z3);
        Z3 = Fp2.add(Z3, t0);
        return new Point2(X3, Y3, Z3);
      }
      subtract(other) {
        return this.add(other.negate());
      }
      is0() {
        return this.equals(Point2.ZERO);
      }
      wNAF(n) {
        return wnaf.wNAFCached(this, pointPrecomputes, n, (comp) => {
          const toInv = Fp2.invertBatch(comp.map((p) => p.pz));
          return comp.map((p, i2) => p.toAffine(toInv[i2])).map(Point2.fromAffine);
        });
      }
      /**
       * Non-constant-time multiplication. Uses double-and-add algorithm.
       * It's faster, but should only be used when you don't care about
       * an exposed private key e.g. sig verification, which works over *public* keys.
       */
      multiplyUnsafe(n) {
        const I = Point2.ZERO;
        if (n === _0n4)
          return I;
        assertGE(n);
        if (n === _1n4)
          return this;
        const { endo } = CURVE;
        if (!endo)
          return wnaf.unsafeLadder(this, n);
        let { k1neg, k1, k2neg, k2 } = endo.splitScalar(n);
        let k1p = I;
        let k2p = I;
        let d = this;
        while (k1 > _0n4 || k2 > _0n4) {
          if (k1 & _1n4)
            k1p = k1p.add(d);
          if (k2 & _1n4)
            k2p = k2p.add(d);
          d = d.double();
          k1 >>= _1n4;
          k2 >>= _1n4;
        }
        if (k1neg)
          k1p = k1p.negate();
        if (k2neg)
          k2p = k2p.negate();
        k2p = new Point2(Fp2.mul(k2p.px, endo.beta), k2p.py, k2p.pz);
        return k1p.add(k2p);
      }
      /**
       * Constant time multiplication.
       * Uses wNAF method. Windowed method may be 10% faster,
       * but takes 2x longer to generate and consumes 2x memory.
       * Uses precomputes when available.
       * Uses endomorphism for Koblitz curves.
       * @param scalar by which the point would be multiplied
       * @returns New point
       */
      multiply(scalar) {
        assertGE(scalar);
        let n = scalar;
        let point, fake;
        const { endo } = CURVE;
        if (endo) {
          const { k1neg, k1, k2neg, k2 } = endo.splitScalar(n);
          let { p: k1p, f: f1p } = this.wNAF(k1);
          let { p: k2p, f: f2p } = this.wNAF(k2);
          k1p = wnaf.constTimeNegate(k1neg, k1p);
          k2p = wnaf.constTimeNegate(k2neg, k2p);
          k2p = new Point2(Fp2.mul(k2p.px, endo.beta), k2p.py, k2p.pz);
          point = k1p.add(k2p);
          fake = f1p.add(f2p);
        } else {
          const { p, f } = this.wNAF(n);
          point = p;
          fake = f;
        }
        return Point2.normalizeZ([point, fake])[0];
      }
      /**
       * Efficiently calculate `aP + bQ`. Unsafe, can expose private key, if used incorrectly.
       * Not using Strauss-Shamir trick: precomputation tables are faster.
       * The trick could be useful if both P and Q are not G (not in our case).
       * @returns non-zero affine point
       */
      multiplyAndAddUnsafe(Q, a, b) {
        const G = Point2.BASE;
        const mul = (P, a2) => a2 === _0n4 || a2 === _1n4 || !P.equals(G) ? P.multiplyUnsafe(a2) : P.multiply(a2);
        const sum = mul(this, a).add(mul(Q, b));
        return sum.is0() ? void 0 : sum;
      }
      // Converts Projective point to affine (x, y) coordinates.
      // Can accept precomputed Z^-1 - for example, from invertBatch.
      // (x, y, z) ∋ (x=x/z, y=y/z)
      toAffine(iz) {
        const { px: x, py: y, pz: z } = this;
        const is0 = this.is0();
        if (iz == null)
          iz = is0 ? Fp2.ONE : Fp2.inv(z);
        const ax = Fp2.mul(x, iz);
        const ay = Fp2.mul(y, iz);
        const zz = Fp2.mul(z, iz);
        if (is0)
          return { x: Fp2.ZERO, y: Fp2.ZERO };
        if (!Fp2.eql(zz, Fp2.ONE))
          throw new Error("invZ was invalid");
        return { x: ax, y: ay };
      }
      isTorsionFree() {
        const { h: cofactor, isTorsionFree } = CURVE;
        if (cofactor === _1n4)
          return true;
        if (isTorsionFree)
          return isTorsionFree(Point2, this);
        throw new Error("isTorsionFree() has not been declared for the elliptic curve");
      }
      clearCofactor() {
        const { h: cofactor, clearCofactor } = CURVE;
        if (cofactor === _1n4)
          return this;
        if (clearCofactor)
          return clearCofactor(Point2, this);
        return this.multiplyUnsafe(CURVE.h);
      }
      toRawBytes(isCompressed = true) {
        this.assertValidity();
        return toBytes3(Point2, this, isCompressed);
      }
      toHex(isCompressed = true) {
        return bytesToHex(this.toRawBytes(isCompressed));
      }
    }
    Point2.BASE = new Point2(CURVE.Gx, CURVE.Gy, Fp2.ONE);
    Point2.ZERO = new Point2(Fp2.ZERO, Fp2.ONE, Fp2.ZERO);
    const _bits = CURVE.nBitLength;
    const wnaf = wNAF(Point2, CURVE.endo ? Math.ceil(_bits / 2) : _bits);
    return {
      CURVE,
      ProjectivePoint: Point2,
      normPrivateKeyToScalar,
      weierstrassEquation,
      isWithinCurveOrder
    };
  }
  function validateOpts(curve) {
    const opts = validateBasic(curve);
    validateObject(opts, {
      hash: "hash",
      hmac: "function",
      randomBytes: "function"
    }, {
      bits2int: "function",
      bits2int_modN: "function",
      lowS: "boolean"
    });
    return Object.freeze({ lowS: true, ...opts });
  }
  function weierstrass(curveDef) {
    const CURVE = validateOpts(curveDef);
    const { Fp: Fp2, n: CURVE_ORDER } = CURVE;
    const compressedLen = Fp2.BYTES + 1;
    const uncompressedLen = 2 * Fp2.BYTES + 1;
    function isValidFieldElement(num) {
      return _0n4 < num && num < Fp2.ORDER;
    }
    function modN2(a) {
      return mod(a, CURVE_ORDER);
    }
    function invN(a) {
      return invert(a, CURVE_ORDER);
    }
    const { ProjectivePoint: Point2, normPrivateKeyToScalar, weierstrassEquation, isWithinCurveOrder } = weierstrassPoints({
      ...CURVE,
      toBytes(_c, point, isCompressed) {
        const a = point.toAffine();
        const x = Fp2.toBytes(a.x);
        const cat = concatBytes2;
        if (isCompressed) {
          return cat(Uint8Array.from([point.hasEvenY() ? 2 : 3]), x);
        } else {
          return cat(Uint8Array.from([4]), x, Fp2.toBytes(a.y));
        }
      },
      fromBytes(bytes3) {
        const len = bytes3.length;
        const head = bytes3[0];
        const tail = bytes3.subarray(1);
        if (len === compressedLen && (head === 2 || head === 3)) {
          const x = bytesToNumberBE(tail);
          if (!isValidFieldElement(x))
            throw new Error("Point is not on curve");
          const y2 = weierstrassEquation(x);
          let y = Fp2.sqrt(y2);
          const isYOdd = (y & _1n4) === _1n4;
          const isHeadOdd = (head & 1) === 1;
          if (isHeadOdd !== isYOdd)
            y = Fp2.neg(y);
          return { x, y };
        } else if (len === uncompressedLen && head === 4) {
          const x = Fp2.fromBytes(tail.subarray(0, Fp2.BYTES));
          const y = Fp2.fromBytes(tail.subarray(Fp2.BYTES, 2 * Fp2.BYTES));
          return { x, y };
        } else {
          throw new Error(`Point of length ${len} was invalid. Expected ${compressedLen} compressed bytes or ${uncompressedLen} uncompressed bytes`);
        }
      }
    });
    const numToNByteStr = (num) => bytesToHex(numberToBytesBE(num, CURVE.nByteLength));
    function isBiggerThanHalfOrder(number3) {
      const HALF = CURVE_ORDER >> _1n4;
      return number3 > HALF;
    }
    function normalizeS(s) {
      return isBiggerThanHalfOrder(s) ? modN2(-s) : s;
    }
    const slcNum = (b, from, to) => bytesToNumberBE(b.slice(from, to));
    class Signature {
      constructor(r, s, recovery) {
        this.r = r;
        this.s = s;
        this.recovery = recovery;
        this.assertValidity();
      }
      // pair (bytes of r, bytes of s)
      static fromCompact(hex2) {
        const l = CURVE.nByteLength;
        hex2 = ensureBytes("compactSignature", hex2, l * 2);
        return new Signature(slcNum(hex2, 0, l), slcNum(hex2, l, 2 * l));
      }
      // DER encoded ECDSA signature
      // https://bitcoin.stackexchange.com/questions/57644/what-are-the-parts-of-a-bitcoin-transaction-input-script
      static fromDER(hex2) {
        const { r, s } = DER.toSig(ensureBytes("DER", hex2));
        return new Signature(r, s);
      }
      assertValidity() {
        if (!isWithinCurveOrder(this.r))
          throw new Error("r must be 0 < r < CURVE.n");
        if (!isWithinCurveOrder(this.s))
          throw new Error("s must be 0 < s < CURVE.n");
      }
      addRecoveryBit(recovery) {
        return new Signature(this.r, this.s, recovery);
      }
      recoverPublicKey(msgHash) {
        const { r, s, recovery: rec } = this;
        const h = bits2int_modN(ensureBytes("msgHash", msgHash));
        if (rec == null || ![0, 1, 2, 3].includes(rec))
          throw new Error("recovery id invalid");
        const radj = rec === 2 || rec === 3 ? r + CURVE.n : r;
        if (radj >= Fp2.ORDER)
          throw new Error("recovery id 2 or 3 invalid");
        const prefix = (rec & 1) === 0 ? "02" : "03";
        const R = Point2.fromHex(prefix + numToNByteStr(radj));
        const ir = invN(radj);
        const u1 = modN2(-h * ir);
        const u2 = modN2(s * ir);
        const Q = Point2.BASE.multiplyAndAddUnsafe(R, u1, u2);
        if (!Q)
          throw new Error("point at infinify");
        Q.assertValidity();
        return Q;
      }
      // Signatures should be low-s, to prevent malleability.
      hasHighS() {
        return isBiggerThanHalfOrder(this.s);
      }
      normalizeS() {
        return this.hasHighS() ? new Signature(this.r, modN2(-this.s), this.recovery) : this;
      }
      // DER-encoded
      toDERRawBytes() {
        return hexToBytes(this.toDERHex());
      }
      toDERHex() {
        return DER.hexFromSig({ r: this.r, s: this.s });
      }
      // padded bytes of r, then padded bytes of s
      toCompactRawBytes() {
        return hexToBytes(this.toCompactHex());
      }
      toCompactHex() {
        return numToNByteStr(this.r) + numToNByteStr(this.s);
      }
    }
    const utils = {
      isValidPrivateKey(privateKey) {
        try {
          normPrivateKeyToScalar(privateKey);
          return true;
        } catch (error) {
          return false;
        }
      },
      normPrivateKeyToScalar,
      /**
       * Produces cryptographically secure private key from random of size
       * (groupLen + ceil(groupLen / 2)) with modulo bias being negligible.
       */
      randomPrivateKey: () => {
        const length = getMinHashLength(CURVE.n);
        return mapHashToField(CURVE.randomBytes(length), CURVE.n);
      },
      /**
       * Creates precompute table for an arbitrary EC point. Makes point "cached".
       * Allows to massively speed-up `point.multiply(scalar)`.
       * @returns cached point
       * @example
       * const fast = utils.precompute(8, ProjectivePoint.fromHex(someonesPubKey));
       * fast.multiply(privKey); // much faster ECDH now
       */
      precompute(windowSize = 8, point = Point2.BASE) {
        point._setWindowSize(windowSize);
        point.multiply(BigInt(3));
        return point;
      }
    };
    function getPublicKey2(privateKey, isCompressed = true) {
      return Point2.fromPrivateKey(privateKey).toRawBytes(isCompressed);
    }
    function isProbPub(item) {
      const arr = item instanceof Uint8Array;
      const str = typeof item === "string";
      const len = (arr || str) && item.length;
      if (arr)
        return len === compressedLen || len === uncompressedLen;
      if (str)
        return len === 2 * compressedLen || len === 2 * uncompressedLen;
      if (item instanceof Point2)
        return true;
      return false;
    }
    function getSharedSecret(privateA, publicB, isCompressed = true) {
      if (isProbPub(privateA))
        throw new Error("first arg must be private key");
      if (!isProbPub(publicB))
        throw new Error("second arg must be public key");
      const b = Point2.fromHex(publicB);
      return b.multiply(normPrivateKeyToScalar(privateA)).toRawBytes(isCompressed);
    }
    const bits2int = CURVE.bits2int || function(bytes3) {
      const num = bytesToNumberBE(bytes3);
      const delta = bytes3.length * 8 - CURVE.nBitLength;
      return delta > 0 ? num >> BigInt(delta) : num;
    };
    const bits2int_modN = CURVE.bits2int_modN || function(bytes3) {
      return modN2(bits2int(bytes3));
    };
    const ORDER_MASK = bitMask(CURVE.nBitLength);
    function int2octets(num) {
      if (typeof num !== "bigint")
        throw new Error("bigint expected");
      if (!(_0n4 <= num && num < ORDER_MASK))
        throw new Error(`bigint expected < 2^${CURVE.nBitLength}`);
      return numberToBytesBE(num, CURVE.nByteLength);
    }
    function prepSig(msgHash, privateKey, opts = defaultSigOpts) {
      if (["recovered", "canonical"].some((k) => k in opts))
        throw new Error("sign() legacy options not supported");
      const { hash: hash3, randomBytes: randomBytes2 } = CURVE;
      let { lowS, prehash, extraEntropy: ent } = opts;
      if (lowS == null)
        lowS = true;
      msgHash = ensureBytes("msgHash", msgHash);
      if (prehash)
        msgHash = ensureBytes("prehashed msgHash", hash3(msgHash));
      const h1int = bits2int_modN(msgHash);
      const d = normPrivateKeyToScalar(privateKey);
      const seedArgs = [int2octets(d), int2octets(h1int)];
      if (ent != null) {
        const e = ent === true ? randomBytes2(Fp2.BYTES) : ent;
        seedArgs.push(ensureBytes("extraEntropy", e));
      }
      const seed = concatBytes2(...seedArgs);
      const m = h1int;
      function k2sig(kBytes) {
        const k = bits2int(kBytes);
        if (!isWithinCurveOrder(k))
          return;
        const ik = invN(k);
        const q = Point2.BASE.multiply(k).toAffine();
        const r = modN2(q.x);
        if (r === _0n4)
          return;
        const s = modN2(ik * modN2(m + r * d));
        if (s === _0n4)
          return;
        let recovery = (q.x === r ? 0 : 2) | Number(q.y & _1n4);
        let normS = s;
        if (lowS && isBiggerThanHalfOrder(s)) {
          normS = normalizeS(s);
          recovery ^= 1;
        }
        return new Signature(r, normS, recovery);
      }
      return { seed, k2sig };
    }
    const defaultSigOpts = { lowS: CURVE.lowS, prehash: false };
    const defaultVerOpts = { lowS: CURVE.lowS, prehash: false };
    function sign(msgHash, privKey, opts = defaultSigOpts) {
      const { seed, k2sig } = prepSig(msgHash, privKey, opts);
      const C = CURVE;
      const drbg = createHmacDrbg(C.hash.outputLen, C.nByteLength, C.hmac);
      return drbg(seed, k2sig);
    }
    Point2.BASE._setWindowSize(8);
    function verify(signature, msgHash, publicKey, opts = defaultVerOpts) {
      const sg = signature;
      msgHash = ensureBytes("msgHash", msgHash);
      publicKey = ensureBytes("publicKey", publicKey);
      if ("strict" in opts)
        throw new Error("options.strict was renamed to lowS");
      const { lowS, prehash } = opts;
      let _sig = void 0;
      let P;
      try {
        if (typeof sg === "string" || sg instanceof Uint8Array) {
          try {
            _sig = Signature.fromDER(sg);
          } catch (derError) {
            if (!(derError instanceof DER.Err))
              throw derError;
            _sig = Signature.fromCompact(sg);
          }
        } else if (typeof sg === "object" && typeof sg.r === "bigint" && typeof sg.s === "bigint") {
          const { r: r2, s: s2 } = sg;
          _sig = new Signature(r2, s2);
        } else {
          throw new Error("PARSE");
        }
        P = Point2.fromHex(publicKey);
      } catch (error) {
        if (error.message === "PARSE")
          throw new Error(`signature must be Signature instance, Uint8Array or hex string`);
        return false;
      }
      if (lowS && _sig.hasHighS())
        return false;
      if (prehash)
        msgHash = CURVE.hash(msgHash);
      const { r, s } = _sig;
      const h = bits2int_modN(msgHash);
      const is = invN(s);
      const u1 = modN2(h * is);
      const u2 = modN2(r * is);
      const R = Point2.BASE.multiplyAndAddUnsafe(P, u1, u2)?.toAffine();
      if (!R)
        return false;
      const v = modN2(R.x);
      return v === r;
    }
    return {
      CURVE,
      getPublicKey: getPublicKey2,
      getSharedSecret,
      sign,
      verify,
      ProjectivePoint: Point2,
      Signature,
      utils
    };
  }

  // node_modules/@noble/curves/node_modules/@noble/hashes/esm/hmac.js
  var HMAC = class extends Hash {
    constructor(hash3, _key) {
      super();
      this.finished = false;
      this.destroyed = false;
      hash(hash3);
      const key = toBytes(_key);
      this.iHash = hash3.create();
      if (typeof this.iHash.update !== "function")
        throw new Error("Expected instance of class which extends utils.Hash");
      this.blockLen = this.iHash.blockLen;
      this.outputLen = this.iHash.outputLen;
      const blockLen = this.blockLen;
      const pad = new Uint8Array(blockLen);
      pad.set(key.length > blockLen ? hash3.create().update(key).digest() : key);
      for (let i2 = 0; i2 < pad.length; i2++)
        pad[i2] ^= 54;
      this.iHash.update(pad);
      this.oHash = hash3.create();
      for (let i2 = 0; i2 < pad.length; i2++)
        pad[i2] ^= 54 ^ 92;
      this.oHash.update(pad);
      pad.fill(0);
    }
    update(buf) {
      exists(this);
      this.iHash.update(buf);
      return this;
    }
    digestInto(out) {
      exists(this);
      bytes(out, this.outputLen);
      this.finished = true;
      this.iHash.digestInto(out);
      this.oHash.update(out);
      this.oHash.digestInto(out);
      this.destroy();
    }
    digest() {
      const out = new Uint8Array(this.oHash.outputLen);
      this.digestInto(out);
      return out;
    }
    _cloneInto(to) {
      to || (to = Object.create(Object.getPrototypeOf(this), {}));
      const { oHash, iHash, finished, destroyed, blockLen, outputLen } = this;
      to = to;
      to.finished = finished;
      to.destroyed = destroyed;
      to.blockLen = blockLen;
      to.outputLen = outputLen;
      to.oHash = oHash._cloneInto(to.oHash);
      to.iHash = iHash._cloneInto(to.iHash);
      return to;
    }
    destroy() {
      this.destroyed = true;
      this.oHash.destroy();
      this.iHash.destroy();
    }
  };
  var hmac = (hash3, key, message) => new HMAC(hash3, key).update(message).digest();
  hmac.create = (hash3, key) => new HMAC(hash3, key);

  // node_modules/@noble/curves/esm/_shortw_utils.js
  function getHash(hash3) {
    return {
      hash: hash3,
      hmac: (key, ...msgs) => hmac(hash3, key, concatBytes(...msgs)),
      randomBytes
    };
  }
  function createCurve(curveDef, defHash) {
    const create = (hash3) => weierstrass({ ...curveDef, ...getHash(hash3) });
    return Object.freeze({ ...create(defHash), create });
  }

  // node_modules/@noble/curves/esm/secp256k1.js
  var secp256k1P = BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f");
  var secp256k1N = BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141");
  var _1n5 = BigInt(1);
  var _2n4 = BigInt(2);
  var divNearest = (a, b) => (a + b / _2n4) / b;
  function sqrtMod(y) {
    const P = secp256k1P;
    const _3n3 = BigInt(3), _6n = BigInt(6), _11n = BigInt(11), _22n = BigInt(22);
    const _23n = BigInt(23), _44n = BigInt(44), _88n = BigInt(88);
    const b2 = y * y * y % P;
    const b3 = b2 * b2 * y % P;
    const b6 = pow2(b3, _3n3, P) * b3 % P;
    const b9 = pow2(b6, _3n3, P) * b3 % P;
    const b11 = pow2(b9, _2n4, P) * b2 % P;
    const b22 = pow2(b11, _11n, P) * b11 % P;
    const b44 = pow2(b22, _22n, P) * b22 % P;
    const b88 = pow2(b44, _44n, P) * b44 % P;
    const b176 = pow2(b88, _88n, P) * b88 % P;
    const b220 = pow2(b176, _44n, P) * b44 % P;
    const b223 = pow2(b220, _3n3, P) * b3 % P;
    const t1 = pow2(b223, _23n, P) * b22 % P;
    const t2 = pow2(t1, _6n, P) * b2 % P;
    const root = pow2(t2, _2n4, P);
    if (!Fp.eql(Fp.sqr(root), y))
      throw new Error("Cannot find square root");
    return root;
  }
  var Fp = Field(secp256k1P, void 0, void 0, { sqrt: sqrtMod });
  var secp256k1 = createCurve({
    a: BigInt(0),
    b: BigInt(7),
    Fp,
    n: secp256k1N,
    // Base point (x, y) aka generator point
    Gx: BigInt("55066263022277343669578718895168534326250603453777594175500187360389116729240"),
    Gy: BigInt("32670510020758816978083085130507043184471273380659243275938904335757337482424"),
    h: BigInt(1),
    lowS: true,
    /**
     * secp256k1 belongs to Koblitz curves: it has efficiently computable endomorphism.
     * Endomorphism uses 2x less RAM, speeds up precomputation by 2x and ECDH / key recovery by 20%.
     * For precomputed wNAF it trades off 1/2 init time & 1/3 ram for 20% perf hit.
     * Explanation: https://gist.github.com/paulmillr/eb670806793e84df628a7c434a873066
     */
    endo: {
      beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
      splitScalar: (k) => {
        const n = secp256k1N;
        const a1 = BigInt("0x3086d221a7d46bcde86c90e49284eb15");
        const b1 = -_1n5 * BigInt("0xe4437ed6010e88286f547fa90abfe4c3");
        const a2 = BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8");
        const b2 = a1;
        const POW_2_128 = BigInt("0x100000000000000000000000000000000");
        const c1 = divNearest(b2 * k, n);
        const c2 = divNearest(-b1 * k, n);
        let k1 = mod(k - c1 * a1 - c2 * a2, n);
        let k2 = mod(-c1 * b1 - c2 * b2, n);
        const k1neg = k1 > POW_2_128;
        const k2neg = k2 > POW_2_128;
        if (k1neg)
          k1 = n - k1;
        if (k2neg)
          k2 = n - k2;
        if (k1 > POW_2_128 || k2 > POW_2_128) {
          throw new Error("splitScalar: Endomorphism failed, k=" + k);
        }
        return { k1neg, k1, k2neg, k2 };
      }
    }
  }, sha256);
  var _0n5 = BigInt(0);
  var fe = (x) => typeof x === "bigint" && _0n5 < x && x < secp256k1P;
  var ge = (x) => typeof x === "bigint" && _0n5 < x && x < secp256k1N;
  var TAGGED_HASH_PREFIXES = {};
  function taggedHash(tag, ...messages) {
    let tagP = TAGGED_HASH_PREFIXES[tag];
    if (tagP === void 0) {
      const tagH = sha256(Uint8Array.from(tag, (c) => c.charCodeAt(0)));
      tagP = concatBytes2(tagH, tagH);
      TAGGED_HASH_PREFIXES[tag] = tagP;
    }
    return sha256(concatBytes2(tagP, ...messages));
  }
  var pointToBytes = (point) => point.toRawBytes(true).slice(1);
  var numTo32b = (n) => numberToBytesBE(n, 32);
  var modP = (x) => mod(x, secp256k1P);
  var modN = (x) => mod(x, secp256k1N);
  var Point = secp256k1.ProjectivePoint;
  var GmulAdd = (Q, a, b) => Point.BASE.multiplyAndAddUnsafe(Q, a, b);
  function schnorrGetExtPubKey(priv) {
    let d_ = secp256k1.utils.normPrivateKeyToScalar(priv);
    let p = Point.fromPrivateKey(d_);
    const scalar = p.hasEvenY() ? d_ : modN(-d_);
    return { scalar, bytes: pointToBytes(p) };
  }
  function lift_x(x) {
    if (!fe(x))
      throw new Error("bad x: need 0 < x < p");
    const xx = modP(x * x);
    const c = modP(xx * x + BigInt(7));
    let y = sqrtMod(c);
    if (y % _2n4 !== _0n5)
      y = modP(-y);
    const p = new Point(x, y, _1n5);
    p.assertValidity();
    return p;
  }
  function challenge(...args) {
    return modN(bytesToNumberBE(taggedHash("BIP0340/challenge", ...args)));
  }
  function schnorrGetPublicKey(privateKey) {
    return schnorrGetExtPubKey(privateKey).bytes;
  }
  function schnorrSign(message, privateKey, auxRand = randomBytes(32)) {
    const m = ensureBytes("message", message);
    const { bytes: px, scalar: d } = schnorrGetExtPubKey(privateKey);
    const a = ensureBytes("auxRand", auxRand, 32);
    const t = numTo32b(d ^ bytesToNumberBE(taggedHash("BIP0340/aux", a)));
    const rand = taggedHash("BIP0340/nonce", t, px, m);
    const k_ = modN(bytesToNumberBE(rand));
    if (k_ === _0n5)
      throw new Error("sign failed: k is zero");
    const { bytes: rx, scalar: k } = schnorrGetExtPubKey(k_);
    const e = challenge(rx, px, m);
    const sig = new Uint8Array(64);
    sig.set(rx, 0);
    sig.set(numTo32b(modN(k + e * d)), 32);
    if (!schnorrVerify(sig, m, px))
      throw new Error("sign: Invalid signature produced");
    return sig;
  }
  function schnorrVerify(signature, message, publicKey) {
    const sig = ensureBytes("signature", signature, 64);
    const m = ensureBytes("message", message);
    const pub = ensureBytes("publicKey", publicKey, 32);
    try {
      const P = lift_x(bytesToNumberBE(pub));
      const r = bytesToNumberBE(sig.subarray(0, 32));
      if (!fe(r))
        return false;
      const s = bytesToNumberBE(sig.subarray(32, 64));
      if (!ge(s))
        return false;
      const e = challenge(numTo32b(r), pointToBytes(P), m);
      const R = GmulAdd(P, s, modN(-e));
      if (!R || !R.hasEvenY() || R.toAffine().x !== r)
        return false;
      return true;
    } catch (error) {
      return false;
    }
  }
  var schnorr = /* @__PURE__ */ (() => ({
    getPublicKey: schnorrGetPublicKey,
    sign: schnorrSign,
    verify: schnorrVerify,
    utils: {
      randomPrivateKey: secp256k1.utils.randomPrivateKey,
      lift_x,
      pointToBytes,
      numberToBytesBE,
      bytesToNumberBE,
      taggedHash,
      mod
    }
  }))();

  // node_modules/@noble/hashes/esm/crypto.js
  var crypto2 = typeof globalThis === "object" && "crypto" in globalThis ? globalThis.crypto : void 0;

  // node_modules/@noble/hashes/esm/utils.js
  var u8a3 = (a) => a instanceof Uint8Array;
  var createView2 = (arr) => new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
  var rotr2 = (word, shift) => word << 32 - shift | word >>> shift;
  var isLE2 = new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68;
  if (!isLE2)
    throw new Error("Non little-endian hardware is not supported");
  var hexes2 = Array.from({ length: 256 }, (v, i2) => i2.toString(16).padStart(2, "0"));
  function bytesToHex2(bytes3) {
    if (!u8a3(bytes3))
      throw new Error("Uint8Array expected");
    let hex2 = "";
    for (let i2 = 0; i2 < bytes3.length; i2++) {
      hex2 += hexes2[bytes3[i2]];
    }
    return hex2;
  }
  function hexToBytes2(hex2) {
    if (typeof hex2 !== "string")
      throw new Error("hex string expected, got " + typeof hex2);
    const len = hex2.length;
    if (len % 2)
      throw new Error("padded hex string expected, got unpadded hex of length " + len);
    const array = new Uint8Array(len / 2);
    for (let i2 = 0; i2 < array.length; i2++) {
      const j = i2 * 2;
      const hexByte = hex2.slice(j, j + 2);
      const byte = Number.parseInt(hexByte, 16);
      if (Number.isNaN(byte) || byte < 0)
        throw new Error("Invalid byte sequence");
      array[i2] = byte;
    }
    return array;
  }
  function utf8ToBytes3(str) {
    if (typeof str !== "string")
      throw new Error(`utf8ToBytes expected string, got ${typeof str}`);
    return new Uint8Array(new TextEncoder().encode(str));
  }
  function toBytes2(data) {
    if (typeof data === "string")
      data = utf8ToBytes3(data);
    if (!u8a3(data))
      throw new Error(`expected Uint8Array, got ${typeof data}`);
    return data;
  }
  var Hash2 = class {
    // Safe version that clones internal state
    clone() {
      return this._cloneInto();
    }
  };
  function wrapConstructor2(hashCons) {
    const hashC = (msg) => hashCons().update(toBytes2(msg)).digest();
    const tmp = hashCons();
    hashC.outputLen = tmp.outputLen;
    hashC.blockLen = tmp.blockLen;
    hashC.create = () => hashCons();
    return hashC;
  }

  // node_modules/@jsr/nostr__tools/core.js
  var verifiedSymbol = /* @__PURE__ */ Symbol("verified");
  var isRecord = (obj) => obj instanceof Object;
  function validateEvent(event) {
    if (!isRecord(event)) return false;
    if (typeof event.kind !== "number") return false;
    if (typeof event.content !== "string") return false;
    if (typeof event.created_at !== "number") return false;
    if (typeof event.pubkey !== "string") return false;
    if (!event.pubkey.match(/^[a-f0-9]{64}$/)) return false;
    if (!Array.isArray(event.tags)) return false;
    for (let i2 = 0; i2 < event.tags.length; i2++) {
      let tag = event.tags[i2];
      if (!Array.isArray(tag)) return false;
      for (let j = 0; j < tag.length; j++) {
        if (typeof tag[j] !== "string") return false;
      }
    }
    return true;
  }

  // node_modules/@noble/hashes/esm/_assert.js
  function number2(n) {
    if (!Number.isSafeInteger(n) || n < 0)
      throw new Error(`Wrong positive integer: ${n}`);
  }
  function bool(b) {
    if (typeof b !== "boolean")
      throw new Error(`Expected boolean, not ${b}`);
  }
  function bytes2(b, ...lengths) {
    if (!(b instanceof Uint8Array))
      throw new Error("Expected Uint8Array");
    if (lengths.length > 0 && !lengths.includes(b.length))
      throw new Error(`Expected Uint8Array of length ${lengths}, not of length=${b.length}`);
  }
  function hash2(hash3) {
    if (typeof hash3 !== "function" || typeof hash3.create !== "function")
      throw new Error("Hash should be wrapped by utils.wrapConstructor");
    number2(hash3.outputLen);
    number2(hash3.blockLen);
  }
  function exists2(instance, checkFinished = true) {
    if (instance.destroyed)
      throw new Error("Hash instance has been destroyed");
    if (checkFinished && instance.finished)
      throw new Error("Hash#digest() has already been called");
  }
  function output2(out, instance) {
    bytes2(out);
    const min = instance.outputLen;
    if (out.length < min) {
      throw new Error(`digestInto() expects output buffer of length at least ${min}`);
    }
  }
  var assert = {
    number: number2,
    bool,
    bytes: bytes2,
    hash: hash2,
    exists: exists2,
    output: output2
  };
  var assert_default = assert;

  // node_modules/@noble/hashes/esm/_sha2.js
  function setBigUint642(view, byteOffset, value, isLE3) {
    if (typeof view.setBigUint64 === "function")
      return view.setBigUint64(byteOffset, value, isLE3);
    const _32n = BigInt(32);
    const _u32_max = BigInt(4294967295);
    const wh = Number(value >> _32n & _u32_max);
    const wl = Number(value & _u32_max);
    const h = isLE3 ? 4 : 0;
    const l = isLE3 ? 0 : 4;
    view.setUint32(byteOffset + h, wh, isLE3);
    view.setUint32(byteOffset + l, wl, isLE3);
  }
  var SHA22 = class extends Hash2 {
    constructor(blockLen, outputLen, padOffset, isLE3) {
      super();
      this.blockLen = blockLen;
      this.outputLen = outputLen;
      this.padOffset = padOffset;
      this.isLE = isLE3;
      this.finished = false;
      this.length = 0;
      this.pos = 0;
      this.destroyed = false;
      this.buffer = new Uint8Array(blockLen);
      this.view = createView2(this.buffer);
    }
    update(data) {
      assert_default.exists(this);
      const { view, buffer, blockLen } = this;
      data = toBytes2(data);
      const len = data.length;
      for (let pos = 0; pos < len; ) {
        const take = Math.min(blockLen - this.pos, len - pos);
        if (take === blockLen) {
          const dataView = createView2(data);
          for (; blockLen <= len - pos; pos += blockLen)
            this.process(dataView, pos);
          continue;
        }
        buffer.set(data.subarray(pos, pos + take), this.pos);
        this.pos += take;
        pos += take;
        if (this.pos === blockLen) {
          this.process(view, 0);
          this.pos = 0;
        }
      }
      this.length += data.length;
      this.roundClean();
      return this;
    }
    digestInto(out) {
      assert_default.exists(this);
      assert_default.output(out, this);
      this.finished = true;
      const { buffer, view, blockLen, isLE: isLE3 } = this;
      let { pos } = this;
      buffer[pos++] = 128;
      this.buffer.subarray(pos).fill(0);
      if (this.padOffset > blockLen - pos) {
        this.process(view, 0);
        pos = 0;
      }
      for (let i2 = pos; i2 < blockLen; i2++)
        buffer[i2] = 0;
      setBigUint642(view, blockLen - 8, BigInt(this.length * 8), isLE3);
      this.process(view, 0);
      const oview = createView2(out);
      const len = this.outputLen;
      if (len % 4)
        throw new Error("_sha2: outputLen should be aligned to 32bit");
      const outLen = len / 4;
      const state = this.get();
      if (outLen > state.length)
        throw new Error("_sha2: outputLen bigger than state");
      for (let i2 = 0; i2 < outLen; i2++)
        oview.setUint32(4 * i2, state[i2], isLE3);
    }
    digest() {
      const { buffer, outputLen } = this;
      this.digestInto(buffer);
      const res = buffer.slice(0, outputLen);
      this.destroy();
      return res;
    }
    _cloneInto(to) {
      to || (to = new this.constructor());
      to.set(...this.get());
      const { blockLen, buffer, length, finished, destroyed, pos } = this;
      to.length = length;
      to.pos = pos;
      to.finished = finished;
      to.destroyed = destroyed;
      if (length % blockLen)
        to.buffer.set(buffer);
      return to;
    }
  };

  // node_modules/@noble/hashes/esm/sha256.js
  var Chi2 = (a, b, c) => a & b ^ ~a & c;
  var Maj2 = (a, b, c) => a & b ^ a & c ^ b & c;
  var SHA256_K2 = new Uint32Array([
    1116352408,
    1899447441,
    3049323471,
    3921009573,
    961987163,
    1508970993,
    2453635748,
    2870763221,
    3624381080,
    310598401,
    607225278,
    1426881987,
    1925078388,
    2162078206,
    2614888103,
    3248222580,
    3835390401,
    4022224774,
    264347078,
    604807628,
    770255983,
    1249150122,
    1555081692,
    1996064986,
    2554220882,
    2821834349,
    2952996808,
    3210313671,
    3336571891,
    3584528711,
    113926993,
    338241895,
    666307205,
    773529912,
    1294757372,
    1396182291,
    1695183700,
    1986661051,
    2177026350,
    2456956037,
    2730485921,
    2820302411,
    3259730800,
    3345764771,
    3516065817,
    3600352804,
    4094571909,
    275423344,
    430227734,
    506948616,
    659060556,
    883997877,
    958139571,
    1322822218,
    1537002063,
    1747873779,
    1955562222,
    2024104815,
    2227730452,
    2361852424,
    2428436474,
    2756734187,
    3204031479,
    3329325298
  ]);
  var IV2 = new Uint32Array([
    1779033703,
    3144134277,
    1013904242,
    2773480762,
    1359893119,
    2600822924,
    528734635,
    1541459225
  ]);
  var SHA256_W2 = new Uint32Array(64);
  var SHA2562 = class extends SHA22 {
    constructor() {
      super(64, 32, 8, false);
      this.A = IV2[0] | 0;
      this.B = IV2[1] | 0;
      this.C = IV2[2] | 0;
      this.D = IV2[3] | 0;
      this.E = IV2[4] | 0;
      this.F = IV2[5] | 0;
      this.G = IV2[6] | 0;
      this.H = IV2[7] | 0;
    }
    get() {
      const { A, B, C, D, E, F, G, H } = this;
      return [A, B, C, D, E, F, G, H];
    }
    // prettier-ignore
    set(A, B, C, D, E, F, G, H) {
      this.A = A | 0;
      this.B = B | 0;
      this.C = C | 0;
      this.D = D | 0;
      this.E = E | 0;
      this.F = F | 0;
      this.G = G | 0;
      this.H = H | 0;
    }
    process(view, offset) {
      for (let i2 = 0; i2 < 16; i2++, offset += 4)
        SHA256_W2[i2] = view.getUint32(offset, false);
      for (let i2 = 16; i2 < 64; i2++) {
        const W15 = SHA256_W2[i2 - 15];
        const W2 = SHA256_W2[i2 - 2];
        const s0 = rotr2(W15, 7) ^ rotr2(W15, 18) ^ W15 >>> 3;
        const s1 = rotr2(W2, 17) ^ rotr2(W2, 19) ^ W2 >>> 10;
        SHA256_W2[i2] = s1 + SHA256_W2[i2 - 7] + s0 + SHA256_W2[i2 - 16] | 0;
      }
      let { A, B, C, D, E, F, G, H } = this;
      for (let i2 = 0; i2 < 64; i2++) {
        const sigma1 = rotr2(E, 6) ^ rotr2(E, 11) ^ rotr2(E, 25);
        const T1 = H + sigma1 + Chi2(E, F, G) + SHA256_K2[i2] + SHA256_W2[i2] | 0;
        const sigma0 = rotr2(A, 2) ^ rotr2(A, 13) ^ rotr2(A, 22);
        const T2 = sigma0 + Maj2(A, B, C) | 0;
        H = G;
        G = F;
        F = E;
        E = D + T1 | 0;
        D = C;
        C = B;
        B = A;
        A = T1 + T2 | 0;
      }
      A = A + this.A | 0;
      B = B + this.B | 0;
      C = C + this.C | 0;
      D = D + this.D | 0;
      E = E + this.E | 0;
      F = F + this.F | 0;
      G = G + this.G | 0;
      H = H + this.H | 0;
      this.set(A, B, C, D, E, F, G, H);
    }
    roundClean() {
      SHA256_W2.fill(0);
    }
    destroy() {
      this.set(0, 0, 0, 0, 0, 0, 0, 0);
      this.buffer.fill(0);
    }
  };
  var SHA224 = class extends SHA2562 {
    constructor() {
      super();
      this.A = 3238371032 | 0;
      this.B = 914150663 | 0;
      this.C = 812702999 | 0;
      this.D = 4144912697 | 0;
      this.E = 4290775857 | 0;
      this.F = 1750603025 | 0;
      this.G = 1694076839 | 0;
      this.H = 3204075428 | 0;
      this.outputLen = 28;
    }
  };
  var sha2562 = wrapConstructor2(() => new SHA2562());
  var sha224 = wrapConstructor2(() => new SHA224());

  // node_modules/@jsr/nostr__tools/utils.js
  var utf8Decoder = new TextDecoder("utf-8");
  var utf8Encoder = new TextEncoder();
  function normalizeURL(url) {
    try {
      if (url.indexOf("://") === -1) url = "wss://" + url;
      let p = new URL(url);
      if (p.protocol === "http:") p.protocol = "ws:";
      else if (p.protocol === "https:") p.protocol = "wss:";
      p.pathname = p.pathname.replace(/\/+/g, "/");
      if (p.pathname.endsWith("/")) p.pathname = p.pathname.slice(0, -1);
      if (p.port === "80" && p.protocol === "ws:" || p.port === "443" && p.protocol === "wss:") p.port = "";
      p.searchParams.sort();
      p.hash = "";
      return p.toString();
    } catch (e) {
      throw new Error(`Invalid URL: ${url}`);
    }
  }
  var QueueNode = class {
    constructor(message) {
      __publicField(this, "value");
      __publicField(this, "next", null);
      __publicField(this, "prev", null);
      this.value = message;
    }
  };
  var Queue = class {
    constructor() {
      __publicField(this, "first");
      __publicField(this, "last");
      this.first = null;
      this.last = null;
    }
    enqueue(value) {
      const newNode = new QueueNode(value);
      if (!this.last) {
        this.first = newNode;
        this.last = newNode;
      } else if (this.last === this.first) {
        this.last = newNode;
        this.last.prev = this.first;
        this.first.next = newNode;
      } else {
        newNode.prev = this.last;
        this.last.next = newNode;
        this.last = newNode;
      }
      return true;
    }
    dequeue() {
      if (!this.first) return null;
      if (this.first === this.last) {
        const target2 = this.first;
        this.first = null;
        this.last = null;
        return target2.value;
      }
      const target = this.first;
      this.first = target.next;
      if (this.first) {
        this.first.prev = null;
      }
      return target.value;
    }
  };

  // node_modules/@jsr/nostr__tools/pure.js
  var JS = class {
    generateSecretKey() {
      return schnorr.utils.randomPrivateKey();
    }
    getPublicKey(secretKey) {
      return bytesToHex2(schnorr.getPublicKey(secretKey));
    }
    finalizeEvent(t, secretKey) {
      const event = t;
      event.pubkey = bytesToHex2(schnorr.getPublicKey(secretKey));
      event.id = getEventHash(event);
      event.sig = bytesToHex2(schnorr.sign(getEventHash(event), secretKey));
      event[verifiedSymbol] = true;
      return event;
    }
    verifyEvent(event) {
      if (typeof event[verifiedSymbol] === "boolean") return event[verifiedSymbol];
      const hash3 = getEventHash(event);
      if (hash3 !== event.id) {
        event[verifiedSymbol] = false;
        return false;
      }
      try {
        const valid = schnorr.verify(event.sig, hash3, event.pubkey);
        event[verifiedSymbol] = valid;
        return valid;
      } catch (err) {
        event[verifiedSymbol] = false;
        return false;
      }
    }
  };
  function serializeEvent(evt) {
    if (!validateEvent(evt)) throw new Error("can't serialize event with wrong or missing properties");
    return JSON.stringify([
      0,
      evt.pubkey,
      evt.created_at,
      evt.kind,
      evt.tags,
      evt.content
    ]);
  }
  function getEventHash(event) {
    let eventHash = sha2562(utf8Encoder.encode(serializeEvent(event)));
    return bytesToHex2(eventHash);
  }
  var i = new JS();
  var generateSecretKey = i.generateSecretKey;
  var getPublicKey = i.getPublicKey;
  var finalizeEvent = i.finalizeEvent;
  var verifyEvent = i.verifyEvent;

  // node_modules/@jsr/nostr__tools/kinds.js
  function isRegularKind(kind) {
    return kind < 1e4 && kind !== 0 && kind !== 3;
  }
  function isReplaceableKind(kind) {
    return kind === 0 || kind === 3 || 1e4 <= kind && kind < 2e4;
  }
  var EventDeletion = 5;
  var ClientAuth = 22242;

  // node_modules/@jsr/nostr__tools/filter.js
  function matchFilter(filter, event) {
    if (filter.ids && filter.ids.indexOf(event.id) === -1) {
      return false;
    }
    if (filter.kinds && filter.kinds.indexOf(event.kind) === -1) {
      return false;
    }
    if (filter.authors && filter.authors.indexOf(event.pubkey) === -1) {
      return false;
    }
    for (let f in filter) {
      if (f[0] === "#") {
        let tagName = f.slice(1);
        let values = filter[`#${tagName}`];
        if (values && !event.tags.find(([t, v]) => t === f.slice(1) && values.indexOf(v) !== -1)) return false;
      }
    }
    if (filter.since && event.created_at < filter.since) return false;
    if (filter.until && event.created_at > filter.until) return false;
    return true;
  }
  function matchFilters(filters, event) {
    for (let i2 = 0; i2 < filters.length; i2++) {
      if (matchFilter(filters[i2], event)) {
        return true;
      }
    }
    return false;
  }

  // node_modules/@jsr/nostr__tools/fakejson.js
  function getHex64(json, field) {
    let len = field.length + 3;
    let idx = json.indexOf(`"${field}":`) + len;
    let s = json.slice(idx).indexOf(`"`) + idx + 1;
    return json.slice(s, s + 64);
  }
  function getSubscriptionId(json) {
    let idx = json.slice(0, 22).indexOf(`"EVENT"`);
    if (idx === -1) return null;
    let pstart = json.slice(idx + 7 + 1).indexOf(`"`);
    if (pstart === -1) return null;
    let start = idx + 7 + 1 + pstart;
    let pend = json.slice(start + 1, 80).indexOf(`"`);
    if (pend === -1) return null;
    let end = start + 1 + pend;
    return json.slice(start + 1, end);
  }

  // node_modules/@jsr/nostr__tools/nip42.js
  function makeAuthEvent(relayURL, challenge2) {
    return {
      kind: ClientAuth,
      created_at: Math.floor(Date.now() / 1e3),
      tags: [
        [
          "relay",
          relayURL
        ],
        [
          "challenge",
          challenge2
        ]
      ],
      content: ""
    };
  }

  // node_modules/@jsr/nostr__tools/helpers.js
  async function yieldThread() {
    return new Promise((resolve, reject) => {
      try {
        if (typeof MessageChannel !== "undefined") {
          const ch = new MessageChannel();
          const handler = () => {
            ch.port1.removeEventListener("message", handler);
            resolve();
          };
          ch.port1.addEventListener("message", handler);
          ch.port2.postMessage(0);
          ch.port1.start();
        } else {
          if (typeof setImmediate !== "undefined") {
            setImmediate(resolve);
          } else if (typeof setTimeout !== "undefined") {
            setTimeout(resolve, 0);
          } else {
            resolve();
          }
        }
      } catch (e) {
        console.error("during yield: ", e);
        reject(e);
      }
    });
  }
  var alwaysTrue = (t) => {
    t[verifiedSymbol] = true;
    return true;
  };

  // node_modules/@jsr/nostr__tools/abstract-relay.js
  var SendingOnClosedConnection = class extends Error {
    constructor(message, relay) {
      super(`Tried to send message '${message} on a closed connection to ${relay}.`);
      this.name = "SendingOnClosedConnection";
    }
  };
  var AbstractRelay = class _AbstractRelay {
    constructor(url, opts) {
      __publicField(this, "url");
      __publicField(this, "_connected", false);
      __publicField(this, "onclose", null);
      __publicField(this, "onnotice", (msg) => console.debug(`NOTICE from ${this.url}: ${msg}`));
      __publicField(this, "onauth");
      __publicField(this, "baseEoseTimeout", 4400);
      __publicField(this, "connectionTimeout", 4400);
      __publicField(this, "publishTimeout", 4400);
      __publicField(this, "pingFrequency", 29e3);
      __publicField(this, "pingTimeout", 2e4);
      __publicField(this, "resubscribeBackoff", [
        1e4,
        1e4,
        1e4,
        2e4,
        2e4,
        3e4,
        6e4
      ]);
      __publicField(this, "openSubs", /* @__PURE__ */ new Map());
      __publicField(this, "enablePing");
      __publicField(this, "enableReconnect");
      __publicField(this, "connectionTimeoutHandle");
      __publicField(this, "reconnectTimeoutHandle");
      __publicField(this, "pingIntervalHandle");
      __publicField(this, "reconnectAttempts", 0);
      __publicField(this, "closedIntentionally", false);
      __publicField(this, "connectionPromise");
      __publicField(this, "openCountRequests", /* @__PURE__ */ new Map());
      __publicField(this, "openEventPublishes", /* @__PURE__ */ new Map());
      __publicField(this, "ws");
      __publicField(this, "incomingMessageQueue", new Queue());
      __publicField(this, "queueRunning", false);
      __publicField(this, "challenge");
      __publicField(this, "authPromise");
      __publicField(this, "serial", 0);
      __publicField(this, "verifyEvent");
      __publicField(this, "_WebSocket");
      this.url = normalizeURL(url);
      this.verifyEvent = opts.verifyEvent;
      this._WebSocket = opts.websocketImplementation || WebSocket;
      this.enablePing = opts.enablePing;
      this.enableReconnect = opts.enableReconnect || false;
    }
    static async connect(url, opts) {
      const relay = new _AbstractRelay(url, opts);
      await relay.connect();
      return relay;
    }
    closeAllSubscriptions(reason) {
      for (let [_, sub] of this.openSubs) {
        sub.close(reason);
      }
      this.openSubs.clear();
      for (let [_, ep] of this.openEventPublishes) {
        ep.reject(new Error(reason));
      }
      this.openEventPublishes.clear();
      for (let [_, cr] of this.openCountRequests) {
        cr.reject(new Error(reason));
      }
      this.openCountRequests.clear();
    }
    get connected() {
      return this._connected;
    }
    async reconnect() {
      const backoff = this.resubscribeBackoff[Math.min(this.reconnectAttempts, this.resubscribeBackoff.length - 1)];
      this.reconnectAttempts++;
      this.reconnectTimeoutHandle = setTimeout(async () => {
        try {
          await this.connect();
        } catch (err) {
        }
      }, backoff);
    }
    handleHardClose(reason) {
      if (this.pingIntervalHandle) {
        clearInterval(this.pingIntervalHandle);
        this.pingIntervalHandle = void 0;
      }
      this._connected = false;
      this.connectionPromise = void 0;
      const wasIntentional = this.closedIntentionally;
      this.closedIntentionally = false;
      this.onclose?.();
      if (this.enableReconnect && !wasIntentional) {
        this.reconnect();
      } else {
        this.closeAllSubscriptions(reason);
      }
    }
    async connect() {
      if (this.connectionPromise) return this.connectionPromise;
      this.challenge = void 0;
      this.authPromise = void 0;
      this.connectionPromise = new Promise((resolve, reject) => {
        this.connectionTimeoutHandle = setTimeout(() => {
          reject("connection timed out");
          this.connectionPromise = void 0;
          this.onclose?.();
          this.closeAllSubscriptions("relay connection timed out");
        }, this.connectionTimeout);
        try {
          this.ws = new this._WebSocket(this.url);
        } catch (err) {
          clearTimeout(this.connectionTimeoutHandle);
          reject(err);
          return;
        }
        this.ws.onopen = () => {
          if (this.reconnectTimeoutHandle) {
            clearTimeout(this.reconnectTimeoutHandle);
            this.reconnectTimeoutHandle = void 0;
          }
          clearTimeout(this.connectionTimeoutHandle);
          this._connected = true;
          const isReconnection = this.reconnectAttempts > 0;
          this.reconnectAttempts = 0;
          for (const sub of this.openSubs.values()) {
            sub.eosed = false;
            if (isReconnection) {
              for (let f = 0; f < sub.filters.length; f++) {
                if (sub.lastEmitted) {
                  sub.filters[f].since = sub.lastEmitted + 1;
                }
              }
            }
            sub.fire();
          }
          if (this.enablePing) {
            this.pingIntervalHandle = setInterval(() => this.pingpong(), this.pingFrequency);
          }
          resolve();
        };
        this.ws.onerror = (ev) => {
          clearTimeout(this.connectionTimeoutHandle);
          reject(ev.message || "websocket error");
          this.handleHardClose("relay connection errored");
        };
        this.ws.onclose = (ev) => {
          clearTimeout(this.connectionTimeoutHandle);
          reject(ev.message || "websocket closed");
          this.handleHardClose("relay connection closed");
        };
        this.ws.onmessage = this._onmessage.bind(this);
      });
      return this.connectionPromise;
    }
    waitForPingPong() {
      return new Promise((resolve) => {
        ;
        this.ws.once("pong", () => resolve(true));
        this.ws.ping();
      });
    }
    waitForDummyReq() {
      return new Promise((resolve, reject) => {
        if (!this.connectionPromise) return reject(new Error(`no connection to ${this.url}, can't ping`));
        try {
          const sub = this.subscribe([
            {
              ids: [
                "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
              ],
              limit: 0
            }
          ], {
            label: "forced-ping",
            oneose: () => {
              resolve(true);
              sub.close();
            },
            onclose() {
              resolve(true);
            },
            eoseTimeout: this.pingTimeout + 1e3
          });
        } catch (err) {
          reject(err);
        }
      });
    }
    // nodejs requires this magic here to ensure connections are closed when internet goes off and stuff
    // in browsers it's done automatically. see https://github.com/nbd-wtf/nostr-tools/issues/491
    async pingpong() {
      if (this.ws?.readyState === 1) {
        const result = await Promise.any([
          // browsers don't have ping so use a dummy req
          this.ws && this.ws.ping && this.ws.once ? this.waitForPingPong() : this.waitForDummyReq(),
          new Promise((res) => setTimeout(() => res(false), this.pingTimeout))
        ]);
        if (!result) {
          if (this.ws?.readyState === this._WebSocket.OPEN) {
            this.ws?.close();
          }
        }
      }
    }
    async runQueue() {
      this.queueRunning = true;
      while (true) {
        if (false === this.handleNext()) {
          break;
        }
        await yieldThread();
      }
      this.queueRunning = false;
    }
    handleNext() {
      const json = this.incomingMessageQueue.dequeue();
      if (!json) {
        return false;
      }
      const subid = getSubscriptionId(json);
      if (subid) {
        const so = this.openSubs.get(subid);
        if (!so) {
          return;
        }
        const id = getHex64(json, "id");
        const alreadyHave = so.alreadyHaveEvent?.(id);
        so.receivedEvent?.(this, id);
        if (alreadyHave) {
          return;
        }
      }
      try {
        let data = JSON.parse(json);
        switch (data[0]) {
          case "EVENT": {
            const so = this.openSubs.get(data[1]);
            const event = data[2];
            if (this.verifyEvent(event) && matchFilters(so.filters, event)) {
              so.onevent(event);
            }
            if (!so.lastEmitted || so.lastEmitted < event.created_at) so.lastEmitted = event.created_at;
            return;
          }
          case "COUNT": {
            const id = data[1];
            const payload = data[2];
            const cr = this.openCountRequests.get(id);
            if (cr) {
              cr.resolve(payload.count);
              this.openCountRequests.delete(id);
            }
            return;
          }
          case "EOSE": {
            const so = this.openSubs.get(data[1]);
            if (!so) return;
            so.receivedEose();
            return;
          }
          case "OK": {
            const id = data[1];
            const ok = data[2];
            const reason = data[3];
            const ep = this.openEventPublishes.get(id);
            if (ep) {
              clearTimeout(ep.timeout);
              if (ok) ep.resolve(reason);
              else ep.reject(new Error(reason));
              this.openEventPublishes.delete(id);
            }
            return;
          }
          case "CLOSED": {
            const id = data[1];
            const so = this.openSubs.get(id);
            if (!so) return;
            so.closed = true;
            so.close(data[2]);
            return;
          }
          case "NOTICE": {
            this.onnotice(data[1]);
            return;
          }
          case "AUTH": {
            this.challenge = data[1];
            if (this.onauth) {
              this.auth(this.onauth);
            }
            return;
          }
          default: {
            const so = this.openSubs.get(data[1]);
            so?.oncustom?.(data);
            return;
          }
        }
      } catch (err) {
        return;
      }
    }
    async send(message) {
      if (!this.connectionPromise) throw new SendingOnClosedConnection(message, this.url);
      this.connectionPromise.then(() => {
        this.ws?.send(message);
      });
    }
    async auth(signAuthEvent) {
      const challenge2 = this.challenge;
      if (!challenge2) throw new Error("can't perform auth, no challenge was received");
      if (this.authPromise) return this.authPromise;
      this.authPromise = new Promise(async (resolve, reject) => {
        try {
          let evt = await signAuthEvent(makeAuthEvent(this.url, challenge2));
          let timeout = setTimeout(() => {
            let ep = this.openEventPublishes.get(evt.id);
            if (ep) {
              ep.reject(new Error("auth timed out"));
              this.openEventPublishes.delete(evt.id);
            }
          }, this.publishTimeout);
          this.openEventPublishes.set(evt.id, {
            resolve,
            reject,
            timeout
          });
          this.send('["AUTH",' + JSON.stringify(evt) + "]");
        } catch (err) {
          console.warn("subscribe auth function failed:", err);
        }
      });
      return this.authPromise;
    }
    async publish(event) {
      const ret = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          const ep = this.openEventPublishes.get(event.id);
          if (ep) {
            ep.reject(new Error("publish timed out"));
            this.openEventPublishes.delete(event.id);
          }
        }, this.publishTimeout);
        this.openEventPublishes.set(event.id, {
          resolve,
          reject,
          timeout
        });
      });
      this.send('["EVENT",' + JSON.stringify(event) + "]");
      return ret;
    }
    async count(filters, params) {
      this.serial++;
      const id = params?.id || "count:" + this.serial;
      const ret = new Promise((resolve, reject) => {
        this.openCountRequests.set(id, {
          resolve,
          reject
        });
      });
      this.send('["COUNT","' + id + '",' + JSON.stringify(filters).substring(1));
      return ret;
    }
    subscribe(filters, params) {
      const sub = this.prepareSubscription(filters, params);
      sub.fire();
      return sub;
    }
    prepareSubscription(filters, params) {
      this.serial++;
      const id = params.id || (params.label ? params.label + ":" : "sub:") + this.serial;
      const subscription = new Subscription(this, id, filters, params);
      this.openSubs.set(id, subscription);
      return subscription;
    }
    close() {
      this.closedIntentionally = true;
      if (this.reconnectTimeoutHandle) {
        clearTimeout(this.reconnectTimeoutHandle);
        this.reconnectTimeoutHandle = void 0;
      }
      if (this.pingIntervalHandle) {
        clearInterval(this.pingIntervalHandle);
        this.pingIntervalHandle = void 0;
      }
      this.closeAllSubscriptions("relay connection closed by us");
      this._connected = false;
      this.onclose?.();
      if (this.ws?.readyState === this._WebSocket.OPEN) {
        this.ws?.close();
      }
    }
    // this is the function assigned to this.ws.onmessage
    // it's exposed for testing and debugging purposes
    _onmessage(ev) {
      this.incomingMessageQueue.enqueue(ev.data);
      if (!this.queueRunning) {
        this.runQueue();
      }
    }
  };
  var Subscription = class {
    constructor(relay, id, filters, params) {
      __publicField(this, "relay");
      __publicField(this, "id");
      __publicField(this, "lastEmitted");
      __publicField(this, "closed", false);
      __publicField(this, "eosed", false);
      __publicField(this, "filters");
      __publicField(this, "alreadyHaveEvent");
      __publicField(this, "receivedEvent");
      __publicField(this, "onevent");
      __publicField(this, "oneose");
      __publicField(this, "onclose");
      // will get any messages that have this subscription id as their second item and are not default standard
      __publicField(this, "oncustom");
      __publicField(this, "eoseTimeout");
      __publicField(this, "eoseTimeoutHandle");
      if (filters.length === 0) throw new Error("subscription can't be created with zero filters");
      this.relay = relay;
      this.filters = filters;
      this.id = id;
      this.alreadyHaveEvent = params.alreadyHaveEvent;
      this.receivedEvent = params.receivedEvent;
      this.eoseTimeout = params.eoseTimeout || relay.baseEoseTimeout;
      this.oneose = params.oneose;
      this.onclose = params.onclose;
      this.onevent = params.onevent || ((event) => {
        console.warn(`onevent() callback not defined for subscription '${this.id}' in relay ${this.relay.url}. event received:`, event);
      });
    }
    fire() {
      this.relay.send('["REQ","' + this.id + '",' + JSON.stringify(this.filters).substring(1));
      this.eoseTimeoutHandle = setTimeout(this.receivedEose.bind(this), this.eoseTimeout);
    }
    receivedEose() {
      if (this.eosed) return;
      clearTimeout(this.eoseTimeoutHandle);
      this.eosed = true;
      this.oneose?.();
    }
    close(reason = "closed by caller") {
      if (!this.closed && this.relay.connected) {
        try {
          this.relay.send('["CLOSE",' + JSON.stringify(this.id) + "]");
        } catch (err) {
          if (err instanceof SendingOnClosedConnection) {
          } else {
            throw err;
          }
        }
        this.closed = true;
      }
      this.relay.openSubs.delete(this.id);
      this.onclose?.(reason);
    }
  };

  // node_modules/@jsr/nostr__tools/abstract-pool.js
  var AbstractSimplePool = class {
    constructor(opts) {
      __publicField(this, "relays", /* @__PURE__ */ new Map());
      __publicField(this, "seenOn", /* @__PURE__ */ new Map());
      __publicField(this, "trackRelays", false);
      __publicField(this, "verifyEvent");
      __publicField(this, "enablePing");
      __publicField(this, "enableReconnect");
      __publicField(this, "automaticallyAuth");
      __publicField(this, "trustedRelayURLs", /* @__PURE__ */ new Set());
      __publicField(this, "_WebSocket");
      this.verifyEvent = opts.verifyEvent;
      this._WebSocket = opts.websocketImplementation;
      this.enablePing = opts.enablePing;
      this.enableReconnect = opts.enableReconnect || false;
      this.automaticallyAuth = opts.automaticallyAuth;
    }
    async ensureRelay(url, params) {
      url = normalizeURL(url);
      let relay = this.relays.get(url);
      if (!relay) {
        relay = new AbstractRelay(url, {
          verifyEvent: this.trustedRelayURLs.has(url) ? alwaysTrue : this.verifyEvent,
          websocketImplementation: this._WebSocket,
          enablePing: this.enablePing,
          enableReconnect: this.enableReconnect
        });
        relay.onclose = () => {
          if (relay && !relay.enableReconnect) {
            this.relays.delete(url);
          }
        };
        if (params?.connectionTimeout) relay.connectionTimeout = params.connectionTimeout;
        this.relays.set(url, relay);
      }
      if (this.automaticallyAuth) {
        const authSignerFn = this.automaticallyAuth(url);
        if (authSignerFn) {
          relay.onauth = authSignerFn;
        }
      }
      await relay.connect();
      return relay;
    }
    close(relays) {
      relays.map(normalizeURL).forEach((url) => {
        this.relays.get(url)?.close();
        this.relays.delete(url);
      });
    }
    subscribe(relays, filter, params) {
      const request = [];
      for (let i2 = 0; i2 < relays.length; i2++) {
        const url = normalizeURL(relays[i2]);
        if (!request.find((r) => r.url === url)) {
          request.push({
            url,
            filter
          });
        }
      }
      return this.subscribeMap(request, params);
    }
    subscribeMany(relays, filter, params) {
      const request = [];
      const uniqUrls = [];
      for (let i2 = 0; i2 < relays.length; i2++) {
        const url = normalizeURL(relays[i2]);
        if (uniqUrls.indexOf(url) === -1) {
          uniqUrls.push(url);
          request.push({
            url,
            filter
          });
        }
      }
      return this.subscribeMap(request, params);
    }
    subscribeMap(requests, params) {
      const grouped = /* @__PURE__ */ new Map();
      for (const req of requests) {
        const { url, filter } = req;
        if (!grouped.has(url)) grouped.set(url, []);
        grouped.get(url).push(filter);
      }
      const groupedRequests = Array.from(grouped.entries()).map(([url, filters]) => ({
        url,
        filters
      }));
      if (this.trackRelays) {
        params.receivedEvent = (relay, id) => {
          let set2 = this.seenOn.get(id);
          if (!set2) {
            set2 = /* @__PURE__ */ new Set();
            this.seenOn.set(id, set2);
          }
          set2.add(relay);
        };
      }
      const _knownIds = /* @__PURE__ */ new Set();
      const subs = [];
      const eosesReceived = [];
      let handleEose = (i2) => {
        if (eosesReceived[i2]) return;
        eosesReceived[i2] = true;
        if (eosesReceived.filter((a) => a).length === groupedRequests.length) {
          params.oneose?.();
          handleEose = () => {
          };
        }
      };
      const closesReceived = [];
      let handleClose = (i2, reason) => {
        if (closesReceived[i2]) return;
        handleEose(i2);
        closesReceived[i2] = reason;
        if (closesReceived.filter((a) => a).length === groupedRequests.length) {
          params.onclose?.(closesReceived);
          handleClose = () => {
          };
        }
      };
      const localAlreadyHaveEventHandler = (id) => {
        if (params.alreadyHaveEvent?.(id)) {
          return true;
        }
        const have = _knownIds.has(id);
        _knownIds.add(id);
        return have;
      };
      const allOpened = Promise.all(groupedRequests.map(async ({ url, filters }, i2) => {
        let relay;
        try {
          relay = await this.ensureRelay(url, {
            connectionTimeout: params.maxWait ? Math.max(params.maxWait * 0.8, params.maxWait - 1e3) : void 0
          });
        } catch (err) {
          handleClose(i2, err?.message || String(err));
          return;
        }
        let subscription = relay.subscribe(filters, {
          ...params,
          oneose: () => handleEose(i2),
          onclose: (reason) => {
            if (reason.startsWith("auth-required: ") && params.onauth) {
              relay.auth(params.onauth).then(() => {
                relay.subscribe(filters, {
                  ...params,
                  oneose: () => handleEose(i2),
                  onclose: (reason2) => {
                    handleClose(i2, reason2);
                  },
                  alreadyHaveEvent: localAlreadyHaveEventHandler,
                  eoseTimeout: params.maxWait
                });
              }).catch((err) => {
                handleClose(i2, `auth was required and attempted, but failed with: ${err}`);
              });
            } else {
              handleClose(i2, reason);
            }
          },
          alreadyHaveEvent: localAlreadyHaveEventHandler,
          eoseTimeout: params.maxWait
        });
        subs.push(subscription);
      }));
      return {
        async close(reason) {
          await allOpened;
          subs.forEach((sub) => {
            sub.close(reason);
          });
        }
      };
    }
    subscribeEose(relays, filter, params) {
      const subcloser = this.subscribe(relays, filter, {
        ...params,
        oneose() {
          subcloser.close("closed automatically on eose");
        }
      });
      return subcloser;
    }
    subscribeManyEose(relays, filter, params) {
      const subcloser = this.subscribeMany(relays, filter, {
        ...params,
        oneose() {
          subcloser.close("closed automatically on eose");
        }
      });
      return subcloser;
    }
    async querySync(relays, filter, params) {
      return new Promise(async (resolve) => {
        const events = [];
        this.subscribeEose(relays, filter, {
          ...params,
          onevent(event) {
            events.push(event);
          },
          onclose(_) {
            resolve(events);
          }
        });
      });
    }
    async get(relays, filter, params) {
      filter.limit = 1;
      const events = await this.querySync(relays, filter, params);
      events.sort((a, b) => b.created_at - a.created_at);
      return events[0] || null;
    }
    publish(relays, event, options) {
      return relays.map(normalizeURL).map(async (url, i2, arr) => {
        if (arr.indexOf(url) !== i2) {
          return Promise.reject("duplicate url");
        }
        let r = await this.ensureRelay(url);
        return r.publish(event).catch(async (err) => {
          if (err instanceof Error && err.message.startsWith("auth-required: ") && options?.onauth) {
            await r.auth(options.onauth);
            return r.publish(event);
          }
          throw err;
        }).then((reason) => {
          if (this.trackRelays) {
            let set2 = this.seenOn.get(event.id);
            if (!set2) {
              set2 = /* @__PURE__ */ new Set();
              this.seenOn.set(event.id, set2);
            }
            set2.add(r);
          }
          return reason;
        });
      });
    }
    listConnectionStatus() {
      const map = /* @__PURE__ */ new Map();
      this.relays.forEach((relay, url) => map.set(url, relay.connected));
      return map;
    }
    destroy() {
      this.relays.forEach((conn) => conn.close());
      this.relays = /* @__PURE__ */ new Map();
    }
  };

  // node_modules/@jsr/nostr__tools/pool.js
  var _WebSocket;
  try {
    _WebSocket = WebSocket;
  } catch {
  }
  var SimplePool = class extends AbstractSimplePool {
    constructor(options) {
      super({
        verifyEvent,
        websocketImplementation: _WebSocket,
        ...options
      });
    }
  };

  // node_modules/@nostr/gadgets/hints.js
  var hints_exports = {};
  __export(hints_exports, {
    HintKey: () => HintKey,
    MemoryHints: () => MemoryHints
  });

  // node_modules/@nostr/gadgets/lists.js
  var lists_exports = {};
  __export(lists_exports, {
    isFresh: () => isFresh,
    itemsFromTags: () => itemsFromTags,
    loadBlossomServers: () => loadBlossomServers,
    loadBookmarks: () => loadBookmarks,
    loadEmojis: () => loadEmojis,
    loadFavoriteRelays: () => loadFavoriteRelays,
    loadFollowsList: () => loadFollowsList,
    loadMuteList: () => loadMuteList,
    loadPins: () => loadPins,
    loadRelayList: () => loadRelayList,
    loadWikiAuthors: () => loadWikiAuthors,
    loadWikiRelays: () => loadWikiRelays,
    makeListFetcher: () => makeListFetcher
  });

  // node_modules/@jsr/fiatjaf__lru-cache/typed-arrays.js
  var MAX_8BIT_INTEGER = Math.pow(2, 8) - 1;
  var MAX_16BIT_INTEGER = Math.pow(2, 16) - 1;
  var MAX_32BIT_INTEGER = Math.pow(2, 32) - 1;
  var MAX_SIGNED_8BIT_INTEGER = Math.pow(2, 7) - 1;
  var MAX_SIGNED_16BIT_INTEGER = Math.pow(2, 15) - 1;
  var MAX_SIGNED_32BIT_INTEGER = Math.pow(2, 31) - 1;
  var getPointerArray = function(size) {
    var maxIndex = size - 1;
    if (maxIndex <= MAX_8BIT_INTEGER)
      return Uint8Array;
    if (maxIndex <= MAX_16BIT_INTEGER)
      return Uint16Array;
    if (maxIndex <= MAX_32BIT_INTEGER)
      return Uint32Array;
    throw new Error("mnemonist: Pointer Array of size > 4294967295 is not supported.");
  };

  // node_modules/@jsr/fiatjaf__lru-cache/lru-cache.js
  function LRUCache(capacity) {
    this.capacity = capacity;
    if (typeof this.capacity !== "number" || this.capacity <= 0)
      throw new Error("mnemonist/lru-cache: capacity should be positive number.");
    else if (!isFinite(this.capacity) || Math.floor(this.capacity) !== this.capacity)
      throw new Error("mnemonist/lru-cache: capacity should be a finite positive integer.");
    var PointerArray = getPointerArray(capacity);
    this.forward = new PointerArray(capacity);
    this.backward = new PointerArray(capacity);
    this.K = new Array(capacity);
    this.V = new Array(capacity);
    this.size = 0;
    this.head = 0;
    this.tail = 0;
    this.items = {};
  }
  LRUCache.prototype.clear = function() {
    this.size = 0;
    this.head = 0;
    this.tail = 0;
    this.items = {};
  };
  LRUCache.prototype.splayOnTop = function(pointer) {
    var oldHead = this.head;
    if (this.head === pointer)
      return this;
    var previous = this.backward[pointer], next2 = this.forward[pointer];
    if (this.tail === pointer) {
      this.tail = previous;
    } else {
      this.backward[next2] = previous;
    }
    this.forward[previous] = next2;
    this.backward[oldHead] = pointer;
    this.head = pointer;
    this.forward[pointer] = oldHead;
    return this;
  };
  LRUCache.prototype.set = function(key, value) {
    var pointer = this.items[key];
    if (typeof pointer !== "undefined") {
      this.splayOnTop(pointer);
      this.V[pointer] = value;
      return;
    }
    if (this.size < this.capacity) {
      pointer = this.size++;
    } else {
      pointer = this.tail;
      this.tail = this.backward[pointer];
      delete this.items[this.K[pointer]];
    }
    this.items[key] = pointer;
    this.K[pointer] = key;
    this.V[pointer] = value;
    this.forward[pointer] = this.head;
    this.backward[this.head] = pointer;
    this.head = pointer;
  };
  LRUCache.prototype.setpop = function(key, value) {
    var oldValue = null;
    var oldKey = null;
    var pointer = this.items[key];
    if (typeof pointer !== "undefined") {
      this.splayOnTop(pointer);
      oldValue = this.V[pointer];
      this.V[pointer] = value;
      return { evicted: false, key, value: oldValue };
    }
    if (this.size < this.capacity) {
      pointer = this.size++;
    } else {
      pointer = this.tail;
      this.tail = this.backward[pointer];
      oldValue = this.V[pointer];
      oldKey = this.K[pointer];
      delete this.items[oldKey];
    }
    this.items[key] = pointer;
    this.K[pointer] = key;
    this.V[pointer] = value;
    this.forward[pointer] = this.head;
    this.backward[this.head] = pointer;
    this.head = pointer;
    if (oldKey) {
      return { evicted: true, key: oldKey, value: oldValue };
    } else {
      return null;
    }
  };
  LRUCache.prototype.has = function(key) {
    return key in this.items;
  };
  LRUCache.prototype.get = function(key) {
    var pointer = this.items[key];
    if (typeof pointer === "undefined")
      return;
    this.splayOnTop(pointer);
    return this.V[pointer];
  };
  LRUCache.prototype.peek = function(key) {
    var pointer = this.items[key];
    if (typeof pointer === "undefined")
      return;
    return this.V[pointer];
  };

  // node_modules/@nostr/gadgets/dataloader.js
  var DataLoader = class {
    constructor(batchLoadFn, options) {
      // Private
      __publicField(this, "_batchLoadFn");
      __publicField(this, "_maxBatchSize");
      __publicField(this, "_cacheKeyFn");
      __publicField(this, "_cacheMap");
      __publicField(this, "_batch");
      if (typeof batchLoadFn !== "function") {
        throw new TypeError(`DataLoader must be constructed with a function which accepts Array<key> and returns Promise<Array<value>>, but got: ${batchLoadFn}.`);
      }
      this._batchLoadFn = batchLoadFn;
      this._maxBatchSize = options?.maxBatchSize || Infinity;
      this._cacheKeyFn = options?.cacheKeyFn;
      const _cache = new LRUCache(2e3);
      this._cacheMap = {
        get: options.transformCacheHit ? (key) => _cache.get(key)?.then(options.transformCacheHit) : (key) => _cache.get(key),
        set(key, value) {
          return _cache.set(key, value);
        },
        delete(key) {
          _cache.set(key, void 0);
        },
        clear() {
          _cache.clear();
        }
      };
      this._batch = null;
    }
    /**
     * Loads a key, returning a `Promise` for the value represented by that key.
     */
    load(key) {
      if (key === null || key === void 0) {
        throw new TypeError(`The loader.load() function must be called with a value, but got: ${String(key)}.`);
      }
      const batch = getCurrentBatch(this);
      const cacheKey = this._cacheKeyFn(key);
      const cachedPromise = this._cacheMap.get(cacheKey);
      if (cachedPromise) {
        const cacheHits = batch.cacheHits || (batch.cacheHits = []);
        return new Promise((resolve) => {
          cacheHits.push(() => {
            resolve(cachedPromise);
          });
        });
      }
      batch.keys.push(key);
      const promise = new Promise((resolve, reject) => {
        batch.callbacks.push({
          resolve,
          reject
        });
      });
      this._cacheMap.set(cacheKey, promise);
      return promise;
    }
    /**
     * Clears the value at `key` from the cache, if it exists. Returns itself for
     * method chaining.
     */
    clear(key) {
      const cacheMap = this._cacheMap;
      if (cacheMap) {
        const cacheKey = this._cacheKeyFn(key);
        cacheMap.delete(cacheKey);
      }
      return this;
    }
  };
  function getCurrentBatch(loader) {
    const existingBatch = loader._batch;
    if (existingBatch !== null && !existingBatch.hasDispatched && existingBatch.keys.length < loader._maxBatchSize) {
      return existingBatch;
    }
    const newBatch = {
      hasDispatched: false,
      keys: [],
      callbacks: []
    };
    loader._batch = newBatch;
    setTimeout(() => {
      dispatchBatch(loader, newBatch);
    });
    return newBatch;
  }
  function dispatchBatch(loader, batch) {
    batch.hasDispatched = true;
    if (batch.keys.length === 0) {
      resolveCacheHits(batch);
      return;
    }
    let batchPromise;
    try {
      batchPromise = loader._batchLoadFn(batch.keys);
    } catch (e) {
      return failedDispatch(loader, batch, new TypeError(`DataLoader must be constructed with a function which accepts Array<key> and returns Promise<Array<value>>, but the function errored synchronously: ${String(e)}.`));
    }
    if (!batchPromise || typeof batchPromise.then !== "function") {
      return failedDispatch(loader, batch, new TypeError(`DataLoader must be constructed with a function which accepts Array<key> and returns Promise<Array<value>>, but the function did not return a Promise: ${String(batchPromise)}.`));
    }
    batchPromise.then((values) => {
      if (values.length !== batch.keys.length) {
        throw new TypeError(`DataLoader must be constructed with a function which accepts Array<key> and returns Promise<Array<value>>, but the function did not return a Promise of an Array of the same length as the Array of keys.

Keys:
${String(batch.keys)}

Values:
${String(values)}`);
      }
      resolveCacheHits(batch);
      for (let i2 = 0; i2 < batch.callbacks.length; i2++) {
        const value = values[i2];
        if (value instanceof Error) {
          batch.callbacks[i2].reject(value);
        } else {
          batch.callbacks[i2].resolve(value);
        }
      }
    }).catch((error) => {
      failedDispatch(loader, batch, error);
    });
  }
  function failedDispatch(loader, batch, error) {
    resolveCacheHits(batch);
    for (let i2 = 0; i2 < batch.keys.length; i2++) {
      loader.clear(batch.keys[i2]);
      batch.callbacks[i2].reject(error);
    }
  }
  function resolveCacheHits(batch) {
    if (batch.cacheHits) {
      for (let i2 = 0; i2 < batch.cacheHits.length; i2++) {
        batch.cacheHits[i2]();
      }
    }
  }
  var dataloader_default = DataLoader;

  // node_modules/idb-keyval/dist/index.js
  function promisifyRequest(request) {
    return new Promise((resolve, reject) => {
      request.oncomplete = request.onsuccess = () => resolve(request.result);
      request.onabort = request.onerror = () => reject(request.error);
    });
  }
  function createStore(dbName, storeName) {
    let dbp;
    const getDB = () => {
      if (dbp)
        return dbp;
      const request = indexedDB.open(dbName);
      request.onupgradeneeded = () => request.result.createObjectStore(storeName);
      dbp = promisifyRequest(request);
      dbp.then((db) => {
        db.onclose = () => dbp = void 0;
      }, () => {
      });
      return dbp;
    };
    return (txMode, callback) => getDB().then((db) => callback(db.transaction(storeName, txMode).objectStore(storeName)));
  }
  var defaultGetStoreFunc;
  function defaultGetStore() {
    if (!defaultGetStoreFunc) {
      defaultGetStoreFunc = createStore("keyval-store", "keyval");
    }
    return defaultGetStoreFunc;
  }
  function get(key, customStore = defaultGetStore()) {
    return customStore("readonly", (store2) => promisifyRequest(store2.get(key)));
  }
  function set(key, value, customStore = defaultGetStore()) {
    return customStore("readwrite", (store2) => {
      store2.put(value, key);
      return promisifyRequest(store2.transaction);
    });
  }
  function setMany(entries, customStore = defaultGetStore()) {
    return customStore("readwrite", (store2) => {
      entries.forEach((entry) => store2.put(entry[1], entry[0]));
      return promisifyRequest(store2.transaction);
    });
  }
  function getMany(keys, customStore = defaultGetStore()) {
    return customStore("readonly", (store2) => Promise.all(keys.map((key) => promisifyRequest(store2.get(key)))));
  }
  function del(key, customStore = defaultGetStore()) {
    return customStore("readwrite", (store2) => {
      store2.delete(key);
      return promisifyRequest(store2.transaction);
    });
  }

  // node_modules/@nostr/gadgets/defaults.js
  var defaults_exports = {};
  __export(defaults_exports, {
    ARBITRARY_IDS_RELAYS: () => ARBITRARY_IDS_RELAYS,
    BIG_RELAYS_DO_NOT_USE_EVER: () => BIG_RELAYS_DO_NOT_USE_EVER,
    METADATA_QUERY_RELAYS: () => METADATA_QUERY_RELAYS,
    RELAYLIST_RELAYS: () => RELAYLIST_RELAYS,
    SEARCH_RELAYS: () => SEARCH_RELAYS
  });
  var METADATA_QUERY_RELAYS = [
    "wss://purplepag.es",
    "wss://relay.nos.social",
    "wss://relay.primal.net"
  ];
  var RELAYLIST_RELAYS = [
    "wss://purplepag.es",
    "wss://relay.nos.social",
    "wss://indexer.coracle.social"
  ];
  var ARBITRARY_IDS_RELAYS = [
    "wss://cache2.primal.net/v1",
    "wss://relay.damus.io",
    "wss://relay.nostr.band"
  ];
  var SEARCH_RELAYS = [
    "wss://relay.nostr.band",
    "wss://nostr.wine",
    "wss://relay.noswhere.com",
    "wss://relay.nos.today"
  ];
  var BIG_RELAYS_DO_NOT_USE_EVER = [
    "wss://relay.damus.io",
    "wss://nos.lol",
    "wss://relay.primal.net"
  ];

  // node_modules/@nostr/gadgets/utils.js
  var utils_exports2 = {};
  __export(utils_exports2, {
    appendUnique: () => appendUnique,
    getTagOr: () => getTagOr,
    identity: () => identity,
    isATag: () => isATag,
    isHex32: () => isHex32,
    shuffle: () => shuffle,
    unique: () => unique,
    urlWithoutScheme: () => urlWithoutScheme
  });
  function getTagOr(event, tagName, dflt = "") {
    return event.tags.find(([t]) => t === tagName)?.[1] || dflt;
  }
  function isHex32(input) {
    for (let i2 = 0; i2 < 64; i2++) {
      let cc = input.charCodeAt(i2);
      if (isNaN(cc) || cc < 48 || cc > 102 || cc > 57 && cc < 97) {
        return false;
      }
    }
    return true;
  }
  function isATag(input) {
    return Boolean(input.match(/^\d+:[0-9a-f]{64}:[^:]+$/));
  }
  function urlWithoutScheme(url) {
    return url.replace("wss://", "").replace(/\/+$/, "");
  }
  function unique(...arrs) {
    const result = [];
    for (let i2 = 0; i2 < arrs.length; i2++) {
      const arr = arrs[i2];
      for (let j = 0; j < arr.length; j++) {
        const item = arr[j];
        if (result.indexOf(item) !== -1) continue;
        result.push(item);
      }
    }
    return result;
  }
  function identity(a) {
    return Boolean(a);
  }
  function appendUnique(target, ...newItem) {
    let max = newItem.length;
    for (let i2 = 0; i2 < max; i2++) {
      let ni = newItem[i2];
      if (target.indexOf(ni) === -1) target.push(ni);
    }
  }
  function shuffle(arr) {
    for (let i2 = 0; i2 < arr.length; i2++) {
      let prev = Math.round(Math.random() * i2);
      let tmp = arr[i2];
      arr[i2] = arr[prev];
      arr[prev] = tmp;
    }
  }

  // node_modules/@nostr/gadgets/lists.js
  var serial = 0;
  var isFresh = /* @__PURE__ */ Symbol("event was just downloaded or force-updated, not loaded from cache");
  var loadFollowsList = makeListFetcher(3, METADATA_QUERY_RELAYS, itemsFromTags((tag) => {
    if (tag.length >= 2 && tag[0] === "p" && isHex32(tag[1])) {
      return tag[1];
    }
  }));
  var loadWikiAuthors = makeListFetcher(10101, [], itemsFromTags((tag) => {
    if (tag.length >= 2 && tag[0] === "p" && isHex32(tag[1])) {
      return tag[1];
    }
  }));
  var loadWikiRelays = makeListFetcher(10102, [], itemsFromTags((tag) => {
    if (tag.length >= 2 && tag[0] === "relay") {
      return tag[1];
    }
  }));
  var loadFavoriteRelays = makeListFetcher(10012, [], itemsFromTags((tag) => {
    if (tag.length >= 2) {
      switch (tag[0]) {
        case "relay":
          return normalizeURL(tag[1]);
        case "a":
          const spl = tag[1].split(":");
          if (!isHex32(spl[1]) || spl[0] !== "30002") return void 0;
          return {
            identifier: spl.slice(2).join(":"),
            pubkey: spl[1],
            kind: parseInt(spl[0]),
            relays: tag[2] ? [
              tag[2]
            ] : []
          };
      }
    }
  }));
  var loadRelayList = makeListFetcher(10002, RELAYLIST_RELAYS, itemsFromTags((tag) => {
    if (tag.length === 2) {
      return {
        url: tag[1],
        read: true,
        write: true
      };
    } else if (tag[2] === "read") {
      return {
        url: tag[1],
        read: true,
        write: false
      };
    } else if (tag[2] === "write") {
      return {
        url: tag[1],
        read: false,
        write: true
      };
    }
  }));
  var loadMuteList = makeListFetcher(1e4, [], itemsFromTags((tag) => {
    if (tag.length >= 2) {
      switch (tag[0]) {
        case "p":
          if (isHex32(tag[1])) {
            return {
              label: "pubkey",
              value: tag[1]
            };
          }
          break;
        case "e":
          if (isHex32(tag[1])) {
            return {
              label: "thread",
              value: tag[1]
            };
          }
          break;
        case "t":
          return {
            label: "hashtag",
            value: tag[1]
          };
        case "word":
          return {
            label: "word",
            value: tag[1]
          };
      }
      return void 0;
    }
  }));
  var loadBookmarks = makeListFetcher(10003, [], itemsFromTags((tag) => {
    if (tag.length >= 2 && (tag[0] === "e" || tag[0] === "a") && tag[1]) {
      return tag[1];
    }
  }));
  var loadBlossomServers = makeListFetcher(10063, [], (event) => event ? event.tags.filter(([k, v]) => k === "server" && v).map(([, url]) => "http" + normalizeURL(url).substring(
    2
    /* 'ws' */
  )).filter(Boolean) : []);
  var loadEmojis = makeListFetcher(10030, [], itemsFromTags((tag) => {
    if (tag.length < 2) return;
    if (tag[0] === "a") {
      const spl = tag[1].split(":");
      if (!isHex32(spl[1]) || spl[0] !== "30030") return void 0;
      return {
        identifier: spl.slice(2).join(":"),
        pubkey: spl[1],
        kind: parseInt(spl[0]),
        relays: tag[2] ? [
          tag[2]
        ] : []
      };
    }
    if (tag.length < 3 || tag[0] !== "emoji") return void 0;
    return {
      shortcode: tag[1],
      url: tag[2]
    };
  }));
  var loadPins = makeListFetcher(10001, [], itemsFromTags((tag) => {
    if (tag.length >= 2 && tag[0] === "e" && tag[1]) {
      return tag[1];
    }
  }));
  function itemsFromTags(tagProcessor) {
    return (event) => {
      const items = event ? event.tags.map(tagProcessor).filter(identity) : [];
      return items;
    };
  }
  function makeListFetcher(kind, hardcodedRelays, process) {
    const store2 = createStore(`@nostr/gadgets/list:${kind}`, "cache");
    const dataloader = new dataloader_default((requests) => new Promise(async (resolve) => {
      let remainingRequests = [];
      let now = Math.round(Date.now() / 1e3);
      let results = await getMany(requests.map((r) => r.target), store2).then((results2) => results2.map((res, i2) => {
        const req = requests[i2];
        req.index = i2;
        if (typeof req.refreshStyle === "object") {
          const final = {
            event: req.refreshStyle,
            items: process(req.refreshStyle),
            [isFresh]: true
          };
          set(req.target, final, store2);
          return final;
        } else if (!res) {
          if (req.refreshStyle !== false) remainingRequests.push(req);
          return {
            items: req.defaultItems || [],
            event: null,
            [isFresh]: false
          };
        } else if (req.refreshStyle === true || !res.lastAttempt || res.lastAttempt < now - 60 * 60 * 24 * 2) {
          if (req.refreshStyle !== false) remainingRequests.push(req);
          return {
            ...res,
            [isFresh]: false
          };
        } else if (res.event === null && res.lastAttempt < Date.now() / 1e3 - 60 * 60) {
          if (req.refreshStyle !== false) remainingRequests.push(req);
          return {
            ...res,
            [isFresh]: false
          };
        } else {
          return {
            ...res,
            [isFresh]: false
          };
        }
      }));
      if (remainingRequests.length === 0) {
        resolve(results);
        return;
      }
      const filterByRelay = {};
      for (let r = 0; r < remainingRequests.length; r++) {
        const req = remainingRequests[r];
        const relays = req.relays.slice(0, Math.min(4, req.relays.length));
        do {
          relays.push(randomPick(hardcodedRelays));
        } while (relays.length < 3);
        for (let j = 0; j < relays.length; j++) {
          const url = relays[j];
          let filter = filterByRelay[url];
          if (!filter) {
            filter = {
              kinds: [
                kind
              ],
              authors: []
            };
            filterByRelay[url] = filter;
          }
          filter.authors?.push(req.target);
        }
      }
      try {
        let handle;
        handle = pool.subscribeMap(Object.entries(filterByRelay).map(([url, filter]) => ({
          url,
          filter
        })), {
          label: `kind:${kind}:batch(${remainingRequests.length})`,
          onevent(evt) {
            for (let r = 0; r < remainingRequests.length; r++) {
              const req = remainingRequests[r];
              if (req.target === evt.pubkey) {
                const previous = results[req.index]?.event;
                if ((previous?.created_at || 0) > evt.created_at) return;
                results[req.index] = {
                  event: evt,
                  items: process(evt),
                  [isFresh]: true
                };
                return;
              }
            }
          },
          oneose() {
            handle?.close();
          },
          async onclose() {
            resolve(results);
            setMany(remainingRequests.map((req) => [
              req.target,
              {
                ...results[req.index],
                lastAttempt: now
              }
            ]), store2);
          }
        });
      } catch (err) {
        resolve(results.map((_) => err));
      }
    }), {
      cacheKeyFn: (req) => req.target,
      transformCacheHit(v) {
        v[isFresh] = false;
        return v;
      }
    });
    return async function(pubkey, hints2 = [], refreshStyle, defaultItems) {
      if (refreshStyle === null) {
        await del(pubkey, store2);
        dataloader._cacheMap.delete(pubkey);
        return {
          items: defaultItems || [],
          event: null,
          [isFresh]: true
        };
      }
      let relays = hints2;
      if (kind === 10002) {
        return await dataloader.load({
          target: pubkey,
          relays,
          refreshStyle,
          defaultItems
        });
      } else {
        const rl = await loadRelayList(pubkey, hints2, refreshStyle);
        relays.push(...rl.items.filter(({ write }) => write).map(({ url }) => url).slice(0, 3));
        const req = {
          target: pubkey,
          relays,
          refreshStyle,
          defaultItems
        };
        if (refreshStyle) {
          dataloader.clear(req);
        }
        return await dataloader.load(req);
      }
    };
  }
  function randomPick(list) {
    return list[serial++ % list.length];
  }

  // node_modules/@nostr/gadgets/hints.js
  var MemoryHints = class {
    constructor() {
      __publicField(this, "relayBySerial", []);
      __publicField(this, "orderedRelaysByPubKey", {});
      __publicField(this, "hasLoadedRelaysFor", /* @__PURE__ */ new Set());
    }
    export() {
      return JSON.stringify({
        relayBySerial: this.relayBySerial,
        orderedRelaysByPubKey: this.orderedRelaysByPubKey
      });
    }
    import(exported) {
      let { relayBySerial, orderedRelaysByPubKey } = JSON.parse(exported);
      this.relayBySerial = relayBySerial;
      this.orderedRelaysByPubKey = orderedRelaysByPubKey;
    }
    save(pubkey, relay, key, ts) {
      let relayIndex = this.relayBySerial.indexOf(relay);
      if (relayIndex === -1) {
        relayIndex = this.relayBySerial.length;
        this.relayBySerial.push(relay);
      }
      let rfpk = this.orderedRelaysByPubKey[pubkey];
      if (!rfpk) {
        rfpk = [];
      }
      const entryIndex = rfpk.findIndex((re) => re.serial === relayIndex);
      if (entryIndex === -1) {
        const entry = new RelayEntry(relayIndex);
        entry.timestamps[key] = ts;
        rfpk.push(entry);
      } else {
        if (rfpk[entryIndex].timestamps[key] < ts) {
          rfpk[entryIndex].timestamps[key] = ts;
        }
      }
      this.orderedRelaysByPubKey[pubkey] = rfpk;
    }
    async topN(pubkey, n) {
      if (!this.hasLoadedRelaysFor.has(pubkey)) {
        try {
          let { event, items } = await loadRelayList(pubkey);
          if (event) {
            items.forEach((rl) => {
              if (rl.write) {
                this.save(pubkey, rl.url, HintKey.lastInRelayList, event.created_at);
              }
            });
          }
        } catch (err) {
        }
        this.hasLoadedRelaysFor.add(pubkey);
      }
      const urls = [];
      const rfpk = this.orderedRelaysByPubKey[pubkey];
      if (rfpk) {
        rfpk.sort((a, b) => b.sum() - a.sum());
        for (let i2 = 0; i2 < n && i2 < rfpk.length; i2++) {
          urls.push(this.relayBySerial[rfpk[i2].serial]);
        }
      }
      return urls;
    }
    printScores() {
      console.log("= print scores");
      for (let pubkey in this.orderedRelaysByPubKey) {
        let rfpk = this.orderedRelaysByPubKey[pubkey];
        console.log(`== relay scores for ${pubkey}`);
        for (let i2 = 0; i2 < rfpk.entries.length; i2++) {
          const re = rfpk[i2];
          console.log(`  ${i2.toString().padStart(3)} :: ${this.relayBySerial[re.serial].padEnd(30)} (${re.serial}) ::> ${re.sum().toString().padStart(12)}`);
        }
      }
    }
  };
  var RelayEntry = class {
    constructor(relay) {
      __publicField(this, "serial");
      __publicField(this, "timestamps", new Array(7).fill(0));
      this.serial = relay;
    }
    sum() {
      const now = Date.now() / 1e3 + 24 * 60 * 60;
      let sum = 0;
      for (let i2 = 0; i2 < this.timestamps.length; i2++) {
        if (this.timestamps[i2] === 0) continue;
        const value = hintBasePoints[i2] * 1e10 / Math.pow(Math.max(now - this.timestamps[i2], 1), 1.3);
        sum += value;
      }
      return sum;
    }
  };
  var HintKey = /* @__PURE__ */ (function(HintKey2) {
    HintKey2[HintKey2["lastFetchAttempt"] = 0] = "lastFetchAttempt";
    HintKey2[HintKey2["mostRecentEventFetched"] = 1] = "mostRecentEventFetched";
    HintKey2[HintKey2["lastInRelayList"] = 2] = "lastInRelayList";
    HintKey2[HintKey2["lastInTag"] = 3] = "lastInTag";
    HintKey2[HintKey2["lastInNprofile"] = 4] = "lastInNprofile";
    HintKey2[HintKey2["lastInNevent"] = 5] = "lastInNevent";
    HintKey2[HintKey2["lastInNIP05"] = 6] = "lastInNIP05";
    return HintKey2;
  })({});
  var hintBasePoints = {
    [HintKey.lastFetchAttempt]: -500,
    [HintKey.mostRecentEventFetched]: 700,
    [HintKey.lastInRelayList]: 350,
    [HintKey.lastInTag]: 5,
    [HintKey.lastInNprofile]: 22,
    [HintKey.lastInNevent]: 8,
    [HintKey.lastInNIP05]: 7
  };

  // node_modules/@nostr/gadgets/global.js
  var pool = new SimplePool();
  function setPool(p) {
    pool = p;
  }
  var hints = new MemoryHints();

  // node_modules/@nostr/gadgets/sets.js
  var sets_exports = {};
  __export(sets_exports, {
    loadEmojiSets: () => loadEmojiSets,
    loadFollowPacks: () => loadFollowPacks,
    loadFollowSets: () => loadFollowSets,
    loadRelaySets: () => loadRelaySets,
    makeSetFetcher: () => makeSetFetcher
  });
  var loadFollowSets = makeSetFetcher(3e4, itemsFromTags((tag) => {
    if (tag.length >= 2 && tag[0] === "p" && isHex32(tag[1])) {
      return tag[1];
    }
  }));
  var loadFollowPacks = makeSetFetcher(39089, itemsFromTags((tag) => {
    if (tag.length >= 2 && tag[0] === "p" && isHex32(tag[1])) {
      return tag[1];
    }
  }));
  var loadRelaySets = makeSetFetcher(30002, itemsFromTags((tag) => {
    if (tag.length >= 2 && tag[0] === "relay") {
      return tag[1];
    }
  }));
  var loadEmojiSets = makeSetFetcher(30002, itemsFromTags((tag) => {
    if (tag.length < 3 || tag[0] !== "emoji") return void 0;
    return {
      shortcode: tag[1],
      url: tag[2]
    };
  }));
  function makeSetFetcher(kind, process) {
    const store2 = createStore(`@nostr/gadgets/set:${kind}`, "cache");
    const dataloader = new dataloader_default((requests) => new Promise(async (resolve) => {
      let remainingRequests = [];
      let now = Math.round(Date.now() / 1e3);
      let results = await getMany(requests.map((r) => r.target), store2).then((results2) => results2.map((res, i2) => {
        const req = requests[i2];
        req.index = i2;
        if (!res) {
          remainingRequests.push(req);
          return {
            lastAttempt: now,
            result: {}
          };
        } else if (req.forceUpdate || !res.lastAttempt || res.lastAttempt < now - 60 * 60 * 24 * 2) {
          remainingRequests.push(req);
          return res;
        } else {
          return res;
        }
      }));
      if (remainingRequests.length === 0) {
        resolve(results.map((r) => r.result));
        return;
      }
      const filterByRelay = {};
      for (let r = 0; r < remainingRequests.length; r++) {
        const req = remainingRequests[r];
        const relays = req.relays.slice(0, Math.min(4, req.relays.length));
        for (let j = 0; j < relays.length; j++) {
          const url = relays[j];
          let filter = filterByRelay[url];
          if (!filter) {
            filter = {
              kinds: [
                kind
              ],
              authors: []
            };
            filterByRelay[url] = filter;
          }
          filter.authors?.push(req.target);
        }
      }
      try {
        let handle;
        handle = pool.subscribeMap(Object.entries(filterByRelay).map(([url, filter]) => ({
          url,
          filter
        })), {
          label: `kind:${kind}:batch(${remainingRequests.length})`,
          onevent(evt) {
            for (let r = 0; r < remainingRequests.length; r++) {
              const req = remainingRequests[r];
              if (req.target === evt.pubkey) {
                const dTag = evt.tags.find((t) => t[0] === "d")?.[1] || "";
                const result = results[req.index].result;
                const existing = result[dTag];
                if (!existing || existing.event.created_at < evt.created_at) {
                  result[dTag] = {
                    event: evt,
                    items: process(evt)
                  };
                }
                return;
              }
            }
          },
          oneose() {
            handle?.close();
          },
          async onclose() {
            resolve(results.map((r) => r.result));
            setMany(remainingRequests.map((req) => [
              req.target,
              {
                ...results[req.index],
                lastAttempt: now
              }
            ]), store2);
          }
        });
      } catch (err) {
        resolve(results.map((_) => err));
      }
    }), {
      cacheKeyFn: (req) => req.target
    });
    return async function(pubkey, hints2 = [], forceUpdate) {
      let relays = hints2;
      const rl = await loadRelayList(pubkey, hints2);
      relays.push(...rl.items.filter(({ write }) => write).map(({ url }) => url).slice(0, 3));
      const req = {
        target: pubkey,
        relays,
        forceUpdate
      };
      if (forceUpdate) {
        dataloader.clear(req);
      }
      return await dataloader.load(req);
    };
  }

  // node_modules/@nostr/gadgets/metadata.js
  var metadata_exports = {};
  __export(metadata_exports, {
    bareNostrUser: () => bareNostrUser,
    loadNostrUser: () => loadNostrUser,
    nostrUserFromEvent: () => nostrUserFromEvent
  });

  // node_modules/@scure/base/lib/esm/index.js
  function assertNumber(n) {
    if (!Number.isSafeInteger(n))
      throw new Error(`Wrong integer: ${n}`);
  }
  function chain(...args) {
    const wrap = (a, b) => (c) => a(b(c));
    const encode = Array.from(args).reverse().reduce((acc, i2) => acc ? wrap(acc, i2.encode) : i2.encode, void 0);
    const decode2 = args.reduce((acc, i2) => acc ? wrap(acc, i2.decode) : i2.decode, void 0);
    return { encode, decode: decode2 };
  }
  function alphabet(alphabet2) {
    return {
      encode: (digits) => {
        if (!Array.isArray(digits) || digits.length && typeof digits[0] !== "number")
          throw new Error("alphabet.encode input should be an array of numbers");
        return digits.map((i2) => {
          assertNumber(i2);
          if (i2 < 0 || i2 >= alphabet2.length)
            throw new Error(`Digit index outside alphabet: ${i2} (alphabet: ${alphabet2.length})`);
          return alphabet2[i2];
        });
      },
      decode: (input) => {
        if (!Array.isArray(input) || input.length && typeof input[0] !== "string")
          throw new Error("alphabet.decode input should be array of strings");
        return input.map((letter) => {
          if (typeof letter !== "string")
            throw new Error(`alphabet.decode: not string element=${letter}`);
          const index = alphabet2.indexOf(letter);
          if (index === -1)
            throw new Error(`Unknown letter: "${letter}". Allowed: ${alphabet2}`);
          return index;
        });
      }
    };
  }
  function join(separator = "") {
    if (typeof separator !== "string")
      throw new Error("join separator should be string");
    return {
      encode: (from) => {
        if (!Array.isArray(from) || from.length && typeof from[0] !== "string")
          throw new Error("join.encode input should be array of strings");
        for (let i2 of from)
          if (typeof i2 !== "string")
            throw new Error(`join.encode: non-string input=${i2}`);
        return from.join(separator);
      },
      decode: (to) => {
        if (typeof to !== "string")
          throw new Error("join.decode input should be string");
        return to.split(separator);
      }
    };
  }
  function padding(bits, chr = "=") {
    assertNumber(bits);
    if (typeof chr !== "string")
      throw new Error("padding chr should be string");
    return {
      encode(data) {
        if (!Array.isArray(data) || data.length && typeof data[0] !== "string")
          throw new Error("padding.encode input should be array of strings");
        for (let i2 of data)
          if (typeof i2 !== "string")
            throw new Error(`padding.encode: non-string input=${i2}`);
        while (data.length * bits % 8)
          data.push(chr);
        return data;
      },
      decode(input) {
        if (!Array.isArray(input) || input.length && typeof input[0] !== "string")
          throw new Error("padding.encode input should be array of strings");
        for (let i2 of input)
          if (typeof i2 !== "string")
            throw new Error(`padding.decode: non-string input=${i2}`);
        let end = input.length;
        if (end * bits % 8)
          throw new Error("Invalid padding: string should have whole number of bytes");
        for (; end > 0 && input[end - 1] === chr; end--) {
          if (!((end - 1) * bits % 8))
            throw new Error("Invalid padding: string has too much padding");
        }
        return input.slice(0, end);
      }
    };
  }
  function normalize(fn) {
    if (typeof fn !== "function")
      throw new Error("normalize fn should be function");
    return { encode: (from) => from, decode: (to) => fn(to) };
  }
  function convertRadix(data, from, to) {
    if (from < 2)
      throw new Error(`convertRadix: wrong from=${from}, base cannot be less than 2`);
    if (to < 2)
      throw new Error(`convertRadix: wrong to=${to}, base cannot be less than 2`);
    if (!Array.isArray(data))
      throw new Error("convertRadix: data should be array");
    if (!data.length)
      return [];
    let pos = 0;
    const res = [];
    const digits = Array.from(data);
    digits.forEach((d) => {
      assertNumber(d);
      if (d < 0 || d >= from)
        throw new Error(`Wrong integer: ${d}`);
    });
    while (true) {
      let carry = 0;
      let done = true;
      for (let i2 = pos; i2 < digits.length; i2++) {
        const digit = digits[i2];
        const digitBase = from * carry + digit;
        if (!Number.isSafeInteger(digitBase) || from * carry / from !== carry || digitBase - digit !== from * carry) {
          throw new Error("convertRadix: carry overflow");
        }
        carry = digitBase % to;
        digits[i2] = Math.floor(digitBase / to);
        if (!Number.isSafeInteger(digits[i2]) || digits[i2] * to + carry !== digitBase)
          throw new Error("convertRadix: carry overflow");
        if (!done)
          continue;
        else if (!digits[i2])
          pos = i2;
        else
          done = false;
      }
      res.push(carry);
      if (done)
        break;
    }
    for (let i2 = 0; i2 < data.length - 1 && data[i2] === 0; i2++)
      res.push(0);
    return res.reverse();
  }
  var gcd = (a, b) => !b ? a : gcd(b, a % b);
  var radix2carry = (from, to) => from + (to - gcd(from, to));
  function convertRadix2(data, from, to, padding2) {
    if (!Array.isArray(data))
      throw new Error("convertRadix2: data should be array");
    if (from <= 0 || from > 32)
      throw new Error(`convertRadix2: wrong from=${from}`);
    if (to <= 0 || to > 32)
      throw new Error(`convertRadix2: wrong to=${to}`);
    if (radix2carry(from, to) > 32) {
      throw new Error(`convertRadix2: carry overflow from=${from} to=${to} carryBits=${radix2carry(from, to)}`);
    }
    let carry = 0;
    let pos = 0;
    const mask = 2 ** to - 1;
    const res = [];
    for (const n of data) {
      assertNumber(n);
      if (n >= 2 ** from)
        throw new Error(`convertRadix2: invalid data word=${n} from=${from}`);
      carry = carry << from | n;
      if (pos + from > 32)
        throw new Error(`convertRadix2: carry overflow pos=${pos} from=${from}`);
      pos += from;
      for (; pos >= to; pos -= to)
        res.push((carry >> pos - to & mask) >>> 0);
      carry &= 2 ** pos - 1;
    }
    carry = carry << to - pos & mask;
    if (!padding2 && pos >= from)
      throw new Error("Excess padding");
    if (!padding2 && carry)
      throw new Error(`Non-zero padding: ${carry}`);
    if (padding2 && pos > 0)
      res.push(carry >>> 0);
    return res;
  }
  function radix(num) {
    assertNumber(num);
    return {
      encode: (bytes3) => {
        if (!(bytes3 instanceof Uint8Array))
          throw new Error("radix.encode input should be Uint8Array");
        return convertRadix(Array.from(bytes3), 2 ** 8, num);
      },
      decode: (digits) => {
        if (!Array.isArray(digits) || digits.length && typeof digits[0] !== "number")
          throw new Error("radix.decode input should be array of strings");
        return Uint8Array.from(convertRadix(digits, num, 2 ** 8));
      }
    };
  }
  function radix2(bits, revPadding = false) {
    assertNumber(bits);
    if (bits <= 0 || bits > 32)
      throw new Error("radix2: bits should be in (0..32]");
    if (radix2carry(8, bits) > 32 || radix2carry(bits, 8) > 32)
      throw new Error("radix2: carry overflow");
    return {
      encode: (bytes3) => {
        if (!(bytes3 instanceof Uint8Array))
          throw new Error("radix2.encode input should be Uint8Array");
        return convertRadix2(Array.from(bytes3), 8, bits, !revPadding);
      },
      decode: (digits) => {
        if (!Array.isArray(digits) || digits.length && typeof digits[0] !== "number")
          throw new Error("radix2.decode input should be array of strings");
        return Uint8Array.from(convertRadix2(digits, bits, 8, revPadding));
      }
    };
  }
  function unsafeWrapper(fn) {
    if (typeof fn !== "function")
      throw new Error("unsafeWrapper fn should be function");
    return function(...args) {
      try {
        return fn.apply(null, args);
      } catch (e) {
      }
    };
  }
  var base16 = chain(radix2(4), alphabet("0123456789ABCDEF"), join(""));
  var base32 = chain(radix2(5), alphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"), padding(5), join(""));
  var base32hex = chain(radix2(5), alphabet("0123456789ABCDEFGHIJKLMNOPQRSTUV"), padding(5), join(""));
  var base32crockford = chain(radix2(5), alphabet("0123456789ABCDEFGHJKMNPQRSTVWXYZ"), join(""), normalize((s) => s.toUpperCase().replace(/O/g, "0").replace(/[IL]/g, "1")));
  var base64 = chain(radix2(6), alphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"), padding(6), join(""));
  var base64url = chain(radix2(6), alphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"), padding(6), join(""));
  var genBase58 = (abc) => chain(radix(58), alphabet(abc), join(""));
  var base58 = genBase58("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz");
  var base58flickr = genBase58("123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ");
  var base58xrp = genBase58("rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz");
  var XMR_BLOCK_LEN = [0, 2, 3, 5, 6, 7, 9, 10, 11];
  var base58xmr = {
    encode(data) {
      let res = "";
      for (let i2 = 0; i2 < data.length; i2 += 8) {
        const block = data.subarray(i2, i2 + 8);
        res += base58.encode(block).padStart(XMR_BLOCK_LEN[block.length], "1");
      }
      return res;
    },
    decode(str) {
      let res = [];
      for (let i2 = 0; i2 < str.length; i2 += 11) {
        const slice = str.slice(i2, i2 + 11);
        const blockLen = XMR_BLOCK_LEN.indexOf(slice.length);
        const block = base58.decode(slice);
        for (let j = 0; j < block.length - blockLen; j++) {
          if (block[j] !== 0)
            throw new Error("base58xmr: wrong padding");
        }
        res = res.concat(Array.from(block.slice(block.length - blockLen)));
      }
      return Uint8Array.from(res);
    }
  };
  var BECH_ALPHABET = chain(alphabet("qpzry9x8gf2tvdw0s3jn54khce6mua7l"), join(""));
  var POLYMOD_GENERATORS = [996825010, 642813549, 513874426, 1027748829, 705979059];
  function bech32Polymod(pre) {
    const b = pre >> 25;
    let chk = (pre & 33554431) << 5;
    for (let i2 = 0; i2 < POLYMOD_GENERATORS.length; i2++) {
      if ((b >> i2 & 1) === 1)
        chk ^= POLYMOD_GENERATORS[i2];
    }
    return chk;
  }
  function bechChecksum(prefix, words, encodingConst = 1) {
    const len = prefix.length;
    let chk = 1;
    for (let i2 = 0; i2 < len; i2++) {
      const c = prefix.charCodeAt(i2);
      if (c < 33 || c > 126)
        throw new Error(`Invalid prefix (${prefix})`);
      chk = bech32Polymod(chk) ^ c >> 5;
    }
    chk = bech32Polymod(chk);
    for (let i2 = 0; i2 < len; i2++)
      chk = bech32Polymod(chk) ^ prefix.charCodeAt(i2) & 31;
    for (let v of words)
      chk = bech32Polymod(chk) ^ v;
    for (let i2 = 0; i2 < 6; i2++)
      chk = bech32Polymod(chk);
    chk ^= encodingConst;
    return BECH_ALPHABET.encode(convertRadix2([chk % 2 ** 30], 30, 5, false));
  }
  function genBech32(encoding) {
    const ENCODING_CONST = encoding === "bech32" ? 1 : 734539939;
    const _words = radix2(5);
    const fromWords = _words.decode;
    const toWords = _words.encode;
    const fromWordsUnsafe = unsafeWrapper(fromWords);
    function encode(prefix, words, limit = 90) {
      if (typeof prefix !== "string")
        throw new Error(`bech32.encode prefix should be string, not ${typeof prefix}`);
      if (!Array.isArray(words) || words.length && typeof words[0] !== "number")
        throw new Error(`bech32.encode words should be array of numbers, not ${typeof words}`);
      const actualLength = prefix.length + 7 + words.length;
      if (limit !== false && actualLength > limit)
        throw new TypeError(`Length ${actualLength} exceeds limit ${limit}`);
      prefix = prefix.toLowerCase();
      return `${prefix}1${BECH_ALPHABET.encode(words)}${bechChecksum(prefix, words, ENCODING_CONST)}`;
    }
    function decode2(str, limit = 90) {
      if (typeof str !== "string")
        throw new Error(`bech32.decode input should be string, not ${typeof str}`);
      if (str.length < 8 || limit !== false && str.length > limit)
        throw new TypeError(`Wrong string length: ${str.length} (${str}). Expected (8..${limit})`);
      const lowered = str.toLowerCase();
      if (str !== lowered && str !== str.toUpperCase())
        throw new Error(`String must be lowercase or uppercase`);
      str = lowered;
      const sepIndex = str.lastIndexOf("1");
      if (sepIndex === 0 || sepIndex === -1)
        throw new Error(`Letter "1" must be present between prefix and data only`);
      const prefix = str.slice(0, sepIndex);
      const _words2 = str.slice(sepIndex + 1);
      if (_words2.length < 6)
        throw new Error("Data must be at least 6 characters long");
      const words = BECH_ALPHABET.decode(_words2).slice(0, -6);
      const sum = bechChecksum(prefix, words, ENCODING_CONST);
      if (!_words2.endsWith(sum))
        throw new Error(`Invalid checksum in ${str}: expected "${sum}"`);
      return { prefix, words };
    }
    const decodeUnsafe = unsafeWrapper(decode2);
    function decodeToBytes(str) {
      const { prefix, words } = decode2(str, false);
      return { prefix, words, bytes: fromWords(words) };
    }
    return { encode, decode: decode2, decodeToBytes, decodeUnsafe, fromWords, fromWordsUnsafe, toWords };
  }
  var bech32 = genBech32("bech32");
  var bech32m = genBech32("bech32m");
  var utf8 = {
    encode: (data) => new TextDecoder().decode(data),
    decode: (str) => new TextEncoder().encode(str)
  };
  var hex = chain(radix2(4), alphabet("0123456789abcdef"), join(""), normalize((s) => {
    if (typeof s !== "string" || s.length % 2)
      throw new TypeError(`hex.decode: expected string, got ${typeof s} with length ${s.length}`);
    return s.toLowerCase();
  }));
  var CODERS = {
    utf8,
    hex,
    base16,
    base32,
    base64,
    base64url,
    base58,
    base58xmr
  };
  var coderTypeError = `Invalid encoding type. Available types: ${Object.keys(CODERS).join(", ")}`;

  // node_modules/@jsr/nostr__tools/nip19.js
  var Bech32MaxSize = 5e3;
  function decode(code) {
    let { prefix, words } = bech32.decode(code, Bech32MaxSize);
    let data = new Uint8Array(bech32.fromWords(words));
    switch (prefix) {
      case "nprofile": {
        let tlv = parseTLV(data);
        if (!tlv[0]?.[0]) throw new Error("missing TLV 0 for nprofile");
        if (tlv[0][0].length !== 32) throw new Error("TLV 0 should be 32 bytes");
        return {
          type: "nprofile",
          data: {
            pubkey: bytesToHex2(tlv[0][0]),
            relays: tlv[1] ? tlv[1].map((d) => utf8Decoder.decode(d)) : []
          }
        };
      }
      case "nevent": {
        let tlv = parseTLV(data);
        if (!tlv[0]?.[0]) throw new Error("missing TLV 0 for nevent");
        if (tlv[0][0].length !== 32) throw new Error("TLV 0 should be 32 bytes");
        if (tlv[2] && tlv[2][0].length !== 32) throw new Error("TLV 2 should be 32 bytes");
        if (tlv[3] && tlv[3][0].length !== 4) throw new Error("TLV 3 should be 4 bytes");
        return {
          type: "nevent",
          data: {
            id: bytesToHex2(tlv[0][0]),
            relays: tlv[1] ? tlv[1].map((d) => utf8Decoder.decode(d)) : [],
            author: tlv[2]?.[0] ? bytesToHex2(tlv[2][0]) : void 0,
            kind: tlv[3]?.[0] ? parseInt(bytesToHex2(tlv[3][0]), 16) : void 0
          }
        };
      }
      case "naddr": {
        let tlv = parseTLV(data);
        if (!tlv[0]?.[0]) throw new Error("missing TLV 0 for naddr");
        if (!tlv[2]?.[0]) throw new Error("missing TLV 2 for naddr");
        if (tlv[2][0].length !== 32) throw new Error("TLV 2 should be 32 bytes");
        if (!tlv[3]?.[0]) throw new Error("missing TLV 3 for naddr");
        if (tlv[3][0].length !== 4) throw new Error("TLV 3 should be 4 bytes");
        return {
          type: "naddr",
          data: {
            identifier: utf8Decoder.decode(tlv[0][0]),
            pubkey: bytesToHex2(tlv[2][0]),
            kind: parseInt(bytesToHex2(tlv[3][0]), 16),
            relays: tlv[1] ? tlv[1].map((d) => utf8Decoder.decode(d)) : []
          }
        };
      }
      case "nsec":
        return {
          type: prefix,
          data
        };
      case "npub":
      case "note":
        return {
          type: prefix,
          data: bytesToHex2(data)
        };
      default:
        throw new Error(`unknown prefix ${prefix}`);
    }
  }
  function parseTLV(data) {
    let result = {};
    let rest = data;
    while (rest.length > 0) {
      let t = rest[0];
      let l = rest[1];
      let v = rest.slice(2, 2 + l);
      rest = rest.slice(2 + l);
      if (v.length < l) throw new Error(`not enough data to read on TLV ${t}`);
      result[t] = result[t] || [];
      result[t].push(v);
    }
    return result;
  }
  function npubEncode(hex2) {
    return encodeBytes("npub", hexToBytes2(hex2));
  }
  function encodeBech32(prefix, data) {
    let words = bech32.toWords(data);
    return bech32.encode(prefix, words, Bech32MaxSize);
  }
  function encodeBytes(prefix, bytes3) {
    return encodeBech32(prefix, bytes3);
  }

  // node_modules/@nostr/gadgets/metadata.js
  var next = 0;
  function bareNostrUser(input) {
    let npub;
    let pubkey;
    if (input.startsWith("npub1")) {
      let { data } = decode(input);
      pubkey = data;
      npub = input;
    } else if (input.startsWith("nprofile")) {
      let { data } = decode(input);
      pubkey = data.pubkey;
      npub = npubEncode(pubkey);
    } else {
      pubkey = input;
      npub = npubEncode(input);
    }
    return {
      pubkey,
      npub,
      shortName: npub.substring(0, 8) + "\u2026" + npub.substring(59),
      metadata: {},
      lastUpdated: 0
    };
  }
  var metadataStore = createStore("@nostr/gadgets/metadata", "cache");
  async function loadNostrUser(request) {
    if (typeof request === "string") {
      return metadataLoader.load({
        pubkey: request
      });
    } else {
      if (request.refreshStyle === null) {
        await del(request.pubkey, metadataStore);
        metadataLoader._cacheMap.delete(request.pubkey);
        return bareNostrUser(request.pubkey);
      } else if (request.refreshStyle) {
        metadataLoader.clear(
          // tell ts that refreshStyle can't be null here
          request
        );
      }
    }
    return metadataLoader.load(
      // tell ts that refreshStyle can't be null here
      request
    );
  }
  var metadataLoader = new dataloader_default(async (requests) => new Promise(async (resolve) => {
    const toFetch = [];
    let now = Math.round(Date.now() / 1e3);
    let results = await getMany(requests.map((r) => r.pubkey), metadataStore).then((results2) => results2.map((res, i2) => {
      const req = requests[i2];
      if (typeof req.refreshStyle === "object") {
        let nu = bareNostrUser(req.pubkey);
        enhanceNostrUserWithEvent(nu, req.refreshStyle);
        set(req.pubkey, nu, metadataStore);
        return nu;
      } else if (!res) {
        if (req.refreshStyle !== false) toFetch.push(req);
        let nu = bareNostrUser(req.pubkey);
        nu.lastAttempt = now;
        return nu;
      } else if (req.refreshStyle === true || res.lastAttempt < now - 60 * 60 * 24 * 2) {
        if (req.refreshStyle !== false) toFetch.push(req);
        res.lastAttempt = now;
        return res;
      } else if (res.lastAttempt < now - 60 * 60 && !res.metadata.name && !res.metadata.picture && !res.metadata.about) {
        if (req.refreshStyle !== false) toFetch.push(req);
        res.lastAttempt = Math.round(Date.now() / 1e3);
        return res;
      } else {
        return res;
      }
    }));
    if (toFetch.length === 0) {
      resolve(results);
      return;
    }
    const pubkeysByRelay = {};
    await Promise.all(toFetch.map(async ({ pubkey, relays = [] }) => {
      const selectedRelays = new Set(relays.slice(0, 3));
      try {
        const { items } = await loadRelayList(pubkey);
        let gathered = 0;
        for (let j = 0; j < items.length; j++) {
          if (items[j].write) {
            selectedRelays.add(items[j].url);
            gathered++;
            if (gathered >= 2) break;
          }
        }
      } catch (err) {
        console.error("Failed to load relay list for", pubkey, err);
      }
      do {
        selectedRelays.add(METADATA_QUERY_RELAYS[next % METADATA_QUERY_RELAYS.length]);
        next++;
      } while (selectedRelays.size < 2);
      for (let relay of selectedRelays) {
        if (pubkeysByRelay[relay]) {
          pubkeysByRelay[relay].push(pubkey);
        } else {
          pubkeysByRelay[relay] = [
            pubkey
          ];
        }
      }
    }));
    try {
      const requestMap = Object.entries(pubkeysByRelay).map(([relay, pubkeys]) => ({
        url: relay,
        filter: {
          kinds: [
            0
          ],
          authors: pubkeys
        }
      }));
      let h = pool.subscribeMap(requestMap, {
        label: `metadata(${requests.length})`,
        onevent(evt) {
          for (let i2 = 0; i2 < requests.length; i2++) {
            if (requests[i2].pubkey === evt.pubkey) {
              const nu = results[i2];
              if (nu.lastUpdated > evt.created_at) return;
              enhanceNostrUserWithEvent(nu, evt);
              return;
            }
          }
        },
        oneose() {
          resolve(results);
          h.close();
          let idbSave = [];
          for (let i2 = 0; i2 < results.length; i2++) {
            let res = results[i2];
            if (res.pubkey) {
              idbSave.push([
                res.pubkey,
                res
              ]);
            }
          }
          setMany(idbSave, metadataStore);
        }
      });
    } catch (err) {
      for (let i2 = 0; i2 < results.length; i2++) {
        results[i2] = err;
      }
      resolve(results);
    }
  }), {
    cacheKeyFn: (r) => r.pubkey
  });
  function enhanceNostrUserWithEvent(nu, evt) {
    let md = {};
    try {
      md = JSON.parse(evt.content);
    } catch {
    }
    nu.metadata = md;
    nu.shortName = md.name || md.display_name || md.nip05?.split("@")?.[0] || nu.shortName;
    nu.lastUpdated = evt.created_at;
    if (md.picture) nu.image = md.picture;
  }
  function nostrUserFromEvent(evt) {
    let nu = bareNostrUser(evt.pubkey);
    enhanceNostrUserWithEvent(nu, evt);
    return nu;
  }

  // node_modules/@nostr/gadgets/store.js
  var store_exports = {};
  __export(store_exports, {
    DatabaseError: () => DatabaseError,
    IDBEventStore: () => IDBEventStore,
    isLocal: () => isLocal,
    seenOn: () => seenOn
  });
  var DatabaseError = class extends Error {
    constructor(message) {
      super(message);
      this.name = "DatabaseError";
    }
  };
  var INDEX_CREATED_AT_PREFIX = 1;
  var INDEX_KIND_PREFIX = 2;
  var INDEX_PUBKEY_PREFIX = 3;
  var INDEX_PUBKEY_KIND_PREFIX = 4;
  var INDEX_TAG_PREFIX = 5;
  var INDEX_TAG32_PREFIX = 6;
  var INDEX_TAG_ADDR_PREFIX = 7;
  var INDEX_FOLLOWED_PREFIX = 8;
  var IDBEventStore = class {
    /**
     * creates a new event store instance.
     * @param dbName - name of the indexedDB database (default: '@nostr/gadgets/events')
     */
    constructor(dbName = "@nostr/gadgets/events") {
      __publicField(this, "dbName");
      __publicField(this, "_db");
      __publicField(this, "saveBatch");
      this.dbName = dbName;
    }
    /**
     * initializes the database connection and creates object stores if needed.
     * automatically called by other methods if not already initialized, so you can ignore it.
     */
    async init() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, 2);
        request.onerror = () => {
          reject(new DatabaseError(`failed to open database: ${request.error?.message}`));
        };
        request.onsuccess = () => {
          this._db = request.result;
          resolve();
        };
        request.onupgradeneeded = (change) => {
          const db = request.result;
          if (!change.oldVersion) {
            db.createObjectStore("events", {
              autoIncrement: true
            });
            db.createObjectStore("ids");
            db.createObjectStore("indexes");
          }
          if (change.oldVersion <= 1) {
            db.createObjectStore("syncing");
          }
        };
      });
    }
    /**
     * closes the database. you probably do not need this.
     */
    async close() {
      if (this._db) {
        this._db.close();
        this._db = void 0;
      }
    }
    /**
     * saves a nostr event to the store with automatic batching for performance.
     * (if you want the batching to work you can't `await` it immediately upon calling it)
     *
     * @param event - the nostr event to save
     * @param seenOn - optional array of relay URLs where this event was seen
     * @param followedBy - optional array of pubkeys that are following this event
     * @returns boolean - true if the event was new, false if it was already saved
     * @throws {DatabaseError} if event values are out of bounds or storage fails
     */
    async saveEvent(event, { seenOn: seenOn2, followedBy } = {}) {
      if (!this._db) await this.init();
      if (event.created_at > 4294967295 || event.kind > 65535) {
        throw new DatabaseError("event with values out of expected boundaries");
      }
      if (seenOn2) {
        ;
        event.seen_on = seenOn2;
      }
      let batch = this.saveBatch;
      if (!batch) {
        batch = [
          [],
          [],
          [],
          []
        ];
        this.saveBatch = batch;
        const events = batch[1];
        const followedBys = batch[2];
        const tasks = batch[3];
        queueMicrotask(() => {
          this.saveBatch = null;
          const transaction = this._db.transaction([
            "events",
            "ids",
            "indexes"
          ], "readwrite", {
            durability: "relaxed"
          });
          const promises = this.saveEventsBatch(transaction, events, followedBys);
          for (let i2 = 0; i2 < promises.length; i2++) {
            promises[i2].catch(tasks[i2].reject).then((isSaved) => {
              if (typeof isSaved !== "undefined") tasks[i2].resolve(isSaved);
            });
          }
        });
      }
      batch = batch;
      let idx = batch[0].indexOf(event.id);
      if (idx !== -1) return batch[3][idx].p;
      idx = batch[0].push(event.id) - 1;
      let task = batch[3][idx] = {};
      batch[1][idx] = event;
      batch[2][idx] = followedBy;
      task.p = new Promise(function(resolve, reject) {
        task.resolve = resolve;
        task.reject = reject;
      });
      return task.p;
    }
    saveEventsBatch(transaction, events, followedBys) {
      const idStore = transaction.objectStore("ids");
      const promises = new Array(events.length);
      for (let i2 = 0; i2 < events.length; i2++) {
        const event = events[i2];
        const followedBy = followedBys[i2];
        promises[i2] = new Promise((resolve, reject) => {
          const idKey = new Uint8Array(8);
          putHexAsBytes(idKey, 0, event.id, 8);
          const checkRequest = idStore.getKey(idKey.buffer);
          checkRequest.onsuccess = () => {
            if (checkRequest.result && checkRequest.result) {
              resolve(false);
              return;
            }
            this.saveEventInternal(transaction, event, followedBy).then(() => {
              resolve(true);
              transaction.commit();
            }).catch(reject);
          };
          checkRequest.onerror = () => {
            reject(new DatabaseError(`failed to check for duplicate: ${checkRequest.error?.message}`));
          };
        });
      }
      return promises;
    }
    async saveEventInternal(transaction, event, followedBy) {
      const eventStore = transaction.objectStore("events");
      const idStore = transaction.objectStore("ids");
      const indexStore = transaction.objectStore("indexes");
      return new Promise((resolve, reject) => {
        const saveEventRequest = eventStore.put(JSON.stringify(event));
        saveEventRequest.onsuccess = () => {
          const serial2 = saveEventRequest.result;
          const indexPromises = [];
          const idKey = new Uint8Array(8);
          putHexAsBytes(idKey, 0, event.id, 8);
          const promise = new Promise((resolve2, reject2) => {
            const idRequest = idStore.add(serial2, idKey);
            idRequest.onsuccess = () => resolve2();
            idRequest.onerror = () => reject2(new DatabaseError(`Failed to create index: ${idRequest.error?.message}`));
          });
          indexPromises.push(promise);
          for (const indexKey of getIndexKeysForEvent(event, serial2, followedBy)) {
            const p = new Promise((resolve2, reject2) => {
              const indexRequest = indexStore.put(null, indexKey.buffer);
              indexRequest.onsuccess = () => resolve2();
              indexRequest.onerror = () => reject2(new DatabaseError(`Failed to create index: ${indexRequest.error?.message}`));
            });
            indexPromises.push(p);
          }
          Promise.all(indexPromises).then(() => resolve()).catch(reject);
        };
        saveEventRequest.onerror = () => {
          reject(new DatabaseError(`Failed to save event: ${saveEventRequest.error?.message}`));
        };
      });
    }
    /**
     * deletes an event from the store by its ID.
     * removes the event and all associated indexes.
     *
     * @param ids - hex-encoded event IDs to delete
     * @param followedBy - optional array of pubkeys that are following this event
     * @returns the number of events actually deleted, ignoring those that we couldn't find
     * @throws {DatabaseError} if deletion fails
     */
    async deleteEvents(ids) {
      if (!this._db) await this.init();
      const transaction = this._db.transaction([
        "events",
        "ids",
        "indexes"
      ], "readwrite");
      return this.deleteEventInternal(transaction, ids);
    }
    async deleteEventInternal(transaction, ids) {
      const eventStore = transaction.objectStore("events");
      const indexStore = transaction.objectStore("indexes");
      const serials = (await Promise.all(ids.map((id) => this.getSerial(transaction, id)))).filter((s) => s);
      const ops = [];
      for (let s = 0; s < serials.length; s++) {
        const serial2 = serials[s];
        const deletePromises = [];
        ops.push(new Promise((resolve, reject) => {
          const getEventRequest = eventStore.get(serial2);
          getEventRequest.onsuccess = () => {
            const eventData = getEventRequest.result;
            if (!eventData) {
              resolve(false);
              return;
            }
            const event = JSON.parse(eventData);
            for (const indexKey of getIndexKeysForEvent(event, serial2, [])) {
              deletePromises.push(new Promise((resolveDelete, rejectDelete) => {
                const deleteRequest = indexStore.delete(indexKey);
                deleteRequest.onsuccess = () => resolveDelete();
                deleteRequest.onerror = () => rejectDelete(new DatabaseError(`Failed to delete index: ${deleteRequest.error?.message}`));
              }));
            }
            deletePromises.push(new Promise((resolveDelete, rejectDelete) => {
              const deleteRequest = eventStore.delete(serial2);
              deleteRequest.onsuccess = () => resolveDelete();
              deleteRequest.onerror = () => rejectDelete(new DatabaseError(`Failed to delete event: ${deleteRequest.error?.message}`));
            }));
          };
          getEventRequest.onerror = () => {
            reject(new DatabaseError(`failed to get event for deletion: ${getEventRequest.error?.message}`));
          };
          Promise.all(deletePromises).then(() => resolve(true)).catch(reject);
        }));
      }
      ops.push(this.removeAllFollowers(transaction, serials).then(() => false));
      return Promise.all(ops).then((dels) => dels.filter((d) => d).length);
    }
    async getSerial(transaction, id) {
      const idKey = new Uint8Array(8);
      putHexAsBytes(idKey, 0, id, 8);
      const idStore = transaction.objectStore("ids");
      return new Promise((resolve) => {
        const req = idStore.get(idKey.buffer);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(void 0);
      });
    }
    /**
     * replaces an existing event with a new one, handling replaceable/addressable event logic.
     * i.e., matching same kind/author(/d-tag).
     * only stores the new event if it's newer than existing one.
     *
     * @param event - the replacement event
     * @param followedBy - optional array of pubkeys that are following this event
     * @returns boolean - true if the event was new, false if it was already saved
     * @throws {DatabaseError} if event values are out of bounds or storage fails
     */
    async replaceEvent(event, { seenOn: seenOn2, followedBy } = {}) {
      if (!this._db) await this.init();
      if (event.created_at > 4294967295 || event.kind > 65535) {
        throw new DatabaseError("event with values out of expected boundaries");
      }
      if (seenOn2) {
        ;
        event.seen_on = seenOn2;
      }
      const transaction = this._db.transaction([
        "events",
        "ids",
        "indexes"
      ], "readwrite", {
        durability: "relaxed"
      });
      const filter = {
        limit: 1,
        kinds: [
          event.kind
        ],
        authors: [
          event.pubkey
        ]
      };
      if (isAddressable(event.kind)) {
        filter["#d"] = [
          getDTag(event.tags)
        ];
      }
      let shouldStore = true;
      const promises = [];
      for await (let previous of this.queryInternal(transaction, filter, 10)) {
        if (isOlder(previous, event)) {
          promises.push(this.deleteEventInternal(transaction, [
            previous.id
          ]));
        } else {
          shouldStore = false;
        }
      }
      if (shouldStore) {
        promises.push(this.saveEventInternal(transaction, event, followedBy));
      }
      await Promise.all(promises);
      transaction.commit();
      return shouldStore;
    }
    /**
     * retrieves events by their IDs.
     * this is equivalent to passing a {ids: [...]} filter to queryEvents(), but slightly faster/simpler.
     *
     * @param ids - array of hex-encoded event IDs to fetch
     * @returns array of found events (may be shorter than input if some IDs not found)
     */
    async getByIds(ids) {
      if (!this._db) await this.init();
      const transaction = this._db.transaction([
        "events",
        "ids"
      ], "readonly");
      return this.getByIdsInternal(transaction, ids);
    }
    async getByIdsInternal(transaction, ids) {
      const idStore = transaction.objectStore("ids");
      const eventStore = transaction.objectStore("events");
      const idEventPromises = [];
      for (let i2 = 0; i2 < ids.length; i2++) {
        const id = ids[i2];
        idEventPromises.push(new Promise((resolve) => {
          const idKey = new Uint8Array(8);
          putHexAsBytes(idKey, 0, id, 8);
          const idReq = idStore.get(idKey.buffer);
          idReq.onsuccess = () => {
            const serial2 = idReq.result;
            if (serial2 === void 0) {
              resolve(null);
              return;
            }
            const getEventRequest = eventStore.get(serial2);
            getEventRequest.onsuccess = () => {
              const eventData = getEventRequest.result;
              if (!eventData) {
                resolve(null);
                return;
              }
              const event = JSON.parse(eventData);
              if ("seen_on" in event) {
                event[seenOnSymbol] = event.seen_on;
                delete event.seen_on;
              }
              event[isLocalSymbol] = true;
              resolve(event);
            };
            getEventRequest.onerror = () => {
              console.error(`failed to get event: ${getEventRequest.error?.message}`);
              resolve(null);
            };
          };
        }));
      }
      const idEventResults = await Promise.all(idEventPromises);
      return idEventResults.filter((evt) => !!evt);
    }
    /**
     * queries events using a nostr filter, any filters supported (except "search").
     * the actual limit of the query will be the minimum between the filter "limit" if it exists
     * and the maxLimit param.
     *
     * @param filter - nostr filter specification
     * @param maxLimit - maximum number of events to return (default: 500)
     * @yields events matching the filter criteria
     */
    async *queryEvents(filter, maxLimit = 500) {
      if (!this._db) await this.init();
      if (filter.search) {
        return;
      }
      const theoreticalLimit = getTheoreticalLimit(filter);
      if (theoreticalLimit === 0) {
        return;
      }
      const limit = Math.min(maxLimit, filter.limit || maxLimit, theoreticalLimit);
      if (filter.ids) {
        const transaction2 = this._db.transaction([
          "events",
          "ids"
        ], "readonly");
        yield* await this.getByIdsInternal(transaction2, filter.ids);
        return;
      }
      const transaction = this._db.transaction([
        "events",
        "indexes"
      ], "readonly");
      yield* this.queryInternal(transaction, filter, limit);
    }
    async *queryInternal(transaction, filter, limit) {
      const indexStore = transaction.objectStore("indexes");
      const eventStore = transaction.objectStore("events");
      const { queries, extraTagFilter, extraAuthorFilter, extraKindFilter } = prepareQueries(filter);
      const batchSize = Math.min(1e3, batchSizePerNumberOfQueries(limit, queries.length));
      await Promise.all(queries.map(async (query) => {
        const hasMore = await this.pull(indexStore, query, batchSize, query.results);
        if (!hasMore) {
          query.exhausted = true;
        }
      }));
      let emittedTotal = 0;
      const numberOfIteratorsToPullOnEachRound = Math.max(1, Math.ceil(queries.length / 2));
      const tempResults = new Array(batchSize * 2);
      const eventPromises = new Array(batchSize * 2);
      const pulls = new Array(numberOfIteratorsToPullOnEachRound);
      const toDelete = new Array(numberOfIteratorsToPullOnEachRound);
      while (queries.length > 0) {
        tempResults.length = 0;
        eventPromises.length = 0;
        pulls.length = 0;
        toDelete.length = 0;
        queries.sort((a, b) => (b.results[b.results.length - 1]?.ts || 0) - (a.results[a.results.length - 1]?.ts || 0));
        if (queries[0].results.length === 0) return;
        const threshold = queries[0].results[queries[0].results.length - 1].ts;
        for (let q = 0; q < queries.length; q++) {
          const query = queries[q];
          let hasSpliced = false;
          let cc = 0;
          for (let i2 = 0; i2 < query.results.length; i2++) {
            const result = query.results[i2];
            if (result.ts >= threshold) {
              tempResults.push(result);
              cc++;
            } else {
              query.results.splice(0, i2);
              hasSpliced = true;
              break;
            }
          }
          if (!hasSpliced) {
            query.results.length = 0;
            if (query.exhausted) {
              queries[q] = queries[queries.length - 1];
              queries.length = queries.length - 1;
              q--;
            }
          }
        }
        tempResults.sort((a, b) => b.ts - a.ts);
        eventPromises.length = tempResults.length;
        for (let i2 = 0; i2 < tempResults.length; i2++) {
          const serial2 = tempResults[i2].serial;
          eventPromises[i2] = new Promise((resolve) => {
            const getEventRequest = eventStore.get(serial2);
            getEventRequest.onsuccess = () => {
              const eventData = getEventRequest.result;
              if (!eventData) {
                console.error("tried to get event with serial", serial2, "but it did not exist");
                resolve(null);
                return;
              }
              const event = JSON.parse(eventData);
              if ("seen_on" in event) {
                event[seenOnSymbol] = event.seen_on;
                delete event.seen_on;
              }
              event[isLocalSymbol] = true;
              resolve(event);
            };
            getEventRequest.onerror = () => {
              console.error(`failed to get event: ${getEventRequest.error?.message}`);
              resolve(null);
            };
          });
        }
        let events = await Promise.all(eventPromises);
        for (let i2 = 0; i2 < events.length; i2++) {
          const evt = events[i2];
          if (!evt || !filterMatchesTags(extraTagFilter, evt) || extraAuthorFilter && !extraAuthorFilter.includes(evt.pubkey) || extraKindFilter && !extraKindFilter.includes(evt.kind)) {
            continue;
          }
          yield evt;
          emittedTotal++;
          if (emittedTotal >= limit) {
            return;
          }
        }
        pulls.length = numberOfIteratorsToPullOnEachRound;
        for (let q = 0; q < numberOfIteratorsToPullOnEachRound && q < queries.length; q++) {
          const query = queries[q];
          if (query.exhausted) {
            if (query.results.length === 0) {
              queries[q] = queries[queries.length - 1];
              if (queries.length - 1 < numberOfIteratorsToPullOnEachRound) {
                q--;
              }
              queries.length = queries.length - 1;
            }
            continue;
          }
          pulls[q] = this.pull(indexStore, query, batchSize, query.results).then((hasMore) => {
            if (!hasMore) {
              query.exhausted = true;
              if (query.results.length === 0) {
                toDelete.push(q);
              }
            }
          });
        }
        await Promise.all(pulls);
        for (let t = toDelete.length - 1; t >= 0; t--) {
          queries[toDelete[t]] = queries[queries.length - 1];
          queries.length--;
        }
      }
    }
    async pull(indexStore, query, batchSize, resultsInto) {
      let last = null;
      return new Promise((resolve) => {
        const range = IDBKeyRange.bound(query.startingPoint.buffer, query.endingPoint.buffer, true, true);
        let skipUntilLastFetched = !!query.lastFetched;
        const keysReq = indexStore.getAllKeys(range, batchSize);
        keysReq.onsuccess = async () => {
          for (let i2 = 0; i2 < keysReq.result.length; i2++) {
            const indexKey = keysReq.result[i2];
            const tsBytes = indexKey.slice(indexKey.byteLength - 8, indexKey.byteLength - 4);
            const ts = timestampFromInvertedBytes(tsBytes);
            last = tsBytes;
            const serial2 = new DataView(indexKey).getUint32(indexKey.byteLength - 4);
            if (skipUntilLastFetched) {
              if (serial2 === query.lastFetched) {
                skipUntilLastFetched = false;
              }
              continue;
            }
            query.lastFetched = serial2;
            resultsInto.push({
              ts,
              serial: serial2
            });
          }
          if (last) {
            query.startingPoint.set(new Uint8Array(last), query.startingPoint.length - 4 - 4);
          }
          resolve(
            // return true if we fetched the exact number that was requested, which means this is not exhausted
            keysReq.result.length === batchSize
          );
        };
      });
    }
    /**
     * marks all events of a pubkey as followed by another pubkey.
     * adds followedBy indexes for existing events if not already present.
     *
     * @param follower - the pubkey that is following
     * @param followed - the pubkey being followed
     */
    async markFollow(follower, followed) {
      if (!this._db) await this.init();
      const transaction = this._db.transaction([
        "events",
        "ids",
        "indexes"
      ], "readwrite");
      const filter = {
        authors: [
          followed
        ]
      };
      const ops = [];
      for await (const event of this.queryInternal(transaction, filter, Number.MAX_SAFE_INTEGER)) {
        const serial2 = await this.getSerial(transaction, event.id);
        if (serial2 === void 0) continue;
        const idx = new Uint8Array(4);
        idx[0] = serial2 >> 24 & 255;
        idx[1] = serial2 >> 16 & 255;
        idx[2] = serial2 >> 8 & 255;
        idx[3] = serial2 & 255;
        const tsBytes = invertedTimestampBytes(event.created_at);
        const key = new Uint8Array(1 + 8 + 4 + 4);
        key[0] = INDEX_FOLLOWED_PREFIX;
        putHexAsBytes(key, 1, follower, 8);
        key.set(tsBytes, 1 + 8);
        key.set(idx, 1 + 8 + 4);
        const indexStore = transaction.objectStore("indexes");
        const req = indexStore.put(null, key.buffer);
        ops.push(new Promise((resolve) => {
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
        }));
      }
      await Promise.all(ops);
      transaction.commit();
    }
    /**
     * removes followedBy indexes for all events of a pubkey followed by another pubkey.
     *
     * @param follower - the pubkey that is unfollowing
     * @param followed - the pubkey being unfollowed
     */
    async markUnfollow(follower, followed) {
      if (!this._db) await this.init();
      const transaction = this._db.transaction([
        "events",
        "ids",
        "indexes"
      ], "readwrite");
      const filter = {
        authors: [
          followed
        ],
        followedBy: follower
      };
      const keysToDelete = [];
      for await (const event of this.queryInternal(transaction, filter, Number.MAX_SAFE_INTEGER)) {
        const serial2 = await this.getSerial(transaction, event.id);
        if (serial2 === void 0) continue;
        const idx = new Uint8Array(4);
        idx[0] = serial2 >> 24 & 255;
        idx[1] = serial2 >> 16 & 255;
        idx[2] = serial2 >> 8 & 255;
        idx[3] = serial2 & 255;
        const tsBytes = invertedTimestampBytes(event.created_at);
        const key = new Uint8Array(1 + 8 + 4 + 4);
        key[0] = INDEX_FOLLOWED_PREFIX;
        putHexAsBytes(key, 1, follower, 8);
        key.set(tsBytes, 1 + 8);
        key.set(idx, 1 + 8 + 4);
        keysToDelete.push(key);
      }
      const indexStore = transaction.objectStore("indexes");
      await Promise.all(keysToDelete.map((key) => {
        const req = indexStore.delete(key.buffer);
        return new Promise((resolve, reject) => {
          req.onsuccess = () => resolve();
          req.onerror = () => reject(new Error(`failed to delete followedBy index ${key} for ${follower} => ${followed}`));
        });
      }));
      transaction.commit();
    }
    async removeAllFollowers(transaction, serials) {
      if (!this._db) await this.init();
      const indexStore = transaction.objectStore("indexes");
      const startingPoint = new Uint8Array(1);
      startingPoint[0] = INDEX_FOLLOWED_PREFIX;
      const endingPoint = new Uint8Array(1);
      endingPoint[0] = INDEX_FOLLOWED_PREFIX + 1;
      const range = IDBKeyRange.bound(startingPoint.buffer, endingPoint.buffer);
      const keysReq = indexStore.getAllKeys(range);
      const ops = [];
      await new Promise((resolve, reject) => {
        keysReq.onsuccess = async () => {
          for (const keyBuffer of keysReq.result) {
            const serial2 = new DataView(keyBuffer).getUint32(keyBuffer.byteLength - 4);
            if (serials.includes(serial2)) {
              const req = indexStore.delete(keyBuffer);
              ops.push(new Promise((resolveDelete, rejectDelete) => {
                req.onsuccess = () => resolveDelete();
                req.onerror = () => rejectDelete(new Error(`failed to delete followedBy index ${keyBuffer}`));
              }));
            }
          }
          try {
            await Promise.all(ops);
            transaction.commit();
            resolve();
          } catch (err) {
            reject(err);
            transaction.abort();
          }
        };
        keysReq.onerror = () => reject(new Error("failed to fetch followedBy keys"));
      });
    }
    /**
     * cleans followedBy indexes for events followed by a specific pubkey.
     * fetches all events followed by the given pubkey, calls the predicate function on each,
     * and deletes the followedBy index if the predicate returns false or if the pointed event doesn't exist.
     *
     * @param followedBy - the pubkey whose followed events to clean
     * @param shouldKeep - function that takes an event and returns false if the followed index should be deleted
     */
    async cleanFollowed(followedBy, shouldKeep) {
      if (!this._db) await this.init();
      const transaction = this._db.transaction([
        "events",
        "indexes"
      ], "readwrite");
      const indexStore = transaction.objectStore("indexes");
      const eventStore = transaction.objectStore("events");
      const startingPoint = new Uint8Array(1 + 8 + 4 + 4);
      startingPoint[0] = INDEX_FOLLOWED_PREFIX;
      putHexAsBytes(startingPoint, 1, followedBy, 8);
      startingPoint.fill(0, 1 + 8);
      const endingPoint = startingPoint.slice();
      endingPoint.fill(255, 1 + 8);
      const range = IDBKeyRange.bound(startingPoint.buffer, endingPoint.buffer);
      const keysReq = indexStore.getAllKeys(range);
      const ops = [];
      await new Promise((topResolve, topReject) => {
        keysReq.onsuccess = async () => {
          const eventPromises = [];
          const keyBuffers = [];
          for (const keyBuffer of keysReq.result) {
            keyBuffers.push(keyBuffer);
            const serial2 = new DataView(keyBuffer).getUint32(keyBuffer.byteLength - 4);
            eventPromises.push(new Promise((resolve) => {
              const getEventRequest = eventStore.get(serial2);
              getEventRequest.onsuccess = () => {
                const eventData = getEventRequest.result;
                if (!eventData) {
                  resolve(null);
                  return;
                }
                const event = JSON.parse(eventData);
                resolve(event);
              };
              getEventRequest.onerror = () => resolve(null);
            }));
          }
          const events = await Promise.all(eventPromises);
          for (let i2 = 0; i2 < events.length; i2++) {
            const event = events[i2];
            if (event && shouldKeep(event)) continue;
            const req = indexStore.delete(keyBuffers[i2]);
            ops.push(new Promise((resolve, reject) => {
              req.onsuccess = () => resolve();
              req.onerror = () => reject(new Error(`failed to delete followedBy entry ${keyBuffers[i2]} for ${event}`));
            }));
          }
          try {
            await Promise.all(ops);
            transaction.commit();
            topResolve();
          } catch (err) {
            topReject(err);
            transaction.abort();
            return;
          }
        };
        keysReq.onerror = () => topReject(new Error("failed to fetch keys"));
      });
    }
  };
  function getTagIndexPrefix(tagLetter, tagValue) {
    let key;
    let offset;
    try {
      const { kind, pk, d } = getAddrTagElements(tagValue);
      key = new Uint8Array(1 + 1 + 2 + 8 + d.length + 4 + 4);
      key[0] = INDEX_TAG_ADDR_PREFIX;
      key[1] = tagLetter.charCodeAt(0) % 256;
      key[2] = kind >> 8 & 255;
      key[3] = kind & 255;
      putHexAsBytes(key, 1 + 1 + 2, pk, 8);
      const encoder = new TextEncoder();
      const dBytes = encoder.encode(d);
      key.set(dBytes, 1 + 1 + 2 + 8);
      offset = 1 + 1 + 2 + 8 + d.length;
      return [
        key,
        offset
      ];
    } catch {
      try {
        key = new Uint8Array(1 + 1 + 8 + 4 + 4);
        key[0] = INDEX_TAG32_PREFIX;
        key[1] = tagLetter.charCodeAt(0) % 256;
        putHexAsBytes(key, 1 + 1, tagValue, 8);
        offset = 1 + 1 + 8;
        return [
          key,
          offset
        ];
      } catch {
        const encoder = new TextEncoder();
        const valueBytes = encoder.encode(tagValue);
        key = new Uint8Array(1 + 1 + valueBytes.length + 4 + 4);
        key[0] = INDEX_TAG_PREFIX;
        key[1] = tagLetter.charCodeAt(0) % 256;
        key.set(valueBytes, 1 + 1);
        offset = 1 + 1 + valueBytes.length;
        return [
          key,
          offset
        ];
      }
    }
  }
  function* getIndexKeysForEvent(event, serialOrIdx, followedBy) {
    let idx;
    if (typeof serialOrIdx === "object") {
      idx = serialOrIdx;
    } else {
      idx = new Uint8Array(4);
      idx[0] = serialOrIdx >> 24 & 255;
      idx[1] = serialOrIdx >> 16 & 255;
      idx[2] = serialOrIdx >> 8 & 255;
      idx[3] = serialOrIdx & 255;
    }
    const tsBytes = invertedTimestampBytes(event.created_at);
    {
      const key = new Uint8Array(1 + 4 + 4);
      key[0] = INDEX_CREATED_AT_PREFIX;
      key.set(tsBytes, 1);
      key.set(idx, 1 + 4);
      yield key;
    }
    {
      const key = new Uint8Array(1 + 2 + 4 + 4);
      key[0] = INDEX_KIND_PREFIX;
      key[1] = event.kind >> 8 & 255;
      key[2] = event.kind & 255;
      key.set(tsBytes, 1 + 2);
      key.set(idx, 1 + 2 + 4);
      yield key;
    }
    {
      const key = new Uint8Array(1 + 8 + 4 + 4);
      key[0] = INDEX_PUBKEY_PREFIX;
      putHexAsBytes(key, 1, event.pubkey, 8);
      key.set(tsBytes, 1 + 8);
      key.set(idx, 1 + 8 + 4);
      yield key;
    }
    {
      const key = new Uint8Array(1 + 8 + 2 + 4 + 4);
      key[0] = INDEX_PUBKEY_KIND_PREFIX;
      putHexAsBytes(key, 1, event.pubkey, 8);
      key[9] = event.kind >> 8 & 255;
      key[10] = event.kind & 255;
      key.set(tsBytes, 1 + 8 + 2);
      key.set(idx, 1 + 8 + 2 + 4);
      yield key;
    }
    const seenTagValues = /* @__PURE__ */ new Set();
    for (const tag of event.tags) {
      if (tag[0].length !== 1 || !tag[1] || tag[1].length > 100) {
        continue;
      }
      if (seenTagValues.has(tag[1])) {
        continue;
      }
      seenTagValues.add(tag[1]);
      const [key, offset] = getTagIndexPrefix(tag[0], tag[1]);
      key.set(tsBytes, offset);
      key.set(idx, offset + 4);
      yield key;
    }
    if (followedBy) {
      for (const follower of followedBy) {
        const key = new Uint8Array(1 + 8 + 4 + 4);
        key[0] = INDEX_FOLLOWED_PREFIX;
        putHexAsBytes(key, 1, follower, 8);
        key.set(tsBytes, 1 + 8);
        key.set(idx, 1 + 8 + 4);
        yield key;
      }
    }
  }
  function getAddrTagElements(tagValue) {
    const parts = tagValue.split(":");
    if (parts.length <= 3) {
      const kind = parseInt(parts[0], 10);
      const pk = parts[1];
      const d = parts.slice(2).join(":");
      if (!isNaN(kind) && pk.length === 64) {
        return {
          kind,
          pk,
          d
        };
      }
    }
    throw "invalid addressable tag";
  }
  function filterMatchesTags(tagFilter, event) {
    for (const [tagName, values] of tagFilter) {
      if (values && values.length > 0) {
        const hasMatchingTag = event.tags.some((tag) => tag.length >= 2 && tag[0] === tagName && values.includes(tag[1]));
        if (!hasMatchingTag) {
          return false;
        }
      }
    }
    return true;
  }
  function isOlder(a, b) {
    return a.created_at < b.created_at;
  }
  function getTheoreticalLimit(filter) {
    if (filter.ids) return filter.ids.length;
    if (filter.until && filter.since && filter.until < filter.since) return 0;
    if (filter.authors !== void 0 && filter.kinds !== void 0) {
      const allAreReplaceable = filter.kinds.every(isReplaceableKind);
      if (allAreReplaceable) {
        return filter.authors.length * filter.kinds.length;
      }
      if (filter["#d"]?.length) {
        const allAreAddressable = filter.kinds.every(isAddressable);
        if (allAreAddressable) {
          return filter.authors.length * filter.kinds.length * filter["#d"].length;
        }
      }
    }
    return Number.MAX_SAFE_INTEGER;
  }
  function isAddressable(kind) {
    return kind >= 3e4 && kind < 4e4 || kind === 0 || kind === 3;
  }
  function getDTag(tags) {
    const dTag = tags.find((tag) => tag.length >= 2 && tag[0] === "d");
    return dTag?.[1] || "";
  }
  function prepareQueries(filter) {
    const queries = [];
    const extraTagFilter = [];
    let extraAuthorFilter = null;
    let extraKindFilter = null;
    const timestampStartingPoint = invertedTimestampBytes(filter.until || 4294967295);
    const timestampEndingPoint = invertedTimestampBytes(filter.since || 0);
    const highPriority = [
      "q",
      "e",
      "E",
      "i",
      "I",
      "a",
      "A",
      "g",
      "r"
    ];
    {
      let bestPrio = 100;
      let bestIndex = -1;
      for (let tagName in filter) {
        if (tagName[0] !== "#" || tagName.length !== 2) continue;
        extraTagFilter.push([
          tagName[1],
          filter[tagName]
        ]);
        let prio = highPriority.indexOf(tagName[1]);
        if (prio >= 0 && prio < bestPrio) {
          bestPrio = prio;
          bestIndex = extraTagFilter.length - 1;
        }
      }
      if (bestIndex >= 0) {
        let [tagLetter, tagValues] = extraTagFilter[bestIndex];
        for (const value of tagValues) {
          const [startingPoint2, offset] = getTagIndexPrefix(tagLetter, value);
          startingPoint2.set(timestampStartingPoint, offset);
          startingPoint2.fill(0, offset + 4);
          const endingPoint2 = startingPoint2.slice();
          endingPoint2.set(timestampEndingPoint, offset);
          endingPoint2.fill(255, offset + 4);
          queries.push({
            startingPoint: startingPoint2,
            endingPoint: endingPoint2,
            exhausted: false,
            results: []
          });
        }
        extraTagFilter[bestIndex] = extraTagFilter[extraTagFilter.length - 1];
        extraTagFilter.pop();
        extraAuthorFilter = filter.authors || null;
        extraKindFilter = filter.kinds || null;
        return {
          queries,
          extraTagFilter,
          extraAuthorFilter,
          extraKindFilter
        };
      }
    }
    if (filter.followedBy) {
      const startingPoint2 = new Uint8Array(1 + 8 + 4 + 4);
      startingPoint2[0] = INDEX_FOLLOWED_PREFIX;
      putHexAsBytes(startingPoint2, 1, filter.followedBy, 8);
      startingPoint2.set(timestampStartingPoint, 1 + 8);
      startingPoint2.fill(0, 1 + 8 + 4);
      const endingPoint2 = startingPoint2.slice();
      endingPoint2.set(timestampEndingPoint, 1 + 8);
      endingPoint2.fill(255, 1 + 8 + 4);
      queries.push({
        startingPoint: startingPoint2,
        endingPoint: endingPoint2,
        exhausted: false,
        results: []
      });
      extraAuthorFilter = filter.authors || null;
      extraKindFilter = filter.kinds || null;
      return {
        queries,
        extraTagFilter,
        extraAuthorFilter,
        extraKindFilter
      };
    }
    if (filter.authors && filter.authors.length > 0) {
      if (filter.kinds && filter.kinds.length > 0) {
        if (filter.kinds.length < 8) {
          for (let author of filter.authors) {
            const authorBytes = hexToBytes2(author.substring(0, 16));
            for (const kind of filter.kinds) {
              const startingPoint2 = new Uint8Array(1 + 8 + 2 + 4 + 4);
              startingPoint2[0] = INDEX_PUBKEY_KIND_PREFIX;
              startingPoint2.set(authorBytes, 1);
              startingPoint2[9] = kind >> 8 & 255;
              startingPoint2[10] = kind & 255;
              startingPoint2.set(timestampStartingPoint, 1 + 8 + 2);
              startingPoint2.fill(0, 1 + 8 + 2 + 4);
              const endingPoint2 = startingPoint2.slice();
              endingPoint2.set(timestampEndingPoint, 1 + 8 + 2);
              endingPoint2.fill(255, 1 + 8 + 2 + 4);
              queries.push({
                startingPoint: startingPoint2,
                endingPoint: endingPoint2,
                exhausted: false,
                results: []
              });
            }
          }
          return {
            queries,
            extraTagFilter,
            extraAuthorFilter,
            extraKindFilter
          };
        } else {
          extraKindFilter = filter.kinds;
        }
      }
      for (const author of filter.authors) {
        const startingPoint2 = new Uint8Array(1 + 8 + 4 + 4);
        startingPoint2[0] = INDEX_PUBKEY_PREFIX;
        putHexAsBytes(startingPoint2, 1, author, 8);
        startingPoint2.set(timestampStartingPoint, 1 + 8);
        startingPoint2.fill(0, 1 + 8 + 4);
        const endingPoint2 = startingPoint2.slice();
        endingPoint2.set(timestampEndingPoint, 1 + 8);
        endingPoint2.fill(255, 1 + 8 + 4);
        queries.push({
          startingPoint: startingPoint2,
          endingPoint: endingPoint2,
          exhausted: false,
          results: []
        });
      }
      return {
        queries,
        extraTagFilter,
        extraAuthorFilter,
        extraKindFilter
      };
    }
    if (filter.kinds && filter.kinds.length > 0) {
      for (const kind of filter.kinds) {
        const startingPoint2 = new Uint8Array(1 + 2 + 4 + 4);
        startingPoint2[0] = INDEX_KIND_PREFIX;
        startingPoint2[1] = kind >> 8 & 255;
        startingPoint2[2] = kind & 255;
        startingPoint2.set(timestampStartingPoint, 1 + 2);
        startingPoint2.fill(0, 1 + 2 + 4);
        const endingPoint2 = startingPoint2.slice();
        endingPoint2.set(timestampEndingPoint, 1 + 2);
        endingPoint2.fill(255, 1 + 2 + 4);
        queries.push({
          startingPoint: startingPoint2,
          endingPoint: endingPoint2,
          exhausted: false,
          results: []
        });
      }
      return {
        queries,
        extraTagFilter,
        extraAuthorFilter,
        extraKindFilter
      };
    }
    {
      for (let i2 = 0; i2 < extraTagFilter.length; i2++) {
        let [tagLetter, tagValues] = extraTagFilter[i2];
        for (let value of tagValues) {
          const [startingPoint2, offset] = getTagIndexPrefix(tagLetter, value);
          startingPoint2.set(timestampStartingPoint, offset);
          startingPoint2.fill(0, offset + 4);
          const endingPoint2 = startingPoint2.slice();
          endingPoint2.set(timestampEndingPoint, offset);
          endingPoint2.fill(255, offset + 4);
          queries.push({
            startingPoint: startingPoint2,
            endingPoint: endingPoint2,
            exhausted: false,
            results: []
          });
        }
        extraTagFilter[i2] = extraTagFilter[extraTagFilter.length - 1];
        extraTagFilter.pop();
        return {
          queries,
          extraTagFilter,
          extraAuthorFilter,
          extraKindFilter
        };
      }
    }
    const startingPoint = new Uint8Array(1 + 4 + 4);
    startingPoint[0] = INDEX_CREATED_AT_PREFIX;
    startingPoint.set(timestampStartingPoint, 1);
    startingPoint.fill(0, 1 + 4);
    const endingPoint = startingPoint.slice();
    endingPoint.set(timestampEndingPoint, 1);
    endingPoint.fill(255, 1 + 4);
    queries.push({
      startingPoint,
      endingPoint,
      exhausted: false,
      results: []
    });
    return {
      queries,
      extraTagFilter,
      extraAuthorFilter,
      extraKindFilter
    };
  }
  function batchSizePerNumberOfQueries(totalFilterLimit, numberOfQueries) {
    if (totalFilterLimit <= 10) return totalFilterLimit;
    if (numberOfQueries <= 2) return totalFilterLimit;
    return Math.ceil(Math.pow(totalFilterLimit, 0.8) / Math.pow(numberOfQueries, 0.11));
  }
  function putHexAsBytes(target, offset, hex2, bytesToWrite) {
    for (let i2 = 0; i2 < bytesToWrite; i2++) {
      const j = i2 * 2;
      const byte = Number.parseInt(hex2.substring(j, j + 2), 16);
      target[offset + i2] = byte;
    }
  }
  function invertedTimestampBytes(created_at) {
    const invertedTimestamp = 4294967295 - created_at;
    const tsBytes = new Uint8Array(4);
    tsBytes[0] = invertedTimestamp >> 24 & 255;
    tsBytes[1] = invertedTimestamp >> 16 & 255;
    tsBytes[2] = invertedTimestamp >> 8 & 255;
    tsBytes[3] = invertedTimestamp & 255;
    return tsBytes;
  }
  function timestampFromInvertedBytes(tsBytes) {
    const invertedTimestamp = new DataView(tsBytes).getUint32(0);
    const created_at = 4294967295 - invertedTimestamp;
    return created_at;
  }
  var isLocalSymbol = /* @__PURE__ */ Symbol("this event is stored locally");
  var seenOnSymbol = /* @__PURE__ */ Symbol("relays where this event was seen before stored");
  function isLocal(event) {
    return event[isLocalSymbol] || false;
  }
  function seenOn(event) {
    return event[seenOnSymbol] || [];
  }

  // node_modules/@nostr/gadgets/wot.js
  var wot_exports = {};
  __export(wot_exports, {
    globalism: () => globalism,
    loadWoT: () => loadWoT
  });
  var store;
  async function loadWoT(pubkey) {
    if (!store) store = createStore(`@nostr/gadgets/wot`, "cache");
    const now = Date.now() / 1e3;
    let res = await get(`${pubkey}`, store);
    if (!res || res.lastAttempt < now - 60 * 60 * 24 * 5 || res.lastAttempt < now * 60 * 60 * 12 && res.pubkeys.length < 5) {
      const fl = await loadFollowsList(pubkey).then((fl2) => fl2.items);
      const mutes = await loadMuteList(pubkey).then((fl2) => fl2.items.filter((m) => m.label === "pubkey").map((m) => m.value));
      return Promise.all(fl.map((f) => loadFollowsList(f).then((fl2) => fl2.items))).then((ffln) => {
        const wot = /* @__PURE__ */ new Set();
        for (let i2 = 0; i2 < ffln.length; i2++) {
          for (let j = 0; j < ffln[i2].length; j++) {
            const pk = ffln[i2][j];
            if (!wot.has(pk) && mutes.indexOf(pk) === -1) {
              wot.add(pk);
            }
          }
        }
        set(`${pubkey}`, {
          pubkeys: Array.from(wot),
          lastAttempt: now
        }, store);
        return wot;
      });
    } else {
      return new Set(res.pubkeys);
    }
  }
  async function globalism(pubkeys) {
    const list = [];
    const rls = await Promise.all(pubkeys.map((pk) => loadRelayList(pk)));
    for (let i2 = 0; i2 < rls.length; i2++) {
      for (let j = 0; j < rls[i2].items.length; j++) {
        try {
          const relay = normalizeURL(rls[i2].items[j].url);
          let curr = list.find((rs) => rs[1] === relay);
          if (!curr) {
            curr = [
              0,
              relay
            ];
            list.push(curr);
          }
          curr[0] += 20 / rls[i2].items.length;
        } catch (_err) {
        }
      }
    }
    list.sort(([a], [b]) => b - a);
    return list.map((rs) => rs[1]);
  }

  // node_modules/@nostr/gadgets/outbox.js
  var outbox_exports = {};
  __export(outbox_exports, {
    OutboxManager: () => OutboxManager,
    outboxFilterRelayBatch: () => outboxFilterRelayBatch
  });

  // node_modules/@jsr/henrygd__semaphore/index.js
  var semaphoreMap = /* @__PURE__ */ new Map();
  var getSemaphore = (key = /* @__PURE__ */ Symbol(), concurrency = 1) => {
    if (semaphoreMap.has(key)) {
      return semaphoreMap.get(key);
    }
    let size = 0;
    let head;
    let tail;
    let createPromise = (res) => {
      if (head) {
        tail = tail.next = {
          res
        };
      } else {
        tail = head = {
          res
        };
      }
    };
    let semaphore = {
      acquire: () => {
        if (++size <= concurrency) {
          return Promise.resolve();
        }
        return new Promise(createPromise);
      },
      release() {
        head?.res();
        head = head?.next;
        if (size && !--size) {
          semaphoreMap.delete(key);
        }
      },
      size: () => size
    };
    semaphoreMap.set(key, semaphore);
    return semaphore;
  };

  // node_modules/@nostr/gadgets/outbox.js
  var OutboxManager = class {
    constructor(baseFilters, opts) {
      __publicField(this, "store");
      __publicField(this, "baseFilters");
      __publicField(this, "bounds");
      __publicField(this, "boundsPromise");
      __publicField(this, "pool");
      __publicField(this, "label");
      __publicField(this, "currentlySyncing", /* @__PURE__ */ new Map());
      __publicField(this, "permanentlyLive", /* @__PURE__ */ new Set());
      __publicField(this, "nuclearAbort", new AbortController());
      __publicField(this, "defaultRelaysForConfusedPeople", BIG_RELAYS_DO_NOT_USE_EVER);
      __publicField(this, "storeRelaysSeenOn", false);
      __publicField(this, "onliveupdate");
      __publicField(this, "onsyncupdate");
      __publicField(this, "onbeforeupdate");
      __publicField(this, "ondeletions");
      __publicField(this, "authorIsFollowedBy");
      this.baseFilters = baseFilters;
      this.store = opts?.store || new IDBEventStore();
      this.bounds = {};
      this.boundsPromise = this.getBounds();
      this.pool = opts?.pool || pool;
      this.label = opts?.label || "outbox";
      this.onliveupdate = opts?.onliveupdate;
      this.onsyncupdate = opts?.onsyncupdate;
      this.onbeforeupdate = opts?.onbeforeupdate;
      this.ondeletions = opts?.ondeletions;
      this.defaultRelaysForConfusedPeople = opts?.defaultRelaysForConfusedPeople || this.defaultRelaysForConfusedPeople;
      this.storeRelaysSeenOn = opts?.storeRelaysSeenOn || false;
      this.authorIsFollowedBy = opts?.authorIsFollowedBy;
    }
    close() {
      this.nuclearAbort.abort("<OutboxManager closed>");
    }
    async ensureBoundsLoaded() {
      if (this.boundsPromise) {
        this.bounds = await this.boundsPromise;
        this.boundsPromise = null;
      }
    }
    markSyncing(authors) {
      for (let i2 = 0; i2 < authors.length; i2++) {
        this.currentlySyncing.set(authors[i2], () => {
        });
      }
    }
    /**
     * Marks a specific public key as not syncing anymore and execute any callbacks that
     * may have registered for that.
     */
    finishSyncing(pubkey) {
      const fn = this.currentlySyncing.get(pubkey);
      this.currentlySyncing.delete(pubkey);
      fn?.();
    }
    /**
     * Returns a promise that is resolved when this pubkey has finished syncing entirely.
     */
    async waitForSyncingToFinish(pubkey) {
      const prev = this.currentlySyncing.get(pubkey);
      if (prev) {
        await new Promise((resolve) => {
          this.currentlySyncing.set(pubkey, () => {
            prev();
            resolve();
          });
        });
        return this.waitForSyncingToFinish(pubkey);
      }
    }
    /**
     * Returns if a public key is synced up to at least 2 hours ago, which means it
     * can be dealt with by just calling .live().
     */
    async isSynced(pubkey) {
      await this.ensureBoundsLoaded();
      const bound = this.bounds[pubkey];
      const newest = bound ? bound[1] : void 0;
      const now = Math.round(Date.now() / 1e3);
      return Boolean(newest && newest > now - 60 * 60 * 2);
    }
    /**
     * Returns true if new notes were discovered during the sync.
     */
    async sync(authors, opts) {
      await this.ensureBoundsLoaded();
      for (let i2 = authors.length - 1; i2 >= 0; i2--) {
        if (this.currentlySyncing.has(authors[i2])) {
          authors[i2] = authors[authors.length - 1];
          authors.length = authors.length - 1;
        }
      }
      if (authors.length === 0) return false;
      this.markSyncing(authors);
      shuffle(authors);
      console.debug("starting sync", authors);
      let addedNewEventsOnSync = false;
      const now = Math.round(Date.now() / 1e3);
      const promises = [];
      for (let i2 = 0; i2 < authors.length; i2++) {
        if (this.nuclearAbort.signal.aborted || opts.signal.aborted) break;
        let pubkey = authors[i2];
        let bound = this.bounds[pubkey];
        let newest = bound ? bound[1] : void 0;
        if (newest && newest > now - 60 * 60 * 2) {
          console.debug(`${i2 + 1}/${authors.length} skip`, pubkey, "synced up to", new Date(newest * 1e3).toLocaleString(), "already");
          this.finishSyncing(pubkey);
          continue;
        }
        console.debug(`${i2 + 1}/${authors.length} syncing`, pubkey);
        const sem = getSemaphore("outbox-sync", 16 / this.baseFilters.length);
        promises.push(sem.acquire().then(async () => {
          if (this.nuclearAbort.signal.aborted || opts.signal.aborted) {
            this.finishSyncing(pubkey);
            sem.release();
            return;
          }
          let relays = (await loadRelayList(pubkey)).items.filter((r) => r.write).slice(0, 4).map((r) => r.url);
          if (relays.length === 0) {
            relays = this.defaultRelaysForConfusedPeople;
          }
          if (this.nuclearAbort.signal.aborted || opts.signal.aborted) {
            this.finishSyncing(pubkey);
            sem.release();
            return;
          }
          let events;
          try {
            events = (await Promise.race([
              new Promise((_, reject) => setTimeout(() => reject(new Error("<timeout>")), 45e3)),
              Promise.all(this.baseFilters.map((f) => this.pool.querySync(relays, {
                ...f,
                authors: [
                  pubkey
                ],
                since: newest,
                limit: 200
              }), {
                label: `sync-${pubkey.substring(0, 6)}`,
                maxWait: 4e3
              }))
            ])).flat();
          } catch (err) {
            console.warn("failed to query events for", pubkey, "at", relays, "=>", err);
            return;
          }
          if (this.nuclearAbort.signal.aborted || opts.signal.aborted) {
            this.finishSyncing(pubkey);
            sem.release();
            return;
          }
          console.debug(`${i2 + 1}/${authors.length} events downloaded`, pubkey, relays, "newest:", newest ? new Date(newest * 1e3).toLocaleString() : newest, `got ${events.length} events`, events);
          let added = await Promise.all(events.map(async (event) => {
            const deletion = event.kind === EventDeletion;
            const isNew = await (isRegularKind(event.kind) ? this.store.saveEvent : this.store.replaceEvent).call(this.store, event, {
              seenOn: this.storeRelaysSeenOn ? Array.from(this.pool.seenOn.get(event.id) || []).map((relay) => relay.url) : void 0,
              followedBy: deletion ? this.authorIsFollowedBy?.(event.pubkey) : void 0
            });
            if (isNew && deletion) {
              this.performDeletions(event);
            }
            return isNew;
          }));
          if (!addedNewEventsOnSync) {
            addedNewEventsOnSync = added.indexOf(true) !== -1;
          }
          if (bound) {
            bound[1] = now;
          } else if (events.length) {
            bound = [
              events[events.length - 1].created_at,
              now
            ];
          } else {
            bound = [
              now - 1,
              now
            ];
          }
          this.bounds[pubkey] = bound;
          await this.setBound(pubkey, bound);
          this.finishSyncing(pubkey);
          this.onsyncupdate?.(pubkey);
          sem.release();
        }));
      }
      await Promise.all(promises);
      console.debug("sync done");
      return addedNewEventsOnSync;
    }
    async live(authors, opts) {
      await this.ensureBoundsLoaded();
      for (let i2 = 0; i2 < authors.length; i2++) {
        const author = authors[i2];
        if (this.permanentlyLive.has(author)) {
          authors[i2] = authors[authors.length - 1];
          authors.length = authors.length - 1;
          i2--;
        } else if (opts.signal === void 0) {
          this.permanentlyLive.add(author);
        }
      }
      if (authors.length === 0) return;
      await Promise.all(authors.map((author) => this.waitForSyncingToFinish(author)));
      console.debug("listening live", authors);
      const declaration = await outboxFilterRelayBatch(authors, ...this.baseFilters.map((f) => ({
        ...f,
        since: Math.round(Date.now() / 1e3) - 60 * 60 * 2
      })));
      const closer = this.pool.subscribeMap(declaration, {
        label: `live-${this.label}`,
        onevent: async (event) => {
          const deletion = event.kind === EventDeletion;
          const isNew = await (isRegularKind(event.kind) ? this.store.saveEvent : this.store.replaceEvent).call(this.store, event, {
            seenOn: this.storeRelaysSeenOn ? Array.from(this.pool.seenOn.get(event.id) || []).map((relay) => relay.url) : void 0,
            followedBy: deletion ? this.authorIsFollowedBy?.(event.pubkey) : void 0
          });
          if (isNew && deletion) {
            this.performDeletions(event);
          }
          if (isNew) {
            this.bounds[event.pubkey][1] = Math.round(Date.now() / 1e3);
            await this.setBound(event.pubkey, this.bounds[event.pubkey]);
            this.onliveupdate?.(event);
          }
        }
      });
      if (opts.signal) {
        opts.signal.onabort = () => {
          closer.close();
        };
      }
      this.nuclearAbort.signal.onabort = () => {
        closer.close();
      };
    }
    async before(authors, ts, opts) {
      await this.ensureBoundsLoaded();
      await Promise.all(authors.map((author) => this.waitForSyncingToFinish(author)));
      this.markSyncing(authors);
      shuffle(authors);
      for (let i2 = 0; i2 < authors.length; i2++) {
        if (this.nuclearAbort.signal.aborted || opts.signal.aborted) break;
        let pubkey = authors[i2];
        const sem = getSemaphore("outbox-sync", 15);
        await sem.acquire().then(async () => {
          if (this.nuclearAbort.signal.aborted || opts.signal.aborted) {
            sem.release();
            return;
          }
          let bound = this.bounds[pubkey];
          if (!bound) {
            console.error("pagination on pubkey without a bound", pubkey);
            sem.release();
            return;
          }
          let oldest = bound ? bound[0] : void 0;
          if (oldest && oldest < ts) {
            sem.release();
            return;
          }
          let relays = (await loadRelayList(pubkey)).items.filter((r) => r.write).slice(0, 4).map((r) => r.url);
          if (this.nuclearAbort.signal.aborted || opts.signal.aborted) {
            sem.release();
            return;
          }
          let events;
          try {
            events = (await Promise.race([
              new Promise((_, rej) => setTimeout(rej, 5e3)),
              Promise.all(this.baseFilters.map((f) => this.pool.querySync(relays, {
                ...f,
                authors: [
                  pubkey
                ],
                until: oldest,
                limit: 200
              }, {
                label: `page-${pubkey.substring(0, 6)}`
              })))
            ])).flat();
          } catch (err) {
            console.warn("failed to query before events for", pubkey, "at", relays, "=>", err);
            return;
          }
          console.debug("paginating to the past", pubkey, relays, oldest, events);
          await Promise.all(events.map(async (event) => {
            const deletion = event.kind === EventDeletion;
            const isNew = await (isRegularKind(event.kind) ? this.store.saveEvent : this.store.replaceEvent).call(this.store, event, {
              seenOn: this.storeRelaysSeenOn ? Array.from(this.pool.seenOn.get(event.id) || []).map((relay) => relay.url) : void 0,
              followedBy: deletion ? this.authorIsFollowedBy?.(event.pubkey) : void 0
            });
            if (isNew && deletion) {
              this.performDeletions(event);
            }
            return isNew;
          }));
          if (events.length) {
            bound[0] = events[events.length - 1].created_at;
          }
          this.bounds[pubkey] = bound;
          await this.setBound(pubkey, bound);
          this.finishSyncing(pubkey);
          this.onbeforeupdate?.(pubkey);
          sem.release();
        });
      }
      console.debug("before done");
    }
    /**
     * retrieves bounds from the syncing store.
     */
    async getBounds() {
      if (!this.store._db) await this.store.init();
      return new Promise((resolve, reject) => {
        const transaction = this.store._db.transaction([
          "syncing"
        ], "readonly");
        const store2 = transaction.objectStore("syncing");
        const keys = store2.getAllKeys();
        const values = store2.getAll();
        const result = [];
        let doneFirst = [
          false,
          0
        ];
        keys.onsuccess = () => {
          let i2 = 0;
          if (doneFirst[0]) {
            for (const item of keys.result) {
              result[i2][0] = item;
              i2++;
            }
            if (doneFirst[1] === i2) {
              resolve(Object.fromEntries(result));
            } else {
              reject(new Error("failed to read bounds"));
            }
          } else {
            for (const item of keys.result) {
              result[i2] = [
                item,
                [
                  0,
                  0
                ]
              ];
              i2++;
            }
            doneFirst = [
              true,
              i2
            ];
          }
        };
        values.onsuccess = () => {
          let i2 = 0;
          if (doneFirst[0]) {
            for (const item of values.result) {
              result[i2][1] = item;
              i2++;
            }
            if (doneFirst[1] === i2) {
              resolve(Object.fromEntries(result));
            } else {
              reject(new Error("failed to read bounds"));
            }
          } else {
            for (const item of values.result) {
              result[i2] = [
                "",
                item
              ];
              i2++;
            }
            doneFirst = [
              true,
              i2
            ];
          }
        };
        keys.onerror = () => {
          reject(new Error(`failed to get bounds: ${keys.error?.message}`));
        };
        values.onerror = () => {
          reject(new Error(`failed to get bounds: ${values.error?.message}`));
        };
      });
    }
    /**
     * saves a single bound to the syncing store.
     */
    async setBound(pubkey, bound) {
      if (!this.store._db) await this.store.init();
      console.debug("new bound for", pubkey, bound.map((d) => new Date(d * 1e3).toLocaleString()));
      return new Promise((resolve, reject) => {
        const transaction = this.store._db.transaction([
          "syncing"
        ], "readwrite");
        const store2 = transaction.objectStore("syncing");
        const putRequest = store2.put(bound, pubkey);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(new Error(`failed to set bound: ${putRequest.error?.message}`));
      });
    }
    async performDeletions(event) {
      const ids = [];
      for (let t = 0; t < event.tags.length; t++) {
        const tag = event.tags[t];
        switch (tag[0]) {
          case "e":
            ids.push(tag[1]);
            break;
          case "a":
            const spl = tag[1].split(":");
            if (spl.length < 3) continue;
            for await (const target of this.store.queryEvents({
              kinds: [
                parseInt(spl[0])
              ],
              authors: [
                spl[1]
              ],
              "#d": [
                spl.slice(2).join(":")
              ]
            }, 100)) {
              if (target.created_at < event.created_at) {
                ids.push(target.id);
              }
            }
            break;
        }
      }
      await this.store.deleteEvents(ids);
      this.ondeletions?.(ids);
    }
  };
  async function outboxFilterRelayBatch(pubkeys, ...baseFilters) {
    const declaration = [];
    const relayCounts = {};
    const relaysByPubKey = {};
    const numberOfRelaysPerUser = pubkeys.length < 100 ? 4 : pubkeys.length < 800 ? 3 : pubkeys.length < 1200 ? 2 : 1;
    await Promise.all(pubkeys.map(async (pubkey) => {
      const rl = await loadRelayList(pubkey);
      relaysByPubKey[pubkey] = {};
      let w = 0;
      for (let i2 = 0; i2 < rl.items.length; i2++) {
        if (rl.items[i2].write) {
          try {
            const url = normalizeURL(rl.items[i2].url);
            const count = relayCounts[url] || {
              count: 0
            };
            relayCounts[url] = count;
            relaysByPubKey[pubkey][url] = count;
            count.count++;
            w++;
          } catch (_err) {
          }
        }
        if (w >= 7) break;
      }
    }));
    for (let i2 = 0; i2 < pubkeys.length; i2++) {
      const pubkey = pubkeys[i2];
      const list = Object.entries(relaysByPubKey[pubkey]).map(([url, count]) => [
        url,
        count.count
      ]);
      list.sort((a, b) => b[1] - a[1]);
      const top = list.slice(0, numberOfRelaysPerUser);
      for (let r = 0; r < top.length; r++) {
        const url = top[r][0];
        let found = false;
        for (let i3 = 0; i3 < declaration.length; i3++) {
          const decl = declaration[i3];
          if (decl.url === url) {
            found = true;
            decl.filter.authors.push(pubkey);
          }
        }
        if (!found) {
          for (let f = 0; f < baseFilters.length; f++) {
            declaration.push({
              url,
              filter: {
                ...baseFilters[f],
                authors: [
                  pubkey
                ]
              }
            });
          }
        }
      }
    }
    return declaration;
  }
  return __toCommonJS(all_gadgets_exports);
})();
/*! Bundled license information:

@noble/hashes/esm/utils.js:
@noble/hashes/esm/utils.js:
  (*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@noble/curves/esm/abstract/utils.js:
@noble/curves/esm/abstract/modular.js:
@noble/curves/esm/abstract/curve.js:
@noble/curves/esm/abstract/weierstrass.js:
@noble/curves/esm/_shortw_utils.js:
@noble/curves/esm/secp256k1.js:
  (*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@scure/base/lib/esm/index.js:
  (*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) *)
*/
