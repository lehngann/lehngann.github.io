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
    const categories = (entry.dataset.category || '').split(/\s+/);
    const show =
      chosen.has('all') || categories.some((category) => chosen.has(category));
    entry.style.display = show ? '' : 'none';
  });
}

function toggleFilter(filter) {
  if (filter === 'all') {
    // "all" resets everything
    chosen = new Set(['all']);
  } else {
    chosen.delete('all'); // picking a specific filter turns "all" off

    if (chosen.has(filter)) {
      chosen.delete(filter); // click again to switch it off
    } else {
      chosen.add(filter);
    }

    // If nothing is left chosen, go back to showing everything
    if (chosen.size === 0) {
      chosen.add('all');
    }
  }
  render();
}

filterLinks.forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault(); // stop the link from jumping to the top of the page
    toggleFilter(link.dataset.filter);
  });
});

render();