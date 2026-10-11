/* Reuses GitHub's week-column calendar structure and public daily counts. */
(function () {
  'use strict';
  var root = document.getElementById('contribution-calendar'); if (!root) return;
  var scroll = document.getElementById('calendar-scroll');
  var status = document.getElementById('calendar-status');
  var note = document.getElementById('calendar-note');
  var readout = document.getElementById('calendar-readout');
  var key = 'kian-contribution-calendar-v1', current = null, busy = false;
  var dayMs = 86400000;
  function iso(ms) { return new Date(ms).toISOString().slice(0, 10); }
  function fullDate(value) { return new Date(value + 'T00:00:00Z').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }); }
  function shortDate(value) { return new Date(value + 'T00:00:00Z').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }); }
  function label(day) { return day.count.toLocaleString('en-US') + (day.count === 1 ? ' contribution on ' : ' contributions on ') + fullDate(day.date); }
  function normalize(data) {
    var raw = data && (data.days || data.contributions);
    if (!Array.isArray(raw) || raw.length < 365 || raw.length > 366) throw new Error('Incomplete annual calendar');
    var days = raw.map(function (d) {
      if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d.date) || !Number.isInteger(d.count) || d.count < 0 || !Number.isInteger(d.level) || d.level < 0 || d.level > 4) throw new Error('Invalid calendar day');
      var ms = Date.parse(d.date + 'T00:00:00Z'); if (!Number.isFinite(ms) || iso(ms) !== d.date) throw new Error('Invalid date');
      if ((d.count === 0 && d.level !== 0) || (d.count > 0 && d.level === 0)) throw new Error('Invalid intensity');
      return { date: d.date, count: d.count, level: d.level };
    }).sort(function (a, b) { return a.date.localeCompare(b.date); });
    days.forEach(function (d, i) { if (i && Date.parse(d.date) - Date.parse(days[i - 1].date) !== dayMs) throw new Error('Calendar has missing or duplicate dates'); });
    var total = days.reduce(function (sum, d) { return sum + d.count; }, 0);
    var reported = typeof data.total === 'number' ? data.total : data.total && data.total.lastYear;
    if (reported !== total) throw new Error('Calendar total mismatch');
    return { days: days, total: total, fetchedAt: data.fetchedAt || new Date().toISOString() };
  }
  function node(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; }
  function render(data, mode) {
    current = normalize(data);
    var days = current.days, firstMs = Date.parse(days[0].date + 'T00:00:00Z'), lastMs = Date.parse(days[days.length - 1].date + 'T00:00:00Z');
    var sunday = firstMs - new Date(firstMs).getUTCDay() * dayMs;
    var weeks = Math.floor((lastMs - sunday) / (7 * dayMs)) + 1;
    var byDate = new Map(days.map(function (d) { return [d.date, d]; }));
    var table = node('table', 'contribution-grid'); table.id = 'calendar-grid'; table.setAttribute('role', 'grid'); table.setAttribute('aria-readonly', 'true'); table.setAttribute('aria-label', current.total + ' GitHub contributions from ' + days[0].date + ' to ' + days[days.length - 1].date); table.style.setProperty('--weeks', String(weeks));
    table.appendChild(node('caption', 'sr-only', 'Daily GitHub contributions. Use arrow keys to inspect days; Home and End move to the first and last day.'));
    var head = node('thead'), header = node('tr'), blank = node('td'); blank.appendChild(node('span', 'sr-only', 'Weekday')); header.appendChild(blank);
    var months = [];
    for (var w = 0; w < weeks; w++) {
      var date = new Date(sunday + w * 7 * dayMs), month = date.getUTCFullYear() + '-' + date.getUTCMonth();
      if (!months.length || months[months.length - 1].id !== month) months.push({ id: month, label: date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }), span: 1 });
      else months[months.length - 1].span++;
    }
    months.forEach(function (m) { var td = node('td', 'calendar-month'); td.colSpan = m.span; td.appendChild(node('span', '', m.label)); header.appendChild(td); }); head.appendChild(header); table.appendChild(head);
    var body = node('tbody'), weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (var row = 0; row < 7; row++) {
      var tr = node('tr'), dayLabel = node('td', 'calendar-weekday'); dayLabel.appendChild(node('span', row === 1 || row === 3 || row === 5 ? '' : 'sr-only', weekday[row])); tr.appendChild(dayLabel);
      for (var week = 0; week < weeks; week++) {
        var value = iso(sunday + (week * 7 + row) * dayMs), day = byDate.get(value), td = node('td', day ? 'contribution-day' : 'calendar-blank');
        if (day) {
          td.dataset.date = day.date; td.dataset.count = day.count; td.dataset.level = day.level; td.setAttribute('role', 'gridcell'); td.setAttribute('aria-label', label(day)); td.tabIndex = day.date === days[days.length - 1].date ? 0 : -1;
        } else td.setAttribute('aria-hidden', 'true');
        tr.appendChild(td);
      }
      body.appendChild(tr);
    }
    table.appendChild(body); scroll.replaceChildren(table);
    document.getElementById('calendar-total').textContent = current.total.toLocaleString('en-US');
    document.getElementById('calendar-period').textContent = shortDate(days[0].date) + ' – ' + shortDate(days[days.length - 1].date);
    document.getElementById('calendar-summary').textContent = current.total + ' contributions over ' + days.length + ' consecutive days, from ' + days[0].date + ' to ' + days[days.length - 1].date + '. Exact daily counts are available through keyboard focus and the accompanying table.';
    status.textContent = mode === 'live' ? 'Updated calendar' : mode === 'cache' ? 'Cached calendar' : 'Saved calendar';
    note.textContent = 'Counts from your public GitHub profile. Saved ' + new Date(current.fetchedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + '.';
    readout.textContent = 'Hover, tap or use arrow keys to inspect a day.';
    var details = document.getElementById('calendar-values'); details.replaceChildren();
    days.forEach(function (day) { var tr = node('tr'); tr.appendChild(node('th', '', day.date)); tr.appendChild(node('td', '', day.count)); details.appendChild(tr); });
    root.dataset.dayCount = String(days.length); root.dataset.total = String(current.total);
  }
  function inspect(cell) { if (cell && cell.classList.contains('contribution-day')) readout.textContent = label({ date: cell.dataset.date, count: Number(cell.dataset.count) }); }
  root.addEventListener('pointerover', function (e) { inspect(e.target.closest('.contribution-day')); });
  root.addEventListener('focusin', function (e) { var cell = e.target.closest('.contribution-day'); if (cell) { root.querySelectorAll('.contribution-day[tabindex="0"]').forEach(function (n) { n.tabIndex = -1; }); cell.tabIndex = 0; inspect(cell); } });
  root.addEventListener('click', function (e) { var cell = e.target.closest('.contribution-day'); if (cell) { inspect(cell); cell.focus(); } });
  root.addEventListener('keydown', function (e) {
    var cell = e.target.closest('.contribution-day'); if (!cell || !current) return;
    var offset = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 }, index = current.days.findIndex(function (d) { return d.date === cell.dataset.date; }), next;
    if (e.key === 'Home') next = 0; else if (e.key === 'End') next = current.days.length - 1; else if (Object.prototype.hasOwnProperty.call(offset, e.key)) next = Math.max(0, Math.min(current.days.length - 1, index + offset[e.key])); else return;
    e.preventDefault(); var target = root.querySelector('[data-date="' + current.days[next].date + '"]'); cell.tabIndex = -1; target.tabIndex = 0; target.focus({ preventScroll: true });
    var left = target.offsetLeft, right = left + target.offsetWidth; if (left < scroll.scrollLeft) scroll.scrollLeft = left - 12; else if (right > scroll.scrollLeft + scroll.clientWidth) scroll.scrollLeft = right - scroll.clientWidth + 12;
  });
  function cached() { try { var data = JSON.parse(localStorage.getItem(key)); return data && normalize(data); } catch (_) { return null; } }
  async function load(force) {
    if (busy) return; var saved = cached();
    if (!current) {
      try { render(saved || JSON.parse(document.getElementById('contribution-snapshot').textContent), saved ? 'cache' : 'snapshot'); } catch (_) { status.textContent = 'Calendar unavailable'; return; }
    }
    if (!force && saved && Date.now() - Date.parse(saved.fetchedAt) < 6 * 60 * 60 * 1000) { render(saved, 'cache'); return; }
    busy = true; status.textContent = 'Checking calendar…';
    var controller = new AbortController(), timer = setTimeout(function () { controller.abort(); }, 8000);
    try {
      var response = await fetch('https://github-contributions-api.jogruber.de/v4/kian-al?y=last', { signal: controller.signal });
      if (!response.ok) throw new Error('Calendar service unavailable'); var data = normalize(await response.json()); render(data, 'live');
      try { localStorage.setItem(key, JSON.stringify(data)); } catch (_) {}
    } catch (_) {
      status.textContent = 'Saved calendar'; note.textContent = 'Calendar service unavailable. Showing saved GitHub data from ' + new Date(current.fetchedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + '.';
    } finally { clearTimeout(timer); busy = false; }
  }
  var refresh = document.getElementById('gh-refresh'); if (refresh) refresh.addEventListener('click', function () { load(true); });
  load(false);
})();
