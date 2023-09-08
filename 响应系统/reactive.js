let activeEffect;
const effectStack = [] 
 // 定义一个任务队列
 const jobQueue = new Set()
 // 使用 Promise.resolve() 创建一个 promise 实例，我们用它将一个任务添加到微任务队列
 const p = Promise.resolve()
 // 一个标志代表是否正在刷新队列
 let isFlushing = false
 function flushJob() {
 // 如果队列正在刷新，则什么都不做
 if (isFlushing) return
 // 设置为 true，代表正在刷新
 isFlushing = true
 // 在微任务队列中刷新 jobQueue 队列
 p.then(() => {
 jobQueue.forEach(job => job())
 }).finally(() => {
 // 结束后重置 isFlushing
 isFlushing = false
 })
 }
const bucket = new WeakMap();
const data = { text: "hello", ok: true, num: 1 };
const proxyData = new Proxy(data, {
  get(target, key) {
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
//   有了调度函数，我们在 trigger 函数中触发副作用函数重新执行
// 时，就可以直接调用用户传递的调度器函数，从而把控制权交给用户
  set(target, key, newVal) {
    target[key] = newVal;
    //执行副作用函数过程
    const depsMap = bucket.get(target);
    if (!depsMap) return;
    const effects = depsMap.get(key);
    const effectsToRun = new Set(effects);
    //effectsToRun.forEach(effectFn => effectFn!==activeEffect?effectFn():'') 
    effectsToRun.forEach(effectFn => {
      if (effectFn !== activeEffect) {
        if (effectFn.options.scheduler) { // 新增
          effectFn.options.scheduler(effectFn) // 新增
          } else {
          // 否则直接执行副作用函数（之前的默认行为）
          effectFn() // 新增
          }
    } }) 
  },
});
// 在调用 effect 函数注册副作用函数时，可以传递第二个参数 options
function effect(fn,options={}) {
  const effectFn = () => {
    cleanup(effectFn)
    activeEffect = effectFn;
    effectStack.push(effectFn)
    fn();
    effectStack.pop()
    activeEffect=effectStack[effectStack.length-1]
  };
  // 将 options 挂载到 effectFn 上
  effectFn.options = options // 新增
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
   // 每次调度时，将副作用函数添加到 jobQueue 队列中
   jobQueue.add(fn)
   // 调用 flushJob 刷新队列
   flushJob()
   }
   }
);
proxyData.num++
proxyData.num++
//不使用调度器打印1 2 3，现在只需要打印最后状态即1 3


// 加上的代码代表连续对 obj.foo 执行两次自增操作，会同步
// 且连续地执行两次 scheduler 调度函数，这意味着同一个副作用函
// 数会被 jobQueue.add(fn) 语句添加两次，但由于 Set 数据结构的
// 去重能力，最终 jobQueue 中只会有一项，即当前副作用函数。类似
// 地，flushJob 也会同步且连续地执行两次，但由于 isFlushing 标
// 志的存在，实际上 flushJob 函数在一个事件循环内只会执行一次，
// 即在微任务队列内执行一次。当微任务队列开始执行时，就会遍历
// jobQueue 并执行里面存储的副作用函数。即他会等同步任务执行完，才会执行他。由于此时 jobQueue 队列
// 内只有一个副作用函数，所以只会执行一次，并且当它执行时，字段
// obj.foo 的值已经是 3 了，这样我们就实现了期望的输出