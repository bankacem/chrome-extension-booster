"""
Safe config for SEO Agent Pro — read API keys from environment variables.
This file is intended for use on a local machine or CI. Do NOT commit real
API keys to a public repository.
"""

import os

API_KEYS = {
    "anthropic":   os.getenv("ANTHROPIC_KEY", ""),
    "openrouter":  os.getenv("OPENROUTER_KEY", ""),
    "groq":        os.getenv("GROQ_KEY", ""),
    # Bluesminds — kept for backward compatibility only. The base URL used by
    # _call_bluesminds() (api.bluesminds.com) was never confirmed against real
    # docs and does not resolve/serve the OpenAI-compatible API — this is the
    # actual cause of the repeated 500/504 errors, not a transient outage.
    "bluesminds":  os.getenv("BLUESMINDS_KEY", ""),
    # Agentrouter.org — the provider actually validated in test_agentrouter.py.
    # Set AGENTROUTER_KEY in your environment; never hardcode the key here.
    "agentrouter": os.getenv("AGENTROUTER_KEY", ""),
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

    # ── Bluesminds — DEPRECATED, base URL unconfirmed / not working ──
    "bluesminds-gpt4o":     ("bluesminds",  "gpt-4o"),
    "bluesminds-llama-8b":  ("bluesminds",  "meta/llama-3.1-8b-instruct"),

    # ── Agentrouter.org — use these instead of the bluesminds-* entries ──
    "agentrouter-gpt-4o":       ("agentrouter", "gpt-4o"),
    "agentrouter-gpt-4o-mini":  ("agentrouter", "gpt-4o-mini"),
    "agentrouter-claude-sonnet":("agentrouter", "claude-sonnet-4-5"),
    "agentrouter-deepseek-v3":  ("agentrouter", "deepseek-v3"),
}

# NOTE: run `python test_agentrouter.py` (with AGENTROUTER_KEY set) once to
# confirm which base URL (agentrouter.org vs agentrouter.org/api) and which
# model IDs actually respond for your account before relying on these in
# production — the candidate list above is not yet verified end-to-end.

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
