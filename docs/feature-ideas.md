# colter.dev — feature ideas catalog

Curated from research (2026-08) on developer personal sites & GitHub homepages.
Effort calibrated to this stack: vanilla JS, SSR'd by a Cloudflare Worker, KV cache, no framework.
"Backend" = what's needed beyond static files. Status each idea when triaged: ACTIONABLE / DEFERRED / SKIPPED / ALREADY-HAVE.

## Highest-signal for "Systems · AI · Open Source" on this exact stack
Worker-native flexes (#45 edge OG images, #62 served-from-PoP ✅DONE, #52 real footer checksum, #61 commit SHA), the AI-era pair (#43 llms.txt/.md + #44 chat twin), the keyboard power-user layer (#14 Cmd+K + #15 vim keys + #16 `?` overlay), cornerstone content pages (#22 /now, #23 /uses, #39 /colophon, #25 blogroll/webring), one live-data widget (#30 now-playing or #35 personal API), and the cheap depth layer (#47-50, #53-56 console/source/header eggs).

## A. Visual / animation
1. Text scramble/decode (Matrix-decode tagline). low / none
2. Staggered letter/word entrance reveal. low / none
3. CSS scroll-driven animations (progress bar, parallax). low / none
4. View Transitions API (crossfade/morph). low / none
5. Variable-font weight shift on scroll. low-med / none
6. Film-grain/noise overlay (feTurbulence). low / none
7. Custom cursor (mix-blend-difference trailing dot). med / none
8. Mouse-follow spotlight/glow. low / none
9. Magnetic hover (links ease toward cursor). low / none
10. Hover-dim grid (highlight one card, dim siblings). low / none
11. Marquee ticker with velocity skew. med / none
12. Perf-aware, reduced-motion-first rendering (FPS self-downgrade). med / none
13. Multi-theme cycling (3-5 palettes, `t`/`T`). med / none

## B. Interactivity
14. Command palette (Cmd+K / `/`) — fuzzy search pages/repos/actions. **high signal**. med / none
15. Vim keybindings sitewide (j/k, gg/G, ? help, t theme). low / none
16. `?` shortcut-help overlay. low / none
17. Interactive terminal (`/terminal`: help/whoami/ls/cat/neofetch). med (client) / med (Worker+KV/DO)
18. Boot-sequence intro (skippable, remembered). low-med / none
19. Draggable elements (cards/avatar). low / none
20. Game-ified navigation (unlock sections). high / none (persona-mismatched)
21. Embedded interactive demos ("craft" gallery). high per-demo / none
22. `/now` page (current focus + date). low / none — **cornerstone**
23. `/uses` page (hardware/software/tools). low / none
24. `/blogroll` + OPML download. low / none
25. Webring membership (prev/next/random). low / none (ring-side)
26. Webmentions (cross-site likes/replies). med-high / external + Worker
27. Guestbook (KV-backed, rate-limited, moderated). med / Worker+KV
28. Hit counter / live visitor count. low-med / Worker+KV
29. Kudos button (per-page thanks heart). low-med / Worker+KV
30. "Now playing" music widget (Spotify/Last.fm via Worker proxy + KV). med / Worker+KV+API
31. Weekly top-tracks list. low (after #30) / same
32. WakaTime coding-activity card. low / external
33. GitHub README widget stack (typing SVG, snake, stats — tasteful subset only). low / external
34. Live GitHub signals (heatmap, commit feed, "days since" ticker). low-med / Worker+KV (have)
35. Personal API (`api.colter.dev` JSON). med / Worker+KV — **signature move**
36. Footer live-status widget (time/weather/focus/availability). low-med / Worker
37. Uptime/status badge (Uptime Kuma → OmniRoute etc.). low / external
38. Digital garden / notes with backlinks. high / none
39. `/colophon` page (stack/fonts/hosting, commits-as-editions). low / none — **tasteful**
40. Public changelog / site history. low / none
41. Stats-flex sections (HN hits, activity buckets). low / none
42. Book notes / library page. low-med / none
43. `llms.txt` + per-page `.md` mirrors. low / Worker (have) — **AI-era**
44. AI chat twin ("ask me anything" RAG). med-high / Worker+LLM
45. Dynamic OG images at the edge (Satori/resvg, edge-cached). med / Worker (have)
46. Public analytics dashboard (aggregate-only). low / external or Worker+KV

## D. Easter eggs
47. Styled console greeting (`%c` CSS). low / none — ✅ DONE
48. Console CLI namespace (`window.colter` `.help()` etc.). low-med / none
49. Konami code (theme flip/confetti). low / none
50. URL query-flag modes (`?trace=1`). low / none
51. Click-N-times triggers. low / none
52. Footer checksum line (real SHA of served HTML). low-med / Worker (have)
53. `humans.txt`. low / none
54. `robots.txt` personality. low / none
55. HTML-comment source eggs. low / none
56. HTTP header eggs (`X-Hire-Me`, `X-Powered-By`). low / Worker (have)
57. Invisible selectable text (margin notes). low / none
58. Tab-title play (boot/come-back-on-blur). low / none
59. `/random`. low / none
60. 88x31 buttons (restrained 2-3). low / none

## E. Practical / utility
61. Footer build info (commit SHA + timestamp). low / Worker (have)
62. "Served from edge PoP" line (`request.cf.colo`). low / Worker (have) — ✅ DONE
63. "View source / improve this page" links. low / none — ✅ DONE
64. Client-side search (static index + fuzzy). med / none
65. RSS/Atom + JSON feed. low / none
66. vCard download + copy-email button. low / none
67. `security.txt` (RFC 9116). low / none
68. Worker contact form + Turnstile. med / Worker + email route
69. Resume page + PDF + JSON Resume. low-med / none
70. PWA / offline support. med / none
71. QR code (vCard/page). low / none
72. "No cookies, no tracking" privacy note. low / none
73. Dark/light toggle (optional — many dark-first sites skip). low / none

## Deliberately filtered (gimmicky / persona-mismatched)
3D drivable-car portfolios, physics-explosion cursors, WebGPU unlock-to-scroll games, Matrix rain (kept only as Konami payload option), arcade RPG portfolios, skill-orb physics, login-wall likes, typing minigames.

## Sources
Codrops Vitasović case study; OKAY DEV Laxenaire; moderngrindtech; jamieede.com web terminal; brunosalgado (6 eggs); shevtsod; slashpages.net; sive.rs /now; IndieWeb; coryd.dev; rauno.me/craft; hyperquader vim nav; schra.ge + EJ Fox personal APIs; tim-kleyersburg + imacrayon now-playing; jawad-console; tovstonos console messages; sebduggan + iaconelli colophon; RoyalIcing SHA footer; aleksandrhovhannisyan build info; tinylytics; korben visitor counter; shaunbonk privacy; susam guestbook; maggieappleton.com; mdgarden; Evil Martians llms.txt; dri.es llms.txt measurements; zinkohlaing AI twin; Chrome view transitions 2025; chriscoyier realign; css-scroll-driven; uptime-kuma badges; humanstxt.org; Cloudflare robots.txt; workers-og; vinayakkulkarni edge OG; GitHub snake action.
