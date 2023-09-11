let activeEffect;
const effectStack = [] 
 const jobQueue = new Set()
 const p = Promise.resolve()
 let isFlushing = false
 function flushJob() {
 if (isFlushing) return
 isFlushing = true
 p.then(() => {
 jobQueue.forEach(job => job())
 }).finally(() => {
 isFlushing = false
 })
 }
const bucket = new WeakMap();
const data = { text: "hello", ok: true, num: 1 };
function track(target, key) {
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
}
function trigger(target, key) {
  const depsMap = bucket.get(target);
  if (!depsMap) return;
  const effects = depsMap.get(key);
  const effectsToRun = new Set(effects);
  //effectsToRun.forEach(effectFn => effectFn!==activeEffect?effectFn():'') 
  effectsToRun.forEach(effectFn => {
    if (effectFn !== activeEffect) {
      if (effectFn.options.scheduler) { 
        effectFn.options.scheduler(effectFn) 
        } else {
        effectFn() 
        }
  } }) 
}
const proxyData = new Proxy(data, {
  get(target, key) {
    track(target, key)
    return target[key];
  },
  set(target, key, newVal) {
    target[key] = newVal;
    trigger(target, key)
  },
});
function effect(fn,options={}) {
  const effectFn = () => {
    cleanup(effectFn)
    activeEffect = effectFn;
    effectStack.push(effectFn)
    const res=fn()
    fn();
    effectStack.pop()
    activeEffect = effectStack[effectStack.length - 1]
    return res
  };
  effectFn.options = options
  effectFn.deps = [];
  if (!options.lazy) {
    effectFn();
  }
    return effectFn;
}
function cleanup(effectFn) { 
  for (let i = 0; i < effectFn.deps.length; i++) { 
    effectFn.deps[i].delete(effectFn)
  }
  effectFn.deps.length = 0
}
function computed(getter) {
  let value
  let dirty=true
  const effectFn = effect(getter, {
    lazy: true,
    scheduler() {
      dirty = true
      trigger(obj, 'value')// 当计算属性依赖的响应式数据变化时，手动调用 trigger 函数触发响应
  }
  })
  const obj = {
    get value() {
      if (dirty) {
        value = effectFn()
        dirty=false
      }
      track(obj, 'value')// 当读取 value 时，手动调用 track 函数进行追踪
      return value
    }
  }
  return obj
}
// const sumRes = computed(() => {
//   return proxyData.num + 1
// })
function watch(source, cb) {
  let getter;
  if (typeof source === "function") {
    getter = source;
  } else {
    getter = () => traverse(source);
  }
  // 定义旧值与新值
  let oldValue, newValue;
  // 使用 effect 注册副作用函数时，开启 lazy 选项，并把返回值存储到effectFn 中以便后续手动调用
  const effectFn = effect(() => getter(), {
    lazy: true,
    scheduler() {
      // 在 scheduler 中重新执行副作用函数，得到的是新值
      newValue = effectFn();
      // 将旧值和新值作为回调函数的参数
      cb(newValue, oldValue);
      // 更新旧值，不然下一次会得到错误的旧值
      oldValue = newValue;
    },
  });
  // 手动调用副作用函数，拿到的值就是旧值
  oldValue = effectFn()
}
function traverse(source, seen = new Set()) {
  if (typeof source !== 'object' || source === null || seen.has(source)) return 
  seen.add(source)
  for (const key in source) {
    traverse(source[key],seen)
  }
}
watch(()=>proxyData.num, (newValue, oldValue) => {
  console.log(newValue,oldValue)
})
proxyData.num++


//  给watch添加新值和旧值 使用 lazy 选项创建了一个懒执
// 行的 effect。注意上面代码中最下面的部分，我们手动调用
// effectFn 函数得到的返回值就是旧值，即第一次执行得到的值。当
// 变化发生并触发 scheduler 调度函数执行时，会重新调用
// effectFn 函数并得到新值，这样我们就拿到了旧值与新值，接着将
// 它们作为参数传递给回调函数 cb 就可以了。最后一件非常重要的事情
// 是，不要忘记使用新值更新旧值：oldValue = newValue，否则在
// 下一次变更发生时会得到错误的旧值。

//备注：修改watch第一个参数可以接受getter之后,现在就不能写watch(proxyData.num)，而是watch(()=>proxyData.num)