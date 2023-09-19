# tryVue

研究Vue3实现原理，参考书vuejs设计与实现，一步一步完善，不直接啃源码，先了解为何这么做及实现思路。
![存储副作用的容器](https://github.com/dddssw/tryVue/assets/58782768/1b5e24b1-2955-43ab-97cd-ae875fb70983)



## 渲染器

`renderer`代表渲染器,`render`是动词，渲染。渲染器会把虚拟 DOM 渲染为真实 DOM 元素。渲染器把虚拟 DOM 节点渲染为真实 DOM 节点的过程叫作`挂载`。因此，渲染器通常需要接收一个挂载点作为参数，用来指定具体的挂载位置。这里的“挂载点”其实就是一个DOM 元素，渲染器会把该 DOM 元素作为容器元素，并把内容渲染到其中。我们通常用英文 container 来表达容器。

 声明createRenderer，patch函数
```js
 function createRenderer() {
     function render(vnode, container) {
     if (vnode) {
     // 新 vnode 存在，将其与旧 vnode 一起传递给 patch 函数，进行打补丁
     patch(container._vnode, vnode, container)
     } else {
     if (container._vnode) {
     // 旧 vnode 存在，且新 vnode 不存在，说明是卸载（unmount）操作
     // 只需要将 container 内的 DOM 清空即可
     container.innerHTML = ''
     }
     }
     // 把 vnode 存储到 container._vnode 下，即后续渲染中的旧 vnode
     container._vnode = vnode
     }
     return {
     render
     }
 }
  function patch(n1, n2, container) {
     // 如果 n1 不存在，意味着挂载，则调用 mountElement 函数完成挂载
     if (!n1) {
     mountElement(n2, container)
     } else {
     // n1 存在，意味着打补丁，暂时省略
    }
}

function mountElement(vnode, container) {
     // 创建 DOM 元素
     const el = document.createElement(vnode.type)
     // 处理子节点，如果子节点是字符串，代表元素具有文本节点
     if (typeof vnode.children === 'string') {
     // 因此只需要设置元素的 textContent 属性即可
     el.textContent = vnode.children
     }
     // 将元素添加到容器中
     container.appendChild(el)
     }
```
使用
```js
 const renderer = createRenderer()

 // 首次渲染
 renderer.render(vnode1, document.querySelector('#app'))
 // 第二次渲染
 renderer.render(vnode2, document.querySelector('#app'))
 // 第三次渲染
 renderer.render(null, document.querySelector('#app'))
 

```
 在首次渲染时，渲染器会将 vnode1 渲染为真实 DOM。渲染完成后，vnode1 会存储到容器元素的 container._vnode 属性中，它会在后续渲染中作为旧 vnode 使用。 在第二次渲染时，旧 vnode 存在，此时渲染器会把 vnode2 作为新 vnode，并将新旧 vnode 一同传递给 patch 函数进行打补丁。 在第三次渲染时，新 vnode 的值为 null，即什么都不渲染。但此时容器中渲染的是 vnode2 所描述的内容，所以渲染器需要清 空容器。从上面的代码中可以看出，我们使用 container.innerHTML = '' 来清空容器。需要注意的是，这样清空容器是有问题的，不过这里我们暂时使用它来达到目的。
 
 

设计一个不依赖于浏览器平台的`通用渲染器`，但很明显，mountElement 函数内调用了大量依赖于浏览器 的 API，例如 document.createElement、el.textContent 以 及 appendChild 等。想要设计通用渲染器，第一步要做的就是将这 些浏览器特有的 API 抽离。怎么做呢？我们可以将这些操作 DOM 的 API 作为配置项，该配置项可以作为 createRenderer 函数的参数
 
```js
    // 在创建 renderer 时传入配置项
    const renderer = createRenderer({
    // 用于创建元素
    createElement(tag) {
    return document.createElement(tag)
    },
    // 用于设置元素的文本节点
    setElementText(el, text) {
    el.textContent = text
    },
    // 用于在给定的 parent 下添加指定元素
    insert(el, parent, anchor = null) {
    parent.insertBefore(el, anchor)
    }
    })
    
    function createRenderer(options) {
    // 通过 options 得到操作 DOM 的 API
    const {
    createElement,
    insert,
    setElementText
    } = options

    // 在这个作用域内定义的函数都可以访问那些 API
    function mountElement(vnode, container) {
    // ...
    }

    function patch(n1, n2, container) {
    // ...
    }

    function render(vnode, container) {
    // ...
    }

    return {
    render
    }
    }
```
 ## 解析器
   用来将模板字符串解析为模板 AST 的解析器（parser）；
   用来将模板 AST 转换为 JavaScript AST 的转换器（transformer）；
   用来根据 JavaScript AST 生成渲染函数代码的生成器（generator）。

