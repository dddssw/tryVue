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
      trigger(obj, 'value')
  }
  })
  const obj = {
    get value() {
      if (dirty) {
        value = effectFn()
        dirty=false
      }
      track(obj, 'value')
      return value
    }
  }
  return obj
}
// const sumRes = computed(() => {
//   return proxyData.num + 1
// })
function watch(source, cb , options={}) {
  let getter;
  if (typeof source === "function") {
    getter = source;
  } else {
    getter = () => traverse(source);
  }
  let oldValue, newValue;
  // 提取 scheduler 调度函数为一个独立的 job 函数
 const job = () => {
   newValue = effectFn();
   cb(newValue, oldValue);
   oldValue = newValue;
 };
  const effectFn = effect(() => getter(), {
    lazy: true,
    scheduler :job,
  });
  if (options.immediate) {// 新增
    job()
  } else {
    oldValue = effectFn()
  }
 
}
function traverse(source, seen = new Set()) {
  if (typeof source !== 'object' || source === null || seen.has(source)) return 
  seen.add(source)
  for (const key in source) {
    traverse(source[key],seen)
  }
}
watch(
  () => proxyData.num,
  (newValue, oldValue) => {
    console.log(newValue, oldValue);
  },
  {
    // 回调函数会在 watch 创建时立即执行一次
    immediate: true,
  }
);
proxyData.num++
