const vueJest = require('@vue/vue3-jest')
const babelJest = require('babel-jest').default

const toCommonJs = babelJest.createTransformer({
  presets: ['@babel/preset-env'],
})

module.exports = {
  process(source, filename, jestConfig, transformOptions) {
    const result = vueJest.process(source, filename, jestConfig, transformOptions)
    const code = typeof result === 'string' ? result : result.code

    // Vue SFC templates compiled under TypeScript 6 can still contain ESM exports.
    // Jest 29 runs this project as CommonJS, so normalize the transformer output here.
    const transformed = toCommonJs.process(code, filename, jestConfig, transformOptions)
    const commonJsCode = typeof transformed === 'string' ? transformed : transformed.code

    return {
      code: `var {
  Fragment: _Fragment,
  Teleport: _Teleport,
  Transition: _Transition,
  createBlock: _createBlock,
  createCommentVNode: _createCommentVNode,
  createElementBlock: _createElementBlock,
  createElementVNode: _createElementVNode,
  createSlots: _createSlots,
  createStaticVNode: _createStaticVNode,
  createTextVNode: _createTextVNode,
  createVNode: _createVNode,
  guardReactiveProps: _guardReactiveProps,
  mergeProps: _mergeProps,
  normalizeClass: _normalizeClass,
  normalizeProps: _normalizeProps,
  normalizeStyle: _normalizeStyle,
  openBlock: _openBlock,
  popScopeId: _popScopeId,
  pushScopeId: _pushScopeId,
  renderList: _renderList,
  renderSlot: _renderSlot,
  resolveComponent: _resolveComponent,
  resolveDynamicComponent: _resolveDynamicComponent,
  toDisplayString: _toDisplayString,
  vModelText: _vModelText,
  vShow: _vShow,
  withCtx: _withCtx,
  withDirectives: _withDirectives,
  withKeys: _withKeys,
  withModifiers: _withModifiers,
} = require('vue');
${commonJsCode}
if (exports.default && exports.render) {
  exports.default = { ...exports.default, render: exports.render };
}
`,
    }
  },
}
