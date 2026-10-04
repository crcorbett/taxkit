#!/usr/bin/env python3
"""Validate generated or existing package boundaries."""

from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path

from render_package import validate_source_condition


FORBIDDEN_SOURCE = {
    "generic SDK callback": re.compile(r"readonly\s+(use|withClient)\s*[:(]"),
    "runtime class policy": re.compile(r"\binstanceof\b"),
    "legacy Context tag": re.compile(r"Context\.Tag\b"),
    "package-local runtime execution": re.compile(r"Effect\.run(?:Promise|Sync)\b"),
}
PERSONAL_ROOT = "/" + "Users" + "/"
RELATIVE_IMPORT = re.compile(r'''(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)["'](\.[^"']*)["']''')


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


root = Path(sys.argv[1]).resolve(strict=True)
for path in root.rglob("*"):
    if not path.is_file():
        continue
    text = path.read_text(errors="ignore")
    if PERSONAL_ROOT in text:
        fail(f"{path.relative_to(root)} contains a personal absolute path")
    if re.search(r"__[A-Z][A-Z0-9_]*__|\*\*[A-Z][A-Z0-9_]*\*\*", text):
        fail(f"{path.relative_to(root)} contains an unresolved template token")
manifest_path = root / "package.json"
if not manifest_path.is_file():
    fail("missing package.json")
manifest = json.loads(manifest_path.read_text())
render_path = root / "package-structure.render.json"
if not render_path.is_file():
    fail("missing package-structure.render.json")
render = json.loads(render_path.read_text())
try:
    source_condition = validate_source_condition(render.get("sourceCondition", ""))
except (TypeError, ValueError) as error:
    fail(str(error))
kind = render.get("kind")
required_by_kind = {
    "effect-service": {
        "src/schemas.ts", "src/errors.ts", "src/service.ts", "src/live.layer.ts",
        "src/test.layer.ts", "src/__testing__/fixtures.ts",
        "src/__testing__/observations.ts", "test/service.test.ts", "test/schemas.test.ts",
    },
    "rpc": {
        "src/group.ts", "src/handlers.ts", "src/service.ts", "src/server.ts",
        "src/live.layer.ts", "src/test.layer.ts",
    },
    "http-api": {
        "src/api.ts", "src/group.ts", "src/handlers.ts", "src/server.ts",
        "src/client/service.ts", "src/client/browser.layer.ts",
        "src/client/live.layer.ts",
    },
}
if kind not in required_by_kind:
    fail(f"unknown rendered package kind: {kind}")
missing = sorted(path for path in required_by_kind[kind] if not (root / path).is_file())
if missing:
    fail(f"{kind} package missing required paths: {missing}")
if not render.get("officialSources") or not render.get("compatibilityDecisions"):
    fail("render receipt lacks official sources or compatibility decisions")
if any(item.get("status") != "qualified" for item in render["compatibilityDecisions"]):
    fail("render receipt contains an unqualified compatibility decision")
if not render.get("limitations") or not render.get("nonClaims"):
    fail("render receipt lacks limitations or non-claims")
for relative, expected in render.get("configDigests", {}).items():
    target = root / relative
    observed = hashlib.sha256(target.read_bytes()).hexdigest() if target.is_file() else None
    if observed != expected:
        fail(f"rendered config digest mismatch: {relative}")
exports = manifest.get("exports")
if not isinstance(exports, dict) or not exports:
    fail("package exports must be explicit")
readme = (root / "README.md").read_text()
for heading in ("## Exports", "## Documentation impact", "## Runbook applicability", "## Non-claims"):
    if heading not in readme:
        fail(f"README missing required section: {heading}")
for export_name in exports:
    if f"`{export_name}`" not in readme:
        fail(f"README must document exact export {export_name}")
for phrase in ("repository", "runbook", "proof"):
    if phrase not in readme.lower():
        fail(f"README must route {phrase} ownership")
publish = manifest.get("publishConfig", {}).get("exports", {})
source_conditions: set[str] = set()
for name, value in exports.items():
    if not isinstance(value, dict):
        fail(f"export {name} must be an object")
    keys = list(value)
    if not keys or keys[0] != source_condition:
        fail(f"export {name} must place recorded source condition first: {source_condition}")
    source_target = value[source_condition]
    if not isinstance(source_target, str) or not source_target.startswith("./src/") or not (root / source_target).is_file():
        fail(f"export {name} recorded source condition must target an existing source file")
    conditions = [key for key in keys if key not in {"types", "default", "import"}]
    source_conditions.update(conditions)
    for condition in conditions:
        target = value[condition]
        if isinstance(target, str) and target.startswith("./src"):
            if keys.index(condition) > keys.index("types"):
                fail(f"export {name} must place source before types")
            if not (root / target).is_file():
                fail(f"export {name} source target does not exist: {target}")
    if "types" in value and "default" in value and keys.index("types") > keys.index("default"):
        fail(f"export {name} must place types before default")
for value in publish.values() if isinstance(publish, dict) else []:
    if isinstance(value, dict) and source_conditions.intersection(value):
        fail("publish exports must omit repository source conditions")
for directory in ("src", "test"):
    for path in (root / directory).rglob("*.ts"):
        for specifier in RELATIVE_IMPORT.findall(path.read_text()):
            if not specifier.endswith(".js"):
                fail(f"{path.relative_to(root)} relative import must use an explicit .js suffix: {specifier}")
for path in (root / "src").rglob("*.ts"):
    text = path.read_text()
    for label, pattern in FORBIDDEN_SOURCE.items():
        if pattern.search(text):
            fail(f"{path.relative_to(root)} contains {label}")
    if re.search(r"\bid\s*[?:]?\s*:\s*string\b", text):
        fail(f"{path.relative_to(root)} contains a raw semantic id")
    if re.search(r'from\s+["\']effect/unstable/(?:rpc|httpapi)/(?!Rpc(?:ClientError|Group|Test)?["\'])', text):
        fail(f"{path.relative_to(root)} contains a substituted upstream Effect import")
for path in (root / "src").rglob("*"):
    if path.is_file() and path.stem.lower() in {"helper", "helpers", "util", "utils"}:
        fail(f"{path.relative_to(root)} is generic helper sprawl; name the owned capability")
service = root / "src/service.ts"
if service.is_file():
    text = service.read_text()
    if "Context.Service" not in text and not (kind == "rpc" and re.search(r"export \{ \w+Service as \w+Client \} from", text)):
        fail("service.ts must define Context.Service")
    if "Layer." in text:
        fail("service.ts must not define a Layer")
    for implementation_marker in (
        "Client.make(",
        "ClientEffect",
        "RawClient",
        "layerLive",
        "layerMock",
    ):
        if implementation_marker in text:
            fail(f"service.ts contains implementation marker {implementation_marker}")
print(f"validated package {manifest.get('name')} at {root}")
