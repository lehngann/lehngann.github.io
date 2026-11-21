// Archive filters (multi-select): click filters to switch them on or off.
// An entry is shown if it belongs to ANY of the chosen filters.
// "all" shows everything; choosing it clears the other filters.

const filterLinks = document.querySelectorAll('.filters a');
const entries = document.querySelectorAll('.entry');

// The filters currently chosen. Starts with "all".
let chosen = new Set(['all']);

function render() {
  // 1. Update the circles
  filterLinks.forEach((link) => {
    const isChosen = chosen.has(link.dataset.filter);
    link.classList.toggle('selected', isChosen);
    link.setAttribute('aria-pressed', isChosen);
  });

  // 2. Show or hide each entry
  entries.forEach((entry) => {
    const categories = (entry.dataset.category || '').split(' ');
    const show = chosen.has('all') || categories.some((c) => chosen.has(c));
    entry.style.display = show ? '' : 'none';
    if (!show) entry.classList.remove('open'); // close hidden entries
  });
}

function toggleFilter(filter) {
  if (filter === 'all') {
    chosen = new Set(['all']);
  } else {
    chosen.delete('all');

    if (chosen.has(filter)) {
      chosen.delete(filter);
    } else {
      chosen.add(filter);
    }

    if (chosen.size === 0) {
      chosen.add('all');
    }
  }
  render();
}

filterLinks.forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    toggleFilter(link.dataset.filter);
  });
});

// Click a title to show its description (one open at a time)
entries.forEach((entry) => {
  entry.querySelector('.title').addEventListener('click', () => {
    const isOpen = entry.classList.contains('open');
    entries.forEach((e) => e.classList.remove('open'));
    if (!isOpen) entry.classList.add('open');
  });
});

render();

// Open the entry named in the link, e.g. archive.html#bao-boc
// (used by the books on the landing page). The id is on each .entry in archive.html.
function openFromLink() {
  const id = decodeURIComponent(location.hash.slice(1));
  if (!id) return;
  const entry = document.getElementById(id);
  if (!entry || !entry.classList.contains('entry')) return;
  if (entry.style.display === 'none') toggleFilter('all'); // make sure a filter isn't hiding it
  entries.forEach((e) => e.classList.remove('open'));
  entry.classList.add('open');
  entry.scrollIntoView({ block: 'start' });
}
openFromLink();
window.addEventListener('hashchange', openFromLink);