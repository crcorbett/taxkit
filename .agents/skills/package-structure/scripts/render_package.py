#!/usr/bin/env python3
"""Render one package variant safely from canonical assets."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path


SKILL = Path(__file__).resolve().parent.parent
KINDS = {"effect-service", "rpc", "http-api"}
PACKAGE = re.compile(r"^@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*$")
SOURCE_CONDITION = re.compile(r"^@?[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?$")
RESERVED_CONDITIONS = {"types", "default", "import", "require", "node", "node-addons", "module-sync", "browser", "development", "production"}


def validate_source_condition(value: str) -> str:
    if not SOURCE_CONDITION.fullmatch(value) or value.isdecimal() or value in RESERVED_CONDITIONS:
        raise ValueError("source-condition must be a custom name, not a reserved export condition")
    return value


def symbol(name: str) -> str:
    return "".join(part.capitalize() for part in re.split(r"[-_.]", name.split("/")[-1]))


def safe_target(raw: str) -> Path:
    candidate = Path(raw)
    if not candidate.is_absolute() or ".." in candidate.parts:
        raise ValueError("target must be an absolute path without '..'")
    if any(parent.is_symlink() for parent in (candidate.parent, *candidate.parent.parents)):
        raise ValueError("target parent and ancestors must not be symlinks")
    resolved_parent = candidate.parent.resolve(strict=True)
    if candidate.exists() or candidate.is_symlink():
        raise ValueError("target must not already exist")
    forbidden = {Path("/"), Path.home().resolve(), resolved_parent.anchor}
    if candidate.resolve(strict=False) in forbidden:
        raise ValueError("refusing a filesystem, home, or repository root target")
    return resolved_parent / candidate.name


def load_versions(path: Path) -> dict[str, str]:
    data = json.loads(path.read_text())
    if not isinstance(data.get("resolvedAt"), str):
        raise ValueError("version snapshot needs resolvedAt")
    effect = data.get("packages", {}).get("effect")
    if not isinstance(effect, str) or not re.fullmatch(r"4\.\d+\.\d+(?:-rc\.\d+)?", effect):
        raise ValueError("version snapshot needs an exact current Effect v4 RC or stable version")
    if any(not isinstance(value, str) or value.lower() == "latest" for value in data["packages"].values()):
        raise ValueError("version snapshot needs exact selected versions, never latest")
    if not isinstance(data.get("sources"), dict) or not data["sources"]:
        raise ValueError("version snapshot needs official sources")
    decisions = data.get("compatibilityDecisions")
    if not isinstance(decisions, list) or any(item.get("status") != "qualified" for item in decisions):
        raise ValueError("version snapshot needs qualified compatibility decisions")
    return data


def render(args: argparse.Namespace) -> Path:
    validate_source_condition(args.source_condition)
    if args.kind not in KINDS:
        raise ValueError(f"unknown kind: {args.kind}")
    if not PACKAGE.fullmatch(args.package_name):
        raise ValueError("package-name must be a valid scoped package name")
    if args.kind != "effect-service" and not args.domain_package:
        raise ValueError("rpc and http-api require --domain-package")
    if args.domain_package and not PACKAGE.fullmatch(args.domain_package):
        raise ValueError("domain-package must be a valid scoped package name")
    target = safe_target(args.target)
    versions = load_versions(Path(args.versions).resolve(strict=True))
    asset_root = SKILL / "assets" / args.kind
    for path in asset_root.rglob("*"):
        if path.is_symlink():
            raise ValueError(f"asset symlink is forbidden: {path}")

    replacements = {
        "__PACKAGE_NAME__": args.package_name,
        "__SOURCE_CONDITION__": args.source_condition,
        "__SYMBOL__": symbol(args.package_name),
        "__DOMAIN_PACKAGE__": args.domain_package or args.package_name,
        "__DOMAIN_SYMBOL__": symbol(args.domain_package or args.package_name),
        "__EFFECT_VERSION__": versions["packages"]["effect"],
    }
    replacements.update({
        f"__VERSION_{name.upper().replace('@', '').replace('/', '_').replace('-', '_')}__": value
        for name, value in versions["packages"].items()
    })
    stage = Path(tempfile.mkdtemp(prefix=f".{target.name}.stage-", dir=target.parent))
    try:
        for source in sorted(asset_root.rglob("*")):
            if not source.is_file():
                continue
            relative = source.relative_to(asset_root)
            if relative.name == "manifest.json":
                continue
            output = stage / str(relative).removesuffix(".tmpl")
            output.parent.mkdir(parents=True, exist_ok=True)
            content = source.read_text()
            for old, new in replacements.items():
                content = content.replace(old, new)
            output.write_text(content)
        manifest = {
            "schemaVersion": 1,
            "kind": args.kind,
            "packageName": args.package_name,
            "domainPackage": args.domain_package,
            "sourceCondition": args.source_condition,
            "versionSnapshot": {
                "resolvedAt": versions["resolvedAt"],
                "sha256": hashlib.sha256(
                    Path(args.versions).resolve().read_bytes()
                ).hexdigest(),
            },
            "officialSources": versions["sources"],
            "selectedVersions": versions["packages"],
            "compatibilityDecisions": versions["compatibilityDecisions"],
            "configDigests": {
                path: hashlib.sha256((stage / path).read_bytes()).hexdigest()
                for path in ("package.json", "tsconfig.json", "tsconfig.build.json", "vitest.config.ts")
            },
            "limitations": ["Structural rendering does not prove installed dependency, declaration, runtime, or packed-consumer behavior."],
            "nonClaims": ["Selected versions are not claimed to remain latest."],
        }
        (stage / "package-structure.render.json").write_text(json.dumps(manifest, indent=2) + "\n")
        subprocess.run(
            ["python3", str(SKILL / "scripts/validate_package.py"), str(stage)],
            check=True,
        )
        os.replace(stage, target)
    except BaseException:
        shutil.rmtree(stage, ignore_errors=True)
        raise
    return target


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--kind", required=True)
    parser.add_argument("--target", required=True)
    parser.add_argument("--package-name", required=True)
    parser.add_argument("--source-condition", required=True)
    parser.add_argument("--versions", required=True)
    parser.add_argument("--domain-package")
    args = parser.parse_args()
    print(render(args))


if __name__ == "__main__":
    main()
