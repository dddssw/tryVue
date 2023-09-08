let activeEffect;
const effectStack = [] 
const bucket = new WeakMap();
const data = { text: "hello", ok: true, num: 1 };
const proxyData = new Proxy(data, {
  get(target, key) {
    console.log("get");
    //添加副作用函数过程
    if (!activeEffect) return target[key];
    let depsMap = bucket.get(target);
    if (!depsMap) {
      bucket.set(target, (depsMap = new Map()));
    }
    let deps = depsMap.get(key);
    if (!deps) {
      depsMap.set(key, (deps = new Set()));
    }
    deps.add(activeEffect);
    activeEffect.deps.push(deps)
    return target[key];
  },
  set(target, key, newVal) {
    console.log("set");
    target[key] = newVal;
    //执行副作用函数过程
    const depsMap = bucket.get(target);
    if (!depsMap) return;
    const effects = depsMap.get(key);
    const effectsToRun = new Set(effects);
    effectsToRun.forEach(effectFn => effectFn!==activeEffect?effectFn():'') //新增
  },
});
function effect(fn) {
  const effectFn = () => {
    cleanup(effectFn)
    activeEffect = effectFn;
    effectStack.push(effectFn)
    fn();
    effectStack.pop()
    activeEffect=effectStack[effectStack.length-1]
  };
  effectFn.deps = [];
  effectFn();
}
function cleanup(effectFn) { 
  for (let i = 0; i < effectFn.deps.length; i++) { 
    effectFn.deps[i].delete(effectFn)
  }
  effectFn.deps.length = 0
}
// 首先读取 obj.foo 的值，这会触发 track 操作，将当前副
// 作用函数收集到“桶”中，接着将其加 1 后再赋值给 obj.foo，此时会
// 触发 trigger 操作，即把“桶”中的副作用函数取出并执行。但问题是
// 该副作用函数正在执行中，还没有执行完毕，就要开始下一次的执
// 行。这样会导致无限递归地调用自己，于是就产生了栈溢出。
effect(() => {
  proxyData.num++;//无限递归循环
});
// 解决办法并不难。通过分析这个问题我们能够发现，读取和设置
// 操作是在同一个副作用函数内进行的。此时无论是 track 时收集的副
// 作用函数，还是 trigger 时要触发执行的副作用函数，都是
// activeEffect。基于此，我们可以在 trigger 动作发生时增加守
// 卫条件：如果 trigger 触发执行的副作用函数与当前正在执行的副
// 作用函数相同，则不触发执行



