const data = { text: "hello", ok: true, num: 1 }; //data(被代理对象)
const proxyData = new Proxy(data, {
  //proxyData(代理对象)
  get(target, key) {
    console.log("get");
    return target[key];//监听到对proxyData(代理对象)get操作返回data(被代理对象)的值
  },
  set(target, key, newVal) {
    console.log("set");
    target[key] = newVal;//监听到对proxyData(代理对象)set操作修改data(被代理对象)
  },
});
proxyData.num++;//会触发get,set
