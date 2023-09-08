let activeEffect;
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
    // 解决方法我们可以构造另外一个 Set集合并遍历它
    const effectsToRun = new Set(effects);
    effectsToRun.forEach(effectFn => effectFn()) 
    // effects &&
    //   effects.forEach((fn) => {
    //     fn();
    //   });
  },
});
function effect(fn) {
  const effectFn = () => {
    cleanup(effectFn)
    activeEffect = effectFn;
    fn();
  };
  effectFn.deps = [];
  effectFn();
}
function cleanup(effectFn) { 
  for (let i = 0; i < effectFn.deps.length; i++) { 
    effectFn.deps[i].delete(effectFn)
  }
  //for循环之后再设置为0
  effectFn.deps.length = 0
}
effect(() => {
  console.log(proxyData.ok ? proxyData.text : "-");
});
proxyData.ok = false;
//proxyData.text = "changed";

// 解决一个问题代码会无限执行
// 触发set时 
// 调用 forEach 遍历 Set 集合
// 时，如果一个值已经被访问过了，但该值被删除并重新添加到集合，
// 如果此时 forEach 遍历没有结束，那么该值会重新被访问。因此，上
// 面的代码会无限执行
