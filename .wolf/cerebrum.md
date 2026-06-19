# Cerebrum

> OpenWolf's learning memory. Updated automatically as the AI learns from interactions.
> Do not edit manually unless correcting an error.
> Last updated: 2026-05-25

## User Preferences

<!-- How the user likes things done. Code style, tools, patterns, communication. -->

## Key Learnings

- **Project:** ai-prd-master
- **Description:** <img src="public/icon-192x192.png" width="160">

## Do-Not-Repeat

<!-- Mistakes made and corrected. Each entry prevents the same mistake recurring. -->
<!-- Format: [YYYY-MM-DD] Description of what went wrong and what to do instead. -->

## Decision Log

<!-- Significant technical decisions with rationale. Why X was chosen over Y. -->
- [2026-06-20] PRD generator system prompt (constants.ts FINAL_PRD_PROMPT, Section 1.1) now mandates: all env vars (secret or not) go in `.env.local` only, never `.env`; scaffold via `create-next-app` so `.gitignore` auto-excludes `.env*`. User referenced "PRD-Master-2026.md" but no such file exists — turned out to mean this tool's own system prompt in constants.ts.
