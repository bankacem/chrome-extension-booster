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
    S1_V3_PATTERNS,
    S2_PATTERNS,
    PRODUCTS,
    FM_FIELDS,
    FM_HONESTY_PATTERNS,
    fabrication_gate,
    frontmatter_honesty_gate,
)
from .unattributed import (  # noqa: F401
    ATTRIBUTION_ENTITIES,
    MEASURE_HEADER_RE,
    scan_attribution_numbers,
    scan_unattributed_table_cells,
    unattributed_gate,
)
