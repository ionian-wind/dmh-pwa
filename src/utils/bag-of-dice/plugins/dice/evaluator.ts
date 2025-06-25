import { DiceAST, ModifierAST } from './converters';

function rollDie(sides: number, rng: () => number): number {
  return Math.floor(rng() * sides) + 1;
}

function rollFudge(fudgeType: number, rng: () => number): number {
  // dF: 0 = standard (-1,0,1), 1 = (-1,0), 2 = (-1,0,1), 3 = (-1,-1,0,1,1,1)
  if (fudgeType === 3) {
    const arr = [-1, -1, 0, 1, 1, 1];
    return arr[Math.floor(rng() * arr.length)];
  } else if (fudgeType === 1) {
    return rng() < 0.5 ? -1 : 0;
  } else {
    // default or 2
    return [-1, 0, 1][Math.floor(rng() * 3)];
  }
}

function applyModifiers(result: any, modifiers: ModifierAST[] | undefined, rng?: () => number): any {
  if (!modifiers || modifiers.length === 0) return result;
  let res = result;
  let warnings: string[] = [];
  for (const mod of modifiers) {
    // --- Keep/Drop ---
    if (mod.type === 'Kh') {
      const n = parseInt(mod.value.slice(2), 10);
      res = [...res].sort((a, b) => b - a).slice(0, n);
    } else if (mod.type === 'Kl') {
      const n = parseInt(mod.value.slice(2), 10);
      res = [...res].sort((a, b) => a - b).slice(0, n);
    } else if (mod.type === 'Dh') {
      const n = parseInt(mod.value.slice(2), 10);
      res = [...res].sort((a, b) => b - a).slice(n);
    } else if (mod.type === 'Dl') {
      const n = parseInt(mod.value.slice(2), 10);
      res = [...res].sort((a, b) => a - b).slice(n);
    }
    // --- Sorting ---
    else if (mod.type === 'Sa') {
      res = [...res].sort((a, b) => a - b);
    } else if (mod.type === 'Sd') {
      res = [...res].sort((a, b) => b - a);
    }
    // --- Set Min/Max per die ---
    else if (mod.type === 'Mi') {
      const n = parseInt(mod.value.slice(2), 10);
      res = res.map((v: number) => Math.max(v, n));
    } else if (mod.type === 'Ma') {
      const n = parseInt(mod.value.slice(2), 10);
      res = res.map((v: number) => Math.min(v, n));
    }
    // --- Rerolling ---
    else if (mod.type === 'Reroll') {
      if (!rng) throw new Error('RNG required for reroll modifiers');
      const m = mod.value.match(/r(o)?(a)?([<>=]?)(\d+)/);
      if (!m) continue;
      const [_, once, until, op, numStr] = m;
      const num = parseInt(numStr, 10);
      const opChar = op || '=';
      let rerollLimit = 99;
      let rerollCount = 0;
      res = res.map((v: number) => {
        let value = v;
        let rerollTimes = 0;
        while (rerollTimes < rerollLimit) {
          let match = false;
          if (opChar === '<') match = value < num;
          else if (opChar === '>') match = value > num;
          else if (opChar === '=') match = value === num;
          else match = value === num;
          if (!match) break;
          rerollTimes++;
          rerollCount++;
          value = Math.floor(rng() * 6) + 1; // Default to d6 for reroll, ideally should know sides
          if (once) break;
          if (until) continue;
        }
        return value;
      });
      if (rerollCount >= rerollLimit) warnings.push('Reroll limit reached');
    }
    // --- Exploding ---
    else if (mod.type === 'Explode') {
      if (!rng) throw new Error('RNG required for explode modifiers');
      let pattern = mod.value;
      let compound = false, penetrate = false, custom = false;
      let op = 'max', val: number | null = null;
      if (pattern.startsWith('!!')) compound = true;
      else if (pattern.startsWith('!p')) penetrate = true;
      else if (pattern.startsWith('!')) {
        const m = pattern.match(/!([<>=]?)(\d+)?/);
        if (m && m[2]) {
          custom = true;
          op = m[1] || '=';
          val = parseInt(m[2], 10);
        }
      }
      const explodeLimit = 99;
      let explodeCount = 0;
      let newRes: number[] = [];
      for (let v of res) {
        let values = [v];
        let current = v;
        let penetrations = 0;
        while (explodeCount < explodeLimit) {
          let match = false;
          if (!custom && op === 'max') {
            match = current === Math.max(...res);
          } else if (op === '<' && val !== null) match = current < val;
          else if (op === '>' && val !== null) match = current > val;
          else if (op === '=' && val !== null) match = current === val;
          else if (op === '!' && val !== null) match = current !== val;
          if (!match) break;
          explodeCount++;
          let next = Math.floor(rng() * 6) + 1; // Default to d6, ideally should know sides
          if (penetrate) next = Math.max(1, next - penetrations);
          if (compound) values[values.length - 1] += next;
          else values.push(next);
          current = next;
          if (!compound && !penetrate && !custom) break;
          if (penetrate) penetrations++;
        }
        newRes.push(...values);
      }
      if (explodeCount >= explodeLimit) warnings.push('Explosion limit reached');
      res = newRes;
    }
    // --- Counting/Success/Failure ---
    else if (mod.type === 'Equal') {
      const n = parseInt(mod.value.slice(1), 10);
      res = res.filter((v: number) => v === n).length;
    } else if (mod.type === 'Success') {
      const n = parseInt(mod.value.slice(1), 10);
      res = res.filter((v: number) => v > n).length;
    } else if (mod.type === 'Failure') {
      const n = parseInt(mod.value.slice(1), 10);
      res = res.filter((v: number) => v < n).length;
    } else if (mod.type === 'S') {
      // 's' counts as success, should be used after >N, <N, =N
      // If res is a number, treat as success count
      res = res;
    } else if (mod.type === 'F') {
      // 'f' counts as failure, should be used after >N, <N, =N
      res = res;
    }
    // --- Criticals ---
    else if (mod.type === 'Cs') {
      // cs>=N, cs>N, cs=N
      const m = mod.value.match(/cs([><=]+)(\d+)/);
      if (m) {
        const op = m[1];
        const n = parseInt(m[2], 10);
        if (op === '>=') res = res.filter((v: number) => v >= n).length;
        else if (op === '>') res = res.filter((v: number) => v > n).length;
        else if (op === '<=') res = res.filter((v: number) => v <= n).length;
        else if (op === '<') res = res.filter((v: number) => v < n).length;
        else if (op === '=') res = res.filter((v: number) => v === n).length;
      }
    } else if (mod.type === 'Cf') {
      // cf<=N, cf<N, cf=N
      const m = mod.value.match(/cf([><=]+)(\d+)/);
      if (m) {
        const op = m[1];
        const n = parseInt(m[2], 10);
        if (op === '>=') res = res.filter((v: number) => v >= n).length;
        else if (op === '>') res = res.filter((v: number) => v > n).length;
        else if (op === '<=') res = res.filter((v: number) => v <= n).length;
        else if (op === '<') res = res.filter((v: number) => v < n).length;
        else if (op === '=') res = res.filter((v: number) => v === n).length;
      }
    }
    // --- Keep above/below ---
    else if (mod.type === 'Kgt') {
      const n = parseInt(mod.value.slice(2), 10);
      res = res.filter((v: number) => v > n);
    } else if (mod.type === 'Klt') {
      const n = parseInt(mod.value.slice(2), 10);
      res = res.filter((v: number) => v < n);
    }
    // --- Matching ---
    else if (mod.type === 'M') {
      // Find matching dice results (group by value)
      const counts: Record<number, number> = {};
      for (const v of res) counts[v] = (counts[v] || 0) + 1;
      res = Object.entries(counts)
        .filter(([_, c]) => c > 1)
        .map(([v, c]) => ({ value: Number(v), count: c }))
        .sort((a, b) => b.count - a.count || b.value - a.value); // Sort by count desc, then value desc
    }
    // --- Exhaustive ---
    else if (mod.type === 'E') {
      // Not fully specified in spec, treat as count of unique values
      res = Array.from(new Set(res)).length;
    }
  }
  return res;
}

export function evaluateDiceAst(ast: DiceAST, rng: () => number = Math.random, ...args: any[]): any {
  if (ast.type === 'Group') {
    const isOnce = ast.modifiers?.some(m => m.type === 'O');
    let result;
    if (isOnce) {
      // Cache for unique dice/group ASTs
      const cache = new Map<string, any>();
      result = ast.items.map(item => {
        const key = JSON.stringify(item);
        if (cache.has(key)) {
          return cache.get(key);
        } else {
          const val = evaluateDiceAst(item, rng, cache);
          cache.set(key, val);
          return val;
        }
      });
      const otherModifiers = ast.modifiers?.filter(m => m.type !== 'O');
      result = applyModifiers(result, otherModifiers, rng);
    } else {
      result = ast.items.map(item => evaluateDiceAst(item, rng, ...args));
      const otherModifiers = ast.modifiers?.filter(m => m.type !== 'O');
      result = applyModifiers(result, otherModifiers, rng);
    }
    return result;
  }
  if (ast.type === 'Dice') {
    const key = `c:${ast.count ?? 1},s:${ast.sides},f:${ast.fudge},cust:${ast.custom?.join(',')}`;
    let rolls: number[];
    const cache = args[0];
    if (cache?.has(key)) {
      rolls = [...cache.get(key)!]; // Use a copy to avoid downstream mutation
    } else {
      const count = ast.count ?? 1;
      if (count < 1) throw new Error('Must roll at least 1 die');
      if (ast.sides) {
        if (ast.sides < 1) throw new Error('Dice must have at least 1 side');
        rolls = Array.from({ length: count }, () => rollDie(ast.sides!, rng));
      } else if (ast.fudge !== null) {
        rolls = Array.from({ length: count }, () => rollFudge(ast.fudge!, rng));
      } else if (ast.custom) {
        if (ast.custom.length === 0) throw new Error('Custom dice must have at least 1 value');
        rolls = Array.from({ length: count }, () => {
          const idx = Math.floor(rng() * ast.custom!.length);
          return ast.custom![idx];
        });
      } else {
        throw new Error('Invalid dice expression');
      }
      if (cache) {
        cache.set(key, [...rolls]); // Store a copy
      }
    }
    const result = applyModifiers(rolls, ast.modifiers, rng);
    return result;
  }
  throw new Error('Unknown AST node');
} 