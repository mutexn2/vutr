"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __publicField = (obj, key, value) => {
    __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
    return value;
  };

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
    _batchLoadFn;
    _maxBatchSize;
    _cacheKeyFn;
    _cacheMap;
    _batch;
    constructor(batchLoadFn, options) {
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
      for (let i3 = 0; i3 < batch.callbacks.length; i3++) {
        const value = values[i3];
        if (value instanceof Error) {
          batch.callbacks[i3].reject(value);
        } else {
          batch.callbacks[i3].resolve(value);
        }
      }
    }).catch((error) => {
      failedDispatch(loader, batch, error);
    });
  }
  function failedDispatch(loader, batch, error) {
    resolveCacheHits(batch);
    for (let i3 = 0; i3 < batch.keys.length; i3++) {
      loader.clear(batch.keys[i3]);
      batch.callbacks[i3].reject(error);
    }
  }
  function resolveCacheHits(batch) {
    if (batch.cacheHits) {
      for (let i3 = 0; i3 < batch.cacheHits.length; i3++) {
        batch.cacheHits[i3]();
      }
    }
  }
  var dataloader_default = DataLoader;

  // ../nostr-tools/node_modules/@noble/hashes/esm/crypto.js
  var crypto = typeof globalThis === "object" && "crypto" in globalThis ? globalThis.crypto : void 0;

  // ../nostr-tools/node_modules/@noble/hashes/esm/utils.js
  var u8a = (a) => a instanceof Uint8Array;
  var createView = (arr) => new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
  var rotr = (word, shift) => word << 32 - shift | word >>> shift;
  var isLE = new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68;
  if (!isLE)
    throw new Error("Non little-endian hardware is not supported");
  var hexes = Array.from({ length: 256 }, (v, i3) => i3.toString(16).padStart(2, "0"));
  function bytesToHex(bytes3) {
    if (!u8a(bytes3))
      throw new Error("Uint8Array expected");
    let hex2 = "";
    for (let i3 = 0; i3 < bytes3.length; i3++) {
      hex2 += hexes[bytes3[i3]];
    }
    return hex2;
  }
  function hexToBytes(hex2) {
    if (typeof hex2 !== "string")
      throw new Error("hex string expected, got " + typeof hex2);
    const len = hex2.length;
    if (len % 2)
      throw new Error("padded hex string expected, got unpadded hex of length " + len);
    const array = new Uint8Array(len / 2);
    for (let i3 = 0; i3 < array.length; i3++) {
      const j = i3 * 2;
      const hexByte = hex2.slice(j, j + 2);
      const byte = Number.parseInt(hexByte, 16);
      if (Number.isNaN(byte) || byte < 0)
        throw new Error("Invalid byte sequence");
      array[i3] = byte;
    }
    return array;
  }
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
    clone() {
      return this._cloneInto();
    }
  };
  function wrapConstructor(hashCons) {
    const hashC = (msg) => hashCons().update(toBytes(msg)).digest();
    const tmp = hashCons();
    hashC.outputLen = tmp.outputLen;
    hashC.blockLen = tmp.blockLen;
    hashC.create = () => hashCons();
    return hashC;
  }

  // ../nostr-tools/node_modules/@scure/base/lib/esm/index.js
  function assertNumber(n) {
    if (!Number.isSafeInteger(n))
      throw new Error(`Wrong integer: ${n}`);
  }
  function chain(...args) {
    const wrap = (a, b) => (c) => a(b(c));
    const encode = Array.from(args).reverse().reduce((acc, i3) => acc ? wrap(acc, i3.encode) : i3.encode, void 0);
    const decode3 = args.reduce((acc, i3) => acc ? wrap(acc, i3.decode) : i3.decode, void 0);
    return { encode, decode: decode3 };
  }
  function alphabet(alphabet2) {
    return {
      encode: (digits) => {
        if (!Array.isArray(digits) || digits.length && typeof digits[0] !== "number")
          throw new Error("alphabet.encode input should be an array of numbers");
        return digits.map((i3) => {
          assertNumber(i3);
          if (i3 < 0 || i3 >= alphabet2.length)
            throw new Error(`Digit index outside alphabet: ${i3} (alphabet: ${alphabet2.length})`);
          return alphabet2[i3];
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
        for (let i3 of from)
          if (typeof i3 !== "string")
            throw new Error(`join.encode: non-string input=${i3}`);
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
        for (let i3 of data)
          if (typeof i3 !== "string")
            throw new Error(`padding.encode: non-string input=${i3}`);
        while (data.length * bits % 8)
          data.push(chr);
        return data;
      },
      decode(input) {
        if (!Array.isArray(input) || input.length && typeof input[0] !== "string")
          throw new Error("padding.encode input should be array of strings");
        for (let i3 of input)
          if (typeof i3 !== "string")
            throw new Error(`padding.decode: non-string input=${i3}`);
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
      for (let i3 = pos; i3 < digits.length; i3++) {
        const digit = digits[i3];
        const digitBase = from * carry + digit;
        if (!Number.isSafeInteger(digitBase) || from * carry / from !== carry || digitBase - digit !== from * carry) {
          throw new Error("convertRadix: carry overflow");
        }
        carry = digitBase % to;
        digits[i3] = Math.floor(digitBase / to);
        if (!Number.isSafeInteger(digits[i3]) || digits[i3] * to + carry !== digitBase)
          throw new Error("convertRadix: carry overflow");
        if (!done)
          continue;
        else if (!digits[i3])
          pos = i3;
        else
          done = false;
      }
      res.push(carry);
      if (done)
        break;
    }
    for (let i3 = 0; i3 < data.length - 1 && data[i3] === 0; i3++)
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
      for (let i3 = 0; i3 < data.length; i3 += 8) {
        const block = data.subarray(i3, i3 + 8);
        res += base58.encode(block).padStart(XMR_BLOCK_LEN[block.length], "1");
      }
      return res;
    },
    decode(str) {
      let res = [];
      for (let i3 = 0; i3 < str.length; i3 += 11) {
        const slice = str.slice(i3, i3 + 11);
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
    for (let i3 = 0; i3 < POLYMOD_GENERATORS.length; i3++) {
      if ((b >> i3 & 1) === 1)
        chk ^= POLYMOD_GENERATORS[i3];
    }
    return chk;
  }
  function bechChecksum(prefix, words, encodingConst = 1) {
    const len = prefix.length;
    let chk = 1;
    for (let i3 = 0; i3 < len; i3++) {
      const c = prefix.charCodeAt(i3);
      if (c < 33 || c > 126)
        throw new Error(`Invalid prefix (${prefix})`);
      chk = bech32Polymod(chk) ^ c >> 5;
    }
    chk = bech32Polymod(chk);
    for (let i3 = 0; i3 < len; i3++)
      chk = bech32Polymod(chk) ^ prefix.charCodeAt(i3) & 31;
    for (let v of words)
      chk = bech32Polymod(chk) ^ v;
    for (let i3 = 0; i3 < 6; i3++)
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
    function decode3(str, limit = 90) {
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
    const decodeUnsafe = unsafeWrapper(decode3);
    function decodeToBytes(str) {
      const { prefix, words } = decode3(str, false);
      return { prefix, words, bytes: fromWords(words) };
    }
    return { encode, decode: decode3, decodeToBytes, decodeUnsafe, fromWords, fromWordsUnsafe, toWords };
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

  // ../nostr-tools/lib/esm/nip19.js
  var utf8Decoder = new TextDecoder("utf-8");
  var utf8Encoder = new TextEncoder();
  var Bech32MaxSize = 5e3;
  function integerToUint8Array(number3) {
    const uint8Array = new Uint8Array(4);
    uint8Array[0] = number3 >> 24 & 255;
    uint8Array[1] = number3 >> 16 & 255;
    uint8Array[2] = number3 >> 8 & 255;
    uint8Array[3] = number3 & 255;
    return uint8Array;
  }
  function decodeNostrURI(nip19code) {
    try {
      if (nip19code.startsWith("nostr:"))
        nip19code = nip19code.substring(6);
      return decode(nip19code);
    } catch (_err) {
      return { type: "invalid", data: null };
    }
  }
  function decode(code) {
    let { prefix, words } = bech32.decode(code, Bech32MaxSize);
    let data = new Uint8Array(bech32.fromWords(words));
    switch (prefix) {
      case "nprofile": {
        let tlv = parseTLV(data);
        if (!tlv[0]?.[0])
          throw new Error("missing TLV 0 for nprofile");
        if (tlv[0][0].length !== 32)
          throw new Error("TLV 0 should be 32 bytes");
        return {
          type: "nprofile",
          data: {
            pubkey: bytesToHex(tlv[0][0]),
            relays: tlv[1] ? tlv[1].map((d) => utf8Decoder.decode(d)) : []
          }
        };
      }
      case "nevent": {
        let tlv = parseTLV(data);
        if (!tlv[0]?.[0])
          throw new Error("missing TLV 0 for nevent");
        if (tlv[0][0].length !== 32)
          throw new Error("TLV 0 should be 32 bytes");
        if (tlv[2] && tlv[2][0].length !== 32)
          throw new Error("TLV 2 should be 32 bytes");
        if (tlv[3] && tlv[3][0].length !== 4)
          throw new Error("TLV 3 should be 4 bytes");
        return {
          type: "nevent",
          data: {
            id: bytesToHex(tlv[0][0]),
            relays: tlv[1] ? tlv[1].map((d) => utf8Decoder.decode(d)) : [],
            author: tlv[2]?.[0] ? bytesToHex(tlv[2][0]) : void 0,
            kind: tlv[3]?.[0] ? parseInt(bytesToHex(tlv[3][0]), 16) : void 0
          }
        };
      }
      case "naddr": {
        let tlv = parseTLV(data);
        if (!tlv[0]?.[0])
          throw new Error("missing TLV 0 for naddr");
        if (!tlv[2]?.[0])
          throw new Error("missing TLV 2 for naddr");
        if (tlv[2][0].length !== 32)
          throw new Error("TLV 2 should be 32 bytes");
        if (!tlv[3]?.[0])
          throw new Error("missing TLV 3 for naddr");
        if (tlv[3][0].length !== 4)
          throw new Error("TLV 3 should be 4 bytes");
        return {
          type: "naddr",
          data: {
            identifier: utf8Decoder.decode(tlv[0][0]),
            pubkey: bytesToHex(tlv[2][0]),
            kind: parseInt(bytesToHex(tlv[3][0]), 16),
            relays: tlv[1] ? tlv[1].map((d) => utf8Decoder.decode(d)) : []
          }
        };
      }
      case "nsec":
        return { type: prefix, data };
      case "npub":
      case "note":
        return { type: prefix, data: bytesToHex(data) };
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
      if (v.length < l)
        throw new Error(`not enough data to read on TLV ${t}`);
      result[t] = result[t] || [];
      result[t].push(v);
    }
    return result;
  }
  function npubEncode(hex2) {
    return encodeBytes("npub", hexToBytes(hex2));
  }
  function encodeBech32(prefix, data) {
    let words = bech32.toWords(data);
    return bech32.encode(prefix, words, Bech32MaxSize);
  }
  function encodeBytes(prefix, bytes3) {
    return encodeBech32(prefix, bytes3);
  }
  function nprofileEncode(profile) {
    let data = encodeTLV({
      0: [hexToBytes(profile.pubkey)],
      1: (profile.relays || []).map((url) => utf8Encoder.encode(url))
    });
    return encodeBech32("nprofile", data);
  }
  function neventEncode(event) {
    let kindArray;
    if (event.kind !== void 0) {
      kindArray = integerToUint8Array(event.kind);
    }
    let data = encodeTLV({
      0: [hexToBytes(event.id)],
      1: (event.relays || []).map((url) => utf8Encoder.encode(url)),
      2: event.author ? [hexToBytes(event.author)] : [],
      3: kindArray ? [new Uint8Array(kindArray)] : []
    });
    return encodeBech32("nevent", data);
  }
  function naddrEncode(addr) {
    let kind = new ArrayBuffer(4);
    new DataView(kind).setUint32(0, addr.kind, false);
    let data = encodeTLV({
      0: [utf8Encoder.encode(addr.identifier)],
      1: (addr.relays || []).map((url) => utf8Encoder.encode(url)),
      2: [hexToBytes(addr.pubkey)],
      3: [new Uint8Array(kind)]
    });
    return encodeBech32("naddr", data);
  }
  function encodeTLV(tlv) {
    let entries = [];
    Object.entries(tlv).reverse().forEach(([t, vs]) => {
      vs.forEach((v) => {
        let entry = new Uint8Array(v.length + 2);
        entry.set([parseInt(t)], 0);
        entry.set([v.length], 1);
        entry.set(v, 2);
        entries.push(entry);
      });
    });
    return concatBytes(...entries);
  }

  // node_modules/idb-keyval/dist/index.js
  function promisifyRequest(request) {
    return new Promise((resolve, reject) => {
      request.oncomplete = request.onsuccess = () => resolve(request.result);
      request.onabort = request.onerror = () => reject(request.error);
    });
  }
  function createStore(dbName, storeName) {
    const request = indexedDB.open(dbName);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    const dbp = promisifyRequest(request);
    return (txMode, callback) => dbp.then((db) => callback(db.transaction(storeName, txMode).objectStore(storeName)));
  }
  var defaultGetStoreFunc;
  function defaultGetStore() {
    if (!defaultGetStoreFunc) {
      defaultGetStoreFunc = createStore("keyval-store", "keyval");
    }
    return defaultGetStoreFunc;
  }
  function set(key, value, customStore = defaultGetStore()) {
    return customStore("readwrite", (store) => {
      store.put(value, key);
      return promisifyRequest(store.transaction);
    });
  }
  function setMany(entries, customStore = defaultGetStore()) {
    return customStore("readwrite", (store) => {
      entries.forEach((entry) => store.put(entry[1], entry[0]));
      return promisifyRequest(store.transaction);
    });
  }
  function getMany(keys, customStore = defaultGetStore()) {
    return customStore("readonly", (store) => Promise.all(keys.map((key) => promisifyRequest(store.get(key)))));
  }
  function del(key, customStore = defaultGetStore()) {
    return customStore("readwrite", (store) => {
      store.delete(key);
      return promisifyRequest(store.transaction);
    });
  }

  // ../nostr-tools/node_modules/@noble/curves/node_modules/@noble/hashes/esm/_assert.js
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

  // ../nostr-tools/node_modules/@noble/curves/node_modules/@noble/hashes/esm/crypto.js
  var crypto2 = typeof globalThis === "object" && "crypto" in globalThis ? globalThis.crypto : void 0;

  // ../nostr-tools/node_modules/@noble/curves/node_modules/@noble/hashes/esm/utils.js
  var u8a2 = (a) => a instanceof Uint8Array;
  var createView2 = (arr) => new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
  var rotr2 = (word, shift) => word << 32 - shift | word >>> shift;
  var isLE2 = new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68;
  if (!isLE2)
    throw new Error("Non little-endian hardware is not supported");
  function utf8ToBytes2(str) {
    if (typeof str !== "string")
      throw new Error(`utf8ToBytes expected string, got ${typeof str}`);
    return new Uint8Array(new TextEncoder().encode(str));
  }
  function toBytes2(data) {
    if (typeof data === "string")
      data = utf8ToBytes2(data);
    if (!u8a2(data))
      throw new Error(`expected Uint8Array, got ${typeof data}`);
    return data;
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
  var Hash2 = class {
    clone() {
      return this._cloneInto();
    }
  };
  var toStr = {}.toString;
  function wrapConstructor2(hashCons) {
    const hashC = (msg) => hashCons().update(toBytes2(msg)).digest();
    const tmp = hashCons();
    hashC.outputLen = tmp.outputLen;
    hashC.blockLen = tmp.blockLen;
    hashC.create = () => hashCons();
    return hashC;
  }
  function randomBytes(bytesLength = 32) {
    if (crypto2 && typeof crypto2.getRandomValues === "function") {
      return crypto2.getRandomValues(new Uint8Array(bytesLength));
    }
    throw new Error("crypto.getRandomValues must be defined");
  }

  // ../nostr-tools/node_modules/@noble/curves/node_modules/@noble/hashes/esm/_sha2.js
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
  var SHA2 = class extends Hash2 {
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
      exists(this);
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
      for (let i3 = pos; i3 < blockLen; i3++)
        buffer[i3] = 0;
      setBigUint64(view, blockLen - 8, BigInt(this.length * 8), isLE3);
      this.process(view, 0);
      const oview = createView2(out);
      const len = this.outputLen;
      if (len % 4)
        throw new Error("_sha2: outputLen should be aligned to 32bit");
      const outLen = len / 4;
      const state = this.get();
      if (outLen > state.length)
        throw new Error("_sha2: outputLen bigger than state");
      for (let i3 = 0; i3 < outLen; i3++)
        oview.setUint32(4 * i3, state[i3], isLE3);
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

  // ../nostr-tools/node_modules/@noble/curves/node_modules/@noble/hashes/esm/sha256.js
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
      for (let i3 = 0; i3 < 16; i3++, offset += 4)
        SHA256_W[i3] = view.getUint32(offset, false);
      for (let i3 = 16; i3 < 64; i3++) {
        const W15 = SHA256_W[i3 - 15];
        const W2 = SHA256_W[i3 - 2];
        const s0 = rotr2(W15, 7) ^ rotr2(W15, 18) ^ W15 >>> 3;
        const s1 = rotr2(W2, 17) ^ rotr2(W2, 19) ^ W2 >>> 10;
        SHA256_W[i3] = s1 + SHA256_W[i3 - 7] + s0 + SHA256_W[i3 - 16] | 0;
      }
      let { A, B, C, D, E, F, G, H } = this;
      for (let i3 = 0; i3 < 64; i3++) {
        const sigma1 = rotr2(E, 6) ^ rotr2(E, 11) ^ rotr2(E, 25);
        const T1 = H + sigma1 + Chi(E, F, G) + SHA256_K[i3] + SHA256_W[i3] | 0;
        const sigma0 = rotr2(A, 2) ^ rotr2(A, 13) ^ rotr2(A, 22);
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
  var sha256 = /* @__PURE__ */ wrapConstructor2(() => new SHA256());

  // ../nostr-tools/node_modules/@noble/curves/esm/abstract/utils.js
  var utils_exports = {};
  __export(utils_exports, {
    bitGet: () => bitGet,
    bitLen: () => bitLen,
    bitMask: () => bitMask,
    bitSet: () => bitSet,
    bytesToHex: () => bytesToHex2,
    bytesToNumberBE: () => bytesToNumberBE,
    bytesToNumberLE: () => bytesToNumberLE,
    concatBytes: () => concatBytes3,
    createHmacDrbg: () => createHmacDrbg,
    ensureBytes: () => ensureBytes,
    equalBytes: () => equalBytes,
    hexToBytes: () => hexToBytes2,
    hexToNumber: () => hexToNumber,
    numberToBytesBE: () => numberToBytesBE,
    numberToBytesLE: () => numberToBytesLE,
    numberToHexUnpadded: () => numberToHexUnpadded,
    numberToVarBytesBE: () => numberToVarBytesBE,
    utf8ToBytes: () => utf8ToBytes3,
    validateObject: () => validateObject
  });
  var _0n = BigInt(0);
  var _1n = BigInt(1);
  var _2n = BigInt(2);
  var u8a3 = (a) => a instanceof Uint8Array;
  var hexes2 = /* @__PURE__ */ Array.from({ length: 256 }, (_, i3) => i3.toString(16).padStart(2, "0"));
  function bytesToHex2(bytes3) {
    if (!u8a3(bytes3))
      throw new Error("Uint8Array expected");
    let hex2 = "";
    for (let i3 = 0; i3 < bytes3.length; i3++) {
      hex2 += hexes2[bytes3[i3]];
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
  function hexToBytes2(hex2) {
    if (typeof hex2 !== "string")
      throw new Error("hex string expected, got " + typeof hex2);
    const len = hex2.length;
    if (len % 2)
      throw new Error("padded hex string expected, got unpadded hex of length " + len);
    const array = new Uint8Array(len / 2);
    for (let i3 = 0; i3 < array.length; i3++) {
      const j = i3 * 2;
      const hexByte = hex2.slice(j, j + 2);
      const byte = Number.parseInt(hexByte, 16);
      if (Number.isNaN(byte) || byte < 0)
        throw new Error("Invalid byte sequence");
      array[i3] = byte;
    }
    return array;
  }
  function bytesToNumberBE(bytes3) {
    return hexToNumber(bytesToHex2(bytes3));
  }
  function bytesToNumberLE(bytes3) {
    if (!u8a3(bytes3))
      throw new Error("Uint8Array expected");
    return hexToNumber(bytesToHex2(Uint8Array.from(bytes3).reverse()));
  }
  function numberToBytesBE(n, len) {
    return hexToBytes2(n.toString(16).padStart(len * 2, "0"));
  }
  function numberToBytesLE(n, len) {
    return numberToBytesBE(n, len).reverse();
  }
  function numberToVarBytesBE(n) {
    return hexToBytes2(numberToHexUnpadded(n));
  }
  function ensureBytes(title, hex2, expectedLength) {
    let res;
    if (typeof hex2 === "string") {
      try {
        res = hexToBytes2(hex2);
      } catch (e) {
        throw new Error(`${title} must be valid hex string, got "${hex2}". Cause: ${e}`);
      }
    } else if (u8a3(hex2)) {
      res = Uint8Array.from(hex2);
    } else {
      throw new Error(`${title} must be hex string or Uint8Array`);
    }
    const len = res.length;
    if (typeof expectedLength === "number" && len !== expectedLength)
      throw new Error(`${title} expected ${expectedLength} bytes, got ${len}`);
    return res;
  }
  function concatBytes3(...arrays) {
    const r = new Uint8Array(arrays.reduce((sum, a) => sum + a.length, 0));
    let pad = 0;
    arrays.forEach((a) => {
      if (!u8a3(a))
        throw new Error("Uint8Array expected");
      r.set(a, pad);
      pad += a.length;
    });
    return r;
  }
  function equalBytes(b1, b2) {
    if (b1.length !== b2.length)
      return false;
    for (let i3 = 0; i3 < b1.length; i3++)
      if (b1[i3] !== b2[i3])
        return false;
    return true;
  }
  function utf8ToBytes3(str) {
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
    let i3 = 0;
    const reset = () => {
      v.fill(1);
      k.fill(0);
      i3 = 0;
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
      if (i3++ >= 1e3)
        throw new Error("drbg: tried 1000 values");
      let len = 0;
      const out = [];
      while (len < qByteLen) {
        v = h();
        const sl = v.slice();
        out.push(sl);
        len += v.length;
      }
      return concatBytes3(...out);
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

  // ../nostr-tools/node_modules/@noble/curves/esm/abstract/modular.js
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
        const i3 = Fp2.mul(Fp2.mul(nv, _2n2), v);
        const root = Fp2.mul(nv, Fp2.sub(i3, Fp2.ONE));
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
    const lastMultiplied = nums.reduce((acc, num, i3) => {
      if (f.is0(num))
        return acc;
      tmp[i3] = acc;
      return f.mul(acc, num);
    }, f.ONE);
    const inverted = f.inv(lastMultiplied);
    nums.reduceRight((acc, num, i3) => {
      if (f.is0(num))
        return acc;
      tmp[i3] = f.mul(acc, tmp[i3]);
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
      sqrN: (num) => num * num,
      addN: (lhs, rhs) => lhs + rhs,
      subN: (lhs, rhs) => lhs - rhs,
      mulN: (lhs, rhs) => lhs * rhs,
      inv: (num) => invert(num, ORDER),
      sqrt: redef.sqrt || ((n) => sqrtP(f, n)),
      invertBatch: (lst) => FpInvertBatch(f, lst),
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

  // ../nostr-tools/node_modules/@noble/curves/esm/abstract/curve.js
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
      precomputeWindow(elm, W) {
        const { windows, windowSize } = opts(W);
        const points = [];
        let p = elm;
        let base = p;
        for (let window2 = 0; window2 < windows; window2++) {
          base = p;
          points.push(base);
          for (let i3 = 1; i3 < windowSize; i3++) {
            base = base.add(p);
            points.push(base);
          }
          p = base.double();
        }
        return points;
      },
      wNAF(W, precomputes, n) {
        const { windows, windowSize } = opts(W);
        let p = c.ZERO;
        let f = c.BASE;
        const mask = BigInt(2 ** W - 1);
        const maxNumber = 2 ** W;
        const shiftBy = BigInt(W);
        for (let window2 = 0; window2 < windows; window2++) {
          const offset = window2 * windowSize;
          let wbits = Number(n & mask);
          n >>= shiftBy;
          if (wbits > windowSize) {
            wbits -= maxNumber;
            n += _1n3;
          }
          const offset1 = offset;
          const offset2 = offset + Math.abs(wbits) - 1;
          const cond1 = window2 % 2 !== 0;
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

  // ../nostr-tools/node_modules/@noble/curves/esm/abstract/weierstrass.js
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
      return concatBytes3(Uint8Array.from([4]), Fp2.toBytes(a.x), Fp2.toBytes(a.y));
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
          key = bytesToHex2(key);
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
      static fromAffine(p) {
        const { x, y } = p || {};
        if (!p || !Fp2.isValid(x) || !Fp2.isValid(y))
          throw new Error("invalid affine point");
        if (p instanceof Point2)
          throw new Error("projective point not allowed");
        const is0 = (i3) => Fp2.eql(i3, Fp2.ZERO);
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
      static normalizeZ(points) {
        const toInv = Fp2.invertBatch(points.map((p) => p.pz));
        return points.map((p, i3) => p.toAffine(toInv[i3])).map(Point2.fromAffine);
      }
      static fromHex(hex2) {
        const P = Point2.fromAffine(fromBytes(ensureBytes("pointHex", hex2)));
        P.assertValidity();
        return P;
      }
      static fromPrivateKey(privateKey) {
        return Point2.BASE.multiply(normPrivateKeyToScalar(privateKey));
      }
      _setWindowSize(windowSize) {
        this._WINDOW_SIZE = windowSize;
        pointPrecomputes.delete(this);
      }
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
      equals(other) {
        assertPrjPoint(other);
        const { px: X1, py: Y1, pz: Z1 } = this;
        const { px: X2, py: Y2, pz: Z2 } = other;
        const U1 = Fp2.eql(Fp2.mul(X1, Z2), Fp2.mul(X2, Z1));
        const U2 = Fp2.eql(Fp2.mul(Y1, Z2), Fp2.mul(Y2, Z1));
        return U1 && U2;
      }
      negate() {
        return new Point2(this.px, Fp2.neg(this.py), this.pz);
      }
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
          return comp.map((p, i3) => p.toAffine(toInv[i3])).map(Point2.fromAffine);
        });
      }
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
      multiplyAndAddUnsafe(Q, a, b) {
        const G = Point2.BASE;
        const mul = (P, a2) => a2 === _0n4 || a2 === _1n4 || !P.equals(G) ? P.multiplyUnsafe(a2) : P.multiply(a2);
        const sum = mul(this, a).add(mul(Q, b));
        return sum.is0() ? void 0 : sum;
      }
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
        return bytesToHex2(this.toRawBytes(isCompressed));
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
        const cat = concatBytes3;
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
    const numToNByteStr = (num) => bytesToHex2(numberToBytesBE(num, CURVE.nByteLength));
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
      static fromCompact(hex2) {
        const l = CURVE.nByteLength;
        hex2 = ensureBytes("compactSignature", hex2, l * 2);
        return new Signature(slcNum(hex2, 0, l), slcNum(hex2, l, 2 * l));
      }
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
      hasHighS() {
        return isBiggerThanHalfOrder(this.s);
      }
      normalizeS() {
        return this.hasHighS() ? new Signature(this.r, modN2(-this.s), this.recovery) : this;
      }
      toDERRawBytes() {
        return hexToBytes2(this.toDERHex());
      }
      toDERHex() {
        return DER.hexFromSig({ r: this.r, s: this.s });
      }
      toCompactRawBytes() {
        return hexToBytes2(this.toCompactHex());
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
      randomPrivateKey: () => {
        const length = getMinHashLength(CURVE.n);
        return mapHashToField(CURVE.randomBytes(length), CURVE.n);
      },
      precompute(windowSize = 8, point = Point2.BASE) {
        point._setWindowSize(windowSize);
        point.multiply(BigInt(3));
        return point;
      }
    };
    function getPublicKey3(privateKey, isCompressed = true) {
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
      const seed = concatBytes3(...seedArgs);
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
      getPublicKey: getPublicKey3,
      getSharedSecret,
      sign,
      verify,
      ProjectivePoint: Point2,
      Signature,
      utils
    };
  }

  // ../nostr-tools/node_modules/@noble/curves/node_modules/@noble/hashes/esm/hmac.js
  var HMAC = class extends Hash2 {
    constructor(hash3, _key) {
      super();
      this.finished = false;
      this.destroyed = false;
      hash(hash3);
      const key = toBytes2(_key);
      this.iHash = hash3.create();
      if (typeof this.iHash.update !== "function")
        throw new Error("Expected instance of class which extends utils.Hash");
      this.blockLen = this.iHash.blockLen;
      this.outputLen = this.iHash.outputLen;
      const blockLen = this.blockLen;
      const pad = new Uint8Array(blockLen);
      pad.set(key.length > blockLen ? hash3.create().update(key).digest() : key);
      for (let i3 = 0; i3 < pad.length; i3++)
        pad[i3] ^= 54;
      this.iHash.update(pad);
      this.oHash = hash3.create();
      for (let i3 = 0; i3 < pad.length; i3++)
        pad[i3] ^= 54 ^ 92;
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

  // ../nostr-tools/node_modules/@noble/curves/esm/_shortw_utils.js
  function getHash(hash3) {
    return {
      hash: hash3,
      hmac: (key, ...msgs) => hmac(hash3, key, concatBytes2(...msgs)),
      randomBytes
    };
  }
  function createCurve(curveDef, defHash) {
    const create = (hash3) => weierstrass({ ...curveDef, ...getHash(hash3) });
    return Object.freeze({ ...create(defHash), create });
  }

  // ../nostr-tools/node_modules/@noble/curves/esm/secp256k1.js
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
    Gx: BigInt("55066263022277343669578718895168534326250603453777594175500187360389116729240"),
    Gy: BigInt("32670510020758816978083085130507043184471273380659243275938904335757337482424"),
    h: BigInt(1),
    lowS: true,
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
      tagP = concatBytes3(tagH, tagH);
      TAGGED_HASH_PREFIXES[tag] = tagP;
    }
    return sha256(concatBytes3(tagP, ...messages));
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

  // ../nostr-tools/node_modules/@noble/hashes/esm/_assert.js
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

  // ../nostr-tools/node_modules/@noble/hashes/esm/_sha2.js
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
  var SHA22 = class extends Hash {
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
      assert_default.exists(this);
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
      for (let i3 = pos; i3 < blockLen; i3++)
        buffer[i3] = 0;
      setBigUint642(view, blockLen - 8, BigInt(this.length * 8), isLE3);
      this.process(view, 0);
      const oview = createView(out);
      const len = this.outputLen;
      if (len % 4)
        throw new Error("_sha2: outputLen should be aligned to 32bit");
      const outLen = len / 4;
      const state = this.get();
      if (outLen > state.length)
        throw new Error("_sha2: outputLen bigger than state");
      for (let i3 = 0; i3 < outLen; i3++)
        oview.setUint32(4 * i3, state[i3], isLE3);
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

  // ../nostr-tools/node_modules/@noble/hashes/esm/sha256.js
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
      for (let i3 = 0; i3 < 16; i3++, offset += 4)
        SHA256_W2[i3] = view.getUint32(offset, false);
      for (let i3 = 16; i3 < 64; i3++) {
        const W15 = SHA256_W2[i3 - 15];
        const W2 = SHA256_W2[i3 - 2];
        const s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ W15 >>> 3;
        const s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ W2 >>> 10;
        SHA256_W2[i3] = s1 + SHA256_W2[i3 - 7] + s0 + SHA256_W2[i3 - 16] | 0;
      }
      let { A, B, C, D, E, F, G, H } = this;
      for (let i3 = 0; i3 < 64; i3++) {
        const sigma1 = rotr(E, 6) ^ rotr(E, 11) ^ rotr(E, 25);
        const T1 = H + sigma1 + Chi2(E, F, G) + SHA256_K2[i3] + SHA256_W2[i3] | 0;
        const sigma0 = rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22);
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
  var sha2562 = wrapConstructor(() => new SHA2562());
  var sha224 = wrapConstructor(() => new SHA224());

  // ../nostr-tools/lib/esm/pool.js
  var verifiedSymbol = Symbol("verified");
  var isRecord = (obj) => obj instanceof Object;
  function validateEvent(event) {
    if (!isRecord(event))
      return false;
    if (typeof event.kind !== "number")
      return false;
    if (typeof event.content !== "string")
      return false;
    if (typeof event.created_at !== "number")
      return false;
    if (typeof event.pubkey !== "string")
      return false;
    if (!event.pubkey.match(/^[a-f0-9]{64}$/))
      return false;
    if (!Array.isArray(event.tags))
      return false;
    for (let i22 = 0; i22 < event.tags.length; i22++) {
      let tag = event.tags[i22];
      if (!Array.isArray(tag))
        return false;
      for (let j = 0; j < tag.length; j++) {
        if (typeof tag[j] !== "string")
          return false;
      }
    }
    return true;
  }
  var utf8Decoder2 = new TextDecoder("utf-8");
  var utf8Encoder2 = new TextEncoder();
  function normalizeURL(url) {
    try {
      if (url.indexOf("://") === -1)
        url = "wss://" + url;
      let p = new URL(url);
      p.pathname = p.pathname.replace(/\/+/g, "/");
      if (p.pathname.endsWith("/"))
        p.pathname = p.pathname.slice(0, -1);
      if (p.port === "80" && p.protocol === "ws:" || p.port === "443" && p.protocol === "wss:")
        p.port = "";
      p.searchParams.sort();
      p.hash = "";
      return p.toString();
    } catch (e) {
      throw new Error(`Invalid URL: ${url}`);
    }
  }
  var QueueNode = class {
    value;
    next = null;
    prev = null;
    constructor(message) {
      this.value = message;
    }
  };
  var Queue = class {
    first;
    last;
    constructor() {
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
      if (!this.first)
        return null;
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
  var JS = class {
    generateSecretKey() {
      return schnorr.utils.randomPrivateKey();
    }
    getPublicKey(secretKey) {
      return bytesToHex(schnorr.getPublicKey(secretKey));
    }
    finalizeEvent(t, secretKey) {
      const event = t;
      event.pubkey = bytesToHex(schnorr.getPublicKey(secretKey));
      event.id = getEventHash(event);
      event.sig = bytesToHex(schnorr.sign(getEventHash(event), secretKey));
      event[verifiedSymbol] = true;
      return event;
    }
    verifyEvent(event) {
      if (typeof event[verifiedSymbol] === "boolean")
        return event[verifiedSymbol];
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
    if (!validateEvent(evt))
      throw new Error("can't serialize event with wrong or missing properties");
    return JSON.stringify([0, evt.pubkey, evt.created_at, evt.kind, evt.tags, evt.content]);
  }
  function getEventHash(event) {
    let eventHash = sha2562(utf8Encoder2.encode(serializeEvent(event)));
    return bytesToHex(eventHash);
  }
  var i = new JS();
  var generateSecretKey = i.generateSecretKey;
  var getPublicKey = i.getPublicKey;
  var finalizeEvent = i.finalizeEvent;
  var verifyEvent = i.verifyEvent;
  var ClientAuth = 22242;
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
        if (values && !event.tags.find(([t, v]) => t === f.slice(1) && values.indexOf(v) !== -1))
          return false;
      }
    }
    if (filter.since && event.created_at < filter.since)
      return false;
    if (filter.until && event.created_at > filter.until)
      return false;
    return true;
  }
  function matchFilters(filters, event) {
    for (let i22 = 0; i22 < filters.length; i22++) {
      if (matchFilter(filters[i22], event)) {
        return true;
      }
    }
    return false;
  }
  function getHex64(json, field) {
    let len = field.length + 3;
    let idx = json.indexOf(`"${field}":`) + len;
    let s = json.slice(idx).indexOf(`"`) + idx + 1;
    return json.slice(s, s + 64);
  }
  function getSubscriptionId(json) {
    let idx = json.slice(0, 22).indexOf(`"EVENT"`);
    if (idx === -1)
      return null;
    let pstart = json.slice(idx + 7 + 1).indexOf(`"`);
    if (pstart === -1)
      return null;
    let start = idx + 7 + 1 + pstart;
    let pend = json.slice(start + 1, 80).indexOf(`"`);
    if (pend === -1)
      return null;
    let end = start + 1 + pend;
    return json.slice(start + 1, end);
  }
  function makeAuthEvent(relayURL, challenge2) {
    return {
      kind: ClientAuth,
      created_at: Math.floor(Date.now() / 1e3),
      tags: [
        ["relay", relayURL],
        ["challenge", challenge2]
      ],
      content: ""
    };
  }
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
  var SendingOnClosedConnection = class extends Error {
    constructor(message, relay) {
      super(`Tried to send message '${message} on a closed connection to ${relay}.`);
      this.name = "SendingOnClosedConnection";
    }
  };
  var AbstractRelay = class {
    url;
    _connected = false;
    onclose = null;
    onnotice = (msg) => console.debug(`NOTICE from ${this.url}: ${msg}`);
    baseEoseTimeout = 4400;
    connectionTimeout = 4400;
    publishTimeout = 4400;
    pingFrequency = 2e4;
    pingTimeout = 2e4;
    resubscribeBackoff = [1e4, 1e4, 1e4, 2e4, 2e4, 3e4, 6e4];
    openSubs = /* @__PURE__ */ new Map();
    enablePing;
    enableReconnect;
    connectionTimeoutHandle;
    reconnectTimeoutHandle;
    pingTimeoutHandle;
    reconnectAttempts = 0;
    closedIntentionally = false;
    connectionPromise;
    openCountRequests = /* @__PURE__ */ new Map();
    openEventPublishes = /* @__PURE__ */ new Map();
    ws;
    incomingMessageQueue = new Queue();
    queueRunning = false;
    challenge;
    authPromise;
    serial = 0;
    verifyEvent;
    _WebSocket;
    constructor(url, opts) {
      this.url = normalizeURL(url);
      this.verifyEvent = opts.verifyEvent;
      this._WebSocket = opts.websocketImplementation || WebSocket;
      this.enablePing = opts.enablePing;
      this.enableReconnect = opts.enableReconnect || false;
    }
    static async connect(url, opts) {
      const relay = new AbstractRelay(url, opts);
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
      if (this.pingTimeoutHandle) {
        clearTimeout(this.pingTimeoutHandle);
        this.pingTimeoutHandle = void 0;
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
      if (this.connectionPromise)
        return this.connectionPromise;
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
          this.reconnectAttempts = 0;
          for (const sub of this.openSubs.values()) {
            sub.eosed = false;
            if (typeof this.enableReconnect === "function") {
              sub.filters = this.enableReconnect(sub.filters);
            }
            sub.fire();
          }
          if (this.enablePing) {
            this.pingpong();
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
    async waitForDummyReq() {
      return new Promise((resolve, _) => {
        const sub = this.subscribe([{ ids: ["a".repeat(64)] }], {
          oneose: () => {
            sub.close();
            resolve(true);
          },
          eoseTimeout: this.pingTimeout + 1e3
        });
      });
    }
    async pingpong() {
      if (this.ws?.readyState === 1) {
        const result = await Promise.any([
          this.ws && this.ws.ping && this.ws.once ? this.waitForPingPong() : this.waitForDummyReq(),
          new Promise((res) => setTimeout(() => res(false), this.pingTimeout))
        ]);
        if (result) {
          this.pingTimeoutHandle = setTimeout(() => this.pingpong(), this.pingFrequency);
        } else {
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
            if (!so)
              return;
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
              if (ok)
                ep.resolve(reason);
              else
                ep.reject(new Error(reason));
              this.openEventPublishes.delete(id);
            }
            return;
          }
          case "CLOSED": {
            const id = data[1];
            const so = this.openSubs.get(id);
            if (!so)
              return;
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
      if (!this.connectionPromise)
        throw new SendingOnClosedConnection(message, this.url);
      this.connectionPromise.then(() => {
        this.ws?.send(message);
      });
    }
    async auth(signAuthEvent) {
      const challenge2 = this.challenge;
      if (!challenge2)
        throw new Error("can't perform auth, no challenge was received");
      if (this.authPromise)
        return this.authPromise;
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
          this.openEventPublishes.set(evt.id, { resolve, reject, timeout });
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
        this.openEventPublishes.set(event.id, { resolve, reject, timeout });
      });
      this.send('["EVENT",' + JSON.stringify(event) + "]");
      return ret;
    }
    async count(filters, params) {
      this.serial++;
      const id = params?.id || "count:" + this.serial;
      const ret = new Promise((resolve, reject) => {
        this.openCountRequests.set(id, { resolve, reject });
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
      if (this.pingTimeoutHandle) {
        clearTimeout(this.pingTimeoutHandle);
        this.pingTimeoutHandle = void 0;
      }
      this.closeAllSubscriptions("relay connection closed by us");
      this._connected = false;
      this.onclose?.();
      if (this.ws?.readyState === this._WebSocket.OPEN) {
        this.ws?.close();
      }
    }
    _onmessage(ev) {
      this.incomingMessageQueue.enqueue(ev.data);
      if (!this.queueRunning) {
        this.runQueue();
      }
    }
  };
  var Subscription = class {
    relay;
    id;
    closed = false;
    eosed = false;
    filters;
    alreadyHaveEvent;
    receivedEvent;
    onevent;
    oneose;
    onclose;
    oncustom;
    eoseTimeout;
    eoseTimeoutHandle;
    constructor(relay, id, filters, params) {
      if (filters.length === 0)
        throw new Error("subscription can't be created with zero filters");
      this.relay = relay;
      this.filters = filters;
      this.id = id;
      this.alreadyHaveEvent = params.alreadyHaveEvent;
      this.receivedEvent = params.receivedEvent;
      this.eoseTimeout = params.eoseTimeout || relay.baseEoseTimeout;
      this.oneose = params.oneose;
      this.onclose = params.onclose;
      this.onevent = params.onevent || ((event) => {
        console.warn(
          `onevent() callback not defined for subscription '${this.id}' in relay ${this.relay.url}. event received:`,
          event
        );
      });
    }
    fire() {
      this.relay.send('["REQ","' + this.id + '",' + JSON.stringify(this.filters).substring(1));
      this.eoseTimeoutHandle = setTimeout(this.receivedEose.bind(this), this.eoseTimeout);
    }
    receivedEose() {
      if (this.eosed)
        return;
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
  var AbstractSimplePool = class {
    relays = /* @__PURE__ */ new Map();
    seenOn = /* @__PURE__ */ new Map();
    trackRelays = false;
    verifyEvent;
    enablePing;
    enableReconnect;
    trustedRelayURLs = /* @__PURE__ */ new Set();
    _WebSocket;
    constructor(opts) {
      this.verifyEvent = opts.verifyEvent;
      this._WebSocket = opts.websocketImplementation;
      this.enablePing = opts.enablePing;
      this.enableReconnect = opts.enableReconnect;
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
        if (params?.connectionTimeout)
          relay.connectionTimeout = params.connectionTimeout;
        this.relays.set(url, relay);
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
      params.onauth = params.onauth || params.doauth;
      const request = [];
      for (let i22 = 0; i22 < relays.length; i22++) {
        const url = normalizeURL(relays[i22]);
        if (!request.find((r) => r.url === url)) {
          request.push({ url, filter });
        }
      }
      return this.subscribeMap(request, params);
    }
    subscribeMany(relays, filter, params) {
      params.onauth = params.onauth || params.doauth;
      const request = [];
      const uniqUrls = [];
      for (let i22 = 0; i22 < relays.length; i22++) {
        const url = normalizeURL(relays[i22]);
        if (uniqUrls.indexOf(url) === -1) {
          uniqUrls.push(url);
          request.push({ url, filter });
        }
      }
      return this.subscribeMap(request, params);
    }
    subscribeMap(requests, params) {
      params.onauth = params.onauth || params.doauth;
      const grouped = /* @__PURE__ */ new Map();
      for (const req of requests) {
        const { url, filter } = req;
        if (!grouped.has(url))
          grouped.set(url, []);
        grouped.get(url).push(filter);
      }
      const groupedRequests = Array.from(grouped.entries()).map(([url, filters]) => ({ url, filters }));
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
      let handleEose = (i22) => {
        if (eosesReceived[i22])
          return;
        eosesReceived[i22] = true;
        if (eosesReceived.filter((a) => a).length === groupedRequests.length) {
          params.oneose?.();
          handleEose = () => {
          };
        }
      };
      const closesReceived = [];
      let handleClose = (i22, reason) => {
        if (closesReceived[i22])
          return;
        handleEose(i22);
        closesReceived[i22] = reason;
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
      const allOpened = Promise.all(
        groupedRequests.map(async ({ url, filters }, i22) => {
          let relay;
          try {
            relay = await this.ensureRelay(url, {
              connectionTimeout: params.maxWait ? Math.max(params.maxWait * 0.8, params.maxWait - 1e3) : void 0
            });
          } catch (err) {
            handleClose(i22, err?.message || String(err));
            return;
          }
          let subscription = relay.subscribe(filters, {
            ...params,
            oneose: () => handleEose(i22),
            onclose: (reason) => {
              if (reason.startsWith("auth-required: ") && params.onauth) {
                relay.auth(params.onauth).then(() => {
                  relay.subscribe(filters, {
                    ...params,
                    oneose: () => handleEose(i22),
                    onclose: (reason2) => {
                      handleClose(i22, reason2);
                    },
                    alreadyHaveEvent: localAlreadyHaveEventHandler,
                    eoseTimeout: params.maxWait
                  });
                }).catch((err) => {
                  handleClose(i22, `auth was required and attempted, but failed with: ${err}`);
                });
              } else {
                handleClose(i22, reason);
              }
            },
            alreadyHaveEvent: localAlreadyHaveEventHandler,
            eoseTimeout: params.maxWait
          });
          subs.push(subscription);
        })
      );
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
      params.onauth = params.onauth || params.doauth;
      const subcloser = this.subscribe(relays, filter, {
        ...params,
        oneose() {
          subcloser.close("closed automatically on eose");
        }
      });
      return subcloser;
    }
    subscribeManyEose(relays, filter, params) {
      params.onauth = params.onauth || params.doauth;
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
      return relays.map(normalizeURL).map(async (url, i22, arr) => {
        if (arr.indexOf(url) !== i22) {
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
  var _WebSocket;
  try {
    _WebSocket = WebSocket;
  } catch {
  }
  var SimplePool = class extends AbstractSimplePool {
    constructor(options) {
      super({ verifyEvent, websocketImplementation: _WebSocket, ...options });
    }
  };

  // node_modules/@nostr/gadgets/defaults.js
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

  // node_modules/@nostr/gadgets/utils.js
  function isHex32(input) {
    for (let i3 = 0; i3 < 64; i3++) {
      let cc = input.charCodeAt(i3);
      if (isNaN(cc) || cc < 48 || cc > 102 || cc > 57 && cc < 97) {
        return false;
      }
    }
    return true;
  }
  function identity(a) {
    return Boolean(a);
  }

  // ../nostr-tools/lib/esm/utils.js
  var utf8Decoder3 = new TextDecoder("utf-8");
  var utf8Encoder3 = new TextEncoder();
  function normalizeURL2(url) {
    try {
      if (url.indexOf("://") === -1)
        url = "wss://" + url;
      let p = new URL(url);
      p.pathname = p.pathname.replace(/\/+/g, "/");
      if (p.pathname.endsWith("/"))
        p.pathname = p.pathname.slice(0, -1);
      if (p.port === "80" && p.protocol === "ws:" || p.port === "443" && p.protocol === "wss:")
        p.port = "";
      p.searchParams.sort();
      p.hash = "";
      return p.toString();
    } catch (e) {
      throw new Error(`Invalid URL: ${url}`);
    }
  }

  // node_modules/@nostr/gadgets/lists.js
  var serial = 0;
  var isFresh = Symbol("event was just downloaded or force-updated, not loaded from cache");
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
          return normalizeURL2(tag[1]);
        case "a":
          const spl = tag[1].split(":");
          if (!isHex32(spl[1]) || spl[0] !== "30002")
            return void 0;
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
  var loadBlossomServers = makeListFetcher(10063, [], (event) => event ? event.tags.filter(([k, v]) => k === "server" && v).map(([, url]) => "http" + normalizeURL2(url).substring(2)).filter(Boolean) : []);
  var loadEmojis = makeListFetcher(10030, [], itemsFromTags((tag) => {
    if (tag.length < 2)
      return;
    if (tag[0] === "a") {
      const spl = tag[1].split(":");
      if (!isHex32(spl[1]) || spl[0] !== "30030")
        return void 0;
      return {
        identifier: spl.slice(2).join(":"),
        pubkey: spl[1],
        kind: parseInt(spl[0]),
        relays: tag[2] ? [
          tag[2]
        ] : []
      };
    }
    if (tag.length < 3 || tag[0] !== "emoji")
      return void 0;
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
    const store = createStore(`@nostr/gadgets/list:${kind}`, "cache");
    const dataloader = new dataloader_default((requests) => new Promise(async (resolve) => {
      let remainingRequests = [];
      let now = Math.round(Date.now() / 1e3);
      let results = await getMany(requests.map((r) => r.target), store).then((results2) => results2.map((res, i3) => {
        const req = requests[i3];
        req.index = i3;
        if (typeof req.refreshStyle === "object") {
          const final = {
            event: req.refreshStyle,
            items: process(req.refreshStyle),
            [isFresh]: true
          };
          set(req.target, final, store);
          return final;
        } else if (!res) {
          if (req.refreshStyle !== false)
            remainingRequests.push(req);
          return {
            items: req.defaultItems || [],
            event: null,
            [isFresh]: false
          };
        } else if (req.refreshStyle === true || !res.lastAttempt || res.lastAttempt < now - 60 * 60 * 24 * 2) {
          if (req.refreshStyle !== false)
            remainingRequests.push(req);
          return {
            ...res,
            [isFresh]: false
          };
        } else if (res.event === null && res.lastAttempt < Date.now() / 1e3 - 60 * 60) {
          if (req.refreshStyle !== false)
            remainingRequests.push(req);
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
                if ((previous?.created_at || 0) > evt.created_at)
                  return;
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
            ]), store);
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
        await del(pubkey, store);
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
    relayBySerial = [];
    orderedRelaysByPubKey = {};
    hasLoadedRelaysFor = /* @__PURE__ */ new Set();
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
        for (let i3 = 0; i3 < n && i3 < rfpk.length; i3++) {
          urls.push(this.relayBySerial[rfpk[i3].serial]);
        }
      }
      return urls;
    }
    printScores() {
      console.log("= print scores");
      for (let pubkey in this.orderedRelaysByPubKey) {
        let rfpk = this.orderedRelaysByPubKey[pubkey];
        console.log(`== relay scores for ${pubkey}`);
        for (let i3 = 0; i3 < rfpk.entries.length; i3++) {
          const re = rfpk[i3];
          console.log(`  ${i3.toString().padStart(3)} :: ${this.relayBySerial[re.serial].padEnd(30)} (${re.serial}) ::> ${re.sum().toString().padStart(12)}`);
        }
      }
    }
  };
  var RelayEntry = class {
    serial;
    timestamps = new Array(7).fill(0);
    constructor(relay) {
      this.serial = relay;
    }
    sum() {
      const now = Date.now() / 1e3 + 24 * 60 * 60;
      let sum = 0;
      for (let i3 = 0; i3 < this.timestamps.length; i3++) {
        if (this.timestamps[i3] === 0)
          continue;
        const value = hintBasePoints[i3] * 1e10 / Math.pow(Math.max(now - this.timestamps[i3], 1), 1.3);
        sum += value;
      }
      return sum;
    }
  };
  var HintKey = /* @__PURE__ */ function(HintKey2) {
    HintKey2[HintKey2["lastFetchAttempt"] = 0] = "lastFetchAttempt";
    HintKey2[HintKey2["mostRecentEventFetched"] = 1] = "mostRecentEventFetched";
    HintKey2[HintKey2["lastInRelayList"] = 2] = "lastInRelayList";
    HintKey2[HintKey2["lastInTag"] = 3] = "lastInTag";
    HintKey2[HintKey2["lastInNprofile"] = 4] = "lastInNprofile";
    HintKey2[HintKey2["lastInNevent"] = 5] = "lastInNevent";
    HintKey2[HintKey2["lastInNIP05"] = 6] = "lastInNIP05";
    return HintKey2;
  }({});
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
          request
        );
      }
    }
    return metadataLoader.load(
      request
    );
  }
  var metadataLoader = new dataloader_default(async (requests) => new Promise(async (resolve) => {
    const toFetch = [];
    let now = Math.round(Date.now() / 1e3);
    let results = await getMany(requests.map((r) => r.pubkey), metadataStore).then((results2) => results2.map((res, i3) => {
      const req = requests[i3];
      if (typeof req.refreshStyle === "object") {
        let nu = bareNostrUser(req.pubkey);
        enhanceNostrUserWithEvent(nu, req.refreshStyle);
        set(req.pubkey, nu, metadataStore);
        return nu;
      } else if (!res) {
        if (req.refreshStyle !== false)
          toFetch.push(req);
        let nu = bareNostrUser(req.pubkey);
        nu.lastAttempt = now;
        return nu;
      } else if (req.refreshStyle === true || res.lastAttempt < now - 60 * 60 * 24 * 2) {
        if (req.refreshStyle !== false)
          toFetch.push(req);
        res.lastAttempt = now;
        return res;
      } else if (res.lastAttempt < now - 60 * 60 && !res.metadata.name && !res.metadata.picture && !res.metadata.about) {
        if (req.refreshStyle !== false)
          toFetch.push(req);
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
            if (gathered >= 2)
              break;
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
          for (let i3 = 0; i3 < requests.length; i3++) {
            if (requests[i3].pubkey === evt.pubkey) {
              const nu = results[i3];
              if (nu.lastUpdated > evt.created_at)
                return;
              enhanceNostrUserWithEvent(nu, evt);
              return;
            }
          }
        },
        oneose() {
          resolve(results);
          h.close();
          let idbSave = [];
          for (let i3 = 0; i3 < results.length; i3++) {
            let res = results[i3];
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
      for (let i3 = 0; i3 < results.length; i3++) {
        results[i3] = err;
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
    if (md.picture)
      nu.image = md.picture;
  }
  function nostrUserFromEvent(evt) {
    let nu = bareNostrUser(evt.pubkey);
    enhanceNostrUserWithEvent(nu, evt);
    return nu;
  }

  // ../nostr-tools/lib/esm/nip05.js
  var NIP05_REGEX = /^(?:([\w.+-]+)@)?([\w_-]+(\.[\w_-]+)+)$/;
  var _fetch;
  try {
    _fetch = fetch;
  } catch (_) {
    null;
  }
  async function queryProfile(fullname) {
    const match = fullname.match(NIP05_REGEX);
    if (!match)
      return null;
    const [, name = "_", domain] = match;
    try {
      const url = `https://${domain}/.well-known/nostr.json?name=${name}`;
      const res = await _fetch(url, { redirect: "manual" });
      if (res.status !== 200) {
        throw Error("Wrong response code");
      }
      const json = await res.json();
      const pubkey = json.names[name];
      return pubkey ? { pubkey, relays: json.relays?.[pubkey] } : null;
    } catch (_e) {
      return null;
    }
  }

  // nostr.ts
  var pool2 = window.nostrSharedPool || new SimplePool();
  window.nostrSharedPool = pool2;
  setPool(pool2);
  var lrl = window.nostrSharedRelayListLoader || loadRelayList;
  window.nostrSharedRelayListLoader = lrl;
  var lnu = window.nostrSharedMetadataLoader || loadNostrUser;
  window.nostrSharedMetadataLoader = lnu;
  async function fetchNostrUser(pubkey, relays) {
    return await lnu({ pubkey, relays });
  }
  async function getOutboxRelaysFor(pubkey) {
    let rl = await lrl(pubkey);
    return rl.items.filter((r) => r.write).map((r) => r.url);
  }
  async function getInboxRelaysFor(pubkey) {
    let rl = await lrl(pubkey);
    return rl.items.filter((r) => r.read).map((r) => r.url);
  }
  async function inputToPubkey(input) {
    try {
      const { type, data } = decode(input);
      if (type === "nprofile") {
        return [data.pubkey, data.relays || []];
      } else if (type === "npub") {
        return [data, []];
      }
    } catch (err) {
      if (input.match(/[0-9a-f]{64}/)) {
        return [input, []];
      } else if (input.match(".")) {
        let res = await queryProfile(input);
        if (!res)
          return [void 0];
        return [res.pubkey, res.relays || []];
      }
    }
    return [void 0];
  }
  async function getWindowNostr() {
    const wn = window.nostr;
    if (!wn) {
      return new Promise((resolve, reject) => {
        try {
          let script = document.createElement("script");
          script.onload = () => resolve(window.nostr);
          script.src = "https://cdn.jsdelivr.net/npm/window.nostr.js/dist/window.nostr.min.js";
          document.head.appendChild(script);
        } catch (err) {
          reject(err);
        }
      });
    }
    return wn;
  }

  // utils.ts
  function debounce(fn, wait = 100) {
    let timeoutId;
    let timestamp;
    let storedArguments;
    function later() {
      const last = Date.now() - timestamp;
      if (last < wait && last >= 0) {
        timeoutId = setTimeout(later, wait - last);
      } else {
        timeoutId = void 0;
        fn(...storedArguments);
      }
    }
    return function(...args) {
      timestamp = Date.now();
      storedArguments = args;
      if (!timeoutId) {
        timeoutId = setTimeout(later, wait);
      }
    };
  }
  function nostrLink(code) {
    let res = window.nwc?.nostrLink?.(code);
    if (res)
      return res;
    return "https://njump.me/" + code;
  }
  function relayLink(url) {
    let res = window.nwc?.relayLink?.(url);
    if (res)
      return res;
    return "https://njump.me/r/" + encodeURIComponent(url);
  }
  var transparentPixel = "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";
  function handleImageError(ev) {
    const el = ev.target;
    console.warn("error loading image", ev);
    if (el.src !== transparentPixel) {
      el.src = transparentPixel;
    }
  }
  function splitComma(value) {
    return value ? value.split(" ").map((v) => v.trim()).filter((v) => v.length) : [];
  }
  function shorten(nip19code) {
    let idx = nip19code.indexOf("1");
    return nip19code.substring(0, idx + 3) + "\u2026" + nip19code.substring(nip19code.length - 5);
  }
  function shortenURL(url) {
    if (url.length <= 30)
      return url;
    try {
      let u = new URL(url);
      if (url.length <= 40) {
        return `${u.host}${u.pathname}${u.search.length ? "?" : ""}${u.search}`;
      }
      if (url.length <= 50 && u.pathname.length < 20) {
        return `${u.host}${u.pathname}`;
      }
      let pathname = u.pathname;
      let parts = u.pathname.split("/");
      let lastPart = parts[parts.length - 1];
      if (lastPart.length > 10) {
        lastPart = `\u2026${lastPart.substring(lastPart.length - 6)}`;
      }
      if (parts.length > 2) {
        pathname = `/\u2026/${lastPart}`;
      } else {
        pathname = `/${lastPart}`;
      }
      return `${u.host}${pathname}`;
    } catch (_err) {
      return url;
    }
  }

  // nostr-name.ts
  var NostrName = class extends HTMLElement {
    constructor() {
      super();
      this.set();
    }
    connectedCallback() {
      this.set();
    }
    attributeChangedCallback() {
      this.set();
    }
    set = debounce(async () => {
      let input = this.getAttribute("pubkey");
      if (input) {
        this.textContent = bareNostrUser(input).shortName;
        let [pubkey, hints2] = await inputToPubkey(input);
        if (pubkey) {
          this.title = npubEncode(pubkey);
          let nu = await fetchNostrUser(pubkey, hints2 || []);
          this.textContent = nu.shortName;
        }
      }
    }, 200);
  };
  __publicField(NostrName, "observedAttributes", ["pubkey"]);
  window.customElements.define("nostr-name", NostrName);

  // nostr-picture.ts
  var NostrPicture = class extends HTMLElement {
    img;
    constructor() {
      super();
      this.img = document.createElement("img");
      this.img.setAttribute("part", "img");
      this.img.onerror = handleImageError;
      this.attachShadow({ mode: "open" });
      const { shadowRoot } = this;
      shadowRoot.appendChild(this.img);
    }
    connectedCallback() {
      this.set();
    }
    attributeChangedCallback(name, _, value) {
      if (name === "pubkey")
        this.set();
      else if (name === "width" || name === "height")
        this.img.setAttribute(name, value);
    }
    set = debounce(async () => {
      let input = this.getAttribute("pubkey");
      if (input) {
        let [pubkey, hints2] = await inputToPubkey(input);
        if (pubkey) {
          let metadata = await fetchNostrUser(pubkey, hints2 || []);
          this.img.src = metadata.image || transparentPixel;
          this.img.alt = `picture for "${metadata.shortName}"`;
        }
      }
    }, 200);
  };
  __publicField(NostrPicture, "observedAttributes", ["pubkey", "width", "height"]);
  window.customElements.define("nostr-picture", NostrPicture);

  // nostr-user-search.ts
  var NostrUserSearch = class extends HTMLElement {
    root;
    limit = 10;
    value;
    relays = ["wss://nostr.wine", "wss://search.nos.today", "wss://relay.nostr.band"].map(normalizeURL2);
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      const { shadowRoot } = this;
      this.root = document.createElement("div");
      shadowRoot.appendChild(this.root);
    }
    connectedCallback() {
      this.style.display = "inline-block";
      this.style.width = "fit-content";
      this.style.height = "fit-content";
      setTimeout(() => {
        let template = this.getAttribute("template") ? document.getElementById(this.getAttribute("template")) : null;
        if (template) {
          this.root.appendChild(template.content.cloneNode(true));
        } else {
          this.root.innerHTML = `
        <style>
          .wrapper {
            position: relative;
          }
          ul {
            margin: 0;
            margin-top: -1px;
            padding: 0;
            background-color: white;
            position: absolute;
            left: 0;
            border-bottom: 0;
            display: none;
          }
          ul > li {
            display: flex;
            align-items: center;
            cursor: pointer;
          }
          ul > li:hover {
            background-color: rgba(0, 0, 0, 0.05);
          }
          ul > li > img {
            height: 2rem;
            width: 2rem;
          }
          ul > li > span {
            margin: 0 0.5rem;
            max-width: 120px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        </style>

        <div class="wrapper" part="wrapper">
          <input type="search" part="input" />
          <ul part="results">
            <template>
              <li part="item">
                <img part="picture" />
                <span part="name"></span>
                <span part="nip05"></span>
              </li>
            </template>
          </ul>
        </div>
        `;
        }
        for (let input of this.queryPart("input")) {
          input.oninput = (ev) => this.search(ev.target.value.trim());
          if (this.hasAttribute("placeholder")) {
            input.setAttribute("placeholder", this.getAttribute("placeholder"));
          }
          if (this.hasAttribute("value")) {
            input.value = this.getAttribute("value");
            this.search(input.value.trim());
          }
        }
      }, 1);
    }
    attributeChangedCallback(name, _old, value) {
      if (name === "relays") {
        this.relays = splitComma(value).map(normalizeURL2);
      } else if (name === "limit") {
        this.limit = parseInt(value) || 10;
      } else if (name === "placeholder") {
        for (let input of this.queryPart("input")) {
          input.setAttribute("placeholder", value);
        }
      } else if (name === "value") {
        for (let input of this.queryPart("input")) {
          input.value = value;
        }
        this.search(value.trim());
      }
    }
    search = debounce(async (q) => {
      for (let results of this.queryPart("results")) {
        if (q.length < 2) {
          results.style.display = "none";
          return;
        }
        for (let i3 = 0; i3 < results.children.length; i3++) {
          if (results.children[i3].tagName === "TEMPLATE")
            continue;
          results.removeChild(results.children[i3]);
        }
        results.style.display = "block";
      }
      pool2.subscribeManyEose(
        this.relays,
        { search: q, limit: this.limit, kinds: [0] },
        {
          onevent: (evt) => {
            let nu = nostrUserFromEvent(evt);
            for (let results of this.queryPart("results")) {
              const template = results.querySelector("template");
              if (!template)
                continue;
              const item = template.content.cloneNode(true);
              const itemElement = item.querySelector('[part="item"]');
              if (itemElement) {
                itemElement.title = nu.npub;
                itemElement.onclick = this.handleItemClicked.bind(this);
                itemElement.dataset.metadata = evt.content;
                const pic = item.querySelector('[part="picture"]');
                if (pic) {
                  pic.onerror = handleImageError;
                  pic.src = nu.image || transparentPixel;
                }
                const name = item.querySelector('[part="name"]');
                if (name) {
                  name.textContent = nu.shortName;
                }
                const nip05 = item.querySelector('[part="nip05"]');
                if (nip05 && nu.metadata.nip05) {
                  nip05.textContent = nu.metadata.nip05;
                }
                results.appendChild(item);
              }
            }
          }
        }
      );
    }, 450);
    handleItemClicked(ev) {
      let item = ev.currentTarget;
      let npub = item.title;
      let pubkey = decode(npub).data;
      for (let results of this.queryPart("results")) {
        for (let i3 = 0; i3 < results.children.length; i3++) {
          if (results.children[i3].tagName === "TEMPLATE")
            continue;
          results.removeChild(results.children[i3]);
        }
        results.style.display = "none";
      }
      this.value = pubkey;
      this.dispatchEvent(
        new CustomEvent("selected", {
          bubbles: true,
          detail: { pubkey, npub, metadata: JSON.parse(item.dataset.metadata) }
        })
      );
    }
    *queryPart(name) {
      let slotted = this.querySelectorAll(`[part="${name}"]`);
      for (let i3 = 0; i3 < slotted.length; i3++) {
        yield slotted[i3];
      }
      let templated = this.root.querySelectorAll(`[part="${name}"]`);
      for (let i3 = 0; i3 < templated.length; i3++) {
        yield templated[i3];
      }
    }
  };
  __publicField(NostrUserSearch, "observedAttributes", ["relays", "limit", "placeholder", "value"]);
  window.customElements.define("nostr-user-search", NostrUserSearch);

  // nostr-event-json.ts
  var NostrEventJson = class extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
    }
    connectedCallback() {
      this.style.display = "inline-block";
      this.style.width = "fit-content";
      this.style.height = "fit-content";
      this.set();
    }
    attributeChangedCallback() {
      this.set();
    }
    set = debounce(async () => {
      let input = this.getAttribute("ref");
      if (input) {
        let { type, data } = decodeNostrURI(input);
        let relays = [];
        let author;
        let filter;
        if (type === "nevent") {
          let d = data;
          relays = d.relays || [];
          author = d.author;
          filter = { ids: [d.id] };
        } else if (type === "naddr") {
          let d = data;
          filter = { authors: [d.pubkey], "#d": [d.identifier], kinds: [d.kind] };
          relays = d.relays || [];
          author = d.pubkey;
        } else if (type === "note") {
          filter = { ids: [data] };
        } else if (input.match(/[0-9a-f]{64}/)) {
          filter = { ids: [input] };
        } else {
          return;
        }
        relays = relays.map(normalizeURL2);
        if (author)
          relays = await getOutboxRelaysFor(author);
        let evt = await pool2.get(relays, filter);
        if (evt) {
          const { shadowRoot } = this;
          shadowRoot.innerHTML = `<pre part="pre" style="white-space: pre-wrap; word-break: break-all">{
  <span part="key">"id":</span> <span part="id" id="id"></span>
  <span part="key">"pubkey":</span> <span part="pubkey" id="pubkey"></span>
  <span part="key">"kind":</span> <span part="kind" id="kind"></span>
  <span part="key">"created_at":</span> <span part="created_at" id="created_at"></span>
  <span part="key">"tags":</span> <span part="tags" id="tags"></span>
  <span part="key">"content":</span> <span part="content" id="content"></span>
  <span part="key">"sig":</span> <span part="sig" id="sig"></span>
}</pre>`;
          shadowRoot.getElementById("id").textContent = evt.id;
          shadowRoot.getElementById("pubkey").textContent = evt.pubkey;
          shadowRoot.getElementById("kind").textContent = `${evt.kind}`;
          shadowRoot.getElementById("created_at").textContent = `${evt.created_at}`;
          shadowRoot.getElementById("tags").textContent = JSON.stringify(evt.tags);
          shadowRoot.getElementById("content").textContent = evt.content;
          shadowRoot.getElementById("sig").textContent = evt.sig;
        }
      }
    }, 200);
  };
  __publicField(NostrEventJson, "observedAttributes", ["ref"]);
  window.customElements.define("nostr-event-json", NostrEventJson);

  // nostr-rsvp.ts
  var NostrRSVP = class extends HTMLElement {
    root;
    eventData = null;
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      const { shadowRoot } = this;
      this.root = document.createElement("div");
      shadowRoot.appendChild(this.root);
    }
    connectedCallback() {
      this.style.display = "block";
      this.style.width = "fit-content";
      this.style.height = "fit-content";
      this.set();
    }
    attributeChangedCallback() {
      this.set();
    }
    set = debounce(async () => {
      let input = this.getAttribute("ref");
      if (!input)
        return;
      let { type, data } = decodeNostrURI(input);
      let relays = [];
      let author;
      let filter;
      if (type === "nevent") {
        let d = data;
        relays = d.relays || [];
        author = d.author;
        filter = { ids: [d.id] };
      } else if (type === "naddr") {
        let d = data;
        relays = d.relays || [];
        author = d.pubkey;
        filter = {
          authors: [d.pubkey],
          kinds: [d.kind],
          "#d": [d.identifier]
        };
      } else if (input.match(/[0-9a-f]{64}/)) {
        filter = { ids: [input] };
      } else {
        return;
      }
      relays = relays.map(normalizeURL2);
      if (author) {
        let authorRelays = await getOutboxRelaysFor(author);
        relays.push(...authorRelays);
      }
      let evt = await pool2.get(relays, filter);
      if (!evt || evt.kind !== 31922 && evt.kind !== 31923) {
        this.root.innerHTML = '<p part="error">Not a valid calendar event.</p>';
        return;
      }
      this.eventData = evt;
      const title = evt.tags.find((t) => t[0] === "title")?.[1] || "Untitled Event";
      let timeStr = "";
      if (evt.kind === 31922) {
        const start = evt.tags.find((t) => t[0] === "start")?.[1];
        const end = evt.tags.find((t) => t[0] === "end")?.[1] || start;
        timeStr = `${start}${end !== start ? ` to ${end}` : ""}`;
      } else {
        const start = evt.tags.find((t) => t[0] === "start")?.[1];
        const end = evt.tags.find((t) => t[0] === "end")?.[1];
        if (start) {
          const startDate = new Date(parseInt(start) * 1e3);
          timeStr = startDate.toLocaleString();
          if (end) {
            const endDate = new Date(parseInt(end) * 1e3);
            timeStr += ` to ${endDate.toLocaleString()}`;
          }
        }
      }
      const identifier = evt.tags.find((t) => t[0] === "d")?.[1] || "";
      this.root.innerHTML = `
      <div part="container">
        <p part="title" title="${identifier}">${title}</p>
        <p part="time">${timeStr}</p>
        <p part="description">${evt.content}</p>
        <div part="buttons">
          <button part="button accepted"><slot name="accepted">Going</slot></button>
          <button part="button tentative"><slot name="tentative">Maybe</slot></button>
          <button part="button declined"><slot name="declined">Not going</slot></button>
        </div>
      </div>
    `;
      const buttons = this.root.querySelectorAll("button");
      buttons[0].addEventListener("click", () => this.sendRSVP("accepted"));
      buttons[1].addEventListener("click", () => this.sendRSVP("tentative"));
      buttons[2].addEventListener("click", () => this.sendRSVP("declined"));
    }, 200);
    async sendRSVP(status) {
      if (!this.eventData) {
        console.error("Cannot RSVP: missing event data");
        return;
      }
      try {
        const signedEvent = await (await getWindowNostr()).signEvent({
          kind: 31925,
          created_at: Math.floor(Date.now() / 1e3),
          content: "",
          tags: [
            ["e", this.eventData.id],
            [
              "a",
              `${this.eventData.kind}:${this.eventData.pubkey}:${this.eventData.tags.find((t) => t[0] === "d")?.[1]}`
            ],
            ["d", Math.random().toString().substring(8)],
            ["status", status],
            ["p", this.eventData.pubkey]
          ]
        });
        const pubs = pool2.publish(await getInboxRelaysFor(this.eventData.pubkey), signedEvent);
        await Promise.all(pubs);
        const buttonsDiv = this.root.querySelector('[part="buttons"]');
        if (buttonsDiv) {
          buttonsDiv.innerHTML = `<p part="rsvp-sent"><slot name="rsvp-sent">RSVP sent: ${status}</slot></p>`;
        }
      } catch (error) {
        console.error("failed to send RSVP:", error);
        const buttonsDiv = this.root.querySelector('[part="buttons"]');
        if (buttonsDiv) {
          buttonsDiv.innerHTML = `<p part="rsvp-failed"><slot name="rsvp-failed">failed to send RSVP: ${error}</slot></p>`;
        }
      }
    }
  };
  __publicField(NostrRSVP, "observedAttributes", ["ref"]);
  window.customElements.define("nostr-rsvp", NostrRSVP);

  // nostr-livestream.ts
  var NostrLivestream = class extends HTMLElement {
    root;
    subc;
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      const { shadowRoot } = this;
      this.root = document.createElement("div");
      shadowRoot.appendChild(this.root);
    }
    connectedCallback() {
      setTimeout(() => {
        let template = this.getAttribute("template") ? document.getElementById(this.getAttribute("template")) : null;
        if (template) {
          this.root.appendChild(template.content.cloneNode(true));
        } else {
          this.root.innerHTML = `
        <style>
          header {
            display: flex;
            align-items: center;
          }
          header img {
            height: 2em;
          }
          video {
            width: 100%;
          }
        </style>

        <slot name="header">
          <header part="header">
            <img part="image" />
            <h3 part="title"></h3>
            <p part="status"></p>
          </header >
        </slot>

        <p part="time"></p>
        <p part="summary"></p>

        <section part="stats">
          <slot name="stats">
            <span part="current" style="display: none;">
              current participants: <span part="current-value" />
            </span>
            <span part="total" style="display: none;">
              total participants: <span part="total-value" />
            </span>
          </slot>
        </section>

        <video part="video" controls style="display: none;">
          <source type="application/x-mpegURL">
          your browser does not support HLS video playback
        </video>

        <section part="participants" style="display: none;">
          <slot name="participants">
            <h4 part="participants-title">
              <slot name="participants-title"></slot>
            </h4>
            <ul part="participants-list">
              <template>
                <li part="participant-entry">
                  <nostr-name part="participant-pubkey" />
                  <span part="participant-role"></span>
                </li>
              </template>
            </ul>
          </slot>
        </section>
        `;
        }
        this.set();
      }, 1);
    }
    *queryPart(name) {
      let slotted = this.querySelectorAll(`[part="${name}"]`);
      for (let i3 = 0; i3 < slotted.length; i3++) {
        yield slotted[i3];
      }
      let templated = this.root.querySelectorAll(`[part="${name}"]`);
      for (let i3 = 0; i3 < templated.length; i3++) {
        yield templated[i3];
      }
    }
    disconnectedCallback() {
      this.subc?.close?.();
    }
    attributeChangedCallback() {
      this.set();
    }
    set = debounce(async () => {
      if (this.subc) {
        this.subc.close();
      }
      let input = this.getAttribute("ref");
      if (!input)
        return;
      let { type, data } = decodeNostrURI(input);
      let relays = [];
      let author;
      let filter;
      if (type === "nevent") {
        let d = data;
        relays = d.relays || [];
        author = d.author;
        filter = { ids: [d.id] };
      } else if (type === "naddr") {
        let d = data;
        relays = d.relays || [];
        author = d.pubkey;
        filter = {
          authors: [d.pubkey],
          kinds: [d.kind],
          "#d": [d.identifier]
        };
      } else if (input.match(/[0-9a-f]{64}/)) {
        filter = { ids: [input] };
      } else {
        this.root.innerHTML = '<p part="error"><slot name="error-pointer">not a valid livestream event pointer</slot></p>';
        return;
      }
      relays = relays.map(normalizeURL2);
      if (author) {
        let authorRelays = await getOutboxRelaysFor(author);
        relays.push(...authorRelays);
      }
      let found = false;
      let loadedHLS = false;
      let hls;
      this.subc = pool2.subscribeMany(relays, filter, {
        label: "nostr-livestream",
        onevent: async (evt) => {
          found = true;
          if (evt.kind !== 30311) {
            this.root.innerHTML = '<p part="error"><slot name="error-invalid">event is not a livestream</slot></p>';
            return;
          }
          const title = evt.tags.find((t) => t[0] === "title")?.[1];
          if (title) {
            for (let node of this.queryPart("title")) {
              node.textContent = title;
            }
          }
          const summary = evt.tags.find((t) => t[0] === "summary")?.[1];
          if (summary) {
            for (let node of this.queryPart("summary")) {
              node.textContent = summary;
            }
          }
          const image = evt.tags.find((t) => t[0] === "image")?.[1];
          if (image) {
            for (let node of this.queryPart("image")) {
              ;
              node.src = image;
            }
          }
          const status = evt.tags.find((t) => t[0] === "status")?.[1] || "unknown";
          if (status) {
            for (let node of this.queryPart("status")) {
              node.textContent = status;
            }
          }
          const current = evt.tags.find((t) => t[0] === "current_participants")?.[1];
          if (current) {
            for (let node of this.queryPart("current")) {
              node.style.display = "block";
            }
            for (let dataEl of this.queryPart("current-value")) {
              dataEl.textContent = current;
            }
          }
          const total = evt.tags.find((t) => t[0] === "total_participants")?.[1];
          if (total) {
            for (let node of this.queryPart("total")) {
              ;
              node.style.display = "block";
            }
            for (let dataEl of this.queryPart("total-value")) {
              dataEl.textContent = total;
            }
          }
          const starts = evt.tags.find((t) => t[0] === "starts")?.[1];
          const ends = evt.tags.find((t) => t[0] === "ends")?.[1];
          let timeStr = "";
          if (starts) {
            const startDate = new Date(parseInt(starts) * 1e3);
            timeStr = startDate.toLocaleString();
            if (ends) {
              const endDate = new Date(parseInt(ends) * 1e3);
              timeStr += ` to ${endDate.toLocaleString()}`;
            }
            for (let node of this.queryPart("time")) {
              node.textContent = timeStr;
            }
          }
          let participantTags = evt.tags.filter((t) => t[0] === "p");
          if (participantTags.length) {
            for (let container of this.queryPart("participants")) {
              let templateEl = container.querySelector("template");
              if (templateEl) {
                let template = templateEl.content;
                participantTags.forEach((t) => {
                  let entry = template.cloneNode();
                  let pubkeyEl = entry.querySelector('[part="participant-pubkey"]');
                  if (pubkeyEl) {
                    if (pubkeyEl.tagName === "NOSTR-NAME") {
                      pubkeyEl.setAttribute("pubkey", t[1]);
                    } else {
                      pubkeyEl.textContent = t[1];
                    }
                  }
                  entry.querySelectorAll('[part="participant-role"]').forEach((roleEl) => {
                    roleEl.textContent = t[3] || "participant";
                  });
                });
              }
            }
          }
          const streamUrl = evt.tags.find((t) => t[0] === "streaming")?.[1];
          if (status === "live" && streamUrl?.endsWith(".m3u8")) {
            let videoEl = this.root.querySelector("video");
            videoEl.autoplay = this.hasAttribute("autoplay");
            videoEl.muted = this.hasAttribute("muted");
            videoEl.style.display = "block";
            let sourceEl = videoEl.querySelector("source");
            if (sourceEl.src !== streamUrl) {
              sourceEl.src = streamUrl;
              if (!videoEl.canPlayType("application/vnd.apple.mpegurl") && !loadedHLS) {
                loadedHLS = true;
                const script = document.createElement("script");
                script.src = "https://cdn.jsdelivr.net/npm/hls.js@latest";
                script.onload = () => {
                  if (window.Hls.isSupported()) {
                    hls = new window.Hls();
                    hls.loadSource(streamUrl);
                    hls.attachMedia(videoEl);
                  }
                };
                document.head.appendChild(script);
              } else if (hls) {
                hls.loadSource(streamUrl);
              }
            }
          }
        },
        oneose: () => {
          if (!found) {
            this.root.innerHTML = '<p part="error"><slot name="error-fetch">failed to fetch event</slot></p>';
            this.subc?.close?.();
          }
        }
      });
    }, 200);
  };
  __publicField(NostrLivestream, "observedAttributes", ["ref", "autoplay", "muted"]);
  window.customElements.define("nostr-livestream", NostrLivestream);

  // ../nostr-tools/lib/esm/pure.js
  var verifiedSymbol2 = Symbol("verified");
  var isRecord2 = (obj) => obj instanceof Object;
  function validateEvent2(event) {
    if (!isRecord2(event))
      return false;
    if (typeof event.kind !== "number")
      return false;
    if (typeof event.content !== "string")
      return false;
    if (typeof event.created_at !== "number")
      return false;
    if (typeof event.pubkey !== "string")
      return false;
    if (!event.pubkey.match(/^[a-f0-9]{64}$/))
      return false;
    if (!Array.isArray(event.tags))
      return false;
    for (let i22 = 0; i22 < event.tags.length; i22++) {
      let tag = event.tags[i22];
      if (!Array.isArray(tag))
        return false;
      for (let j = 0; j < tag.length; j++) {
        if (typeof tag[j] !== "string")
          return false;
      }
    }
    return true;
  }
  var utf8Decoder4 = new TextDecoder("utf-8");
  var utf8Encoder4 = new TextEncoder();
  var JS2 = class {
    generateSecretKey() {
      return schnorr.utils.randomPrivateKey();
    }
    getPublicKey(secretKey) {
      return bytesToHex(schnorr.getPublicKey(secretKey));
    }
    finalizeEvent(t, secretKey) {
      const event = t;
      event.pubkey = bytesToHex(schnorr.getPublicKey(secretKey));
      event.id = getEventHash2(event);
      event.sig = bytesToHex(schnorr.sign(getEventHash2(event), secretKey));
      event[verifiedSymbol2] = true;
      return event;
    }
    verifyEvent(event) {
      if (typeof event[verifiedSymbol2] === "boolean")
        return event[verifiedSymbol2];
      const hash3 = getEventHash2(event);
      if (hash3 !== event.id) {
        event[verifiedSymbol2] = false;
        return false;
      }
      try {
        const valid = schnorr.verify(event.sig, hash3, event.pubkey);
        event[verifiedSymbol2] = valid;
        return valid;
      } catch (err) {
        event[verifiedSymbol2] = false;
        return false;
      }
    }
  };
  function serializeEvent2(evt) {
    if (!validateEvent2(evt))
      throw new Error("can't serialize event with wrong or missing properties");
    return JSON.stringify([0, evt.pubkey, evt.created_at, evt.kind, evt.tags, evt.content]);
  }
  function getEventHash2(event) {
    let eventHash = sha2562(utf8Encoder4.encode(serializeEvent2(event)));
    return bytesToHex(eventHash);
  }
  var i2 = new JS2();
  var generateSecretKey2 = i2.generateSecretKey;
  var getPublicKey2 = i2.getPublicKey;
  var finalizeEvent2 = i2.finalizeEvent;
  var verifyEvent2 = i2.verifyEvent;

  // ../nostr-tools/lib/esm/nip10.js
  function parse(event) {
    const result = {
      reply: void 0,
      root: void 0,
      mentions: [],
      profiles: [],
      quotes: []
    };
    let maybeParent;
    let maybeRoot;
    for (let i3 = event.tags.length - 1; i3 >= 0; i3--) {
      const tag = event.tags[i3];
      if (tag[0] === "e" && tag[1]) {
        const [_, eTagEventId, eTagRelayUrl, eTagMarker, eTagAuthor] = tag;
        const eventPointer = {
          id: eTagEventId,
          relays: eTagRelayUrl ? [eTagRelayUrl] : [],
          author: eTagAuthor
        };
        if (eTagMarker === "root") {
          result.root = eventPointer;
          continue;
        }
        if (eTagMarker === "reply") {
          result.reply = eventPointer;
          continue;
        }
        if (eTagMarker === "mention") {
          result.mentions.push(eventPointer);
          continue;
        }
        if (!maybeParent) {
          maybeParent = eventPointer;
        } else {
          maybeRoot = eventPointer;
        }
        result.mentions.push(eventPointer);
        continue;
      }
      if (tag[0] === "q" && tag[1]) {
        const [_, eTagEventId, eTagRelayUrl] = tag;
        result.quotes.push({
          id: eTagEventId,
          relays: eTagRelayUrl ? [eTagRelayUrl] : []
        });
      }
      if (tag[0] === "p" && tag[1]) {
        result.profiles.push({
          pubkey: tag[1],
          relays: tag[2] ? [tag[2]] : []
        });
        continue;
      }
    }
    if (!result.root) {
      result.root = maybeRoot || maybeParent || result.reply;
    }
    if (!result.reply) {
      result.reply = maybeParent || result.root;
    }
    ;
    [result.reply, result.root].forEach((ref) => {
      if (!ref)
        return;
      let idx = result.mentions.indexOf(ref);
      if (idx !== -1) {
        result.mentions.splice(idx, 1);
      }
      if (ref.author) {
        let author = result.profiles.find((p) => p.pubkey === ref.author);
        if (author && author.relays) {
          if (!ref.relays) {
            ref.relays = [];
          }
          author.relays.forEach((url) => {
            if (ref.relays?.indexOf(url) === -1)
              ref.relays.push(url);
          });
          author.relays = ref.relays;
        }
      }
    });
    result.mentions.forEach((ref) => {
      if (ref.author) {
        let author = result.profiles.find((p) => p.pubkey === ref.author);
        if (author && author.relays) {
          if (!ref.relays) {
            ref.relays = [];
          }
          author.relays.forEach((url) => {
            if (ref.relays.indexOf(url) === -1)
              ref.relays.push(url);
          });
          author.relays = ref.relays;
        }
      }
    });
    return result;
  }

  // ../nostr-tools/lib/esm/nip27.js
  var utf8Decoder5 = new TextDecoder("utf-8");
  var utf8Encoder5 = new TextEncoder();
  var Bech32MaxSize2 = 5e3;
  function decode2(code) {
    let { prefix, words } = bech32.decode(code, Bech32MaxSize2);
    let data = new Uint8Array(bech32.fromWords(words));
    switch (prefix) {
      case "nprofile": {
        let tlv = parseTLV2(data);
        if (!tlv[0]?.[0])
          throw new Error("missing TLV 0 for nprofile");
        if (tlv[0][0].length !== 32)
          throw new Error("TLV 0 should be 32 bytes");
        return {
          type: "nprofile",
          data: {
            pubkey: bytesToHex(tlv[0][0]),
            relays: tlv[1] ? tlv[1].map((d) => utf8Decoder5.decode(d)) : []
          }
        };
      }
      case "nevent": {
        let tlv = parseTLV2(data);
        if (!tlv[0]?.[0])
          throw new Error("missing TLV 0 for nevent");
        if (tlv[0][0].length !== 32)
          throw new Error("TLV 0 should be 32 bytes");
        if (tlv[2] && tlv[2][0].length !== 32)
          throw new Error("TLV 2 should be 32 bytes");
        if (tlv[3] && tlv[3][0].length !== 4)
          throw new Error("TLV 3 should be 4 bytes");
        return {
          type: "nevent",
          data: {
            id: bytesToHex(tlv[0][0]),
            relays: tlv[1] ? tlv[1].map((d) => utf8Decoder5.decode(d)) : [],
            author: tlv[2]?.[0] ? bytesToHex(tlv[2][0]) : void 0,
            kind: tlv[3]?.[0] ? parseInt(bytesToHex(tlv[3][0]), 16) : void 0
          }
        };
      }
      case "naddr": {
        let tlv = parseTLV2(data);
        if (!tlv[0]?.[0])
          throw new Error("missing TLV 0 for naddr");
        if (!tlv[2]?.[0])
          throw new Error("missing TLV 2 for naddr");
        if (tlv[2][0].length !== 32)
          throw new Error("TLV 2 should be 32 bytes");
        if (!tlv[3]?.[0])
          throw new Error("missing TLV 3 for naddr");
        if (tlv[3][0].length !== 4)
          throw new Error("TLV 3 should be 4 bytes");
        return {
          type: "naddr",
          data: {
            identifier: utf8Decoder5.decode(tlv[0][0]),
            pubkey: bytesToHex(tlv[2][0]),
            kind: parseInt(bytesToHex(tlv[3][0]), 16),
            relays: tlv[1] ? tlv[1].map((d) => utf8Decoder5.decode(d)) : []
          }
        };
      }
      case "nsec":
        return { type: prefix, data };
      case "npub":
      case "note":
        return { type: prefix, data: bytesToHex(data) };
      default:
        throw new Error(`unknown prefix ${prefix}`);
    }
  }
  function parseTLV2(data) {
    let result = {};
    let rest = data;
    while (rest.length > 0) {
      let t = rest[0];
      let l = rest[1];
      let v = rest.slice(2, 2 + l);
      rest = rest.slice(2 + l);
      if (v.length < l)
        throw new Error(`not enough data to read on TLV ${t}`);
      result[t] = result[t] || [];
      result[t].push(v);
    }
    return result;
  }
  var noCharacter = /\W/m;
  var noURLCharacter = /\W |\W$|$|,| /m;
  function* parse2(content) {
    const max = content.length;
    let prevIndex = 0;
    let index = 0;
    while (index < max) {
      let u = content.indexOf(":", index);
      if (u === -1) {
        break;
      }
      if (content.substring(u - 5, u) === "nostr") {
        const m = content.substring(u + 60).match(noCharacter);
        const end = m ? u + 60 + m.index : max;
        try {
          let pointer;
          let { data, type } = decode2(content.substring(u + 1, end));
          switch (type) {
            case "npub":
              pointer = { pubkey: data };
              break;
            case "nsec":
            case "note":
              index = end + 1;
              continue;
            default:
              pointer = data;
          }
          if (prevIndex !== u - 5) {
            yield { type: "text", text: content.substring(prevIndex, u - 5) };
          }
          yield { type: "reference", pointer };
          index = end;
          prevIndex = index;
          continue;
        } catch (_err) {
          index = u + 1;
          continue;
        }
      } else if (content.substring(u - 5, u) === "https" || content.substring(u - 4, u) === "http") {
        const m = content.substring(u + 4).match(noURLCharacter);
        const end = m ? u + 4 + m.index : max;
        const prefixLen = content[u - 1] === "s" ? 5 : 4;
        try {
          let url = new URL(content.substring(u - prefixLen, end));
          if (url.hostname.indexOf(".") === -1) {
            throw new Error("invalid url");
          }
          if (prevIndex !== u - prefixLen) {
            yield { type: "text", text: content.substring(prevIndex, u - prefixLen) };
          }
          if (/\.(png|jpe?g|gif|webp)$/i.test(url.pathname)) {
            yield { type: "image", url: url.toString() };
            index = end;
            prevIndex = index;
            continue;
          }
          if (/\.(mp4|avi|webm|mkv)$/i.test(url.pathname)) {
            yield { type: "video", url: url.toString() };
            index = end;
            prevIndex = index;
            continue;
          }
          if (/\.(mp3|aac|ogg|opus)$/i.test(url.pathname)) {
            yield { type: "audio", url: url.toString() };
            index = end;
            prevIndex = index;
            continue;
          }
          yield { type: "url", url: url.toString() };
          index = end;
          prevIndex = index;
          continue;
        } catch (_err) {
          index = end + 1;
          continue;
        }
      } else if (content.substring(u - 3, u) === "wss" || content.substring(u - 2, u) === "ws") {
        const m = content.substring(u + 4).match(noURLCharacter);
        const end = m ? u + 4 + m.index : max;
        const prefixLen = content[u - 1] === "s" ? 3 : 2;
        try {
          let url = new URL(content.substring(u - prefixLen, end));
          if (url.hostname.indexOf(".") === -1) {
            throw new Error("invalid ws url");
          }
          if (prevIndex !== u - prefixLen) {
            yield { type: "text", text: content.substring(prevIndex, u - prefixLen) };
          }
          yield { type: "relay", url: url.toString() };
          index = end;
          prevIndex = index;
          continue;
        } catch (_err) {
          index = end + 1;
          continue;
        }
      } else {
        index = u + 1;
        continue;
      }
    }
    if (prevIndex !== max) {
      yield { type: "text", text: content.substring(prevIndex) };
    }
  }

  // text.ts
  function renderText(wrapper, content) {
    for (let block of parse2(content)) {
      switch (block.type) {
        case "text":
          let span = document.createElement("span");
          span.setAttribute("part", "text");
          span.textContent = block.text;
          wrapper.appendChild(span);
          break;
        case "reference": {
          let a = document.createElement("a");
          a.setAttribute("part", "reference");
          a.target = "_blank";
          if ("id" in block.pointer) {
            a.setAttribute("part", "nevent");
            let code = neventEncode(block.pointer);
            a.href = nostrLink(code);
            a.target = "_blank";
            a.textContent = shorten(code);
          } else if ("identifier" in block.pointer) {
            a.setAttribute("part", "naddr");
            let code = naddrEncode(block.pointer);
            a.href = nostrLink(code);
            a.target = "_blank";
            a.textContent = shorten(code);
          } else {
            a.setAttribute("part", "npub reference");
            let nprofile = nprofileEncode(block.pointer);
            a.href = nostrLink(nprofile);
            a.target = "_blank";
            let npub = npubEncode(block.pointer.pubkey);
            a.textContent = shorten(npub);
            let pp = block.pointer;
            setTimeout(async () => {
              let nu = await fetchNostrUser(pp.pubkey, pp.relays || []);
              a.textContent = nu.shortName;
            }, 10);
          }
          wrapper.appendChild(a);
          break;
        }
        case "url": {
          let a = document.createElement("a");
          a.href = block.url;
          a.textContent = shortenURL(block.url);
          a.setAttribute("part", "url");
          a.target = "_blank";
          wrapper.appendChild(a);
          break;
        }
        case "image": {
          let a = document.createElement("a");
          a.href = block.url;
          a.setAttribute("part", "image");
          let img = document.createElement("img");
          img.style.width = "100%";
          img.src = block.url;
          img.loading = "lazy";
          a.appendChild(img);
          wrapper.appendChild(a);
          break;
        }
        case "video": {
          let video = document.createElement("video");
          video.setAttribute("part", "video");
          video.style.width = "100%";
          video.src = block.url;
          video.controls = true;
          video.muted = true;
          video.playsInline = true;
          wrapper.appendChild(video);
          break;
        }
        case "audio": {
          let audio = document.createElement("audio");
          audio.setAttribute("part", "audio");
          audio.style.width = "100%";
          audio.src = block.url;
          audio.controls = true;
          wrapper.appendChild(audio);
          break;
        }
        case "relay": {
          let a = document.createElement("a");
          a.href = relayLink(block.url);
          a.setAttribute("part", "relay");
          a.target = "_blank";
          wrapper.appendChild(a);
          break;
        }
        default:
          break;
      }
    }
  }

  // nostr-note.ts
  var NostrNote = class extends HTMLElement {
    root;
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      const { shadowRoot } = this;
      this.root = document.createElement("div");
      shadowRoot.appendChild(this.root);
    }
    connectedCallback() {
      setTimeout(() => {
        let template = this.getAttribute("template") ? document.getElementById(this.getAttribute("template")) : null;
        if (template) {
          this.root.appendChild(template.content.cloneNode(true));
        } else {
          this.root.innerHTML = `
          <div part="container">
            <header part="header">
              <a part="author-link">
                <span part="author-name"></span>
                <span part="author-npub-short"></span>
              </a>
              <a part="parent-link" style="display: none">
                <span part="parent">parent</span>
              </a>
              <a part="link">
                <time part="date"></time>
              </a>
            </header>
            <div part="content"></div>
          </div>
        `;
        }
        this.set();
      }, 1);
    }
    *queryPart(name) {
      let slotted = this.querySelectorAll(`[part="${name}"]`);
      for (let i3 = 0; i3 < slotted.length; i3++) {
        yield slotted[i3];
      }
      let templated = this.root.querySelectorAll(`[part="${name}"]`);
      for (let i3 = 0; i3 < templated.length; i3++) {
        yield templated[i3];
      }
    }
    attributeChangedCallback() {
      this.set();
    }
    set = debounce(async () => {
      var evt = null;
      let eventj = this.getAttribute("event");
      if (eventj) {
        evt = JSON.parse(eventj);
        if (evt) {
          if (!verifyEvent2(evt)) {
            return;
          }
        }
      }
      if (!evt) {
        let ref = this.getAttribute("ref");
        if (ref) {
          let { type, data } = decodeNostrURI(ref);
          if (type !== "nevent") {
            return;
          }
          let d = data;
          let relays = (d.relays || []).concat(splitComma(this.getAttribute("relays")).map(normalizeURL2));
          let filter = { ids: [d.id] };
          if (d.author && relays.length === 0)
            relays = await getOutboxRelaysFor(d.author);
          evt = await pool2.get(relays, filter);
          if (!evt && d.author) {
            relays = await getOutboxRelaysFor(d.author);
            evt = await pool2.get(relays, filter);
          }
        }
      }
      if (!evt) {
        return;
      }
      let npub = npubEncode(evt.pubkey);
      for (let el of this.queryPart("author-link")) {
        el.href = nostrLink(npub);
        el.target = "_blank";
      }
      for (let el of this.queryPart("author-npub")) {
        el.textContent = npub;
      }
      var nu = null;
      for (let el of this.queryPart("author-name")) {
        if (!nu) {
          nu = await fetchNostrUser(evt.pubkey, []);
        }
        el.textContent = nu.shortName;
      }
      for (let el of this.queryPart("author-npub-short")) {
        el.textContent = shorten(npub);
      }
      let thread = null;
      for (let el of this.queryPart("parent-link")) {
        if (!thread)
          thread = parse(evt);
        if (thread.reply) {
          el.href = nostrLink(neventEncode(thread.reply));
          el.target = "_blank";
          el.style.display = "";
        } else {
          el.remove();
        }
      }
      for (let el of this.queryPart("root-link")) {
        if (!thread)
          thread = parse(evt);
        if (thread.root) {
          el.href = nostrLink(neventEncode(thread.root));
          el.target = "_blank";
        } else {
          el.remove();
        }
      }
      for (let el of this.queryPart("link")) {
        el.href = nostrLink(
          neventEncode({
            id: evt.id,
            relays: Array.from(pool2.seenOn.get(evt.id) || []).slice(0, 3).map((r) => r.url),
            author: evt.pubkey
          })
        );
        el.target = "_blank";
      }
      for (let el of this.queryPart("date")) {
        let date = new Date(evt.created_at * 1e3);
        el.textContent = date.toLocaleString();
        if (el.tagName === "TIME") {
          el.setAttribute("time", date.toISOString().substring(0, 23));
        }
      }
      let contentWrapper = null;
      for (let el of this.queryPart("content")) {
        if (!contentWrapper) {
          contentWrapper = document.createElement("div");
          el.appendChild(contentWrapper);
        }
        renderText(contentWrapper, evt.content);
      }
    }, 200);
  };
  __publicField(NostrNote, "observedAttributes", ["ref", "event", "relays", "template"]);
  window.customElements.define("nostr-note", NostrNote);

  // nostr-text.ts
  var NostrText = class extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
    }
    connectedCallback() {
      this.set();
    }
    attributeChangedCallback() {
      this.set();
    }
    async set() {
      const { shadowRoot } = this;
      if (!shadowRoot)
        return;
      const content = this.getAttribute("content") || "";
      shadowRoot.innerHTML = "";
      renderText(shadowRoot, content);
    }
  };
  __publicField(NostrText, "observedAttributes", ["content"]);
  window.customElements.define("nostr-text", NostrText);

  // nostr-follow.ts
  var NostrFollow = class extends HTMLElement {
    button;
    slotDefault;
    slotLoading;
    slotSuccess;
    slotFailure;
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      const { shadowRoot } = this;
      this.button = document.createElement("button");
      this.button.setAttribute("part", "button");
      this.button.onclick = this.handleClick.bind(this);
      this.slotDefault = document.createElement("slot");
      this.slotDefault.textContent = "Follow me on Nostr!";
      this.button.appendChild(this.slotDefault);
      this.slotLoading = document.createElement("slot");
      this.slotLoading.name = "loading";
      this.slotLoading.style.display = "none";
      this.slotLoading.textContent = "Following...";
      this.button.appendChild(this.slotLoading);
      this.slotSuccess = document.createElement("slot");
      this.slotSuccess.name = "success";
      this.slotSuccess.style.display = "none";
      this.slotSuccess.textContent = "Followed.";
      this.button.appendChild(this.slotSuccess);
      this.slotFailure = document.createElement("slot");
      this.slotFailure.name = "failure";
      this.slotFailure.style.display = "none";
      this.slotFailure.textContent = "Error: ";
      this.button.appendChild(this.slotFailure);
      const errorMessage = document.createElement("span");
      errorMessage.setAttribute("part", "error-message");
      this.slotFailure.appendChild(errorMessage);
      shadowRoot.appendChild(this.button);
    }
    *queryPart(name) {
      let slotted = this.button.querySelectorAll(`[part="${name}"]`);
      for (let i3 = 0; i3 < slotted.length; i3++) {
        yield slotted[i3];
      }
      let slotted2 = this.querySelectorAll(`[part="${name}"]`);
      for (let i3 = 0; i3 < slotted2.length; i3++) {
        yield slotted2[i3];
      }
    }
    async handleClick() {
      const [target, hints2] = await inputToPubkey(this.getAttribute("pubkey"));
      if (!target)
        return;
      this.button.onclick = null;
      this.button.disabled = true;
      this.slotLoading.style.display = "";
      this.slotDefault.style.display = "none";
      try {
        const publicKey = await (await getWindowNostr()).getPublicKey();
        const relays = await getOutboxRelaysFor(publicKey);
        relays.push(...hints2);
        const res = await pool2.querySync(relays, {
          kinds: [3],
          authors: [publicKey]
        });
        if (res.length === 0) {
          throw new Error("couldn't find your contact list");
        }
        const event = res[0];
        if (event.tags.find((tag) => tag[1] === target)) {
          this.slotLoading.style.display = "none";
          this.slotSuccess.style.display = "";
          this.dispatchEvent(
            new CustomEvent("success", {
              bubbles: true,
              detail: { already: true }
            })
          );
          return;
        }
        event.tags.push(["p", target, relays[0]]);
        event.created_at = Math.round(Date.now() / 1e3);
        const signedEvent = await (await getWindowNostr()).signEvent(event);
        await Promise.any(pool2.publish(relays, signedEvent));
        this.slotLoading.style.display = "none";
        this.slotSuccess.style.display = "";
        this.dispatchEvent(
          new CustomEvent("success", {
            bubbles: true,
            detail: { already: false }
          })
        );
      } catch (error) {
        console.warn("failed to follow:", error);
        this.slotLoading.style.display = "none";
        this.slotFailure.style.display = "";
        this.dispatchEvent(
          new CustomEvent("failure", {
            bubbles: true,
            detail: { message: String(error) }
          })
        );
        for (let el of this.queryPart("error-message")) {
          let msg = String(error);
          if (msg.startsWith("Error:")) {
            msg = msg.substring(6);
          }
          el.textContent = msg.trim();
        }
      }
    }
  };
  __publicField(NostrFollow, "observedAttributes", ["pubkey"]);
  window.customElements.define("nostr-follow", NostrFollow);
})();
