# Vercel

## Default ownership

Vercel Git integration normally owns deployment creation and source provenance. Do not reproduce that lifecycle in Alchemy unless the repository has deliberately chosen a different owner.

Possible Alchemy roles:

- observe or adopt a Vercel project;
- read project/Git/OIDC identity;
- configure a narrowly owned environment setting;
- declare a custom retained resource for provider inventory;
- coordinate another provider with a Vercel-owned URL;
- verify deployment identity.

“Vercel owns deployment; Alchemy has no deployment role” is a complete design.

## Distinguish Vercel identities

Model:

- team/account safe ID;
- project safe ID and name;
- Git repository/organisation;
- production branch;
- environment;
- deployment safe ID/URL;
- source ref and revision;
- OIDC issuer/audience/subject claims where used;
- environment variable target and type.

Do not equate a project, deployment, environment, and Git connection.

## Project observation or adoption

A read-only custom Resource may:

- read/list the exact project;
- assert Git repository and production branch;
- assert framework/build settings that belong in scope;
- report safe identity;
- retain on removal.

It must not claim to create deployments or own Git provenance. If adoption writes Alchemy state, require explicit adoption authority even when the provider operation is read-only.

## Environment configuration

If Alchemy configures Vercel environment values:

- use a closed allowlist of key names and environments;
- separate secret values from metadata;
- reject Preview-to-Production credential reuse unless expressly designed;
- read metadata before and after write;
- do not expose values in plan, diff, logs, or receipt;
- define whether redeployment is required;
- forbid generic arbitrary environment mutation;
- default deletion to forbidden or retain.

Prefer provider-native/OIDC credentials over long-lived secrets where the workload supports them.

## Multiple services

When a repository has more than one Vercel project, name each deployment owner and mapping. Do not create a third project for a logical dependency such as AI Gateway unless it is an independently deployed service.

Test:

- project-to-workspace mapping;
- build root and output;
- Git connection;
- environment target;
- public URL;
- cross-service configuration.

## Readback and proof

Separate:

1. project configuration readback;
2. Git connection/source readback;
3. deployment identity and ready state;
4. environment/OIDC metadata readback;
5. public journey.

A ready deployment is not proof that it contains the expected revision. A project linked to Git is not proof of a current deployment. A public 200 is not proof of OIDC configuration.

Use the Vercel API or supported CLI for independent provider readback, under explicit authority. Keep URL and deployment IDs safe; never emit environment values or tokens.

## Custom provider semantics

For a Vercel custom Resource:

- use stable project/provider IDs;
- distinguish missing, forbidden, and transient reads;
- make update scope explicit;
- read after uncertain writes;
- retain foreign projects and deployments;
- never delete a Vercel project through a generic removal path;
- reject source or team drift rather than silently adopting it.

Keep Vercel SDK/HTTP clients private to an Effect Layer.
