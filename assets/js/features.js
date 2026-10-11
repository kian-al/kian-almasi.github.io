/* Public GitHub data only. No credentials, tokens, or private repositories. */
(function () {
  'use strict';
  var header = document.querySelector('header.nav');
  var menu = document.querySelector('.menu-toggle');
  if (header && menu) {
    menu.hidden = false; header.dataset.menuReady = 'true';
    menu.addEventListener('click', function () {
      var open = menu.getAttribute('aria-expanded') !== 'true';
      menu.setAttribute('aria-expanded', String(open)); header.classList.toggle('is-menu-open', open);
    });
    header.querySelectorAll('nav a').forEach(function (a) { a.addEventListener('click', function () {
      menu.setAttribute('aria-expanded', 'false'); header.classList.remove('is-menu-open');
    }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && header.classList.contains('is-menu-open')) {
      menu.setAttribute('aria-expanded', 'false'); header.classList.remove('is-menu-open'); menu.focus();
    } });
  }
  var filters = document.querySelector('.project-filters');
  if (filters) {
    filters.hidden = false;
    filters.querySelectorAll('button').forEach(function (button) { button.addEventListener('click', function () {
      var value = button.dataset.filter;
      filters.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b === button)); });
      var total = 0;
      document.querySelectorAll('#projects .project').forEach(function (card) {
        card.hidden = value !== 'all' && card.dataset.category !== value; if (!card.hidden) total++;
      });
      document.getElementById('project-count').textContent = total + (total === 1 ? ' project' : ' projects');
    }); });
  }
  var root = document.getElementById('github'); if (!root) return;
  var status = document.getElementById('gh-status'), note = document.getElementById('gh-note'), refresh = document.getElementById('gh-refresh'), current = null, busy = false;
  var key = 'kian-public-github-summary-v2'; refresh.hidden = false;
  function normalize(data) {
    if (!data || !data.profile || data.profile.login !== 'kian-al' || !Array.isArray(data.repos)) throw new Error('Invalid public GitHub data');
    function number(value) { if (!Number.isInteger(value) || value < 0) throw new Error('Invalid count'); return value; }
    return { fetchedAt: data.fetchedAt || new Date().toISOString(), profile: { login: 'kian-al', public_repos: number(data.profile.public_repos), followers: number(data.profile.followers) }, repos: data.repos.map(function (r) { return { name: String(r.name), fork: !!r.fork, stargazers_count: number(r.stargazers_count) }; }) };
  }
  function render(data, mode) {
    current = normalize(data);
    document.getElementById('gh-repos').textContent = current.profile.public_repos;
    document.getElementById('gh-followers').textContent = current.profile.followers;
    document.getElementById('gh-stars').textContent = current.repos.filter(function (r) { return !r.fork; }).reduce(function (n, r) { return n + r.stargazers_count; }, 0);
    status.textContent = mode === 'live' ? 'Live public data' : mode === 'cache' ? 'Cached public data' : 'Saved public data'; status.dataset.state = mode;
    note.textContent = 'Profile data updated ' + new Date(current.fetchedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + '.';
  }
  function cached() { try { var d = JSON.parse(localStorage.getItem(key)); return d && normalize(d); } catch (_) { return null; } }
  async function request(path) {
    var controller = new AbortController(), timer = setTimeout(function () { controller.abort(); }, 8000);
    try { var response = await fetch('https://api.github.com/users/kian-al' + path, { signal: controller.signal, headers: { Accept: 'application/vnd.github+json' } }); if (!response.ok) throw new Error('GitHub unavailable'); return await response.json(); } finally { clearTimeout(timer); }
  }
  async function repositories() {
    var result = [], page = 1;
    while (true) { var rows = await request('/repos?per_page=100&page=' + page); if (!Array.isArray(rows)) throw new Error('Invalid repositories'); result = result.concat(rows); if (rows.length < 100) return result; page++; }
  }
  async function load(force) {
    if (busy) return; var saved = cached();
    if (!current) { try { render(saved || JSON.parse(document.getElementById('github-snapshot').textContent), saved ? 'cache' : 'snapshot'); } catch (_) {} }
    if (!force && saved && Date.now() - Date.parse(saved.fetchedAt) < 15 * 60 * 1000) { render(saved, 'cache'); return; }
    busy = true; refresh.disabled = true; refresh.textContent = 'Updating…';
    try { var results = await Promise.all([request(''), repositories()]); var data = normalize({ profile: results[0], repos: results[1] }); render(data, 'live'); try { localStorage.setItem(key, JSON.stringify(data)); } catch (_) {} }
    catch (_) { status.textContent = 'Saved profile data'; status.dataset.state = 'snapshot'; note.textContent = 'Live GitHub profile data is unavailable. Showing the saved profile snapshot.'; }
    finally { busy = false; refresh.disabled = false; refresh.textContent = 'Refresh'; }
  }
  refresh.addEventListener('click', function () { load(true); }); load(false);
})();
