"""Verify app exports against originals kept outside the code package."""
from hashlib import sha256
from pathlib import Path
import json
import math
import unittest

from PIL import Image, ImageChops, ImageStat

ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / 'assets/miniprogram-originals'
APP = ROOT / 'miniprogram'


class MiniprogramAssetsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest = json.loads((SOURCES / 'manifest.json').read_text(encoding='utf-8'))

    def test_exports_match_declared_dimensions_quality_and_color_management(self):
        for record in self.manifest['images']:
            with self.subTest(path=record['path']):
                source, exported = SOURCES / record['path'], APP / record['path']
                self.assertEqual(sha256(source.read_bytes()).hexdigest(), record['source_sha256'])
                self.assertEqual(sha256(exported.read_bytes()).hexdigest(), record['export_sha256'])
                with Image.open(source) as before, Image.open(exported) as after:
                    self.assertEqual(before.size, tuple(record.get('source_dimensions', record['dimensions'])))
                    self.assertEqual(after.size, tuple(record['dimensions']))
                    if record.get('encoding') == 'indexed-png-256':
                        self.assertEqual(record['path'], 'images/profile-guest-avatar.png')
                        self.assert_indexed_quality(before, after)
                    else:
                        self.assertNotIn('encoding', record)
                        self.assertEqual(before.size, after.size)
                        self.assertEqual(before.convert('RGBA').tobytes(), after.convert('RGBA').tobytes())
                    for key in ('icc_profile', 'srgb', 'gamma', 'chromaticity'):
                        self.assertEqual(before.info.get(key), after.info.get(key))
                self.assertEqual(source.stat().st_size, record['before'])
                self.assertEqual(exported.stat().st_size, record['after'])
                self.assertLess(exported.stat().st_size, source.stat().st_size)

    def assert_indexed_quality(self, before, after):
        self.assertEqual(before.convert('RGBA').getchannel('A').getextrema(),
                         after.convert('RGBA').getchannel('A').getextrema())
        reference = before.convert('RGBA').resize(after.size, Image.Resampling.LANCZOS)
        self.assert_display_quality(reference, after, (100, 160, 300, 480), 0.3, 50)
        self.assert_display_quality(before, after, (100, 160, 300), 0.35, 49)

    def assert_display_quality(self, before, after, sizes, max_mae, min_psnr):
        for background in ('#545454', '#f8fafc'):
            original = Image.alpha_composite(Image.new('RGBA', before.size, background), before.convert('RGBA')).convert('RGB')
            exported = Image.alpha_composite(Image.new('RGBA', after.size, background), after.convert('RGBA')).convert('RGB')
            for size in sizes:
                with self.subTest(background=background, display_size=size):
                    a = original.resize((size, size), Image.Resampling.LANCZOS)
                    b = exported.resize((size, size), Image.Resampling.LANCZOS)
                    stats = ImageStat.Stat(ImageChops.difference(a, b))
                    rmse = math.sqrt(sum(value * value for value in stats.rms) / 3)
                    self.assertLess(sum(stats.mean) / 3, max_mae)
                    self.assertTrue(rmse == 0 or 20 * math.log10(255 / rmse) > min_psnr)

    def test_guest_avatar_matches_tool_illustration_format(self):
        for name in ('profile-guest-avatar.png', 'home-tool-boardgames.png', 'home-tool-chwazi.png'):
            with self.subTest(image=name), Image.open(APP / 'images' / name) as image:
                self.assertEqual(image.format, 'PNG')
                self.assertEqual(image.mode, 'P')
                self.assertEqual(image.size, (512, 512))
                self.assertLessEqual(len(image.getcolors()), 256)
                self.assertIn('transparency', image.info)
                minimum, maximum = image.convert('RGBA').getchannel('A').getextrema()
                self.assertEqual(minimum, 0)
                self.assertGreaterEqual(maximum, 250)

    def test_audio_keeps_original_bytes_and_playback_onset(self):
        audio = self.manifest['audio_unchanged']
        self.assertTrue(audio)
        for relative, digest in audio.items():
            with self.subTest(path=relative):
                self.assertEqual(sha256((APP / relative).read_bytes()).hexdigest(), digest)

    def test_sources_and_tests_are_outside_the_package(self):
        config = json.loads((ROOT / 'project.config.json').read_text(encoding='utf-8'))
        self.assertEqual((ROOT / config['miniprogramRoot']).resolve(), APP)
        self.assertFalse(SOURCES.is_relative_to(APP))
        self.assertIn({'type': 'folder', 'value': 'tests'}, config['packOptions']['ignore'])
        self.assertIn({'type': 'suffix', 'value': '.md'}, config['packOptions']['ignore'])
        app = json.loads((APP / 'app.json').read_text(encoding='utf-8'))
        self.assertEqual(app.get('subPackages'), [])


if __name__ == '__main__':
    unittest.main()
