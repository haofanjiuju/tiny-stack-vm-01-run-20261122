// Tiny stack VM: one run answers every instance of a set.
// For each /input/<id>/ (program.bin + input.bin) it writes
// /output/<id>/stdout.bin and /output/<id>/exit.txt.
// Semantics follow make.fun's tiny stack ISA exactly: 32-bit wrapping
// integers, a 256-value stack, a 64-deep call stack, 256 words of memory,
// and traps 2-11 with their own exit codes.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Opcode table: imm length + 1 per valid opcode, 0 for an unknown opcode.
// Valid: 00-07, 10-22 except 1F, 30-34, 40-41, 50-53.
const V = new Uint8Array(256);
for (let i = 0; i < 8; i++) V[i] = 1;
for (let i = 0x10; i <= 0x22; i++) V[i] = 1;
V[0x1f] = 0;
V[1] = 2;
V[2] = 5;
for (let i = 0x30; i <= 0x34; i++) V[i] = 1;
for (let i = 0x30; i <= 0x33; i++) V[i] = 3;
V[0x40] = 1;
V[0x41] = 1;
for (let i = 0x50; i <= 0x53; i++) V[i] = 1;

function run(p, inp) {
  const n = p.length;
  const D = new Int32Array(256);
  const C = new Int32Array(64);
  const M = new Int32Array(256);
  const out = new Uint8Array(65536);
  let sp = 0, cp = 0, ol = 0, ip = 0, pc = 0, steps = 0;
  const done = (e) => [e, out.slice(0, ol)];
  for (;;) {
    if (steps === 1000000) return done(10);
    if (pc < 0 || pc >= n) return done(9);
    const op = p[pc];
    const v = V[op];
    if (v === 0) return done(5);
    const imm = v - 1;
    if (pc + imm >= n) return done(9);
    steps++;
    const nx = pc + 1 + imm;
    pc = nx;
    switch (op) {
      case 0x00:
        return done(0);
      case 0x01:
        if (sp === 256) return done(3);
        D[sp++] = (p[nx - 1] << 24) >> 24;
        break;
      case 0x02:
        if (sp === 256) return done(3);
        D[sp++] = p[nx - 4] | (p[nx - 3] << 8) | (p[nx - 2] << 16) | (p[nx - 1] << 24);
        break;
      case 0x03:
        if (sp < 1) return done(2);
        sp--;
        break;
      case 0x04:
        if (sp < 1) return done(2);
        if (sp === 256) return done(3);
        D[sp] = D[sp - 1];
        sp++;
        break;
      case 0x05: {
        if (sp < 2) return done(2);
        const t = D[sp - 1];
        D[sp - 1] = D[sp - 2];
        D[sp - 2] = t;
        break;
      }
      case 0x06:
        if (sp < 2) return done(2);
        if (sp === 256) return done(3);
        D[sp] = D[sp - 2];
        sp++;
        break;
      case 0x07: {
        if (sp < 3) return done(2);
        const a = D[sp - 3];
        D[sp - 3] = D[sp - 2];
        D[sp - 2] = D[sp - 1];
        D[sp - 1] = a;
        break;
      }
      case 0x17:
        if (sp < 1) return done(2);
        D[sp - 1] = (-D[sp - 1]) | 0;
        break;
      case 0x1b:
        if (sp < 1) return done(2);
        D[sp - 1] = ~D[sp - 1];
        break;
      case 0x30:
      case 0x31:
      case 0x32: {
        const rel = ((p[nx - 2] | (p[nx - 1] << 8)) << 16) >> 16;
        if (op === 0x30) {
          pc = nx + rel;
          break;
        }
        if (sp < 1) return done(2);
        const t = D[--sp];
        if ((op === 0x31) === (t === 0)) pc = nx + rel;
        break;
      }
      case 0x33:
        if (cp === 64) return done(7);
        C[cp++] = nx;
        pc = p[nx - 2] | (p[nx - 1] << 8);
        break;
      case 0x34:
        if (cp === 0) return done(8);
        pc = C[--cp];
        break;
      case 0x40:
        if (sp < 1) return done(2);
        if (D[sp - 1] < 0 || D[sp - 1] >= 256) return done(6);
        D[sp - 1] = M[D[sp - 1]];
        break;
      case 0x41: {
        if (sp < 2) return done(2);
        const a = D[sp - 1];
        const w = D[sp - 2];
        if (a < 0 || a >= 256) return done(6);
        sp -= 2;
        M[a] = w;
        break;
      }
      case 0x50: {
        if (sp < 1) return done(2);
        const s = String(D[sp - 1]);
        if (ol + s.length > 65536) return done(11);
        sp--;
        for (let i = 0; i < s.length; i++) out[ol++] = s.charCodeAt(i);
        break;
      }
      case 0x51:
        if (sp < 1) return done(2);
        if (ol + 1 > 65536) return done(11);
        out[ol++] = D[--sp] & 255;
        break;
      case 0x52:
        if (sp === 256) return done(3);
        D[sp++] = ip < inp.length ? inp[ip++] : -1;
        break;
      case 0x53:
        if (sp < 1) return done(2);
        return done(D[--sp] & 255);
      default: {
        // Binary ops: 10-16, 18-1A, 1C-1E, 20-22.
        if (sp < 2) return done(2);
        const b = D[sp - 1];
        const a = D[sp - 2];
        let r;
        if (op === 0x10) r = (a + b) | 0;
        else if (op === 0x11) r = (a - b) | 0;
        else if (op === 0x12) r = Math.imul(a, b);
        else if (op === 0x13) {
          if (b === 0) return done(4);
          r = a === -2147483648 && b === -1 ? a : (a / b) | 0;
        } else if (op === 0x14) {
          if (b === 0) return done(4);
          r = b === -1 ? 0 : (a % b) | 0;
        } else if (op === 0x15) {
          if (b === 0) return done(4);
          r = Math.floor((a >>> 0) / (b >>> 0)) | 0;
        } else if (op === 0x16) {
          if (b === 0) return done(4);
          r = ((a >>> 0) % (b >>> 0)) | 0;
        } else if (op === 0x18) r = a & b;
        else if (op === 0x19) r = a | b;
        else if (op === 0x1a) r = a ^ b;
        else if (op === 0x1c) r = a << (b & 31);
        else if (op === 0x1d) r = a >> (b & 31);
        else if (op === 0x1e) r = (a >>> (b & 31)) | 0;
        else if (op === 0x20) r = a === b ? 1 : 0;
        else if (op === 0x21) r = a < b ? 1 : 0;
        else r = (a >>> 0) < (b >>> 0) ? 1 : 0;
        D[sp - 2] = r;
        sp--;
        break;
      }
    }
  }
}

const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (const id of readdirSync(I).sort()) {
  let e = 0;
  let o = new Uint8Array(0);
  try {
    [e, o] = run(readFileSync(join(I, id, 'program.bin')), readFileSync(join(I, id, 'input.bin')));
  } catch {
    e = 0;
    o = new Uint8Array(0);
  }
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, 'stdout.bin'), o);
  writeFileSync(join(O, id, 'exit.txt'), e + '\n');
}
