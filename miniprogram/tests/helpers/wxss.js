const fs = require("node:fs");
const path = require("node:path");

function readWxss(file) {
  return fs
    .readFileSync(file, "utf8")
    .replace(/@import\s+"([^"]+)"\s*;/g, (_, imported) =>
      readWxss(path.resolve(path.dirname(file), imported)),
    );
}

module.exports = { readWxss };
