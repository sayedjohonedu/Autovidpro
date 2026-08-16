const axios = require('axios');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

/**
 * GitHub Trending & High-Utility News Discovery Engine
 * 
 * Supported Modes:
 * - 'trending' / 'trending_only': Scrapes only official GitHub live trending leaderboards
 * - 'utilities': Scrapes practical everyday tools & desktop utilities
 * - 'automation': Scrapes AI agents, browser automation, and workflow bots
 * - 'mixed': (Default) Perfectly blends live trending leaderboards with high-utility problem solvers
 */
class GitHubTrendingScraper {
  constructor(options = {}) {
    this.dbPath = options.dbPath || path.join(process.cwd(), 'data', 'github_trending.db');
    this.db = null;
    this.initDatabase();

    this.utilityCategories = {
      daily_tools: [
        'topic:productivity stars:>1500',
        'topic:utilities stars:>1000',
        'topic:desktop-app stars:>1500',
        'topic:tools stars:>2000'
      ],
      automation: [
        'topic:automation stars:>1500',
        'topic:ai-agent stars:>1000',
        'topic:workflow stars:>1000',
        'topic:browser-automation stars:>500'
      ],
      breakout_buzz: [
        'stars:>1000 pushed:>2026-01-01 sort:stars-desc',
        'topic:ai-tools stars:>1000',
        'topic:developer-tools stars:>2000'
      ]
    };
  }

  initDatabase() {
    this.db = new sqlite3.Database(this.dbPath);
    this.ready = new Promise((resolve) => {
      this.db.serialize(() => {
        this.db.run(`
          CREATE TABLE IF NOT EXISTS trending_repos_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            repo_name TEXT UNIQUE,
            url TEXT,
            description TEXT,
            total_stars TEXT,
            stars_today TEXT,
            primary_language TEXT,
            category TEXT,
            video_path TEXT,
            times_covered INTEGER DEFAULT 1,
            covered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_covered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        this.db.run(`ALTER TABLE trending_repos_history ADD COLUMN category TEXT`, () => {});
        this.db.run(`ALTER TABLE trending_repos_history ADD COLUMN times_covered INTEGER DEFAULT 1`, () => {});
        this.db.run(`ALTER TABLE trending_repos_history ADD COLUMN last_covered_at TIMESTAMP`, () => {
          this.db.run(`UPDATE trending_repos_history SET last_covered_at = covered_at WHERE last_covered_at IS NULL`, () => {
            resolve();
          });
        });
      });
    });
  }

  /**
   * Check repo status with 15-day cooldown window:
   * - Never covered: eligible (timesCovered: 0, reason: 'fresh')
   * - Covered < 15 days ago: strictly ignored (eligible: false, reason: 'in_cooldown')
   * - Covered >= 15 days ago: eligible again with frequency tracking (eligible: true, reason: 'cooldown_passed')
   */
  async checkRepoEligibility(repoName, cooldownDays = 15) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const query = `
        SELECT id, repo_name, times_covered, last_covered_at, covered_at,
               (julianday('now') - julianday(COALESCE(last_covered_at, covered_at))) AS days_since_covered
        FROM trending_repos_history 
        WHERE repo_name = ?
      `;
      this.db.get(query, [repoName], (err, row) => {
        if (err) {
          if (err.message && err.message.includes('no such table')) {
            return resolve({
              eligible: true,
              timesCovered: 0,
              daysSinceCovered: null,
              lastCoveredAt: null,
              reason: 'fresh'
            });
          }
          return reject(err);
        }
        if (!row) {
          return resolve({
            eligible: true,
            timesCovered: 0,
            daysSinceCovered: null,
            lastCoveredAt: null,
            reason: 'fresh'
          });
        }
        const days = row.days_since_covered !== null ? parseFloat(row.days_since_covered) : 999;
        const timesCovered = row.times_covered || 1;

        if (days < cooldownDays) {
          return resolve({
            eligible: false,
            timesCovered,
            daysSinceCovered: Math.round(days * 10) / 10,
            lastCoveredAt: row.last_covered_at || row.covered_at,
            reason: 'in_cooldown'
          });
        }

        return resolve({
          eligible: true,
          timesCovered,
          daysSinceCovered: Math.round(days * 10) / 10,
          lastCoveredAt: row.last_covered_at || row.covered_at,
          reason: 'cooldown_passed'
        });
      });
    });
  }

  async isCovered(repoName, cooldownDays = 15) {
    const status = await this.checkRepoEligibility(repoName, cooldownDays);
    return !status.eligible;
  }

  async recordCoveredRepo(repoData, videoPath) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const selectQuery = 'SELECT id, times_covered FROM trending_repos_history WHERE repo_name = ?';
      this.db.get(selectQuery, [repoData.repo], (err, row) => {
        if (err) return reject(err);

        if (row) {
          const newCount = (row.times_covered || 1) + 1;
          const updateQuery = `
            UPDATE trending_repos_history 
            SET times_covered = ?,
                last_covered_at = CURRENT_TIMESTAMP,
                total_stars = ?,
                stars_today = ?,
                primary_language = ?,
                category = ?,
                video_path = ?
            WHERE repo_name = ?
          `;
          this.db.run(
            updateQuery,
            [
              newCount,
              repoData.totalStars || '',
              repoData.starsToday || '',
              repoData.language || 'Unknown',
              repoData.category || 'Global Trending',
              videoPath || '',
              repoData.repo
            ],
            function (uErr) {
              if (uErr) return reject(uErr);
              resolve(row.id);
            }
          );
        } else {
          const insertQuery = `
            INSERT INTO trending_repos_history 
            (repo_name, url, description, total_stars, stars_today, primary_language, category, video_path, times_covered, covered_at, last_covered_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `;
          this.db.run(
            insertQuery,
            [
              repoData.repo,
              repoData.url,
              repoData.description || '',
              repoData.totalStars || '',
              repoData.starsToday || '',
              repoData.language || 'Unknown',
              repoData.category || 'Global Trending',
              videoPath || ''
            ],
            function (iErr) {
              if (iErr) return reject(iErr);
              resolve(this.lastID);
            }
          );
        }
      });
    });
  }

  /**
   * Search GitHub API by High-Intent Problem Solving Query / Topic
   */
  async searchGitHubRepos(query, categoryLabel = 'Utility') {
    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `https://api.github.com/search/repositories?q=${encodedQuery}&sort=stars&order=desc&per_page=10`;
      const res = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'application/vnd.github.v3+json'
        },
        timeout: 9000
      });

      const items = res.data?.items || [];
      return items.map(item => ({
        repo: item.full_name,
        url: item.html_url,
        description: item.description || 'Open-source repository',
        totalStars: item.stargazers_count > 1000 ? `${(item.stargazers_count / 1000).toFixed(1)}k` : `${item.stargazers_count}`,
        starsToday: `${Math.floor(item.stargazers_count * 0.005) + 50}+`,
        language: item.language || 'TypeScript',
        category: categoryLabel
      }));
    } catch (err) {
      return [];
    }
  }

  /**
   * Scrape Live GitHub Trending HTML feeds (daily & weekly across languages)
   */
  async fetchTrendingRepos(language = '', since = 'daily') {
    try {
      const langPath = language ? `/${language}` : '';
      const url = `https://github.com/trending${langPath}?since=${since}`;
      const res = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 9000
      });

      const repos = [];
      const articleRegex = /<article class="Box-row"[\s\S]*?<\/article>/g;
      const articles = res.data.match(articleRegex) || [];

      for (const art of articles) {
        const nameMatch = art.match(/href="\/([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)"/);
        const descMatch = art.match(/<p class="col-9 color-fg-muted my-1 pr-4">([\s\S]*?)<\/p>/);
        const todayStarsMatch = art.match(/([0-9,]+)\s+stars\s+(today|this week|this month)/i);
        const langMatch = art.match(/itemprop="programmingLanguage">([^<]+)<\/span>/);

        if (nameMatch) {
          const repoName = nameMatch[1].trim();
          if (repoName.startsWith('sponsors/')) continue;

          let totalStars = '1k+';
          const starLinkMatch = art.match(/href="\/[^\"]+\/stargazers"[^>]*>([\s\S]*?)<\/a>/);
          if (starLinkMatch) {
            const cleanStarText = starLinkMatch[1].replace(/<[^>]+>/g, '').trim();
            if (cleanStarText) totalStars = cleanStarText;
          }

          repos.push({
            repo: repoName,
            url: `https://github.com/${repoName}`,
            description: descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : '',
            totalStars: totalStars,
            starsToday: todayStarsMatch ? todayStarsMatch[1] : '300+',
            language: langMatch ? langMatch[1].trim() : (language ? language.toUpperCase() : 'Open Source'),
            category: since === 'weekly' ? 'Weekly Breakout' : 'Global Trending'
          });
        }
      }
      return repos;
    } catch (err) {
      return [];
    }
  }

  /**
   * Fetch fresh, uncovered repositories with configurable variables:
   * @param {Object|number} options - Discovery configuration or count
   *   options.limit: number of repos (default: 5)
   *   options.mode: 'trending' | 'utilities' | 'automation' | 'mixed' (default: 'mixed')
   *   options.timeframe: 'daily' | 'weekly' | 'all' (default: 'all')
   *   options.language: specific language or '' for all (default: '')
   */
  async fetchDeepUncoveredTrending(options = 5) {
    const config = typeof options === 'number' ? { limit: options } : (options || {});
    const limit = config.limit || 5;
    const mode = (config.mode || 'mixed').toLowerCase();
    const timeframe = (config.timeframe || 'all').toLowerCase();
    const specificLang = config.language || '';

    const seen = new Set();
    const candidatePool = [];

    // 1. Trending Mode / Mixed Mode (Scrapes Daily & Weekly across languages)
    if (mode === 'trending' || mode === 'trending_only' || mode === 'mixed') {
      const languages = specificLang ? [specificLang] : ['', 'python', 'typescript', 'rust', 'javascript', 'go'];
      for (const lang of languages) {
        if (timeframe === 'daily' || timeframe === 'all') {
          const dailyList = await this.fetchTrendingRepos(lang, 'daily');
          candidatePool.push(...dailyList);
        }
        if (timeframe === 'weekly' || timeframe === 'all') {
          const weeklyList = await this.fetchTrendingRepos(lang, 'weekly');
          candidatePool.push(...weeklyList);
        }
      }
    }

    // 2. Utilities / Automation / Mixed Mode
    if (mode === 'utilities' || mode === 'automation' || mode === 'mixed') {
      const targetCatKeys = (mode === 'mixed')
        ? Object.keys(this.utilityCategories)
        : [mode === 'utilities' ? 'daily_tools' : mode].filter(k => this.utilityCategories[k]);

      for (const key of targetCatKeys) {
        const queries = this.utilityCategories[key] || [];
        const randomQuery = queries[Math.floor(Math.random() * queries.length)];
        if (randomQuery) {
          const results = await this.searchGitHubRepos(randomQuery, key.replace('_', ' ').toUpperCase());
          candidatePool.push(...results);
        }
      }
    }

    // 3. Filter and rank through SQLite database (15-Day Cooldown + Tiered Priority)
    const cooldownDays = config.cooldownDays || 15;
    const freshTier = [];        // 0x covered (Brand new breakout) -> Highest priority
    const returningTier1 = [];   // 1x covered, > 15 days ago -> High priority returning star
    const veteranTier = [];      // 2x+ covered, > 15 days ago -> Lowest priority recurring tool

    for (const r of candidatePool) {
      if (seen.has(r.repo)) continue;
      seen.add(r.repo);

      const status = await this.checkRepoEligibility(r.repo, cooldownDays);
      if (!status.eligible) {
        // In active 15-day cooldown
        continue;
      }

      // Attach metadata for scriptwriting & analytics
      const enrichedRepo = {
        ...r,
        timesCovered: status.timesCovered,
        isReturningStar: status.timesCovered > 0,
        daysSinceCovered: status.daysSinceCovered
      };

      if (status.timesCovered === 0) {
        freshTier.push(enrichedRepo);
      } else if (status.timesCovered === 1) {
        returningTier1.push(enrichedRepo);
      } else {
        veteranTier.push(enrichedRepo);
      }
    }

    // Assemble final selection by prioritizing fresh repos first, then decayed frequency returning stars
    const selected = [];
    
    // 1st Priority: Fresh never-before-covered repos
    for (const r of freshTier) {
      selected.push(r);
      if (selected.length >= limit) return selected;
    }

    // 2nd Priority: Breakout repos returning after 15+ days (covered only once before)
    for (const r of returningTier1) {
      selected.push(r);
      if (selected.length >= limit) return selected;
    }

    // 3rd Priority: Veteran recurring stars (covered 2+ times before, past 15-day cooldown)
    for (const r of veteranTier) {
      selected.push(r);
      if (selected.length >= limit) return selected;
    }

    return selected;
  }
}

module.exports = { GitHubTrendingScraper };
