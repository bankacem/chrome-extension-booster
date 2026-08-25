import unittest

import config


class ConfigTests(unittest.TestCase):
    def test_default_model_is_registered(self):
        self.assertIn(config.DEFAULT_MODEL, config.MODELS)

    def test_model_registry_entries_have_provider_and_model_id(self):
        self.assertGreater(len(config.MODELS), 0)
        for name, entry in config.MODELS.items():
            with self.subTest(model=name):
                self.assertIsInstance(entry, tuple)
                self.assertEqual(len(entry), 2)
                provider, model_id = entry
                self.assertIn(provider, config.API_KEYS)
                self.assertTrue(model_id)

    def test_generation_settings_are_valid(self):
        self.assertGreater(config.SETTINGS["max_tokens"], 0)
        self.assertGreaterEqual(config.SETTINGS["temperature"], 0)
        self.assertLessEqual(config.SETTINGS["temperature"], 2)
        self.assertIsInstance(config.SETTINGS["stream"], bool)


if __name__ == "__main__":
    unittest.main()
