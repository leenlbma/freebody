// FreeBody 数据模型（与 docs/data-model.md 对应），只用于 tsc --checkJs 类型检查，不参与构建。
// 字段多为可选：旧数据与导入包可能缺省；新增字段请同步 docs/data-model.md。
type YMD = string; // YYYY-MM-DD
type HM = string; // HH:MM

interface Nutri {
  kcal?: number;
  p?: number;
  c?: number;
  f?: number;
  na?: number;
  fib?: number;
}
interface Meal extends Nutri {
  id: string;
  date: YMD;
  meal: string;
  food?: string;
  /** CSV 导入的旧记录只有 food */
  name?: string;
  foodId?: string;
  amount?: number;
  unit?: string;
  g?: number;
  nutrimentsPer100g?: Nutri;
  src?: string;
  via?: string;
  est?: boolean;
  imp?: string;
  lo?: number;
  hi?: number;
  kcalOnly?: boolean;
  note?: string;
  [k: string]: any;
}
interface Food extends Nutri {
  id: string;
  name: string;
  category?: string;
  servings?: { unit: string; g: number }[];
  source?: string;
  ref?: string;
  custom?: boolean;
  combo?: string;
  [k: string]: any;
}
interface Workout {
  id: string;
  date: YMD;
  exercise: string;
  sets: number;
  reps: number;
  weight: number;
  rpe?: number;
  rir?: number;
  note?: string;
  wrist?: boolean;
  target?: { reps?: number; weight?: number };
  session?: string;
  imp?: string;
  [k: string]: any;
}
interface SleepRec {
  id?: string;
  date: YMD;
  bed: HM;
  wake: HM;
  dur: number;
  q?: number;
  note?: string;
  imp?: string;
  [k: string]: any;
}
interface BodyRec {
  id?: string;
  /** 先收集数值，保存前补上 */
  date?: YMD;
  weight?: number;
  bf?: number;
  waist?: number;
  rhr?: number;
  imp?: string;
  [k: string]: any;
}
interface Rec {
  id?: string;
  date?: YMD;
  [k: string]: any;
}
interface State {
  v: number;
  theme: 'auto' | 'light' | 'dark' | string;
  motion?: 'auto' | 'reduce' | string;
  hideHello?: boolean;
  profile: { name: string; height: number | null; injuryFlagLabel: string; [k: string]: any };
  goals: {
    kcal: number;
    p: number;
    c: number;
    f: number;
    sleepH: number;
    trainDays: number;
    stairMin: number;
    weight: number | null;
    mealSplit: Record<string, number>;
    calc?: any;
    [k: string]: any;
  };
  meals: Meal[];
  favFoods: any[];
  customFoods: Food[];
  workouts: Workout[];
  plans: any[];
  sessions: any[];
  active: any;
  exRules: Record<string, any>;
  cardio: Rec[];
  swims: Rec[];
  pb100br: Rec[];
  run800: Rec[];
  run800Hist: number | null;
  perfEvents: any[];
  perfLog: Rec[];
  supps: { id: string; name: string; dose: string; time: string }[];
  /** 补剂打卡：日期 → 补剂 id → 时间；imp 为导入来源 id */
  suppLog: Record<YMD, Record<string, { at: HM; imp?: string }>>;
  sleep: SleepRec[];
  body: BodyRec[];
  notes: Rec[];
  recov: Rec[];
  labs: Rec[];
  injuries: Rec[];
  wristLog: Rec[];
  rehab: Rec[];
  rehabLog: Record<YMD, Record<string, number>>;
  restricted: Rec[];
  recoveryStart: string;
  [k: string]: any;
}
/** 导入流程中带 imp 标记的错误 */
interface ImpError extends Error {
  imp?: boolean;
}
