let activeEffect; //用一个全局变量存储被注册的副作用函数
const bucket = new WeakMap();
const data = { text: "hello", ok: true, num: 1 };
//先将副作用函数 effect 添加到桶里，即bucket.add(effect)，然后返回属性值
//当设置属性值时先更新原始数据，再将副作用函数从桶里取出并重新执行
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
//effect用来注册副作用函数的函数
function effect(fn) {
  activeEffect = fn;
  fn();
}
effect(() => {
  console.log(proxyData.text);
});
proxyData.text='changed'
