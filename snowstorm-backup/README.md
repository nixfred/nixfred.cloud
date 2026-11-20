# Snowstorm archive

Snapshot of the nixfred.cloud snowstorm landing page taken on Nov 20, 2026 before the NixNet story page replaced it on main.

- Repo root on this branch: the snowstorm source exactly as it was on main (commit 548ba92).
- `nixfred.cloud-mirror/`, `www.nixfred.cloud-mirror/`: wget mirrors of the live site as served.
- `*.headers.txt`: live response headers.
- `dns-before.json`: nixfred.cloud DNS records at capture time.

Restore: deploy this branch's root to Cloudflare Pages, or point DNS back at the previous host.
