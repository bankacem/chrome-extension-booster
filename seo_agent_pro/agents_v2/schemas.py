"""agents_v2.schemas — minimal JSON-Schema subset validator (stdlib only).

Owner spec: "مدخلات/مخرجات بـ JSON Schema مُتحقَّق منه". CI installs only
anthropic+requests, so agents_v2 carries a tiny, strict validator for the
schema subset it actually uses — no third-party dependency.

Supported keywords: type (object|array|string|integer|number|boolean|null),
properties, required, additionalProperties (bool), items, enum, min/max
Length, minimum/maximum, minItems/maxItems.
"""
from __future__ import annotations

import re
from typing import Any


class SchemaError(ValueError):
    """Raised with a human-readable path when data violates the schema."""


def validate(data: Any, schema: dict, path: str = "$") -> None:
    """Raise SchemaError(path: reason) if data does not match schema."""
    t = schema.get("type")
    if t is not None:
        if not _check_type(data, t):
            raise SchemaError(f"{path}: expected {t}, got {type(data).__name__}")
    if "enum" in schema and data not in schema["enum"]:
        raise SchemaError(f"{path}: {data!r} not in enum {schema['enum']}")
    if isinstance(data, str):
        if "minLength" in schema and len(data) < schema["minLength"]:
            raise SchemaError(f"{path}: shorter than minLength={schema['minLength']}")
        if "maxLength" in schema and len(data) > schema["maxLength"]:
            raise SchemaError(f"{path}: longer than maxLength={schema['maxLength']}")
    if isinstance(data, (int, float)) and not isinstance(data, bool):
        if "minimum" in schema and data < schema["minimum"]:
            raise SchemaError(f"{path}: below minimum={schema['minimum']}")
        if "maximum" in schema and data > schema["maximum"]:
            raise SchemaError(f"{path}: above maximum={schema['maximum']}")
    if isinstance(data, list):
        if "minItems" in schema and len(data) < schema["minItems"]:
            raise SchemaError(f"{path}: fewer than minItems={schema['minItems']}")
        if "maxItems" in schema and len(data) > schema["maxItems"]:
            raise SchemaError(f"{path}: more than maxItems={schema['maxItems']}")
        if "items" in schema:
            for i, item in enumerate(data):
                validate(item, schema["items"], f"{path}[{i}]")
    if isinstance(data, dict):
        props = schema.get("properties", {})
        for r in schema.get("required", []):
            if r not in data:
                raise SchemaError(f"{path}: missing required property {r!r}")
        if schema.get("additionalProperties") is False:
            for k in data:
                if k not in props:
                    raise SchemaError(f"{path}: unexpected property {k!r}")
        for k, v in data.items():
            if k in props:
                validate(v, props[k], f"{path}.{k}")


def _check_type(data: Any, t) -> bool:
    types = [t] if isinstance(t, str) else list(t)
    for tt in types:
        ok = {
            "object": lambda d: isinstance(d, dict),
            "array": lambda d: isinstance(d, list),
            "string": lambda d: isinstance(d, str),
            "integer": lambda d: isinstance(d, int) and not isinstance(d, bool),
            "number": lambda d: isinstance(d, (int, float)) and not isinstance(d, bool),
            "boolean": lambda d: isinstance(d, bool),
            "null": lambda d: d is None,
        }[tt](data)
        if ok:
            return True
    return False


_FENCE_RE = re.compile(r"```(?:json)?\s*|\s*```")


def extract_json(text: str) -> Any:
    """Best-effort JSON extraction from a model reply (fence-stripping +
    outermost-brace scan). Raises ValueError when nothing parseable exists."""
    cleaned = _FENCE_RE.sub("", text).strip()
    for opener, closer in (("{", "}"), ("[", "]")):
        start = cleaned.find(opener)
        if start < 0:
            continue
        depth = 0
        in_str = False
        esc = False
        for i in range(start, len(cleaned)):
            ch = cleaned[i]
            if in_str:
                if esc:
                    esc = False
                elif ch == "\\":
                    esc = True
                elif ch == '"':
                    in_str = False
                continue
            if ch == '"':
                in_str = True
            elif ch == opener:
                depth += 1
            elif ch == closer:
                depth -= 1
                if depth == 0:
                    candidate = cleaned[start:i + 1]
                    import json
                    return json.loads(candidate)
    raise ValueError("no parseable JSON object/array found in model reply")
