export type Primitive = string | number | boolean | bigint | symbol | undefined | null;
export type Builtin = Primitive | Function | Date | Error | RegExp | Uint8Array;

export type ReadonlyDeep<T> = T extends Builtin
  ? T
  : T extends ReadonlyMap<infer K, infer V>
    ? ReadonlyMap<ReadonlyDeep<K>, ReadonlyDeep<V>>
    : T extends ReadonlySet<infer U>
      ? ReadonlySet<ReadonlyDeep<U>>
      : T extends readonly (infer U)[]
        ? readonly ReadonlyDeep<U>[]
        : T extends object
          ? { readonly [K in keyof T]: ReadonlyDeep<T[K]> }
          : T;

export function deepFreeze<T>(value: T): ReadonlyDeep<T> {
  if (
    value === null ||
    typeof value !== 'object' ||
    Object.isFrozen(value) ||
    ArrayBuffer.isView(value) ||
    value instanceof Date
  ) {
    return value as ReadonlyDeep<T>;
  }

  const propNames = Object.getOwnPropertyNames(value) as Array<keyof T>;
  for (const name of propNames) {
    const prop = value[name];
    if (prop !== null && typeof prop === 'object') {
      deepFreeze(prop);
    }
  }
  return Object.freeze(value) as ReadonlyDeep<T>;
}

declare const __brand: unique symbol;
export type Brand<T, B extends string> = T & { readonly [__brand]: B };

export type SectorId = Brand<string, 'SectorId'>;
export type RegionId = Brand<string, 'RegionId'>;
export type ProvinceId = Brand<string, 'ProvinceId'>;
export type CountryIso2 = Brand<string, 'CountryIso2'>;
export type MatchId = Brand<string, 'MatchId'>;
export type BattleSessionId = Brand<string, 'BattleSessionId'>;
export type ClanId = Brand<string, 'ClanId'>;
export type UserId = Brand<string, 'UserId'>;
export type CommanderId = Brand<string, 'CommanderId'>;
export type Hp100 = Brand<number, 'Hp100'>;
export type AliveHp100 = Brand<number, 'AliveHp100'>;
export type TcpPoints = Brand<number, 'TcpPoints'>;
export type DeterministicSeed = Brand<number, 'DeterministicSeed'>;
export type TurnNumber = Brand<number, 'TurnNumber'>;
export type IsoTimestamp = Brand<string, 'IsoTimestamp'>;

export interface ValidationIssue {
  readonly path: string;
  readonly message: string;
}

export interface ParseSuccess<T> {
  readonly success: true;
  readonly data: T;
}

export interface ParseFailure {
  readonly success: false;
  readonly issues: readonly ValidationIssue[];
}

export type SafeParseResult<T> = ParseSuccess<T> | ParseFailure;

export function isParseFailure<T>(result: SafeParseResult<T>): result is ParseFailure {
  return result.success === false;
}

export class ContractValidationError extends Error {
  public readonly issues: readonly ValidationIssue[];
  constructor(contractName: string, issues: readonly ValidationIssue[]) {
    const summary = issues.map((i) => `${i.path || '<root>'}: ${i.message}`).join('; ');
    super(`[ContractViolation:${contractName}] ${summary}`);
    this.name = 'ContractValidationError';
    this.issues = deepFreeze([...issues]);
  }
}

export class Schema<T> {
  public readonly name: string;
  private readonly validator: (input: unknown, path: string) => SafeParseResult<T>;

  constructor(name: string, validator: (input: unknown, path: string) => SafeParseResult<T>) {
    this.name = name;
    this.validator = validator;
  }

  public safeParse(input: unknown, path: string = ''): SafeParseResult<T> {
    return this.validator(input, path);
  }

  public parse(input: unknown): T {
    const res = this.validator(input, '');
    if (isParseFailure(res)) {
      throw new ContractValidationError(this.name, res.issues);
    }
    return res.data;
  }

  public parseFrozen(input: unknown): ReadonlyDeep<T> {
    return deepFreeze(this.parse(input));
  }

  public is(input: unknown): input is T {
    return this.validator(input, '').success;
  }

  public refine(predicate: (val: T) => boolean, message: string): Schema<T> {
    return new Schema<T>(this.name, (input, path) => {
      const base = this.validator(input, path);
      if (isParseFailure(base)) return base;
      if (!predicate(base.data)) {
        return { success: false, issues: [{ path, message }] };
      }
      return base;
    });
  }

  public brand<B extends string>(brandName: B): Schema<Brand<T, B>> {
    return new Schema<Brand<T, B>>(brandName, (input, path) => {
      const base = this.validator(input, path);
      if (isParseFailure(base)) return base;
      return { success: true, data: base.data as Brand<T, B> };
    });
  }

  public nullable(): Schema<T | null> {
    return new Schema<T | null>(`${this.name}|null`, (input, path) => {
      if (input === null) return { success: true, data: null };
      return this.validator(input, path);
    });
  }

  public optional(): Schema<T | undefined> {
    return new Schema<T | undefined>(`${this.name}|undefined`, (input, path) => {
      if (input === undefined) return { success: true, data: undefined };
      return this.validator(input, path);
    });
  }
}

export type Infer<S extends Schema<unknown>> = S extends Schema<infer T> ? T : never;

type ObjectShape = Record<string, Schema<unknown>>;
type InferShape<S extends ObjectShape> = {
  readonly [K in keyof S]: S[K] extends Schema<infer V> ? V : never;
};

export const s = {
  string: (minLen: number = 0, maxLen: number = Infinity): Schema<string> =>
    new Schema<string>('string', (input, path) => {
      if (typeof input !== 'string') {
        return { success: false, issues: [{ path, message: `Expected string, got ${typeof input}` }] };
      }
      if (input.length < minLen || input.length > maxLen) {
        return {
          success: false,
          issues: [{ path, message: `String length ${input.length} outside [${minLen}, ${maxLen}]` }],
        };
      }
      return { success: true, data: input };
    }),

  number: (min: number = -Infinity, max: number = Infinity): Schema<number> =>
    new Schema<number>('number', (input, path) => {
      if (typeof input !== 'number' || !Number.isFinite(input)) {
        return { success: false, issues: [{ path, message: 'Expected finite number' }] };
      }
      if (input < min || input > max) {
        return { success: false, issues: [{ path, message: `Number ${input} outside [${min}, ${max}]` }] };
      }
      return { success: true, data: input };
    }),

  int: (min: number = Number.MIN_SAFE_INTEGER, max: number = Number.MAX_SAFE_INTEGER): Schema<number> =>
    s.number(min, max).refine((n) => Number.isInteger(n), 'Expected safe integer'),

  boolean: (): Schema<boolean> =>
    new Schema<boolean>('boolean', (input, path) =>
      typeof input === 'boolean'
        ? { success: true, data: input }
        : { success: false, issues: [{ path, message: `Expected boolean, got ${typeof input}` }] }
    ),

  literal: <const L extends string | number | boolean>(expected: L): Schema<L> =>
    new Schema<L>(`literal(${String(expected)})`, (input, path) =>
      input === expected
        ? { success: true, data: expected }
        : { success: false, issues: [{ path, message: `Expected literal ${String(expected)}, got ${String(input)}` }] }
    ),

  enumValues: <const T extends readonly [string, ...string[]]>(values: T): Schema<T[number]> => {
    const allowed = new Set<string>(values);
    return new Schema<T[number]>(`enum(${values.join('|')})`, (input, path) =>
      typeof input === 'string' && allowed.has(input)
        ? { success: true, data: input as T[number] }
        : { success: false, issues: [{ path, message: `Expected one of [${values.join(', ')}], got ${String(input)}` }] }
    );
  },

  intLiteralUnion: <const T extends readonly [number, ...number[]]>(values: T): Schema<T[number]> => {
    const allowed = new Set<number>(values);
    return new Schema<T[number]>(`intUnion(${values.join('|')})`, (input, path) =>
      typeof input === 'number' && allowed.has(input)
        ? { success: true, data: input as T[number] }
        : { success: false, issues: [{ path, message: `Expected one of [${values.join(', ')}], got ${String(input)}` }] }
    );
  },

  tuple2: <A, B>(sa: Schema<A>, sb: Schema<B>): Schema<readonly [A, B]> =>
    new Schema<readonly [A, B]>('tuple2', (input, path) => {
      if (!Array.isArray(input) || input.length !== 2) {
        return { success: false, issues: [{ path, message: 'Expected 2-tuple array' }] };
      }
      const r0 = sa.safeParse(input[0], `${path}[0]`);
      const r1 = sb.safeParse(input[1], `${path}[1]`);
      if (isParseFailure(r0) || isParseFailure(r1)) {
        return {
          success: false,
          issues: [
            ...(isParseFailure(r0) ? r0.issues : []),
            ...(isParseFailure(r1) ? r1.issues : []),
          ],
        };
      }
      return { success: true, data: [r0.data, r1.data] as const };
    }),

  tuple4: <A>(sa: Schema<A>): Schema<readonly [A, A, A, A]> =>
    new Schema<readonly [A, A, A, A]>('tuple4', (input, path) => {
      if (!Array.isArray(input) || input.length !== 4) {
        return { success: false, issues: [{ path, message: 'Expected 4-tuple array' }] };
      }
      const out: A[] = [];
      const issues: ValidationIssue[] = [];
      for (let i = 0; i < 4; i++) {
        const ri = sa.safeParse(input[i], `${path}[${i}]`);
        if (isParseFailure(ri)) issues.push(...ri.issues);
        else out.push(ri.data);
      }
      if (issues.length > 0) return { success: false, issues };
      return { success: true, data: [out[0]!, out[1]!, out[2]!, out[3]!] as const };
    }),

  array: <U>(itemSchema: Schema<U>, maxItems: number = 10000): Schema<readonly U[]> =>
    new Schema<readonly U[]>(`Array<${itemSchema.name}>`, (input, path) => {
      if (!Array.isArray(input)) {
        return { success: false, issues: [{ path, message: 'Expected array' }] };
      }
      if (input.length > maxItems) {
        return { success: false, issues: [{ path, message: `Array length ${input.length} exceeds ${maxItems}` }] };
      }
      const out: U[] = [];
      const issues: ValidationIssue[] = [];
      for (let i = 0; i < input.length; i++) {
        const ri = itemSchema.safeParse(input[i], `${path}[${i}]`);
        if (isParseFailure(ri)) issues.push(...ri.issues);
        else out.push(ri.data);
      }
      return issues.length > 0 ? { success: false, issues } : { success: true, data: out };
    }),

  record: <K extends string, V>(keySchema: Schema<K>, valSchema: Schema<V>): Schema<Readonly<Record<K, V>>> =>
    new Schema<Readonly<Record<K, V>>>(`Record<${keySchema.name},${valSchema.name}>`, (input, path) => {
      if (input === null || typeof input !== 'object' || Array.isArray(input)) {
        return { success: false, issues: [{ path, message: 'Expected plain object record' }] };
      }
      const out: Record<string, V> = {};
      const issues: ValidationIssue[] = [];
      for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
        const rk = keySchema.safeParse(k, `${path}.${k}(key)`);
        const rv = valSchema.safeParse(v, path ? `${path}.${k}` : k);
        if (isParseFailure(rk)) issues.push(...rk.issues);
        if (isParseFailure(rv)) issues.push(...rv.issues);
        if (!isParseFailure(rk) && !isParseFailure(rv)) {
          out[rk.data] = rv.data;
        }
      }
      return issues.length > 0
        ? { success: false, issues }
        : { success: true, data: out as Readonly<Record<K, V>> };
    }),

  object: <S extends ObjectShape>(name: string, shape: S): Schema<InferShape<S>> =>
    new Schema<InferShape<S>>(name, (input, path) => {
      if (input === null || typeof input !== 'object' || Array.isArray(input)) {
        return { success: false, issues: [{ path, message: `Expected object for ${name}` }] };
      }
      const raw = input as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      const issues: ValidationIssue[] = [];
      for (const key of Object.keys(shape)) {
        const fieldSchema = shape[key]!;
        const fieldPath = path ? `${path}.${key}` : key;
        const res = fieldSchema.safeParse(raw[key], fieldPath);
        if (isParseFailure(res)) {
          issues.push(...res.issues);
        } else {
          out[key] = res.data;
        }
      }
      return issues.length > 0
        ? { success: false, issues }
        : { success: true, data: out as InferShape<S> };
    }),
};

export const Primitives = {
  SectorId: s.string(3, 64).brand('SectorId'),
  RegionId: s.string(3, 32).brand('RegionId'),
  ProvinceId: s.string(2, 32).brand('ProvinceId'),
  CountryIso2: s.string(2, 2).refine((c) => /^[A-Z]{2}$/.test(c), 'Must be ISO-3166 alpha-2').brand('CountryIso2'),
  MatchId: s.string(3, 128).brand('MatchId'),
  BattleSessionId: s.string(3, 128).brand('BattleSessionId'),
  ClanId: s.string(2, 64).brand('ClanId'),
  UserId: s.string(2, 64).brand('UserId'),
  CommanderId: s.string(2, 32).brand('CommanderId'),
  Hp100: s.int(0, 100).brand('Hp100'),
  AliveHp100: s.int(1, 100).brand('AliveHp100'),
  TcpPoints: s.int(0, 15000).brand('TcpPoints'),
  DeterministicSeed: s.int(0, 0xffffffff).brand('DeterministicSeed'),
  TurnNumber: s.int(1, 999).brand('TurnNumber'),
  IsoTimestamp: s
    .string(10, 64)
    .refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid ISO-8601 timestamp')
    .brand('IsoTimestamp'),
} as const;
