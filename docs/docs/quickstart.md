---
title: Quickstart
description: ""
authors:
  - name: Max Dietrich
  - url: https://mxd.codes
last_update:
  date: 10/07/2025
  author: Max Dietrich
keywords:
  - Introduction
slug: /quickstart
sidebar_position: 2
---

# Quickstart

Run the service with Docker:

```bash
docker run -p '3000:3000/tcp' mxdcodes/docker-staticmaps:latest
```

Send a sample request:

```bash
curl "http://localhost:3000/api/staticmaps?width=1000&height=1000&center=-18.2871,147.6992&zoom=9&basemap=satellite"
```

![Minimal Example](https://raw.githubusercontent.com/dietrichmax/docker-staticmaps/refs/heads/main/examples/minimalexample.png)

An interactive playground is available at [http://localhost:3000](http://localhost:3000).