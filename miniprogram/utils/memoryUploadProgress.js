// Ring geometry exported from Pencil xkSru; only the visible sector changes.
const RING_PATH = "M13 0 C20.18 0 26 5.82 26 13 C26 20.18 20.18 26 13 26 C5.82 26 0 20.18 0 13 C0 5.82 5.82 0 13 0 Z M13 2.34 C7.113 2.34 2.34 7.113 2.34 13 C2.34 18.887 7.113 23.66 13 23.66 C18.887 23.66 23.66 18.887 23.66 13 C23.66 7.113 18.887 2.34 13 2.34 Z";
const images = new Map();

function uploadProgressImage(value) {
  const progress = Math.max(0, Math.min(100, Math.floor(Number(value) || 0)));
  if (images.has(progress)) return images.get(progress);
  const path = `<path data-pencil-id="xkSru" fill="#FFFFFF" d="${RING_PATH}"`;
  let foreground = "";
  if (progress === 100) foreground = `${path}/>`;
  else if (progress > 0) {
    const angle = progress * Math.PI / 50;
    const x = (13 + 26 * Math.sin(angle)).toFixed(5);
    const y = (13 - 26 * Math.cos(angle)).toFixed(5);
    // The sector clips the exported ring, rather than drawing a new icon.
    foreground = `<defs><clipPath id="progress"><path d="M13 13 L13 -13 A26 26 0 ${progress > 50 ? 1 : 0} 1 ${x} ${y} Z"/></clipPath></defs>${path} clip-path="url(#progress)"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 26 26" width="26" height="26">${path} fill-opacity="0.25098"/>${foreground}</svg>`;
  const bytes = new Uint8Array(svg.length);
  for (let index = 0; index < svg.length; index++) bytes[index] = svg.charCodeAt(index);
  const image = `data:image/svg+xml;base64,${wx.arrayBufferToBase64(bytes.buffer)}`;
  images.set(progress, image);
  return image;
}

module.exports = { uploadProgressImage };
