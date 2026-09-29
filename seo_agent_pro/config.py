"""
Safe config for SEO Agent Pro — read API keys from environment variables.
This file is intended for use on a local machine or CI. Do NOT commit real
API keys to a public repository.
"""

import os


# ──────────────────────────────────────────────────────────────
#  SECRETS RESOLUTION
#  Order (first hit wins):
#    1. real environment variable          (export CLEANAPIS_KEY=...)
#    2. site/seo_agent_pro/secrets.env     (KEY=VALUE lines, gitignored)
#    3. /home/z/my-project/.env            (workspace-level drop file)
#  This is what makes the Clean APIs key "plug and play": the user can
#  paste the key into ANY of the three places and every agent picks it up
#  on the next run, no code changes.
# ──────────────────────────────────────────────────────────────

def _load_secret_file(path: str) -> dict:
    got = {}
    try:
        with open(path, "r", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, _, v = line.partition("=")
                got[k.strip()] = v.strip().strip('"').strip("'")
    except OSError:
        pass
    return got


def resolve_key(env_names, file_names=None):
    """Resolve an API key from env, then from known secret files."""
    for name in env_names:
        v = os.getenv(name, "")
        if v:
            return v, f"env:{name}"
    for path in (file_names or []):
        if not os.path.exists(path):
            continue
        data = _load_secret_file(path)
        for name in env_names:
            if data.get(name):
                return data[name], f"{path}#{name}"
    return "", "not-found"


_SECRETS_FILES = [
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "secrets.env"),
    "/home/z/my-project/.env",
]

_cleanapis_key, _cleanapis_src = resolve_key(
    ["CLEANAPIS_KEY", "CLEANAPIS_API_KEY"], _SECRETS_FILES
)

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
    # Gorouter.app — OpenAI-compatible gateway (validated live Aug 2026:
    # claude-opus-5 responds; Cloudflare in front requires a browser-like
    # User-Agent, same lesson as the Groq header below). Set GOROUTER_KEY
    # in your environment; never hardcode the key here.
    "gorouter": os.getenv("GOROUTER_KEY", ""),
    # Google AI Studio (Gemini) — used only by image_agent.py for featured
    # images (Imagen 3 via the Gemini API). Set GEMINI_KEY in your
    # environment / as a GitHub Actions secret. Must be a real AI Studio
    # API key (starts with "AIzaSy...", from aistudio.google.com/apikey) —
    # an OAuth access token will NOT work here and typically expires within
    # an hour, so don't paste one of those into this variable.
    "gemini": os.getenv("GEMINI_KEY", ""),
    # Manus built-in OpenAI-compatible proxy for local, reproducible tests.
    # Credentials are injected by the sandbox and are never committed.
    "openai_compat": os.getenv("OPENAI_API_KEY", ""),
    # Clean APIs (cleanapis.com) — OpenAI-compatible gateway, 33 models,
    # base URL https://cleanapis.com/v1 (validated against their live docs
    # and public model catalog, Sep 2026). Key resolved via resolve_key()
    # above: env CLEANAPIS_KEY → secrets.env → /home/z/my-project/.env.
    "cleanapis": _cleanapis_key,
}

# Where the cleanapis key actually came from ("env:CLEANAPIS_KEY",
# ".../secrets.env#CLEANAPIS_KEY", or "not-found") — used by
# test_cleanapis.py to print an exact diagnostic instead of a guess.
CLEANAPIS_KEY_SOURCE = _cleanapis_src

# Clean APIs live catalog (https://cleanapis.com/models, scraped Sep 2026):
# 33 models, USD per 1M input tokens. Free tier = 5M tokens/month and
# every plan reaches every model — plans only change token volume.
CLEANAPIS_CATALOG = {
    # sku: usd_per_1M_input
    "gemma-2-2b": 0.115,
    "deepseek-v4-flash-0731": 0.115,
    "gpt-5.6-luna": 0.3565,
    "deepseek-v4-pro-0813": 0.552,
    "qwen3.8-27b": 0.575,
    "seed-2.1-turbo": 0.92,
    "seed-2.1-pro": 1.15,
    "kimi-k2.6": 1.219,
    "gemini-3.7-flash": 1.242,
    "glm-5.3": 1.357,
    "glm-5.2": 1.357,
    "qwen3.8-max": 1.7595,
    "qwen3.7-max": 1.7595,
    "muse-spark-1.1": 1.817,
    "deepseek-v4-pro-max": 2.047,
    "gemini-3.6-flash": 2.4955,
    "grok-4.5": 2.806,
    "grok-4.6": 2.806,
    "claude-sonnet-5": 3.3235,
    "gpt-5.6-terra": 3.5765,
    "gemini-3.1-pro": 4.4735,
    "kimi-k3": 4.9795,
    "claude-opus-5": 8.303,
    "claude-mythos-preview": 8.303,
    "claude-opus-4.8": 8.303,
    "claude-opus-4.6": 8.303,
    "claude-opus-4.7": 8.303,
    "claude-opus-5.5": 8.303,
    "gpt-5.6-sol": 8.947,
    "gpt-5.5": 8.947,
    "gpt-5.5-pro": 8.947,
    "claude-fable-5": 8.303,
    "claude-fable-5.1": 8.303,
}

# Stage-based model picks for the article pipeline (overridable via env):
# writer needs long-context quality; translator needs strong multilingual;
# fast stages (SEO metadata, JSON classification) just need cheap speed.
CLEANAPIS_STAGE_MODELS = {
    "writer":      os.getenv("CLEANAPIS_MODEL_WRITER", "deepseek-v4-pro-0813"),
    "translator":  os.getenv("CLEANAPIS_MODEL_TRANSLATOR", "glm-5.3"),
    "fast":        os.getenv("CLEANAPIS_MODEL_FAST", "gpt-5.6-luna"),
    "heavy":       os.getenv("CLEANAPIS_MODEL_HEAVY", "claude-sonnet-5"),
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
    # OpenRouter Ox Alpha — use OPENROUTER_KEY from the environment only.
    "ox-alpha":             ("openrouter",  "stealth/ox-alpha"),

    # ── Manus built-in OpenAI-compatible proxy ──────────────────
    "builtin-gpt-5-mini":   ("openai_compat", "gpt-5-mini"),

    # ── Groq (ultra-fast) ──────────────────────────────────────
    # Groq — llama-3.1-70b-versatile / llama-3.3-70b-versatile were BOTH
    # deprecated by Groq (confirmed live: the 3.1 one errors with
    # "model_decommissioned" as of Aug 2026). Current recommended
    # general-purpose model per Groq's own deprecation notice is
    # openai/gpt-oss-120b (smaller: openai/gpt-oss-20b). Re-check
    # https://console.groq.com/docs/deprecations before trusting this long-term
    # — Groq's model lineup churns fast.
    "llama-3.1-70b-groq":   ("groq",        "openai/gpt-oss-120b"),

    # ── Bluesminds — DEPRECATED, base URL unconfirmed / not working ──
    "bluesminds-gpt4o":     ("bluesminds",  "gpt-4o"),
    "bluesminds-llama-8b":  ("bluesminds",  "meta/llama-3.1-8b-instruct"),

    # ── Agentrouter.org — use these instead of the bluesminds-* entries ──
    "agentrouter-gpt-4o":       ("agentrouter", "gpt-4o"),
    "agentrouter-gpt-4o-mini":  ("agentrouter", "gpt-4o-mini"),
    "agentrouter-claude-sonnet":("agentrouter", "claude-sonnet-4-5"),
    "agentrouter-deepseek-v3":  ("agentrouter", "deepseek-v3"),

    # ── Gorouter.app — validated live (claude-opus-5, long-form SEO article) ──
    "gorouter-claude-opus-5":   ("gorouter",     "claude-opus-5"),

    # ── Clean APIs (cleanapis.com) — 33-model OpenAI-compatible gateway ──
    # Stage picks first (what the pipeline actually uses), then direct skus.
    "cleanapis-writer":         ("cleanapis", CLEANAPIS_STAGE_MODELS["writer"]),
    "cleanapis-translator":     ("cleanapis", CLEANAPIS_STAGE_MODELS["translator"]),
    "cleanapis-fast":           ("cleanapis", CLEANAPIS_STAGE_MODELS["fast"]),
    "cleanapis-heavy":          ("cleanapis", CLEANAPIS_STAGE_MODELS["heavy"]),
    "cleanapi-gpt-5.6-luna":    ("cleanapis", "gpt-5.6-luna"),
    "cleanapi-deepseek-v4-pro": ("cleanapis", "deepseek-v4-pro-0813"),
    "cleanapi-glm-5.3":         ("cleanapis", "glm-5.3"),
    "cleanapi-gemini-3.7-flash":("cleanapis", "gemini-3.7-flash"),
    "cleanapi-claude-sonnet-5": ("cleanapis", "claude-sonnet-5"),
    "cleanapi-claude-opus-5":   ("cleanapis", "claude-opus-5"),
    "cleanapi-kimi-k3":         ("cleanapis", "kimi-k3"),
    "cleanapi-grok-4.6":        ("cleanapis", "grok-4.6"),
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
    # Bumped from 4096: articles now carry a longer hard-required section
    # checklist (see content.py) and were getting cut off mid-sentence
    # before finishing every required section within the old budget.
    "max_tokens":    7000,
    "temperature":   0.7,
    "stream":        True,
    "output_dir":    "output",
    "memory_file":   "seo_memory.json",
}
