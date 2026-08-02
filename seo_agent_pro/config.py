"""
Safe config for SEO Agent Pro — read API keys from environment variables.
This file is intended for use on a local machine or CI. Do NOT commit real
API keys to a public repository.
"""

import os

API_KEYS = {
    "anthropic":  os.getenv("ANTHROPIC_KEY", ""),
    "openrouter": os.getenv("OPENROUTER_KEY", ""),
    "groq":       os.getenv("GROQ_KEY", ""),
    # Bluesminds (user-provided provider)
    "bluesminds": os.getenv("BLUESMINDS_KEY", ""),
}

# ──────────────────────────────────────────────────────────────
#  AVAILABLE MODELS
#  Format: "display_name": ("provider", "model_id")
#  Add Bluesminds model IDs here once you discover them from the test endpoint.
# ──────────────────────────────────────────────────────────────

MODELS = {
    # ── Anthropic ──────────────────────────────────────────────
    "claude-sonnet-4":      ("anthropic",   "claude-sonnet-4-5"),
    "claude-haiku":         ("anthropic",   "claude-haiku-4-5-20251001"),

    # ── OpenRouter ─────────────────────────────────────────────
    "gpt-4o":               ("openrouter",  "openai/gpt-4o"),
    "gpt-4o-mini":          ("openrouter",  "openai/gpt-4o-mini"),

    # ── Groq (ultra-fast) ──────────────────────────────────────
    "llama-3.1-70b-groq":   ("groq",        "llama-3.1-70b-versatile"),

    # ── Bluesminds (confirmed working models, tested 2026-08-02) ─
    "bluesminds-gpt4o":     ("bluesminds",  "gpt-4o"),
    "bluesminds-llama-8b":  ("bluesminds",  "meta/llama-3.1-8b-instruct"),
}

# ──────────────────────────────────────────────────────────────
#  DEFAULT MODEL
# ──────────────────────────────────────────────────────────────

DEFAULT_MODEL = "claude-sonnet-4"

# ──────────────────────────────────────────────────────────────
#  GENERATION SETTINGS
# ──────────────────────────────────────────────────────────────

SETTINGS = {
    "max_tokens":    4096,
    "temperature":   0.7,
    "stream":        True,
    "output_dir":    "output",
    "memory_file":   "seo_memory.json",
}
