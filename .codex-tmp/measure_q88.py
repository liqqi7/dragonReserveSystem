from pathlib import Path
from PIL import Image
import sys
source, output = map(Path, sys.argv[1:])
with Image.open(source) as image:
    image.load()
    source_mode = image.mode
    if image.mode not in ('RGB', 'L'):
        background = Image.new('RGB', image.size, (255, 255, 255))
        if 'A' in image.getbands():
            background.paste(image.convert('RGB'), mask=image.getchannel('A'))
        else:
            background.paste(image.convert('RGB'))
        image = background
    elif image.mode == 'L':
        image = image.convert('RGB')
    image.save(output, format='JPEG', quality=88, subsampling=2, optimize=True, progressive=False,
               icc_profile=image.info.get('icc_profile'), exif=image.info.get('exif', b''))
print(f'source_mode={source_mode}; dimensions={image.size[0]}x{image.size[1]}; source_bytes={source.stat().st_size}; q88_bytes={output.stat().st_size}')
