# Reuse the three shared Axiom datasets

Status: accepted

Cooper selected the existing shared logs, traces and metrics datasets because
the account is limited to three. TaxKit will reference Site's existing resources
and own its own scoped ingestion token, destinations, dashboards and identity
filters. Site keeps ownership and retention policy for the datasets.

Sharing preserves capacity for every project but makes exact project, app and
stage filters essential. Resource references and safe fields must be checked;
shared storage is not access isolation or proof that events were delivered.
PostHog remains the owner of minimal product traffic/calculator counts; Axiom
owns operational observations without tax inputs or results.

[Deployment](../architecture/deployment.md#observability) owns the current
telemetry contract. Provider changes require a reviewed exact-resource plan
and its separate authority.
