"""Honesty & cleanliness gates — public surface.

from seo_agent_pro.agents_v2.gates import fabrication_gate
"""
from .body_neutralization import (  # noqa: F401
    body_neutralization_gate,
)
from .fabrication import (  # noqa: F401
    SEVERITIES,
    S1_PATTERNS,
    S1_PROPOSED_PATTERNS,
    S2_PATTERNS,
    PRODUCTS,
    FM_FIELDS,
    FM_HONESTY_PATTERNS,
    fabrication_gate,
    frontmatter_honesty_gate,
)
