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
  // 调用 traverse 递归地读取
  effect(() => traverse(source),//修改
    {
      scheduler() {
      cb()
  }})
}
function traverse(source, seen = new Set()) {
   // 如果要读取的数据是原始值，或者已经被读取过了，那么什么都不做
  if (typeof source !== 'object' || source == null || seen.has(source)) return 
  // 将数据添加到 seen 中，代表遍历地读取过了，避免循环引用引起的死循环
  seen.add(source)
  // 假设 value 就是一个对象，使用 for...in 读取对象的每一个值，并递归地调用 traverse 进行处理
  for (const key in source) {
    traverse(source[key],seen)
  }
}
watch(proxyData, () => {
  console.log('changed')
})
proxyData.num=999
proxyData.num=997
proxyData.text = 'watch'

//在 watch 内部的 effect 中调用 traverse
// 函数进行递归的读取操作，代替硬编码的方式，这样就能读取一个对
// 象上的任意属性，从而当任意属性发生变化时都能够触发回调函数执
// 行