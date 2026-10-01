"""agents_v2 — Anthropic-style layered agent system for the SEO pipeline.

Layer ب1 lives here: the role-routed LLM provider over cleanapis.com.
Higher layers (research agents, writer, critic, orchestrator) arrive in
later PRs and must go through llm_provider.chat() — never call the raw
HTTP endpoint directly.
"""
from .llm_provider import (  # noqa: F401
    BudgetExceeded,
    LLMResult,
    ProviderFatal,
    ToolCall,
    UsageLedger,
    chat,
    load_config,
    resolve_model,
)
