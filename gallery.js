let siteData = null;
let currentSort = 'date';

async function init() {
  try {
    const res = await fetch('collections.json?t=' + Date.now());
    siteData = await res.json();
  } catch (e) {
    siteData = { title: '学画成长记录', tagline: '', collections: [] };
  }
  document.title = siteData.title;
  const titleEl = document.getElementById('site-title');
  if (titleEl) titleEl.textContent = siteData.title;
  render();
}

function getSorted() {
  const list = [...(siteData.collections || [])];
  if (currentSort === 'date') {
    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }
  return list.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}

function createCard(col, delay) {
  const a = document.createElement('a');
  a.className = 'collection-card';
  const firstPainting = (col.paintings || [])[0];
  a.href = firstPainting
    ? `painting.html?col=${col.id}&id=${firstPainting.id}`
    : `collection.html?id=${col.id}`;
  a.style.animationDelay = `${delay * 0.07}s`;

  const cover = document.createElement('div');
  cover.className = 'card-cover';

  if (col.cover) {
    const img = document.createElement('img');
    img.src = `images/${col.cover}`;
    img.alt = col.title;
    img.loading = 'lazy';
    cover.appendChild(img);
  } else {
    cover.classList.add('card-cover-placeholder');
    cover.innerHTML = '<span>🎨</span>';
  }

  const count = document.createElement('span');
  count.className = 'card-count';
  count.textContent = `${(col.paintings || []).length} 张`;
  cover.appendChild(count);

  const info = document.createElement('div');
  info.className = 'card-info';
  info.innerHTML = `<h3 class="card-title">${col.title}</h3>
                    <span class="card-date">${formatDate(col.date)}</span>`;

  a.appendChild(cover);
  a.appendChild(info);
  return a;
}

function render() {
  const sorted      = getSorted();
  const featuredGrid = document.getElementById('featured-grid');
  const archiveGrid  = document.getElementById('archive-grid');
  const emptyState   = document.getElementById('empty-state');
  const archiveSec   = document.getElementById('archive-section');
  const featuredSec  = document.getElementById('featured-section');

  featuredGrid.innerHTML = '';
  archiveGrid.innerHTML  = '';

  if (sorted.length === 0) {
    emptyState.classList.remove('hidden');
    featuredSec.style.display = 'none';
    archiveSec.style.display  = 'none';
    return;
  }

  emptyState.classList.add('hidden');
  featuredSec.style.display = '';

  sorted.slice(0, 5).forEach((col, i) => featuredGrid.appendChild(createCard(col, i)));

  const rest = sorted.slice(5);
  if (rest.length > 0) {
    archiveSec.style.display = '';
    rest.forEach((col, i) => archiveGrid.appendChild(createCard(col, i)));
  } else {
    archiveSec.style.display = 'none';
  }
}

function formatDate(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  return `${y}.${parseInt(m)}.${parseInt(d)}`;
}

document.querySelectorAll('.sort-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentSort = btn.dataset.sort;
    render();
  });
});

init();
