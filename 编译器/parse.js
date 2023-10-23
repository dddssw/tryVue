function parse(content) {
  const context = { source: content, mode: "DATA" };
  return {
    type: "Root",
    children: parseChild(context, []),
  };
}
function isEnd(context, ancestors) {
  const s = context.source;
  for (let i = 0; i < ancestors.length; i++) {
    const tag = ancestors[ancestors.length - 1]?.tag;
    if (tag === s.slice(2, 2 + tag.length)) return true;
  }
  return !s;
}
function parseChild(context, ancestors) {
  const nodes = [];
  //while 循环一定要遇到父级节点的结束标签才会停止
  while (!isEnd(context, ancestors)) {
    let node;
    // 只有 DATA 模式和 RCDATA 模式才支持插值节点的解析
    if (context.mode === "DATA" || context.mode === "RCDATA") {
      // 只有 DATA 模式才支持标签节点的解析
      if (context.mode === "DATA" && context.source[0] === "<") {
        if (/[a-z]/i.test(context.source[1])) {
          node = parseElement(context, ancestors);
        } else if (context.source[1] === "/") {
          parseTag(context, "End");
          continue;
        }
      } else if (context.source.startsWith("{{")) {
        node = parseInterpolation(context);
      }
    }
    // node 不存在，说明处于其他模式，即非 DATA 模式且非 RCDATA 模式
    // 这时一切内容都作为文本处理
    if (!node) {
      // 解析文本节点
      node = parseText(context);
    }

    // 将节点添加到 nodes 数组中
    nodes.push(node);
  }
  return nodes;
}
function parseInterpolation(context) {
  const index = context.source.indexOf("}}");
  const content = context.source.slice(2, index);
  advanceBy(context, index + 2);
  return {
    type: "Interpolation",
    content,
  };
}
function parseText(context) {
  const indexI = context.source.indexOf("{{");
  const indexE = context.source.indexOf("<");
  const index = Math.min(indexI, indexE);
  const content = context.source.slice(0, index);
  advanceBy(context, content.length);
  return {
    type: "Text",
    content,
  };
}
function parseElement(context, ancestors) {
  const element = parseTag(context, "Start");
  if(element.isSelfClosing) return element
  ancestors.push(element);
  element.children = parseChild(context, ancestors);
  ancestors.pop();
  if (context.source.startsWith(`</${element.tag}`)) {
    parseTag(context, "End");
  } else {
    // 缺少闭合标签
    console.error(`${element.tag} 标签缺少闭合标签`);
  }
  return element;
}
function parseTag(context, type) {
  const match = /^<\/?([a-z][^\t\r\n\f />]*)/i.exec(context.source);
  const tag = match[1];
  advanceBy(context, match[0].length);
  advanceSpaces(context);
  const isSelfClosing=context.source.startsWith("/>")
  advanceBy(context, isSelfClosing ? 2 : 1);
  return type === "Start"
    ? {
        type: "Element",
      tag,
        isSelfClosing
      }
    : null;
}
function advanceBy(context, nums) {
  context.source = context.source.slice(nums);
}
function advanceSpaces(context) {
  const match = /^[\t\r\n\f ]+/.exec(context.source);
  if (match) {
    advanceBy(context, match[0].length);
  }
}
const content = "<div   ><p/>{{hi}}<span></span></div>";
const a = parse(content);
console.log(a);
