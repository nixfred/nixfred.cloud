<p align="center">
  <img src="public/brand/nixfred-logo.svg" alt="nixfred" width="360">
</p>

<p align="center">
  <img src="docs/banner.png" alt="NixNet: private AI infrastructure by Fred Nix" width="100%">
</p>

<p align="center">
  <a href="https://nixfred.cloud/"><img alt="live" src="https://img.shields.io/badge/live-nixfred.cloud-7ff9bc?style=flat-square&labelColor=070707"></a>
  <img alt="hosting" src="https://img.shields.io/badge/hosting-Cloudflare%20Pages-36e2f0?style=flat-square&labelColor=070707">
  <img alt="stack" src="https://img.shields.io/badge/stack-HTML%20%2B%20CSS%20%2B%20a%20little%20JS-a77bff?style=flat-square&labelColor=070707">
</p>

# nixfred.cloud

The public showcase for **NixNet**, Fred Nix's live reference build of private AI infrastructure: multi-user chat, an OpenAI-compatible API and MCP server, image, voice and video generation, offline agent sandboxes, ZFS storage and nightly backups on one 128GB box, reached only over Tailscale. It pitches the same build as a service. NixNet itself stays private; this page is the tour. CTA: [book a call](https://calendly.com/nixfred) or [asknix.io](https://asknix.io/).

```mermaid
flowchart LR
  people[Your people and their agents] --> mesh[Tailscale mesh, zero public ports]
  mesh --> nixnet[Chat, API and MCP]
  nixnet --> hex[hex: 128GB AI box]
  hex --> nas[nas / tank, ZFS over NFS]
  hex --> sandboxes[Sandboxes, tested nightly]
  hex --> sessions[hex.sessions spawn broker]
  hex --> backups[PBS backups, nightly, offsite]
  mesh --> vault[Infisical secrets vault]
  sandboxes --> agents[Short-lived linux agent containers]
  sessions --> agents
```

## Layout

| Path | What |
|---|---|
| `public/` | The whole site. Hand-written HTML, CSS and a little JS, no framework, no build. |
| `public/brand/` | The locked nixfred hexagon files, copied unmodified. |
| `public/llms.txt` | Plain-text summary for agents. No fake endpoints. |
| `tools/diagram.py` | Generates the inline SVG flowchart (wide and mobile layouts). |
| Cloudflare Pages | Project `nixfred-cloud` is Git-connected: push to `main` deploys `public/` (no build step). |

The old snowstorm landing page lives on the [`snowstorm-archive`](../../tree/snowstorm-archive) branch and at [storm.nixfred.com](https://storm.nixfred.com/).

## Run locally

```
cd public && python3 -m http.server
```

Animations switch off for anyone with `prefers-reduced-motion` set.
