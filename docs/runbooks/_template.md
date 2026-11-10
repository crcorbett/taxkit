# <Operation>

Copy this file to `docs/runbooks/<operation>.md`, replace each section and add
the runbook to the [runbook index](./README.md). Review it whenever the
operation, its command, target or required access changes. Delete this
paragraph.

## When to use it

Say when this procedure applies and when it does not. Name the exact target
(stage, package, registry or provider account) and the access it needs.
Deploying, publishing, changing credentials or deleting provider resources
needs the maintainer's explicit request for that operation.

## Commands

List the native commands in order, each with the result to expect:

1. `bun run <command>`: what a successful run prints or changes.

## Recovery

Describe how to recover after a partial failure, including rollback to the
previous working commit with the same native command.

## Record

Keep credentials out of this file and of command output you share. Report the
actual results in the existing pull request or chat; a local check does not
show that a deployment or publication works, so check the deployed system or
registry directly.
