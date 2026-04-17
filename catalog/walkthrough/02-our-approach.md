---
title: "Our Approach"
order: 2
rubric: [innovation]
timing: "2 min"
audience: [evaluator, general]
---

# An LLM-Native Forms Platform

Rather than bolting LLM features onto an existing forms product, Forms Lab was designed from the ground up around LLM capabilities.

## The Core Insight

Government forms are structured documents. They encode a **data collection specification** — what information to gather, in what format, under what conditions. An LLM can extract this structure directly from a PDF.

## Architecture

The system separates three concerns:

- **DataCollectionSpec** — What to collect: fields, types, constraints, conditions, sensitivity classifications
- **FormSpec** — How to present it: pages, sections, delivery modes, visual layout
- **Submission** — Collected data, linked to the exact spec version

This separation means the LLM extraction produces a DataCollectionSpec, and the system can generate multiple presentation formats from the same underlying data model.

## What Makes This Different

- **Two LLM integration points, not one**: structured extraction (PDF → spec) and constrained command generation (intent → edit batch). Both use different techniques — free-form structured output vs. tool-use — for different problems.
- **Not just chat**: The LLM does structured extraction and constrained command generation, not open-ended conversational interaction
- **Systematic evaluation**: Every extraction is scored against ground truth with quantitative metrics
- **Production-grade**: Full deployment pipeline, not a notebook demo
- **Standards-compliant**: Output meets USWDS accessibility and design standards

See: [Architecture](/catalog/architecture) | [Data Model](/catalog/architecture/data-model) | [Design Decisions](/catalog/decisions)
