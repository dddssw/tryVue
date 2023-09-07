//现在我们需要在触发get时收集副作用函数，触发set时执行与key相关的所有副作用函数
//要在副作用函数与被操作的目标字段之间建立明确的联系，必须好好想想怎么设计存储副作用函数的数据结构
//其中 WeakMap 的键是原始对象 target，WeakMap 的值是一个 Map 实例，而 Map 的键是原始对象 target 的 key，Map 的值是一个由副作用函数组成的 Set。
const bucket = new WeakMap(); //bucket (weakMap+map+set)
const data = { text: "hello", ok: true, num: 1 }; //data(被代理对象)
const proxyData = new Proxy(data, {
  //proxyData(代理对象)
  get(target, key) {
    console.log("get");
    return target[key]; //监听到对proxyData(代理对象)get操作返回data(被代理对象)的值
  },
  set(target, key, newVal) {
    console.log("set");
    target[key] = newVal; //监听到对proxyData(代理对象)set操作修改data(被代理对象)
  },
});
proxyData.num++; //会触发get,set

//map与weakMap的区别
//简单地说，WeakMap对 key 是弱引用，不影响垃圾回收器的工作。据这个特性可知，一旦 key 被垃圾回收器回收，那么对应的键和值就访问不到了。
//所以 WeakMap 经常用于存储那些只有当 key所引用的对象存在时（没有被回收）才有价值的信息，例如上面的场景中，如果 target 对象没有任何引用了，
//说明用户侧不再需要它了， 这时垃圾回收器会完成回收任务。但如果使用 Map 来代替 WeakMap， 那么即使用户侧的代码对 target 没有任何引用，
//这个 target 也不会被回收，最终可能导致内存溢出。
