const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createRequire } = require("node:module");

function loadPage(name) {
  const filename = path.join(__dirname, `../pages/${name}/${name}.js`);
  let definition;
  vm.runInNewContext(fs.readFileSync(filename, "utf8"), {
    require: createRequire(filename),
    Page(value) { definition = value; },
    getApp: () => ({ globalData: {} })
  }, { filename });
  return definition;
}

for (const [name, handler, minimums] of [
  ["activity_create", "stepCapacity", [3]],
  ["activity_edit", "stepQuota", [3, 8]]
]) {
  test(`${name}: quota boundary clicks do nothing and reverse steps re-enable changes`, () => {
    const definition = loadPage(name);
    for (const minimum of minimums) {
      for (const [boundary, blockedDelta] of [[minimum, -1], [999, 1]]) {
        const page = {
          data: { minParticipants: minimum, form: { maxParticipants: boundary, subItems: [] } },
          updates: 0,
          setData(patch) {
            this.updates += 1;
            for (const [key, value] of Object.entries(patch)) this.data.form[key.slice(5)] = value;
          }
        };
        const step = delta => definition[handler].call(page, { currentTarget: { dataset: { delta } } });
        step(blockedDelta);
        step(blockedDelta);
        assert.equal(page.updates, 0);
        assert.equal(page.data.form.maxParticipants, boundary);
        step(-blockedDelta);
        assert.equal(page.data.form.maxParticipants, boundary - blockedDelta);
        step(blockedDelta);
        assert.equal(page.data.form.maxParticipants, boundary);
        assert.equal(page.updates, 2);
      }
    }
  });

  test(`${name}: disabled quota icons keep the prototype white button and gray icon`, () => {
    const pageDir = path.join(__dirname, `../pages/${name}`);
    const wxml = fs.readFileSync(path.join(pageDir, `${name}.wxml`), "utf8");
    const wxss = fs.readFileSync(path.join(pageDir, `${name}.wxss`), "utf8");
    const minimum = name === "activity_create" ? "3" : "minParticipants";
    for (const [comparison, icon] of [[`<= ${minimum}`, "minus"], [">= 999", "plus"]]) {
      assert.ok(wxml.includes(`form.maxParticipants ${comparison} ? 'step-button--disabled' : ''`));
      assert.ok(wxml.includes(`aria-disabled="{{form.maxParticipants ${comparison}}}"`));
      assert.ok(wxml.includes(`form.maxParticipants ${comparison} ? '/images/icon-${icon}-disabled.svg' : '/images/icon-${icon}.svg'`));
      const active = fs.readFileSync(path.join(__dirname, `../images/icon-${icon}.svg`), "utf8").trim();
      const disabled = fs.readFileSync(path.join(__dirname, `../images/icon-${icon}-disabled.svg`), "utf8").trim();
      assert.equal(disabled.replace(/\r\n/g, "\n"), active.replace(/\r\n/g, "\n").replace("#FF9800", "#9CA3AF"));
    }
    assert.match(wxss, /\.step-button\s*\{[^}]*background:\s*#FFFFFF;/);
    const disabledStyle = wxss.match(/\.step-button--disabled\s*\{([^}]+)\}/)[1];
    assert.match(disabledStyle, /pointer-events:\s*none;/);
    assert.doesNotMatch(disabledStyle, /background|opacity|width|height/);
  });
}
