const fs = require("node:fs");
const path = require("node:path");

function readWxss(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  return source.replace(/@import\s+["']([^"']+)["']\s*;/g, (_, relativePath) =>
    readWxss(path.resolve(path.dirname(filePath), relativePath))
  );
}

function readRules(filePath) {
  const rules = {};
  const source = readWxss(filePath).replace(/\/\*[\s\S]*?\*\//g, "");
  for (const match of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const declarations = {};
    for (const declaration of match[2].split(";")) {
      const separator = declaration.indexOf(":");
      if (separator < 0) continue;
      declarations[declaration.slice(0, separator).trim()] = declaration.slice(separator + 1).trim();
    }
    for (const selector of match[1].split(",").map(value => value.trim())) {
      rules[selector] = { ...rules[selector], ...declarations };
    }
  }
  return rules;
}

module.exports = { readWxss, readRules };
