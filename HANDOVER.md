# 🚀 YouTube Automation Studio — Complete Project Handover Dossier (v3.0)

> **Document Purpose**: This handover file provides the incoming AI agent with complete architectural context, codebase map, feature inventory, solved bugs, configuration variables, and verified workflows. Copy-paste this file into the new conversation to resume work seamlessly with zero loss of context.

---

## 📌 1. Project Overview & Channel Identity

* **Project**: Autonomous YouTube Long-Form Compilation Studio for GitHub Repositories.
* **Workspace Path**: `/Users/sayedjohon/Documents/DEV_AREA/ssh linux/automated-segment-github`
* **Target YouTube Channel**: **Junoverse AI Tech** (Official website: [`junoverseai.com`](https://www.junoverseai.com)).
* **Channel Host**: **Meera** (Photorealistic host with persistent face identity via `Assets/Character Reference.png` and animated stop-motion paper-cut stickers in `Assets/Character Paper Cut Clip/`).
* **Content Format**: Fast-paced, high-retention long-form countdown compilations (3, 5, or 10 breakout open-source tools per video, 3 to 10 minutes total runtime).
* **Latest Verified Live Output**: [`https://youtu.be/9iXeEUhBziU`](https://youtu.be/9iXeEUhBziU) (Unlisted 1080p master video + custom `neon_mystery` thumbnail).

---

## 🗺️ 2. High-Level Architecture & Logic Flow

```
[Discovery Engine] -> Live Trending (Daily/Weekly across languages) + Utilities/Automation
        ↓
[Inspection] -> Playwright 1440px Desktop Screenshot + Author Diagrams + README Harvest
        ↓
[Scriptwriting] -> Teaser Hook (Launch line) + 5 Scenes/Repo + Organic Bridge + Outro
        ↓
[Voiceover TTS] -> Google Cloud TTS (en-GB-Chirp3-HD-Aoede) + EBU R128 loudnorm
        ↓
[Motion Canvas] -> 30s Procedural Screen Flights + 3D Pan/Tilt + Movie/Meme Pop-Culture GIFs
        ↓
[Character Pop-ins] -> Vox-Style 6 fps Paper-Cut Stickers + Dynamic Unfolding Banners (every 25–35s)
        ↓
[Audio Engine] -> Unbroken Continuous 52-min BGM + Contextual SFX (Whooshes, Pops, Lasers)
        ↓
[Packaging Engine] -> Date-stamped Clickbait Title + Chapter Timestamps + 12 SEO Tags
        ↓
[Thumbnail Studio] -> Multi-Archetype (1 of 7) + Grade-3 Universal Hook + Character Sheet
        ↓
[Cloud / Local Dispatch] -> Local Run / Remote Linux Hermes Cron / GitHub Actions Cloud
```

---

## 🗂️ 3. Core File Map & Module Breakdown

| Component | File Path | Responsibilities |
|---|---|---|
| **Master Orchestrator** | [`create_compilation_video.js`](file:///Users/sayedjohon/Documents/DEV_AREA/ssh%20linux/automated-segment-github/create_compilation_video.js) | Coordinates 8 production phases (Intro, Segments 1..N, Outro, BGM, Character Pop-ins, SEO Metadata, Thumbnail, YouTube Upload). Supports flexible CLI flags (`--count=N`, `--mode=trending\|automation\|utilities\|mixed`). |
| **Discovery Engine** | [`utils/github-trending-scraper.js`](file:///Users/sayedjohon/Documents/DEV_AREA/ssh%20linux/automated-segment-github/utils/github-trending-scraper.js) | Scrapes live daily/weekly GitHub trending feeds (Global, Python, TS, JS, Rust, Go) + problem-solvers. SQLite persistent memory (`data/github_trending.db`) guarantees zero repeats. |
| **Scriptwriting Agent** | [`agents/github-script-agent.js`](file:///Users/sayedjohon/Documents/DEV_AREA/ssh%20linux/automated-segment-github/agents/github-script-agent.js) | Writes viral storytelling scripts. 5 scenes per repo with organic bridge transitions (Scene 5 = Verdict & Bridge, NO canned mid-video ads). Teaser intro uses varied creator kickoff lines (*"Let's jump right in!"*). Master Outro dynamically wraps up all covered tools. Website speech strictly formatted as `"juno verse ai dot com"`. |
| **Visual Director & GIFs** | [`utils/gif-motion-fetcher.js`](file:///Users/sayedjohon/Documents/DEV_AREA/ssh%20linux/automated-segment-github/utils/gif-motion-fetcher.js) | Deep Visual Metaphor framework mapping voice lines to iconic movie moments (Matrix, Iron Man, Doctor Strange, Oppenheimer, F1 pit stops) and viral memes (galaxy brain, Leonardo DiCaprio, Mr. Bean). Tenor web scraper + DuckDuckGo Universal GIF engine with persistent history (`gif_history_db.json`) and Fisher-Yates randomization. |
| **Thumbnail Studio** | [`agents/thumbnail-designer-agent.js`](file:///Users/sayedjohon/Documents/DEV_AREA/ssh%20linux/automated-segment-github/agents/thumbnail-designer-agent.js) <br> [`utils/thumbnail-studio-generator.js`](file:///Users/sayedjohon/Documents/DEV_AREA/ssh%20linux/automated-segment-github/utils/thumbnail-studio-generator.js) | Auto-picks 1 of 7 visual archetypes (`white_studio_dotgrid`, `total_chaos`, `neon_mystery`, `versus_split`, `scale_and_awe`, `minimalist_pop`, `cinematic_high_octane`). Strictly enforces Grade-3 vocabulary (2–3 words max), bans AI cliches, preserves character face identity with `Assets/Character Reference.png` via Vertex AI Nano Banana 2 (`gemini-2.5-flash-image`) / OmniRoute fallback. |
| **Screen Studio Flights** | [`utils/screen-studio-cursor-animator.js`](file:///Users/sayedjohon/Documents/DEV_AREA/ssh%20linux/automated-segment-github/utils/screen-studio-cursor-animator.js) | Pre-renders 30.0s procedural full-screen 1080p cursor flights with DOM element tracking, Bézier acceleration, micro-wandering jitter, and Retina zoom depths (1.25x–1.55x). |
| **Paper-Cut Characters** | [`utils/character-cutout-animator.js`](file:///Users/sayedjohon/Documents/DEV_AREA/ssh%20linux/automated-segment-github/utils/character-cutout-animator.js) <br> [`utils/paper-banner-generator.js`](file:///Users/sayedjohon/Documents/DEV_AREA/ssh%20linux/automated-segment-github/utils/paper-banner-generator.js) | 6 fps stop-motion character overlays (Meera) popping in every 25–35s with dynamic unfolding sticker banners (Subscribe, Like, Comment, Star, Share). |
| **Motion Canvas & FFmpeg** | [`utils/ffmpeg-motion-canvas.js`](file:///Users/sayedjohon/Documents/DEV_AREA/ssh%20linux/automated-segment-github/utils/ffmpeg-motion-canvas.js) <br> [`utils/github-card-renderer.js`](file:///Users/sayedjohon/Documents/DEV_AREA/ssh%20linux/automated-segment-github/utils/github-card-renderer.js) | Cinematic 3D floating cards (1420px GIFs, 1680px repo media), 3D perspective panning, CRT scanlines, and continuous audio mixing. |
| **Cloud CI/CD Workflow** | [`.github/workflows/render-video.yml`](file:///Users/sayedjohon/Documents/DEV_AREA/ssh%20linux/automated-segment-github/.github/workflows/render-video.yml) | GitHub Actions workflow for cloud video rendering on `ubuntu-latest` with `workflow_dispatch` inputs for `repo_count`, `mode`, and `timeframe`. |
| **Snapshot Backup** | [`backups/v3_stable_snapshot/`](file:///Users/sayedjohon/Documents/DEV_AREA/ssh%20linux/automated-segment-github/backups/v3_stable_snapshot/) | Safe untouched snapshot of all working v3.0 core files. |

---

## 🛠️ 4. Key Rules, Solved Quirks & Engineering Guardrails

1. **TTS Website Pronunciation**:
   * Google Cloud TTS (`en-GB-Chirp3-HD-Aoede`) stutters if domain is written as `junoverseai dot com` (it says *"junoverse dot ai dot com"*).
   * **Rule**: Always format website speech as **`"juno verse ai dot com"`** with clean spacing. Never repeat the brand name and domain side-by-side.
2. **Organic Script Transitions (No Mid-Video Ads)**:
   * Scene 5 is an **Organic Verdict & Bridge Transition** written dynamically by the LLM. Canned ad injections in the middle of countdowns are strictly banned.
3. **Intro De-duplication**:
   * The opening teaser intro is explicitly banned from saying *"starting with number one"*. It ends with creator launch lines (*"Let's jump right in!"*, *"Check this out!"*).
4. **Zero Video Freezes (30s Flight Slicing Buffer)**:
   * Master Screen Studio recording is pre-rendered for a full 30.0s buffer with boundary wrap checks (`cursor + dur > 29.5 -> reset to 0`), ensuring FFmpeg stitchers are never starved of video frames.
5. **Thumbnails Vocabulary & Visual Integrity**:
   * All thumbnail hooks are filtered through `sanitizeHookText()` enforcing **Grade 3 simple words** (2–3 words max: `100% FREE`, `1 CLICK FIX`, `STOP!`, `OWN UI`, `CODE LEAK`, `THEY HID THIS`).
   * Overused AI buzzwords (`UNLEASHED`, `REVOLUTIONARY`, `GAME CHANGER`, `SUPERCHARGED`) are strictly banned.
6. **SQLite Schema**:
   * Database `data/github_trending.db` tracks covered repos in `trending_repos_history` with columns: `repo_name`, `url`, `description`, `total_stars`, `stars_today`, `primary_language`, `category`, `video_path`, `covered_at`.

---

## 💻 5. CLI Execution & Dispatch Commands

```bash
# 1. Standard 5-Repository Compilation (Mixed Trending + Utilities):
node create_compilation_video.js 5

# 2. 10-Repository Mega Compilation (Pure Live Trending Only):
node create_compilation_video.js 10 trending

# 3. Pure Automation & AI Agents (5 repos):
node create_compilation_video.js 5 automation

# 4. Pure Daily Utilities & Desktop Tools (3 repos):
node create_compilation_video.js 3 utilities

# 5. Full Flags Syntax (Ideal for Linux Hermes AI / Cron tasks):
node create_compilation_video.js --count=5 --mode=trending --timeframe=daily --lang=python
```

---

## ☁️ 6. GitHub Actions Cloud Workflow Usage

1. Go to GitHub Repository -> **Actions** -> **Cloud Long-Form Video Renderer**.
2. Click **Run workflow** -> Set inputs:
   * `repo_count`: `3`, `5`, or `10`
   * `mode`: `mixed`, `trending`, `automation`, `utilities`
   * `timeframe`: `all`, `daily`, `weekly`
   * `upload_youtube`: `true`
3. GitHub Actions spins up an Ubuntu VM, pulls fresh repos, renders the video with FFmpeg, generates the thumbnail, uploads to YouTube, and stores artifacts.

---

## 🤖 7. Autonomous Cloud & Linux Architecture (Zero Local CPU/RAM)

* **100% Free Cloud Compute (GitHub Actions)**:
  * GitHub gives **2,000 free runner minutes per month** on standard accounts (and unlimited on public repos).
  * Each 5-repo video takes only ~2–3 minutes of compute time. You can render **600 to 1,000 videos per month completely free** in the cloud.
* **Linux Docker Autonomous Dispatcher (`joe@100.86.193.4`)**:
  * Run a lightweight Docker container or cron task on your Linux PC.
  * Instead of rendering locally, the Linux cron triggers GitHub Actions via one simple CLI command:
    ```bash
    gh workflow run render-video.yml -f repo_count=5 -f mode=mixed
    ```
  * GitHub Actions handles 100% of the video rendering, FFmpeg slicing, and YouTube publishing.
* **Alternative Local Free GPU Cluster (`colab-pool`)**:
  * You also have a 4-account Google Colab GPU cluster (`/home/joe/.local/bin/colab-pool`) on the Linux server providing **64GB VRAM (4x 16GB T4 GPUs)** completely free for heavy offline rendering and AI models.
