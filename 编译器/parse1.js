function parse(content) {
    const context = { source: content };
    return {
      type: "Root",
      children: parseChild(context, []),
    };
  }
  function isEnd(context, ancestors) {
      const s = context.source;
      if (ancestors.length !== 0) {
          const tag = ancestors[ancestors.length - 1]?.tag;
          if (tag === s.slice(2, 2 + tag.length)) return true;
      }
    return !s;
  }
  function parseChild(context, ancestors) {
    const nodes = [];
    while (!isEnd(context,ancestors)) {
      let node;
      if (context.source[0] === "<") {
        if (/[a-z]/i.test(context.source[1])) {
          node = parseElement(context, ancestors);
        } else if (context.source[1] === "/") {
            parseTag(context, "End");
        }
      } else if (context.source.startsWith("{{")) {
        node = parseInterpolation(context);
      } else {
        node = parseText(context);
        }
        node&&nodes.push(node);
    }
    return nodes;
  }
  function parseInterpolation(context) {
      const index = context.source.indexOf("}}");
      const content = context.source.slice(2, index);
      advanceBy(context,index+2)
      return {
          type: 'Interpolation',
          content
    };
  }
  function parseText(context) {
      const indexI = context.source.indexOf("{{");
      const indexE = context.source.indexOf("<");
      const index=Math.min(indexI,indexE)
    const content = context.source.slice(0, index);
    console.log(content)
    advanceBy(context, content.length)
    console.log(context.source)
      return {
          type: 'Text',
          content
    };
  }
  function parseElement(context, ancestors) {
    const element = parseTag(context, "Start");
    ancestors.push(element);
    element.children = parseChild(context, ancestors);
    ancestors.pop();
    return element;
  }
  function parseTag(context, type) {
    const match = /^<\/?([a-z][^\t\r\n\f />]*)/i.exec(context.source);
    const tag = match[1];
      advanceBy(context, type === "Start" ? 2 + tag.length : 3 + tag.length);
    return type === "Start"
      ? {
          type: "Element",
          tag,
        }
      : null;
  }
  function advanceBy(context, nums) {
    context.source = context.source.slice(nums);
  }
  const content = "<div><p></p><span></span>Hi,{{message}}</div>";
  console.log(parse(content))