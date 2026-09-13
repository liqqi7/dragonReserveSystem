const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const imageDir = path.join(__dirname, "../images");
const prototypeIcons = {
  "activity-detail-chevron-left.svg": { id: "wdlHP", icon: "chevron-left", width: 18, height: 18, fill: "#FFFFFF", hash: "1a21780209050a1beeded91faea968138f9075c2aa81855b035ba2e08c77eb36" },
  "activity-detail-chevron-right.svg": { id: "gN74I", icon: "chevron-right", width: 14, height: 14, fill: "#9CA3AF", hash: "392ec546fd14836c01db2d56eaf29f064518e39d5b29abbc10c8d30db96e283c" },
  "activity-detail-chevron-down.svg": { id: "ZwcJG", icon: "chevron-down", width: 14, height: 14, fill: "#FFFFFFCC", hash: "8a8c14dee12978b9ae2b2de0a512339772ca0335525a3da767604d8fa10f1833" },
  "activity-detail-chevron-up.svg": { id: "AYzHT", icon: "chevron-up", width: 14, height: 14, fill: "#FFFFFFCC", hash: "e2b0efe8d3b459e033f93f95f030cd9bea4463f06ac061ea8182fd093bf3d1e0" },
  "icon-navigation.svg": { id: "n94xE", icon: "navigation", width: 15, height: 15, fill: "#FF9800", hash: "e0e792ec21ece56368dd1ac04854fbc3c2912255e77b4f482c49904acee6a1a8" },
  "weather-partly-cloudy.svg": { id: "F6RJvi", icon: "cloud-sun", width: 24, height: 24, fill: "#FF9800", hash: "ed1d6815d48d406eae51eb9c238278a76a3e645d3679bf84ece1397ae710ba99" },
  "weather-humidity.svg": { id: "tXrji", icon: "droplets", width: 14, height: 14, fill: "#4B5563", hash: "6a5acfd4f91556890dd5e30b401289661223a856b53843f887fb3f877c12d2b6" },
  "weather-wind.svg": { id: "vQrLD", icon: "navigation", width: 14, height: 14, fill: "#4B5563", hash: "e0e792ec21ece56368dd1ac04854fbc3c2912255e77b4f482c49904acee6a1a8" },
  "weather-air-quality.svg": { id: "Z6qG3", icon: "leaf", width: 14, height: 14, fill: "#4B5563", hash: "5afe65de4dd1a8bfce041944478deae0dd37e68061d4a5209f95d949408ccf37" },
  "weather-sunny.svg": { id: "dbIwm", icon: "sun", width: 24, height: 24, fill: "#FF9800", hash: "16abc1e66bab87bfd076ad3e4c5d68413e2d7fc1a52d0a319f91ea1f02fd6f77" },
  "weather-cloudy.svg": { id: "S0YqL", icon: "cloud", width: 24, height: 24, fill: "#FF9800", hash: "0239b5a9f7e22379056f950b89ab08af6b2f09cb9963d221741b5277a09ef715" },
  "weather-rain.svg": { id: "iCIov", icon: "cloud-rain", width: 24, height: 24, fill: "#FF9800", hash: "9f856c5c9aff42dd9c10af7a110542e943868419473b6c35b1e104ad0b0e76ea" },
  "weather-snow.svg": { id: "nDnfE", icon: "snowflake", width: 24, height: 24, fill: "#FF9800", hash: "aeeab0bf28e58cd10324be602c631a044aef118e471c27ba9f576a2c8b03f6ed" },
  "weather-fog.svg": { id: "ArYPQ", icon: "cloud-fog", width: 24, height: 24, fill: "#FF9800", hash: "74bc281fb927c116ae256270ffd798199061a427d3e8e4caa2d2d4678f8ea297" },
  "weather-dust.svg": { id: "etwOv", icon: "wind", width: 24, height: 24, fill: "#FF9800", hash: "bcb7b0e6ade8ea34b57fd5e8f53ba1b60305ebbb0fcf177a639404ffcc83d866" },
  "icon-share.svg": { id: "H0mzuM", icon: "share-2", width: 20, height: 20, fill: "#FF9800", hash: "17b54ba0d1138eb77f8412842a230ed4aab4416e910792494a11901cf0186eb6" },
  "icon-edit.svg": { id: "ljUn1", icon: "pencil", width: 20, height: 20, fill: "#FF9800", hash: "49eff4396db1ec654b97eb0c458def6755d00cefde82f4f1ac1558845e5daf57" }
};

test("activity detail icons use the exact filled SVG paths exported from the Pencil prototype", () => {
  for (const [filename, expected] of Object.entries(prototypeIcons)) {
    const svg = fs.readFileSync(path.join(imageDir, filename), "utf8");
    const pathData = svg.match(/<path d="([^"]+)" fill="([^"]+)"\/>/);

    assert.match(svg, new RegExp(`width="${expected.width}" height="${expected.height}"`), filename);
    assert.match(svg, /viewBox="0 0 13\.99993896484375 14"/, filename);
    assert.match(svg, new RegExp(`data-prototype-id="${expected.id}"`), filename);
    assert.match(svg, new RegExp(`data-icon-name="${expected.icon}"`), filename);
    assert.doesNotMatch(svg, /stroke(?:-width)?=/, filename);
    assert.ok(pathData, `${filename} should contain one prototype filled path`);
    assert.equal(pathData[2], expected.fill, `${filename} fill should match the prototype`);
    assert.equal(
      crypto.createHash("sha256").update(pathData[1]).digest("hex"),
      expected.hash,
      `${filename} path should stay aligned with the Pencil export`
    );
  }
});
