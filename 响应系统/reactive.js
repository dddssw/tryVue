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
    //收集 effectFn.deps 数组中的依赖集合 数组里装的是[set set set ...]
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
    effects &&
      effects.forEach((fn) => {
        fn();
      });
  },
});
//要将一个副作用函数从所有与之关联的依赖集合中移除，就需要
// 明确知道哪些依赖集合中包含它，因此我们需要重新设计副作用函
// 数，如下面的代码所示。在 effect 内部我们定义了新的 effectFn
// 函数，并为其添加了 effectFn.deps 属性，该属性是一个数组，用
// 来存储所有包含当前副作用函数的依赖集合
function effect(fn) {
  const effectFn = () => {
// cleanup 函数接收副作用函数作为参数，遍历副作用函数的
// effectFn.deps 数组，该数组的每一项都是一个依赖集合，然后将
// 该副作用函数从依赖集合中移除，最后重置 effectFn.deps 数组。
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
    // 最后需要重置 effectFn.deps 数组
    effectFn.deps.length = 0
  }
}
effect(() => {
  //分支切换产生的问题，ok为true时，text上有这个副作用函数，修改ok为false，text上不应有这个副作用函数，但是修改text的值还是会触发这个副作用
  console.log(proxyData.ok ? proxyData.text : "-");
});
proxyData.ok = false;
proxyData.text = "changed";
//解决方法：在副作用执行之前，将其从相关联的依赖集合中移除，当副作用函数执行完毕后，会重新建立联系，但在新的联系中不会包含遗留的副作用函数
