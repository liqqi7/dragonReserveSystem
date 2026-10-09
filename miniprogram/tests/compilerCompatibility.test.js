const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

for (const file of ['pages/activity_list/activity_list.js', 'components/date-time-picker-sheet/index.js']) {
  test(`${file} avoids the missing Babel object-rest runtime helper`, () => {
    const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    assert.doesNotMatch(source, /(?:const|let|var)\s*\{[^{}]*\.\.\./s);
    assert.doesNotMatch(source, /objectWithoutProperties(?:Loose)?/);
    assert.match(source, /Object\.assign\(\{\}, (?:item|pickerState)\)/);
  });
}
