<p align="center">
  <img src="public/brand/nixfred-logo.svg" alt="nixfred" width="360">
</p>

<p align="center">
  <img src="docs/banner.png" alt="NixNet: Fred Nix's private GPU lab for friends" width="100%">
</p>

<p align="center">
  <a href="https://nixfred.cloud/"><img alt="live" src="https://img.shields.io/badge/live-nixfred.cloud-7ff9bc?style=flat-square&labelColor=070707"></a>
  <img alt="hosting" src="https://img.shields.io/badge/hosting-Cloudflare%20Pages-36e2f0?style=flat-square&labelColor=070707">
  <img alt="stack" src="https://img.shields.io/badge/stack-HTML%20%2B%20CSS%20%2B%20a%20little%20JS-a77bff?style=flat-square&labelColor=070707">
</p>

# nixfred.cloud

The public story page for **NixNet**, Fred Nix's private GPU lab for a small circle of friends: browser chat and an OpenAI-compatible API over Tailscale, shared nas storage, and short-lived agent sandboxes on one 128GB homelab box. The real service stays on the tailnet; this page just tells the story.

```mermaid
flowchart LR
  friends[Friends] --> mesh[Tailscale mesh]
  mesh --> nixnet[NixNet chat and API]
  nixnet --> hex[hex: 128GB GPU box]
  hex --> nas[nas / tank over NFS]
  hex --> hypernix[HyperNix control plane]
  hex --> sessions[hex.sessions spawn broker]
  mesh --> vault[Infisical secrets vault]
  hypernix --> agents[Short-lived linux agent LXCs]
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
