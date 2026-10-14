// 构建时注入或由其他内联脚本提供的全局对象，供 tsc --checkJs 使用（不参与构建）
declare const FB_VERSION: string;
interface Window {
  FIT_DATA: { foods: { foods: Food[]; [k: string]: any }; examples: any[]; coachPrompt?: string };
  FitIcons: { svg(name: string, cls?: string): string; hydrate(root?: ParentNode): void; names: string[] };
  FitCharts: any;
  __fbPwaMeta?: boolean;
  __freeBody?: any;
}
declare const FitIcons: Window['FitIcons'];
declare const FitCharts: any;
declare const FIT_DATA: Window['FIT_DATA'];

// 界面代码大量使用事件委托（e.target.closest(...)）与 `this.value`。
// 这些场景下的目标一定是元素 / 表单控件，这里集中声明，避免在每个处理函数里写类型断言。
interface EventTarget {
  click(): void;
  blur(): void;
  getAttribute(name: string): string | null;
  closest(selectors: string): HTMLElement | null;
  matches(selectors: string): boolean;
  readonly tagName: string;
  readonly parentNode: (Node & ParentNode & { classList?: DOMTokenList }) | null;
  id: string;
  value: string;
  checked: boolean;
  open: boolean;
}
interface Navigator {
  /** iOS Safari：从主屏幕启动时为 true */
  readonly standalone?: boolean;
}
interface GlobalEventHandlers {
  textContent: string | null;
  value: string;
  files: FileList | null;
  disabled: boolean;
}
interface ParentNode {
  readonly classList?: DOMTokenList;
  className?: string;
}
// querySelector 返回 Element；界面代码里取到的都是 HTMLElement
interface Element {
  focus(options?: FocusOptions): void;
  click(): void;
  readonly type?: string;
  style: CSSStyleDeclaration;
  dataset: DOMStringMap;
}
/** `$()` 的返回类型：界面里取的多为表单控件。value 允许直接赋数字（浏览器会转成字符串） */
type FBEl = HTMLInputElement & {
  value: any;
  options?: HTMLOptionsCollection;
  open?: boolean;
};
