const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('bilingual source titles keep English secondary text without repeating Chinese or inventing translations', () => {
  const module = {exports:{}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../templates/boardgame-name.wxs'), 'utf8'),
    {module, getRegExp:(pattern, flags) => new RegExp(pattern, flags)});
  const secondary = module.exports.secondary;
  assert.equal(secondary({name:'方舟动物园', original_name:'Ark Nova'}), 'Ark Nova');
  assert.equal(secondary({name:'春秋', original_name:'春秋 (Spring and Autumn)'}), 'Spring and Autumn');
  assert.equal(secondary({name:'促织', original_name:'促织 (Cuzhi)'}), 'Cuzhi');
  assert.equal(secondary({name:'Source', display_name:'中文名', original_name:'Source'}), 'Source');
  assert.equal(secondary({name:'Source', original_name:'Source'}), '');
  assert.equal(secondary({name:'手工游戏'}), '');
  assert.equal(secondary({name:'游戏', original_name:'游戏 (2026)'}), '游戏 (2026)');
  assert.equal(secondary({name:'游戏', original_name:'游戏（特别版）'}), '游戏（特别版）');
});
