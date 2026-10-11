(function () {
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if ('IntersectionObserver' in window) {
    var targets = document.querySelectorAll('.photo-card,.focus-grid .feature-card,.curated-card,.section > h2,.feature-section-head h2,.quote p');
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        // Animate a visible baseline; never leave content hidden if scripting fails.
        if (!reduced.matches && typeof entry.target.animate === 'function') {
          entry.target.animate([{ opacity: .65, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 420, easing: 'cubic-bezier(.2,.65,.3,1)' });
        }
      });
    }, { threshold: .12 });
    targets.forEach(function (target) { observer.observe(target); });
    var links = Array.from(document.querySelectorAll('#primary-nav a[href^="#"]'));
    var active = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) {
          var selected = a.hash === '#' + entry.target.id;
          a.classList.toggle('is-current', selected);
          if (selected) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-15% 0px -65% 0px', threshold: 0 });
    links.forEach(function (a) { var section = document.getElementById(a.hash.slice(1)); if (section) active.observe(section); });
    var hero = document.querySelector('.hero');
    if (hero) {
      var home = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) { if (entry.isIntersecting) links.forEach(function (a) { a.classList.remove('is-current'); a.removeAttribute('aria-current'); }); });
      }, { threshold: .4 }); home.observe(hero);
    }
  }
  if (reduced.addEventListener) reduced.addEventListener('change', function () {
    if (reduced.matches && document.getAnimations) document.getAnimations().forEach(function (animation) { animation.cancel(); });
  });
})();
