<p align="center">
  <img src="og-preview.jpg" alt="nixfred.cloud wordmark floating inside a dark computational storm with falling nix glyphs and an orbital hub" width="100%">
</p>

<p align="center">
  <strong>A cloud that computes, and snows nix.</strong><br>
  Move the wind. Call the lightning. Operate the storm from a built-in terminal.
</p>

<p align="center">
  <a href="https://nixfred.cloud"><strong>Enter the storm</strong></a>
  ·
  <a href="#the-console">Open the operator manual</a>
</p>

# nixfred.cloud

`nixfred.cloud` is a single-page browser instrument built around a three-way
name: cloud infrastructure, a literal storm cloud, and *nix that falls as snow.
It boots like a machine, reacts like weather, and exposes its controls through
an embedded command line.

<p align="center">
  <img src="preview.png" alt="The full nixfred.cloud browser experience during a lightning strike, with turbulent cloud shader, falling glyphs, and constellation hub" width="88%">
</p>

The entire experience is hand-rolled in HTML, CSS, and JavaScript with **zero
runtime dependencies** and no build step.

## Four layers, one engine

The visual stack is deliberately separated by responsibility. WebGL renders
the volumetric field; a transparent 2D canvas carries the sharp effects and
interface-adjacent particles; the cold boot owns the opening beat; and semantic
HTML remains available above the weather.

```mermaid
flowchart TB
    I[Pointer, touch<br/>& device tilt] --> W[Layer A<br/>WebGL storm]
    I --> F[Layers B + C<br/>2D effects canvas]
    B[Layer D<br/>cold boot] --> S[Storm sequence<br/>ignite · snow · hub · steady]
    S --> W
    S --> F
    W --> V[Composited<br/>weather system]
    F --> V
    H[HTML controls<br/>& console] --> V

    classDef input fill:#17131a,stroke:#9b8793,color:#f2eaf0
    classDef storm fill:#231419,stroke:#f85149,color:#fff0ef
    classDef system fill:#0c2024,stroke:#36d6e7,color:#edfdff
    class I,B input
    class W,F,S storm
    class H,V system
```

### Storm cloud

The background is a WebGL fragment shader built from domain-warped fractional
Brownian motion. Pointer movement becomes wind: move to part the fog, swipe to
tear a gust, or hold and release to discharge lightning.

### Snow, lightning, and drift

The foreground canvas emits falling monospace nix glyphs, lets nearby flakes
respond to the cursor, and accumulates them into a drift. Lightning adds a
temporary precipitation burst and hands its strike identity to the audio
system.

### Constellation hub

Subdomains can orbit a glowing core as they come online. The whole mesh leans
toward input like a small gravity well; an empty fleet becomes the intentional
“awaiting nodes” state rather than an error.

### Cold boot

A one-time kernel-log and ASCII-cloud sequence introduces the system, then
stores its completion in `localStorage`. `reboot` clears that marker and plays
the sequence again.

## Input becomes weather

```mermaid
flowchart LR
    P[Pointer<br/>position] --> G[Wind +<br/>gravity]
    D[Hold / click] --> L[Lightning<br/>strike]
    T[Touch / tilt] --> G
    C[Console<br/>command] --> M[Storm mode<br/>& overrides]
    G --> R[Render loop]
    L --> R
    M --> R
    R --> S[Shader cloud]
    R --> N[Glyph snow<br/>& drift]
    R --> H[Orbit hub]
    L --> A[Synthesized<br/>thunder]

    classDef input fill:#17131a,stroke:#9b8793,color:#f2eaf0
    classDef state fill:#231419,stroke:#f85149,color:#fff0ef
    classDef output fill:#0c2024,stroke:#36d6e7,color:#edfdff
    class P,D,T,C input
    class G,L,M,R state
    class S,N,H,A output
```

Audio arms only after the first interaction. Reduced-motion visitors bypass the
boot animation and receive a calm, static fallback; the page also contains a
`noscript` experience.

## The console

Press <kbd>`</kbd> or click the console hint. Commands mutate the same live state
used by the pointer-driven storm:

| Command | Effect |
|---|---|
| `storm rage \| calm \| auto` | Set the storm's energy policy |
| `lightning [1-7]` | Call a bolt; `1`–`7` selects a thunder voice |
| `snow on \| off \| auto` | Override or release precipitation |
| `mute` / `unmute` | Control synthesized storm audio |
| `ls`, `open <sub>` | Inspect and navigate the subdomain hub |
| `whoami`, `red`, `reboot`, `help` | Identity, machine lore, boot replay, and command reference |

```mermaid
flowchart LR
    K[Backtick or<br/>console hint] --> T[Terminal<br/>opens]
    T --> P[Parse command<br/>+ aliases]
    P --> W[Weather<br/>state]
    P --> N[Navigation<br/>actions]
    P --> B[Boot<br/>control]
    W --> O[Console<br/>response]
    N --> O
    B --> O

    classDef console fill:#0c2024,stroke:#36d6e7,color:#edfdff
    classDef action fill:#231419,stroke:#f85149,color:#fff0ef
    class K,T,P,O console
    class W,N,B action
```

The console is not decorative command-line copy. `storm`, `lightning`, `snow`,
and sound commands drive the running engine directly.

## Thunder without samples

Every sound is synthesized with the Web Audio API. Seven strike voices combine
different envelopes and noise treatments for a close crack, distant roll,
boomer, sizzle, rolling thunder, double crack, and deep grumble. Each flash is
paired with a delayed boom so distance still reads in an invented storm.

```mermaid
flowchart LR
    L[Lightning<br/>event] --> I[Voice index<br/>1–7]
    I --> F[Immediate<br/>flash]
    I --> D[Distance-aware<br/>delay]
    D --> C[Crack / roll /<br/>rumble synthesis]
    C --> M[Web Audio<br/>mix]
    U[First user<br/>interaction] --> A[AudioContext<br/>armed]
    A --> M

    classDef event fill:#231419,stroke:#f85149,color:#fff0ef
    classDef audio fill:#17131a,stroke:#9b8793,color:#f2eaf0
    classDef output fill:#0c2024,stroke:#36d6e7,color:#edfdff
    class L,I,F event
    class D,C,U,A audio
    class M output
```

No audio files ship with the site.

## Repository anatomy

```mermaid
flowchart TD
    H[index.html<br/>semantic shell] --> P[Static page]
    C[styles.css<br/>layout + fallbacks] --> P
    J[storm.js<br/>complete engine] --> P
    O[og-preview.jpg<br/>social card] --> P
    R[_headers<br/>security policy] --> P
    G[Push to main] --> A[GitHub Actions]
    A --> D[Clean dist/<br/>staging]
    P --> D
    D --> F[Cloudflare Pages<br/>nixfred-cloud]
    F --> L[nixfred.cloud<br/>+ www]

    classDef source fill:#17131a,stroke:#9b8793,color:#f2eaf0
    classDef deploy fill:#0c2024,stroke:#36d6e7,color:#edfdff
    class H,C,J,O,R,G source
    class P,A,D,F,L deploy
```

Core files:

- `index.html` contains metadata, accessible controls, boot/console markup, and fallbacks.
- `styles.css` defines the dark weather system, overlays, and reduced-motion behavior.
- `storm.js` contains the shader, particles, lightning, hub, boot, console, sharing, and audio.
- `_headers` carries the security headers used by the previous nginx deployment.

## Run locally

Serve the repository root with any static server:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Deployment

Pushes to `main` stage a clean `dist/` and deploy it to the `nixfred-cloud`
Cloudflare Pages project. The `nixfred.cloud` and `www.nixfred.cloud` custom
domains terminate DNS and TLS at Cloudflare; credentials remain in encrypted
repository secrets.

Manual fallback:

```bash
npx --yes wrangler@latest pages deploy . \
  --project-name nixfred-cloud \
  --branch main
```

The apex migrated from the former `red`/`blu` tunnel path on 2026-05-24. The
separate `*.nixfred.cloud` wildcard was not moved into Pages and remains outside
this repository's deployment scope.

© Fred Nix
