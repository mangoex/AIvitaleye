---
name: sdd-framework
description: Forces the agent to follow Spec-Driven Development (SDD) when creating new features. Triggers when the user asks to plan a new feature, architecture, or write new specifications.
---

# Spec-Driven Development (SDD) Framework

You must strictly follow the Spec-Driven Development process for any new feature or architectural change in this project.
This workspace uses SDD (adapted from GitHub's spec-kit) to ensure all features are well-documented before implementation.

## The SDD Process

1. **Review Constitution**: Always refer to `.specify/memory/constitution.md` to ensure your architecture choices align with the project's technical and clinical rules.
2. **Feature Directory**: When the user requests a new feature, create a new directory inside `specs/` (e.g., `specs/002-user-auth/`).
3. **Spec Document**: Write `spec.md` (the product requirements) using `.specify/templates/spec-template.md`.
4. **Plan Document**: Write `plan.md` (the technical architecture and components) using `.specify/templates/plan-template.md`.
5. **Tasks Document**: Write `tasks.md` (the checklist of implementation steps) using `.specify/templates/tasks-template.md`.
6. **Execution**: Do NOT start coding the feature until the user has approved the `plan.md`. Once approved, execute the items in `tasks.md`.

## File Formats

If you need to view the templates, read them from `.specify/templates/`. 

Never skip the specification phase for non-trivial features.
