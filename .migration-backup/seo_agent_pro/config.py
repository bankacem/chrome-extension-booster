"""
╔══════════════════════════════════════════════════════════════╗
║              SEO AGENT PRO — API Configuration               ║
║                                                              ║
║  Add your API keys here. Leave unused providers empty (""). ║
╚══════════════════════════════════════════════════════════════╝
"""

# ──────────────────────────────────────────────────────────────
#  API KEYS
#  Get keys from:
#    Anthropic   → https://console.anthropic.com
#    OpenRouter  → https://openrouter.ai/keys
#    Groq        → https://console.groq.com/keys
# ──────────────────────────────────────────────────────────────

API_KEYS = {
    "anthropic":  "sk-ant-v7-u6PV6RBen5GQohiyNupoCKl7m1lnCJvG5iegV8WZTljtd6Z2",   # sk-u6PV6RBen5GQohiyNupoCKl7m1lnCJvG5iegV8WZTljtd6Z2
    "openrouter": "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",   # OpenRouter Key
    "groq":       "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",   # Groq Key
}

# ──────────────────────────────────────────────────────────────
#  AVAILABLE MODELS
#  Format: "display_name": ("provider", "model_id")
# ──────────────────────────────────────────────────────────────

MODELS = {
    # ── Anthropic ──────────────────────────────────────────────
    "claude-sonnet-4":      ("anthropic",   "claude-sonnet-4-5"),
    "claude-haiku":         ("anthropic",   "claude-haiku-4-5-20251001"),

    # ── OpenRouter ─────────────────────────────────────────────
    "gpt-4o":               ("openrouter",  "openai/gpt-4o"),
    "gpt-4o-mini":          ("openrouter",  "openai/gpt-4o-mini"),
    "gemini-pro":           ("openrouter",  "google/gemini-pro-1.5"),
    "gemini-flash":         ("openrouter",  "google/gemini-flash-1.5"),
    "mistral-large":        ("openrouter",  "mistralai/mistral-large"),
    "llama-3.3-70b":        ("openrouter",  "meta-llama/llama-3.3-70b-instruct"),
    "deepseek-r1":          ("openrouter",  "deepseek/deepseek-r1"),
    "qwen-2.5-72b":         ("openrouter",  "qwen/qwen-2.5-72b-instruct"),

    # ── Groq (ultra-fast) ──────────────────────────────────────
    "llama-3.1-70b-groq":   ("groq",        "llama-3.1-70b-versatile"),
    "llama-3.3-70b-groq":   ("groq",        "llama-3.3-70b-versatile"),
    "mixtral-8x7b-groq":    ("groq",        "mixtral-8x7b-32768"),
    "gemma2-9b-groq":       ("groq",        "gemma2-9b-it"),
}

# ──────────────────────────────────────────────────────────────
#  DEFAULT MODEL
#  Change this to set which model runs by default
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
