// 图标库提供的 React 组件：成功、错误、警告、信息，以及关闭按钮的图标。
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
// useState 管理需要显示的数据；useRef 保存跨渲染复用、但不直接驱动显示的数据。
// useCallback 复用函数引用；useMemo 复用计算结果；useEffect 管理生命周期中的资源清理。
// type ReactNode 仅用于类型检查，表示 React 可以渲染的子内容。
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
// ToastContext 用来向后代提供 showToast；ToastMessage 描述一条完整提示的数据结构。
import { ToastContext, type ToastMessage } from './ToastContext';
// CSS Modules：styles.viewport / styles.toast 对应构建工具处理后的局部类名。
import styles from './ToastProvider.module.css';

// 同时最多保留 3 条提示；新提示到来时，超出数量的最旧提示会被移除。
const MAX_VISIBLE_TOASTS = 3;
// 数字中的下划线只是便于阅读，3_600 与 3600 相同，单位是毫秒。
// 定时器从注册时开始计时；实际回调可能因浏览器调度而晚于 3.6 秒执行。
const TOAST_DURATION_MS = 3_600;

/**
 * 全局轻量提示的提供者，同时负责提示列表的真实渲染。
 *
 * 使用流程：
 * 1. AppProviders 用 <ToastProvider> 包住应用子树。
 * 2. 后代通过 useToast() 取得 showToast({ title, tone, description? })。
 * 3. 此组件生成 ID、维护最多三条消息，并在右上角显示。
 * 4. 到时、手动关闭或超出数量时移除消息，并清理对应定时器。
 *
 * children 是标签中间传进来的内容，例如 <ToastProvider><App /></ToastProvider>
 * 中的 <App />。参数中的 { children } 是解构；后面的对象是 TypeScript 类型标注。
 * Provider 通过 Context 共享的是 showToast 方法，不是把内部状态直接暴露给页面。
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  // 完整消息数组，是 JSX 的数据来源。ToastMessage[] 表示“提示对象组成的数组”。
  // setToasts 安排状态更新，使 React 重新计算界面；初始 [] 表示没有提示。
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // 标记当前生命周期是否还允许处理提示；清理后阻止旧异步回调继续添加/删除消息。
  // ref.current 可以立即读写，修改它本身不会触发重新渲染。
  const mountedRef = useRef(true);

  // 按从旧到新的顺序，记录当前操作已经决定保留的提示 ID。
  // 它不代表 DOM 此刻已经绘制的列表：React 可能尚未提交对应的 state 更新。
  // 连续调用 showToast 时，这个同步更新的记录让下一次调用读到最新保留方案。
  const visibleToastIdsRef = useRef<string[]>([]);

  // Map 保存“提示 ID → 浏览器定时器编号”，方便按提示取消定时器。
  // string 是消息 ID 类型；number 是 window.setTimeout 返回的编号类型。
  // ref 持有的 Map 跨渲染复用，其变化不需要直接触发 UI 更新。
  const timersRef = useRef(new Map<string, number>());

  // 只处理定时器资源，不删除提示内容；删除内容由下面的 dismiss 负责。
  // useCallback 的 [] 表示没有会随渲染变化的依赖，并非“函数只能执行一次”。
  const clearToastTimer = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    // 找不到记录，说明从未登记或已经清理，直接结束即可。
    if (timer === undefined) return;
    window.clearTimeout(timer);
    // 取消浏览器定时器后，也删除自己维护的登记，避免保留无用条目。
    timersRef.current.delete(id);
  }, []);

  // 手动关闭和自动关闭共用这个函数，保证消息与定时器一起清理。
  const dismiss = useCallback(
    (id: string) => {
      // 即使生命周期已经结束，也先尝试清理对应资源。
      clearToastTimer(id);
      if (!mountedRef.current) return;

      // filter 返回一个新数组：只保留 ID 与待删除 ID 不相等的项。
      visibleToastIdsRef.current = visibleToastIdsRef.current.filter((toastId) => toastId !== id);
      // 函数式更新会收到更新队列中前面的更新计算出的 items，
      // 不依赖创建这个回调时闭包里的旧 toasts，也不直接修改原状态数组。
      setToasts((items) => items.filter((item) => item.id !== id));
    },
    [clearToastTimer],
  );

  // 提供给页面调用的方法。Omit<ToastMessage, 'id'> 表示调用方不必传 id：
  // 页面只负责 title、tone、可选 description，ID 由 Provider 统一生成。
  const showToast = useCallback(
    (toast: Omit<ToastMessage, 'id'>) => {
      // 例如页面发出的异步操作很晚才完成，但这个 Provider 已经卸载：
      // 旧回调调用到这里时，不再为已经移除的界面安排提示和定时器。
      if (!mountedRef.current) return;

      // 优先使用浏览器提供的随机 UUID。
      // ?. 表示对象/方法不存在时停止访问；?? 仅在结果为 null/undefined 时取右侧。
      // 兼容分支组合时间戳与随机数，用作提示标识，不承担安全凭证的职责。
      const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

      // 要加入 1 条新提示，所以最多保留已有提示中的最后 2 条。
      // slice(-2) 返回末尾两项且不修改原数组：如 [A, B, C] → [B, C]。
      const retainedIds = visibleToastIdsRef.current.slice(-(MAX_VISIBLE_TOASTS - 1));
      // Set 是集合，后面用 has(id) 判断某条旧提示是否应该继续保留。
      const retainedIdSet = new Set(retainedIds);

      // 不在保留集合中的旧提示会被淘汰，必须同时取消它的自动关闭定时器。
      for (const evictedId of visibleToastIdsRef.current) {
        if (!retainedIdSet.has(evictedId)) clearToastTimer(evictedId);
      }

      // ... 展开数组，把保留的旧 ID 与新 ID 合成新的顺序记录。
      // 先同步写 ref，使本轮可能紧接着发生的另一调用看到这个新结果。
      visibleToastIdsRef.current = [...retainedIds, id];
      setToasts((items) => [
        // 每次更新使用本次调用捕获的保留集合，筛出还应显示的旧消息。
        ...items.filter((item) => retainedIdSet.has(item.id)),
        // ...toast 展开输入对象，再补上 Provider 生成的 id。
        { ...toast, id },
      ]);

      // 注册自动关闭回调；箭头函数现在只是被传入，到时才执行 dismiss(id)。
      // 生成 ID、清理/创建定时器均在 state 更新器外：
      // 更新器只计算数组，避免 React 额外检查更新器时重复产生资源。
      const timer = window.setTimeout(() => dismiss(id), TOAST_DURATION_MS);
      timersRef.current.set(id, timer);
    },
    // 依赖函数不变时，useCallback 复用上次的 showToast 引用。
    [clearToastTimer, dismiss],
  );

  // 安排本组件生命周期的清理；空依赖不代表开发环境绝不会额外执行。
  useEffect(() => {
    // setup 中重新设为 true，避免仅在 ref 初始化时设置；
    // React StrictMode 在开发检查中可能额外进行 setup/cleanup。
    mountedRef.current = true;
    // 保存同一个 Map 的引用，不是复制它的内容。
    // 后续 showToast 加入的定时器，cleanup 仍能从这个 Map 中取到。
    const timers = timersRef.current;

    // 这是 effect 返回的清理函数，不是现在立即执行，也不是组件的 JSX 返回值。
    return () => {
      mountedRef.current = false;
      // Provider 真实卸载时，所有归它管理的自动关闭任务都应取消。
      for (const timer of timers.values()) window.clearTimeout(timer);
      timers.clear();
      visibleToastIdsRef.current = [];
      // 此处不再 setToasts：真实卸载会移除这份组件界面。
      // cleanup 也可能用于开发检查，不应据此推断 state 在每次 cleanup 都被清空。
    };
  }, []);

  // () => ({ showToast }) 返回对象：括号让花括号表示对象，而不是函数体。
  // 当 showToast 没变时复用 value 对象，避免仅因每次创建新对象引发 Context 更新。
  // 这是一项优化，不保证所有后代组件都不会因为其他原因重新渲染。
  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    // Context Provider 向后代提供 value；它本身不会创建一个额外的 HTML 容器。
    <ToastContext.Provider value={value}>
      {/* 原有页面继续显示；提示容器作为同一 Provider 里的另一部分渲染。 */}
      {children}
      {/* viewport 样式将提示区固定在右上角。
          aria-live="polite" 请求辅助技术在合适时机宣告变化；
          aria-atomic="false" 表示外层区域不要求每次完整宣告全部内容。
          每条提示下方还具有自己的 role="status" 语义。 */}
      <div className={styles.viewport} aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => {
          // 根据 tone 选择图标组件。连续三元表达式相当于多组 if / else。
          // Icon 存放的是组件；使用大写名称，才能在 JSX 中写 <Icon />。
          const Icon =
            toast.tone === 'success'
              ? CheckCircle2
              : toast.tone === 'error'
                ? XCircle
                : toast.tone === 'warning'
                  ? AlertTriangle
                  : Info;
          return (
            // key 帮助 React 识别列表项，不作为普通 key 属性输出到 DOM。
            // data-tone 会保留在 HTML 上，配合 CSS 的 [data-tone='success'] 等选择器。
            // role="status" 让辅助技术把这一项识别为状态提示。
            <div key={toast.id} className={styles.toast} data-tone={toast.tone} role="status">
              <Icon size={20} />
              <span>
                <strong>{toast.title}</strong>
                {/* 可选说明存在且非空时显示 small，否则返回 null，不创建该节点。 */}
                {toast.description ? <small>{toast.description}</small> : null}
              </span>
              {/* type="button" 明确它不是表单提交按钮；
                  aria-label 为只有图标的按钮提供名称；
                  onClick 传入函数，点击时才关闭当前这一条提示。 */}
              <button type="button" aria-label="关闭提示" onClick={() => dismiss(toast.id)}>
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
