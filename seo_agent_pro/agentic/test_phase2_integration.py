#!/usr/bin/env python3
"""
TEST RUN ORCHESTRATOR — Phase 2 Integration Test (2026-09-25)

This script runs a single article through the complete agentic pipeline
and captures detailed telemetry at each stage:
  1. Research Agent — competitor analysis + memory retrieval
  2. Strategy Agent — brief generation with quality gates
  3. Content Agent — article writing (first draft)
  4. Optimizer Agent — SEO tuning (title/links/category)
  5. Evaluator Agent — deterministic + LLM review + quality score
  6. Learning Agent — cycle recording + lesson extraction

Purpose: Demonstrate that the improved pipeline (with Quality Gate + Learning)
produces actionable, complete articles without thin/truncated failures.

Usage:
  python3 test_phase2_integration.py \
    --keyword "best privacy extension" \
    --model claude-haiku \
    --output-report /tmp/test_run_report.md
"""

import sys
import json
import os
from pathlib import Path
from datetime import datetime, timezone
import argparse

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "seo_agent_pro"))
sys.path.insert(0, str(ROOT / "seo_agent_pro" / "agentic"))

def main():
    parser = argparse.ArgumentParser(description="Phase 2 Integration Test")
    parser.add_argument("--keyword", default="best privacy extension", help="Keyword to test")
    parser.add_argument("--model", default="claude-haiku", help="Model to use")
    parser.add_argument("--niche", default="browser productivity", help="Niche category")
    parser.add_argument("--output-report", default="/tmp/test_phase2_report.md", help="Report output path")
    args = parser.parse_args()

    # ─── SETUP ───────────────────────────────────────────────────────────
    report_lines = [
        "# Phase 2 Integration Test Report",
        f"Generated: {datetime.now(timezone.utc).isoformat()}",
        "",
        f"**Keyword:** {args.keyword}",
        f"**Model:** {args.model}",
        f"**Niche:** {args.niche}",
        "",
        "---",
        ""
    ]

    try:
        # ─── IMPORT PIPELINE ─────────────────────────────────────────────
        report_lines.append("## 1. Pipeline Initialization")
        report_lines.append("")
        
        from graph import build_graph
        from agentic import memory_store
        from llm_router import find_working_model, c
        import daily_article as legacy
        
        report_lines.append("✓ Imports successful")
        report_lines.append("")

        # ─── CHECK MEMORY STATE ──────────────────────────────────────────
        report_lines.append("## 2. Memory State (Before Run)")
        report_lines.append("")
        
        log = memory_store.load_cycle_log()
        lessons = memory_store.load_lessons()
        articles_count = memory_store.articles_written_count()
        past_cycles = memory_store.previous_cycles_for_keyword(args.keyword, limit=3)
        
        report_lines.append(f"- Total cycles recorded: {len(log)}")
        report_lines.append(f"- Articles published: {articles_count}")
        report_lines.append(f"- Past cycles for this keyword: {len(past_cycles)}")
        report_lines.append(f"- Accumulated lessons: {len([l for l in lessons.splitlines() if l.strip().startswith('-')])}")
        report_lines.append("")

        # ─── BUILD GRAPH ────────────────────────────────────────────────
        report_lines.append("## 3. Graph Construction")
        report_lines.append("")
        
        graph = build_graph()
        report_lines.append(f"✓ LangGraph compiled with {len(graph.nodes)} nodes")
        report_lines.append("")

        # ─── BUILD INITIAL STATE ────────────────────────────────────────
        report_lines.append("## 4. Initial State")
        report_lines.append("")
        
        initial_state = {
            "keyword": args.keyword,
            "category": "",
            "niche": args.niche,
            "articles_written": articles_count,
            "model_chain": [args.model, "claude-haiku"],
            "active_model": args.model,
            "revision_count": 0,
            "max_revisions": 2,
        }
        
        report_lines.append(f"```json")
        report_lines.append(json.dumps(initial_state, indent=2))
        report_lines.append("```")
        report_lines.append("")

        # ─── RUN PIPELINE ───────────────────────────────────────────────
        report_lines.append("## 5. Pipeline Execution")
        report_lines.append("")
        report_lines.append("Starting full pipeline run...")
        report_lines.append("")
        
        print(c("bold", "=== Starting Phase 2 Integration Test ===\n"))
        print(f"Keyword: {args.keyword}")
        print(f"Model: {args.model}")
        print(f"Output report: {args.output_report}\n")

        final_state = graph.invoke(initial_state)
        
        report_lines.append("✓ Pipeline completed successfully\n")

        # ─── EXTRACT KEY METRICS ────────────────────────────────────────
        report_lines.append("## 6. Final State Summary")
        report_lines.append("")
        
        title = final_state.get("title", "N/A")
        body_words = len(final_state.get("body", "").split())
        evaluation = final_state.get("evaluation", {})
        
        report_lines.append(f"**Title:** {title}")
        report_lines.append(f"**Word Count:** {body_words}")
        report_lines.append(f"**Status:** {final_state.get('final_status', 'unknown')}")
        report_lines.append("")
        
        report_lines.append("### Evaluation Results")
        report_lines.append("")
        report_lines.append(f"- **Approved:** {evaluation.get('approved', False)}")
        report_lines.append(f"- **LLM Score:** {evaluation.get('score', 'N/A')}/100")
        report_lines.append(f"- **Quality Score:** {evaluation.get('quality_score', 'N/A')}/100")
        report_lines.append(f"- **Deterministic Issues:** {len(evaluation.get('deterministic_issues', []))}")
        report_lines.append(f"- **LLM Issues:** {len(evaluation.get('llm_issues', []))}")
        report_lines.append("")

        if evaluation.get("deterministic_issues"):
            report_lines.append("**Deterministic Issues Found:**")
            for issue in evaluation.get("deterministic_issues", []):
                report_lines.append(f"  - {issue}")
            report_lines.append("")

        if evaluation.get("llm_issues"):
            report_lines.append("**LLM Issues Found:**")
            for issue in evaluation.get("llm_issues", [])[:5]:  # First 5 only
                report_lines.append(f"  - {issue}")
            report_lines.append("")

        report_lines.append(f"**Evaluation Notes:** {evaluation.get('notes', 'N/A')}")
        report_lines.append("")

        # ─── STRATEGY ANALYSIS ───────────────────────────────────────────
        report_lines.append("### Strategy Brief")
        report_lines.append("")
        
        strategy = final_state.get("strategy", {})
        report_lines.append(f"- **Target Length:** {strategy.get('ideal_length', 'N/A')} words")
        report_lines.append(f"- **Sections Required:** {len(strategy.get('required_sections', []))}")
        if strategy.get("required_sections"):
            for i, section in enumerate(strategy.get("required_sections", []), 1):
                report_lines.append(f"  {i}. {section}")
        report_lines.append("")

        # ─── CONTENT ANALYSIS ───────────────────────────────────────────
        report_lines.append("### Content Analysis")
        report_lines.append("")
        
        body = final_state.get("body", "")
        h2_count = body.count("## ")
        h3_count = body.count("### ")
        link_count = body.count("](/blog/")
        
        report_lines.append(f"- **H2 Headings:** {h2_count}")
        report_lines.append(f"- **H3 Headings:** {h3_count}")
        report_lines.append(f"- **Internal Links:** {link_count}")
        report_lines.append(f"- **SEO Title:** {final_state.get('seo_title', 'N/A')}")
        report_lines.append(f"- **Meta Description:** {final_state.get('meta_description', 'N/A')}")
        report_lines.append(f"- **Category:** {final_state.get('category', 'N/A')}")
        report_lines.append("")

        # ─── MEMORY STATE AFTER RUN ──────────────────────────────────────
        report_lines.append("## 7. Memory State (After Run)")
        report_lines.append("")
        
        new_log = memory_store.load_cycle_log()
        if len(new_log) > len(log):
            latest_cycle = new_log[-1]
            report_lines.append("**New Cycle Recorded:**")
            report_lines.append(f"- Keyword: {latest_cycle.get('keyword')}")
            report_lines.append(f"- Score: {latest_cycle.get('score')}")
            report_lines.append(f"- Quality Score: {latest_cycle.get('quality_score', 'N/A')}")
            report_lines.append(f"- Status: {latest_cycle.get('final_status')}")
            report_lines.append(f"- New Lessons: {len(latest_cycle.get('new_lessons', []))}")
            report_lines.append("")
            
            if latest_cycle.get("new_lessons"):
                report_lines.append("**Lessons Learned:**")
                for lesson in latest_cycle.get("new_lessons", []):
                    report_lines.append(f"  - {lesson}")
                report_lines.append("")

        # ─── VERDICT ─────────────────────────────────────────────────────
        report_lines.append("## 8. Test Verdict")
        report_lines.append("")
        
        passed_quality_gate = (
            not evaluation.get("deterministic_issues") and
            evaluation.get("score", 0) >= 70 and
            evaluation.get("quality_score", 0) >= 70
        )
        
        if passed_quality_gate:
            report_lines.append("✅ **PASS** — Article passed all quality gates")
        else:
            report_lines.append("❌ **FAIL** — Article rejected by quality gates")
            report_lines.append("")
            report_lines.append("**Failure Reasons:**")
            if evaluation.get("deterministic_issues"):
                report_lines.append(f"  - Hard rule violations: {len(evaluation.get('deterministic_issues', []))}")
            if evaluation.get("score", 0) < 70:
                report_lines.append(f"  - LLM score too low: {evaluation.get('score', 0)}/100")
            if evaluation.get("quality_score", 0) < 70:
                report_lines.append(f"  - Quality score too low: {evaluation.get('quality_score', 0)}/100")
        
        report_lines.append("")

        # ─── OUTPUT REPORT ───────────────────────────────────────────────
        report_content = "\n".join(report_lines)
        Path(args.output_report).write_text(report_content, encoding="utf-8")
        
        print(c("green", f"\n✓ Report written to: {args.output_report}\n"))
        print(report_content)

    except Exception as e:
        report_lines.append(f"## ERROR\n\n```\n{type(e).__name__}: {e}\n```")
        report_content = "\n".join(report_lines)
        Path(args.output_report).write_text(report_content, encoding="utf-8")
        print(c("red", f"\n✗ Error during test: {e}\n"))
        print(f"Report written to: {args.output_report}")
        sys.exit(1)


if __name__ == "__main__":
    main()
