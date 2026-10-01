#!/usr/bin/env python3
"""Regression test for the empty-meta fallback path in daily_article.py.

That path calls c("yellow", f"  ↳ meta description empty from model — ...")
when the model returns an empty meta description. `c` lives in llm_router
and was never imported into daily_article — a latent NameError on the rare
empty-meta path (found by the bench-002 IMP pilot run; fixed here by
importing it next to call/find_working_model).

Run:  python3 seo_agent_pro/test_meta_fallback_path.py
(also works under pytest if you have it)
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import daily_article  # noqa: E402


def test_c_is_imported_into_daily_article():
    """The empty-meta fallback path uses c() — the name must resolve."""
    assert callable(daily_article.c), (
        "c is not imported in daily_article — the empty-meta fallback path "
        "(print(c('yellow', 'meta description empty ...'))) raises NameError"
    )


def test_c_is_the_llm_router_helper():
    import llm_router
    assert daily_article.c is llm_router.c


def test_fallback_call_shape_resolves():
    """Execute the exact call shape used by the empty-meta path."""
    out = daily_article.c(
        "yellow", "  ↳ meta description empty from model — using fallback: ''")
    assert isinstance(out, str)
    assert "meta description empty" in out


if __name__ == "__main__":
    test_c_is_imported_into_daily_article()
    test_c_is_the_llm_router_helper()
    test_fallback_call_shape_resolves()
    print("3/3 PASS — c() resolves on the empty-meta fallback path")
