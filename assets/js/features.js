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
  var status = document.getElementById('gh-status');
  var note = document.getElementById('gh-note');
  var refresh = document.getElementById('gh-refresh');
  var search = document.getElementById('repo-search');
  var language = document.getElementById('repo-language');
  var more = document.getElementById('repo-more');
  var grid = document.getElementById('repo-grid');
  var count = document.getElementById('repo-count');
  var current = null, expanded = false, busy = false;
  var cacheKey = 'kian-public-github-v1';
  var initial = null;
  try { initial = JSON.parse(document.getElementById('github-snapshot').textContent); } catch (_) {}
  document.getElementById('repo-controls').hidden = false; refresh.hidden = false;
  function number(n) { return Number.isFinite(Number(n)) ? Math.max(0, Math.floor(Number(n))) : 0; }
  function date(value) {
    var d = new Date(value); return isNaN(d.getTime()) ? 'Date unavailable' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  function githubLink(name) {
    if (typeof name !== 'string' || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(name)) return 'https://github.com/kian-al';
    return 'https://github.com/' + name.split('/').map(encodeURIComponent).join('/');
  }
  function element(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; }
  function link(text, url, cls) { var a = element('a', cls, text); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a; }
  function normalize(data) {
    if (!data || !data.profile || data.profile.login !== 'kian-al' || !Array.isArray(data.repos)) throw new Error('Invalid public data');
    return {
      fetchedAt: data.fetchedAt,
      profile: { login: 'kian-al', public_repos: number(data.profile.public_repos), followers: number(data.profile.followers) },
      repos: data.repos.filter(function (r) { return r && typeof r.name === 'string' && /^[A-Za-z0-9_.-]+$/.test(r.name); }).map(function (r) {
        return { name: r.name, description: typeof r.description === 'string' ? r.description : '', language: typeof r.language === 'string' ? r.language : null,
          stargazers_count: number(r.stargazers_count), fork: !!r.fork, archived: !!r.archived, updated_at: r.updated_at };
      }),
      events: Array.isArray(data.events) ? data.events.filter(function (e) { return e && typeof e.type === 'string' && e.repo && typeof e.repo.name === 'string'; }).slice(0, 30).map(function (e) { return { type: e.type, repo: { name: e.repo.name }, created_at: e.created_at }; }) : []
    };
  }
  function sourceRepos() { return current.repos.filter(function (r) { return !r.fork && r.name !== 'kian-almasi.github.io'; }); }
  function card(repo) {
    var article = element('article', 'repo-card');
    var top = element('div', 'repo-top'); top.appendChild(element('span', 'repo-kind', repo.archived ? 'Archived repository' : 'Public repository')); article.appendChild(top);
    var h = element('h3'); h.appendChild(link(repo.name, githubLink('kian-al/' + repo.name))); article.appendChild(h);
    var desc = repo.description || 'Source code and project details on GitHub.';
    article.appendChild(element('p', 'repo-description', desc.length > 200 ? desc.slice(0, 197) + '…' : desc));
    var meta = element('div', 'repo-meta'); meta.appendChild(element('span', 'repo-language', repo.language || 'Not specified'));
    meta.appendChild(element('span', '', number(repo.stargazers_count) + (number(repo.stargazers_count) === 1 ? ' star' : ' stars'))); article.appendChild(meta);
    article.appendChild(element('p', 'repo-updated', 'Updated ' + date(repo.updated_at))); return article;
  }
  function renderRepos() {
    if (!current) return;
    var query = search.value.trim().toLowerCase(), selected = language.value;
    var repos = sourceRepos().filter(function (r) {
      return (!selected || (r.language || 'Not specified') === selected) && (!query || (r.name + ' ' + (r.description || '')).toLowerCase().indexOf(query) !== -1);
    }).sort(function (a, b) { return (Date.parse(b.updated_at) || 0) - (Date.parse(a.updated_at) || 0); });
    grid.replaceChildren();
    (expanded ? repos : repos.slice(0, 6)).forEach(function (r) { grid.appendChild(card(r)); });
    if (!repos.length) grid.appendChild(element('p', 'empty-state', 'No repositories match these filters. Try a different keyword or language.'));
    count.textContent = (expanded ? repos.length : Math.min(6, repos.length)) + ' of ' + repos.length + ' repositories';
    more.hidden = repos.length <= 6; more.textContent = expanded ? 'Show fewer' : 'Show all ' + repos.length + ' repositories';
    more.setAttribute('aria-expanded', String(expanded));
  }
  var eventLabels = { PushEvent: 'Pushed code', PullRequestEvent: 'Pull request activity', IssuesEvent: 'Issue activity', CreateEvent: 'Created a branch, tag or repository', ReleaseEvent: 'Published a release', WatchEvent: 'Starred a repository', ForkEvent: 'Forked a repository', PublicEvent: 'Made a repository public' };
  function renderEvents() {
    var list = document.getElementById('gh-events'); list.replaceChildren();
    var events = current.events.filter(function (e) { return eventLabels[e.type]; }).sort(function (a, b) { return (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0); }).slice(0, 4);
    if (!events.length) { list.appendChild(element('li', 'empty-state', 'No recent public events were returned by GitHub.')); return; }
    events.forEach(function (e) {
      var li = element('li', 'gh-event'); var details = element('div'); details.appendChild(element('span', 'event-action', eventLabels[e.type]));
      details.appendChild(link(e.repo.name, githubLink(e.repo.name), 'event-repo')); li.appendChild(details);
      var time = element('time', '', date(e.created_at)); if (!isNaN(Date.parse(e.created_at))) time.dateTime = e.created_at;
      li.appendChild(time); list.appendChild(li);
    });
  }
  function render(data, mode) {
    current = normalize(data);
    document.getElementById('gh-repos').textContent = number(current.profile.public_repos);
    document.getElementById('gh-stars').textContent = current.repos.filter(function (r) { return !r.fork; }).reduce(function (sum, r) { return sum + number(r.stargazers_count); }, 0);
    document.getElementById('gh-followers').textContent = number(current.profile.followers);
    var selected = language.value; language.replaceChildren(element('option', '', 'All languages')); language.firstChild.value = '';
    Array.from(new Set(sourceRepos().map(function (r) { return r.language || 'Not specified'; }))).sort().forEach(function (name) {
      var option = element('option', '', name); option.value = name; language.appendChild(option);
    });
    if (Array.from(language.options).some(function (o) { return o.value === selected; })) language.value = selected;
    status.textContent = mode === 'live' ? 'Live public data' : mode === 'cache' ? 'Cached public data' : 'Saved public data'; status.dataset.state = mode;
    note.textContent = mode === 'live' ? 'Updated ' + date(current.fetchedAt) + '. Public GitHub data only.' : 'Saved ' + date(current.fetchedAt) + '. Checking for live updates when available.';
    renderRepos(); renderEvents();
  }
  function cache() { try { var d = JSON.parse(localStorage.getItem(cacheKey)); return d && normalize(d); } catch (_) { return null; } }
  async function request(path) {
    var controller = new AbortController(), timer = setTimeout(function () { controller.abort(); }, 8000);
    try {
      var response = await fetch('https://api.github.com/users/kian-al' + path, { signal: controller.signal, headers: { Accept: 'application/vnd.github+json' } });
      if (!response.ok) throw new Error('GitHub request unavailable'); return await response.json();
    } finally { clearTimeout(timer); }
  }
  async function repos() {
    var result = [], page = 1;
    while (true) {
      var batch = await request('/repos?per_page=100&sort=updated&page=' + page); if (!Array.isArray(batch)) throw new Error('Invalid repository list');
      result = result.concat(batch); if (batch.length < 100) break; page++;
    }
    return result;
  }
  async function load(force) {
    if (busy) return;
    var saved = cache();
    if (!current && (saved || initial)) { try { render(saved || initial, saved ? 'cache' : 'snapshot'); } catch (_) {} }
    if (!force && saved && Date.now() - Date.parse(saved.fetchedAt) < 15 * 60 * 1000) { render(saved, 'cache'); note.textContent = 'Updated ' + date(saved.fetchedAt) + '. Cached for up to 15 minutes; use Refresh to check again.'; return; }
    busy = true; refresh.disabled = true; refresh.textContent = 'Updating…'; root.setAttribute('aria-busy', 'true');
    try {
      var values = await Promise.all([request(''), repos(), request('/events/public?per_page=30')]);
      var data = normalize({ profile: values[0], repos: values[1], events: values[2], fetchedAt: new Date().toISOString() });
      render(data, 'live'); try { localStorage.setItem(cacheKey, JSON.stringify(data)); } catch (_) {}
    } catch (_) {
      if (current) {
        status.textContent = 'Saved data · offline'; status.dataset.state = 'snapshot';
        note.textContent = 'Live GitHub data is unavailable or rate-limited. Showing saved public data from ' + date(current.fetchedAt) + '.';
      } else {
        status.textContent = 'GitHub unavailable';
        note.textContent = 'Please use the GitHub profile link to view the latest repositories.';
      }
    } finally { busy = false; refresh.disabled = false; refresh.textContent = 'Refresh'; root.setAttribute('aria-busy', 'false'); }
  }
  search.addEventListener('input', function () { expanded = false; renderRepos(); });
  language.addEventListener('change', function () { expanded = false; renderRepos(); });
  more.addEventListener('click', function () { expanded = !expanded; renderRepos(); });
  refresh.addEventListener('click', function () { load(true); });
  load(false);
})();
