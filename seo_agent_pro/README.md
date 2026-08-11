# SEO Agent Pro — Multi-Model Edition

> **If you are a Claude/AI session picking up this project: read
> [`agentic/AGENT_HANDOFF.md`](./agentic/AGENT_HANDOFF.md) in full before
> touching any article or agent file.** Multiple sessions work on this repo
> over time; that file exists to stop them from conflicting with each
> other.

A production-ready SEO content pipeline that supports **Anthropic**, **OpenRouter**, and **Groq** — run any model from a single command.

---

## Quick Start

### 1. Install
```bash
pip install -r requirements.txt
```

### 2. Add Your API Keys
Open `config.py` and fill in your keys:
```python
API_KEYS = {
    "anthropic":  "sk-ant-api03-...",   # https://console.anthropic.com
    "openrouter": "sk-or-v1-...",       # https://openrouter.ai/keys
    "groq":       "gsk_...",            # https://console.groq.com/keys
}
```
You only need keys for the providers you want to use.

### 3. Run
```bash
python main.py --keyword "best laptop for students" --niche "technology"
```

---

## Run Modes

| Mode | Command | Output |
|------|---------|--------|
| **Full pipeline** (default) | `--mode full` | Article + Cluster + Calendar + Report |
| **Article only** | `--mode article` | Single SEO article |
| **Keyword cluster** | `--mode cluster` | Topic map JSON |
| **Content calendar** | `--mode calendar` | Publishing schedule JSON |

---

## Model Examples

```bash
# Anthropic Claude
python main.py --keyword "best laptop" --model claude-sonnet-4

# OpenAI GPT-4o via OpenRouter
python main.py --keyword "best laptop" --model gpt-4o

# Google Gemini Flash via OpenRouter
python main.py --keyword "best laptop" --model gemini-flash

# Meta Llama via Groq (fastest)
python main.py --keyword "best laptop" --model llama-3.3-70b-groq

# DeepSeek R1 via OpenRouter
python main.py --keyword "best laptop" --model deepseek-r1
```

List all available models:
```bash
python main.py --models
```

---

## VS Code Integration

The `.vscode/launch.json` file includes 8 ready-to-run configurations.

1. Open the folder in VS Code
2. Press `F5` or open the **Run and Debug** panel
3. Select a configuration and click the green play button

---

## Project Structure

```
seo_agent_pro/
├── config.py         ← API keys + model registry (edit this)
├── main.py           ← Entry point + CLI
├── llm_router.py     ← Multi-provider routing (Anthropic / OpenRouter / Groq)
├── modules.py        ← SEO pipeline modules
├── memory.py         ← Persistent memory system
├── requirements.txt
├── .vscode/
│   └── launch.json   ← VS Code run configurations
└── output/           ← Generated articles and reports (auto-created)
```

---

## Pipeline Steps

```
  Input keyword
       │
  [1] Competitor Analysis    → discovers content gaps
       │
  [2] Strategy Decision      → sets length, angle, structure
       │
  [3] Article Writer         → streams full article
       │
  [4] CTR Optimizer          → title + meta description
       │
  [5] Keyword Cluster (V3)   → topic map for the niche
       │
  [6] Content Calendar (V3)  → 3-month publishing schedule
       │
  [7] Authority Score (V3)   → tracks niche coverage progress
       │
  [8] Memory Update          → learns from every run
```

---

## Available Models

| Name | Provider | Notes |
|------|----------|-------|
| `claude-sonnet-4` | Anthropic | Best quality |
| `claude-haiku` | Anthropic | Fast + cheap |
| `gpt-4o` | OpenRouter | Strong all-rounder |
| `gpt-4o-mini` | OpenRouter | Fast + affordable |
| `gemini-pro` | OpenRouter | Long context |
| `gemini-flash` | OpenRouter | Very fast |
| `mistral-large` | OpenRouter | Good for structured output |
| `llama-3.3-70b` | OpenRouter | Open-weight |
| `deepseek-r1` | OpenRouter | Strong reasoning |
| `qwen-2.5-72b` | OpenRouter | Multilingual |
| `llama-3.1-70b-groq` | Groq | Ultra-fast inference |
| `llama-3.3-70b-groq` | Groq | Ultra-fast inference |
| `mixtral-8x7b-groq` | Groq | Fast + capable |
| `gemma2-9b-groq` | Groq | Lightweight + fast |

---

## Output Files

All files are saved in the `output/` folder:

```
output/
├── best_laptop_{timestamp}.md           ← The article
├── cluster_best_laptop_{timestamp}.json ← Keyword cluster map
├── calendar_best_laptop_{timestamp}.json← Publishing calendar
└── report_best_laptop_{timestamp}.md    ← Full run report

seo_memory.json                          ← Persistent memory (grows over time)
```
