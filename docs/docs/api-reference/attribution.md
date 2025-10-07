---
title: Attribution
description: ""
authors:
  - name: Max Dietrich
  - url: https://mxd.codes
last_update:
  date: 10/07/2025
  author: Max Dietrich
keywords:
  - Attribution
slug: /api-reference/attribution
sidebar_position: 3
---

# Attribution

The map service supports an optional `attribution` query parameter to control whether and how attribution is rendered on the generated image.

## Basic Behavior

- Attribution is **shown by default** (if nothing is passed).
- If no custom text is provided, the service uses the default attribution for the selected basemap.

## Parameter Format

The `attribution` parameter accepts key-value pairs separated by `|`, for example:

```
&attribution=show:true|text:© OpenStreetMap contributors
```

## Supported Keys

| Key | Description | Example |
| --- | --- | --- |
| show | `true` or `false` – controls visibility | `show:false` |
| text | Custom attribution text (URL-encoded) | `text:%C2%A9%20Your%20Company` |