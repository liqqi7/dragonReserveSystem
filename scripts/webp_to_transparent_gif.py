#!/usr/bin/env python3
"""
将动图 WebP 转为透明背景 GIF
解决 PIL 默认转换导致透明区域变黑的问题
"""
from typing import Tuple, List, Union
from collections import defaultdict
from random import randrange
from itertools import chain

from PIL import Image, ImageSequence


class TransparentAnimatedGifConverter:
    """解决 PIL 保存 GIF 时透明像素变黑的问题"""
    _PALETTE_SLOTSET = set(range(256))

    def __init__(self, img_rgba: Image.Image, alpha_threshold: int = 128):
        self._img_rgba = img_rgba
        self._alpha_threshold = alpha_threshold

    def _process_pixels(self):
        """标记透明像素"""
        self._transparent_pixels = set(
            idx for idx, alpha in enumerate(
                self._img_rgba.getchannel(channel='A').getdata())
            if alpha <= self._alpha_threshold)

    def _set_parsed_palette(self):
        """解析调色板"""
        palette = self._img_p.getpalette()
        self._img_p_used_palette_idxs = set(
            idx for pal_idx, idx in enumerate(self._img_p_data)
            if pal_idx not in self._transparent_pixels)
        self._img_p_parsedpalette = dict(
            (idx, tuple(palette[idx * 3:idx * 3 + 3]))
            for idx in self._img_p_used_palette_idxs)

    def _get_similar_color_idx(self):
        """获取最相似颜色的调色板索引"""
        old_color = self._img_p_parsedpalette[0]
        dict_distance = defaultdict(list)
        for idx in range(1, 256):
            if idx not in self._img_p_parsedpalette:
                continue
            color_item = self._img_p_parsedpalette[idx]
            if color_item == old_color:
                return idx
            distance = sum((
                abs(old_color[0] - color_item[0]),
                abs(old_color[1] - color_item[1]),
                abs(old_color[2] - color_item[2])))
            dict_distance[distance].append(idx)
        return dict_distance[sorted(dict_distance)[0]][0] if dict_distance else 1

    def _remap_palette_idx_zero(self):
        """重映射调色板索引 0"""
        free_slots = self._PALETTE_SLOTSET - self._img_p_used_palette_idxs
        new_idx = free_slots.pop() if free_slots else self._get_similar_color_idx()
        self._img_p_used_palette_idxs.add(new_idx)
        self._palette_replaces['idx_from'].append(0)
        self._palette_replaces['idx_to'].append(new_idx)
        self._img_p_parsedpalette[new_idx] = self._img_p_parsedpalette[0]
        del self._img_p_parsedpalette[0]

    def _get_unused_color(self) -> tuple:
        """获取未使用的颜色"""
        used_colors = set(self._img_p_parsedpalette.values())
        while True:
            new_color = (randrange(256), randrange(256), randrange(256))
            if new_color not in used_colors:
                return new_color

    def _process_palette(self):
        """处理调色板，将索引 0 设为透明"""
        self._set_parsed_palette()
        if 0 in self._img_p_used_palette_idxs:
            self._remap_palette_idx_zero()
        self._img_p_parsedpalette[0] = self._get_unused_color()

    def _adjust_pixels(self):
        """调整像素值"""
        if self._palette_replaces['idx_from']:
            trans_table = bytearray.maketrans(
                bytes(self._palette_replaces['idx_from']),
                bytes(self._palette_replaces['idx_to']))
            self._img_p_data = self._img_p_data.translate(trans_table)
        for idx_pixel in self._transparent_pixels:
            self._img_p_data[idx_pixel] = 0
        self._img_p.frombytes(data=bytes(self._img_p_data))

    def _adjust_palette(self):
        """调整调色板"""
        unused_color = self._get_unused_color()
        final_palette = chain.from_iterable(
            self._img_p_parsedpalette.get(x, unused_color) for x in range(256))
        self._img_p.putpalette(data=final_palette)

    def process(self) -> Image.Image:
        """返回处理后的 P 模式图像"""
        self._img_p = self._img_rgba.convert(mode='P')
        self._img_p_data = bytearray(self._img_p.tobytes())
        self._palette_replaces = dict(idx_from=list(), idx_to=list())
        self._process_pixels()
        self._process_palette()
        self._adjust_pixels()
        self._adjust_palette()
        self._img_p.info['transparency'] = 0
        self._img_p.info['background'] = 0
        return self._img_p


def webp_to_transparent_gif(webp_path: str, gif_path: str, scale: float = 1.0, frame_step: int = 1):
    """将动图 WebP 转为透明背景 GIF
    
    Args:
        webp_path: 源文件路径
        gif_path: 输出路径
        scale: 缩放比例 (0-1)，默认 1.0 不缩放
        frame_step: 帧间隔，1=全部帧，2=每隔一帧
    """
    img = Image.open(webp_path)
    frames = []
    durations = []

    for i, frame in enumerate(ImageSequence.Iterator(img)):
        if i % frame_step != 0:
            continue
        frame_rgba = frame.convert('RGBA')
        if scale < 1.0:
            w, h = frame_rgba.size
            new_size = (int(w * scale), int(h * scale))
            frame_rgba = frame_rgba.resize(new_size, Image.Resampling.LANCZOS)
        converter = TransparentAnimatedGifConverter(img_rgba=frame_rgba)
        frame_p = converter.process()
        frames.append(frame_p)
        dur = frame.info.get('duration', 100) * frame_step
        durations.append(dur)

    save_kwargs = dict(
        format='GIF',
        save_all=True,
        optimize=False,
        append_images=frames[1:],
        duration=durations,
        disposal=2,
        loop=0
    )
    frames[0].save(gif_path, **save_kwargs)


if __name__ == '__main__':
    import sys
    import os
    names = ['activity-empty-default', 'activity-empty-icon', 'empty-state-icon']
    base = 'miniprogram/images'
    # scale=0.32 新缺省图 500px 需更小缩放以 < 200KB
    scale = float(os.environ.get('GIF_SCALE', '0.32'))
    frame_step = int(os.environ.get('GIF_FRAME_STEP', '1'))
    for name in names:
        webp = f'{base}/{name}.webp'
        gif = f'{base}/{name}.gif'
        try:
            webp_to_transparent_gif(webp, gif, scale=scale, frame_step=frame_step)
            size_kb = os.path.getsize(gif) / 1024
            print(f'Converted {name}.webp -> {name}.gif ({size_kb:.0f}KB)')
        except Exception as e:
            print(f'Error converting {name}: {e}')
            sys.exit(1)
