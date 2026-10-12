// SPDX-License-Identifier: MIT
'use strict';
/**
 * ESLint 配置。src/app/*.js 在构建时拼接进同一个作用域，
 * 因此把所有模块的顶层声明收集为彼此可见的全局变量，no-undef 仍能发现拼写错误与漏声明。
 */
const fs = require('fs');
const path = require('path');
const espree = require('espree');
const js = require('@eslint/js');
const globals = require('globals');

const APP = path.join(__dirname, 'src', 'app');
function topLevel(file) {
  const ast = espree.parse(fs.readFileSync(file, 'utf8'), { ecmaVersion: 2020, sourceType: 'script' });
  const names = [];
  for (const n of ast.body) {
    if (n.type === 'FunctionDeclaration') names.push(n.id.name);
    else if (n.type === 'VariableDeclaration')
      n.declarations.forEach((d) => d.id.type === 'Identifier' && names.push(d.id.name));
  }
  return names;
}
const appGlobals = {};
fs.readdirSync(APP)
  .filter((n) => /^\d{2}-[\w-]+\.js$/.test(n))
  .forEach((n) =>
    topLevel(path.join(APP, n)).forEach((k) => {
      // 模块共享一个作用域：同名顶层声明会互相覆盖，直接报错
      if (appGlobals[k]) throw new Error('src/app 中重复的顶层声明：' + k + '（' + appGlobals[k] + ' 与 ' + n + '）');
      appGlobals[k] = n;
    })
  );
for (const k in appGlobals) appGlobals[k] = 'writable';

const shared = {
  'no-unused-vars': ['error', { vars: 'local', args: 'none', caughtErrors: 'none' }],
  'no-empty': ['error', { allowEmptyCatch: true }],
  eqeqeq: ['error', 'smart'],
  'no-var': 'off',
  'no-redeclare': ['error', { builtinGlobals: false }],
  'no-implicit-globals': 'off',
  'no-shadow-restricted-names': 'error',
  'no-new-func': 'error',
  'no-eval': 'error',
  'no-implied-eval': 'error'
};

module.exports = [
  { ignores: ['index.html', 'sw.js', 'node_modules/**', 'tests/e2e/report/**', 'test-results/**'] },
  js.configs.recommended,
  {
    files: ['src/app/*.js'],
    languageOptions: {
      ecmaVersion: 5,
      sourceType: 'script',
      globals: {
        ...globals.es2021,
        ...globals.browser,
        ...appGlobals,
        FitIcons: 'readonly',
        FitCharts: 'readonly',
        FIT_DATA: 'readonly',
        FB_VERSION: 'readonly'
      }
    },
    rules: shared
  },
  {
    files: ['src/charts.js', 'src/icons.js', 'src/sw.template.js'],
    languageOptions: {
      ecmaVersion: 5,
      sourceType: 'script',
      globals: { ...globals.es2021, ...globals.browser, ...globals.serviceworker, __ASSETS__: 'readonly' }
    },
    rules: shared
  },
  {
    files: ['scripts/*.js', 'tests/**/*.js', 'eslint.config.js', 'playwright.config.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'commonjs', globals: { ...globals.node } },
    rules: { ...shared, 'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }] }
  },
  {
    // 端到端测试里传给 page.evaluate 的回调在浏览器中执行
    files: ['tests/e2e/**/*.js'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } }
  }
];
