let activeEffect;
const effectStack = [] // 新增副作用栈
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
    effectsToRun.forEach(effectFn => effectFn()) 
  },
});
function effect(fn) {
  const effectFn = () => {
    cleanup(effectFn)
    activeEffect = effectFn;
    effectStack.push(effectFn)// 新增
    fn();
    effectStack.pop()// 新增
    activeEffect=effectStack[effectStack.length-1]// 新增
  };
  effectFn.deps = [];
  effectFn();
}
function cleanup(effectFn) { 
  for (let i = 0; i < effectFn.deps.length; i++) { 
    effectFn.deps[i].delete(effectFn)
    //补充一下，因为引用的原因，这里的修改也会修改到bucket里的值
  }
  effectFn.deps.length = 0
}
//嵌套effect
effect(() => {
  effect(() => {
    console.log(proxyData.text)
  })
  console.log(proxyData.num);
});
proxyData.num = 100//这里会打印text
// 我们用全局变量 activeEffect 来存储通过 effect 函数注册的
// 副作用函数，这意味着同一时刻 activeEffect 所存储的副作用函数
// 只能有一个。当副作用函数发生嵌套时，内层副作用函数的执行会覆
// 盖 activeEffect 的值，并且永远不会恢复到原来的值。这时如果再
// 有响应式数据进行依赖收集，即使这个响应式数据是在外层副作用函
// 数中读取的，它们收集到的副作用函数也都会是内层副作用函数，这
// 就是问题所在。

// 为了解决这个问题，我们需要一个副作用函数栈 effectStack，
// 在副作用函数执行时，将当前副作用函数压入栈中，待副作用函数执
// 行完毕后将其从栈中弹出，并始终让 activeEffect 指向栈顶的副作
// 用函数。这样就能做到一个响应式数据只会收集直接读取其值的副作
// 用函数，而不会出现互相影响的情况


