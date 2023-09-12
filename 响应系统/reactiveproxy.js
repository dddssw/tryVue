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
const data = {
    foo: 1, get bar() {
    return this.foo
} };
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
  get(target, key,receiver) {//receiver，它代表谁在读取属性
    track(target, key)
    return Reflect.get(target, key, receiver);
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
function watch(source, cb , options={}) {
  let getter;
  if (typeof source === "function") {
    getter = source;
  } else {
    getter = () => traverse(source);
  }
  let oldValue, newValue;
  let cleanup;
  function onInvalidate(fn) {
    cleanup = fn;
  }

 const job = () => {
   newValue = effectFn();
   if (cleanup) {
     cleanup();
   }
   cb(newValue, oldValue,onInvalidate);
   oldValue = newValue;
 };
  const effectFn = effect(() => getter(), {
    lazy: true,
    scheduler: () => {
      if (options.flush === "post") {
        const p = Promise.resolve();
        p.then(job);
      } else {
        job();
      }
    },
  });
  if (options.immediate) {
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
effect(() => {
    console.log(proxyData.bar)
})
proxyData.foo++

// p.bar 是一个访问器属
// 性，因此执行 getter 函数。由于在 getter 函数中通过 this.foo
// 读取了 foo 属性值，因此我们认为副作用函数与属性 foo 之间也会建
// 立联系。当我们修改 p.foo 的值时应该能够触发响应，使得副作用函
// 数重新执行才对

// 当我们使用 p.bar 访问 bar
// 属性时，它的 getter 函数内的 this 指向的其实是原始对象 obj，
// 这说明我们最终访问的其实是 obj.foo。很显然，在副作用函数内通
// 过原始对象访问它的某个属性是不会建立响应联系的，这等价于
//----------------------------------------------------------------
//  effect(() => {
//      // obj 是原始数据，不是代理对象，这样的访问不能够建立响应联系
//      obj.foo
//      })
    