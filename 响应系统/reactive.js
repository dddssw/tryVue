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
const sumRes = computed(() => {
  return proxyData.num + 1
})
effect(() => {
   // 在该副作用函数中读取 sumRes.value
   console.log(sumRes.value)
   })
   // 修改 proxyData.num 的值
   proxyData.num++

//sumRes 是一个计算属性，并且在另一个
// effect 的副作用函数中读取了 sumRes.value 的值。如果此时修改
// obj.foo 的值，我们期望副作用函数重新执行，就像我们在 Vue.js 的
// 模板中读取计算属性值的时候，一旦计算属性发生变化就会触发重新

//解决办法：当读取计算属性的值时，我们可以手动调用
// track 函数进行追踪；当计算属性依赖的响应式数据发生变化时，我
// 们可以手动调用 trigger 函数触发响应