# Mini Program Resource Exports

These are the original PNG files for the optimized app exports. This directory
is outside `miniprogramRoot` and is never included in the Mini Program package.
Keep the originals when regenerating exports.

`manifest.json` records original/export SHA-256, dimensions, byte sizes, and the
unchanged audio hashes. Seven exports use lossless pyoxipng 9.1.1 (level 6,
Zopfli 15, safe metadata stripping). The guest avatar is explicitly marked as
`indexed-png-256`: imagequant 1.1.5 with a 256-color palette, minimum quality 95,
target quality 100, and dithering 0.5, followed by lossless PNG optimization.
It is regenerated directly from the original RGBA image using Lanczos resizing
to 512 x 512 before quantization, matching both tool illustrations' dimensions.
Resizing and color quantization are not mathematically lossless. The avatar
retains transparency, sRGB, its resource path, and its on-screen size.
The original RGBA image remains here. Build tools are not app dependencies.

Run the regression checks with the project's existing Pillow environment:

```powershell
& 'backend/.venv/Scripts/python.exe' tools/test_miniprogram_assets.py
```

The tests compare decoded RGBA pixels and color metadata, not just file sizes.
Only the marked avatar uses perceptual error bounds instead of pixel equality.
Against the 512px Lanczos reference, MAE < 0.3 and PSNR > 50 dB are required at
100/160/300/480 px. Against the full original, MAE < 0.35 and PSNR > 49 dB are
required at 100/160/300 px. Both checks use dark and light backgrounds, separating
palette error from the intentional resize. The source's dimensions are recorded
separately from the exported dimensions.
Its indexed PNG mode, alpha channel, and color count match the tool illustrations.
Audio remains byte-identical so the existing trimmed onset and playback behavior
are preserved. JavaScript, page markup, styles, and resource paths are unchanged.

`package-size.json` records the 2026-10-20 before/after local production builds
using the same official miniprogram-ci compiler and wxapkg packer. Package size
includes the package index and headers, not only the source directory's bytes.
The builds do not upload a version; authenticated project attributes were not
available, so both builds used the same compiler defaults for those attributes.
The final WeChat upload result remains authoritative. Markdown documentation is
excluded through `project.config.json`; source originals and build tools remain
outside `miniprogramRoot`.

The indexed-avatar stage reuses the preceding production compile and replaces
only the PNG before repacking with the same official packer. It is recorded
separately from the first full compile. The current avatar was also decoded and
shown at 100 x 100 in the existing WeChat DevTools simulator; its in-simulator
SHA-256 matched the new export. Native before/after screenshots were inspected.
This does not replace physical iOS/Android acceptance.
