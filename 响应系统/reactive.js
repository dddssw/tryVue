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
function effect(fn,options={}) {//effect都需要执行一遍副作用函数才能收集上
  const effectFn = () => {
    cleanup(effectFn)
    activeEffect = effectFn;
    effectStack.push(effectFn)
    fn();
    effectStack.pop()
    activeEffect=effectStack[effectStack.length-1]
  };
  effectFn.options = options
  effectFn.deps = [];
  effectFn();
}
function cleanup(effectFn) { 
  for (let i = 0; i < effectFn.deps.length; i++) { 
    effectFn.deps[i].delete(effectFn)
  }
  effectFn.deps.length = 0
}
effect(() => {
  console.log(proxyData.num);
}, {
   scheduler(fn) {
   jobQueue.add(fn)
   flushJob()
   }
   }
);
proxyData.num++

