const titleEl = document.getElementById('site-title');
if (titleEl) titleEl.textContent = SITE_DATA.title;
document.title = SITE_DATA.title;

let currentSort = 'date';

function getSorted() {
  const list = [...SITE_DATA.collections];
  if (currentSort === 'date') {
    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }
  return list.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}

function createCard(col, delay) {
  const a = document.createElement('a');
  a.className = 'collection-card';
  a.href = `collection.html?id=${col.id}`;
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
  count.textContent = `${(col.images || []).length} 张`;
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
  const sorted = getSorted();
  const featuredGrid = document.getElementById('featured-grid');
  const archiveGrid  = document.getElementById('archive-grid');
  const emptyState   = document.getElementById('empty-state');
  const archiveSec   = document.getElementById('archive-section');

  featuredGrid.innerHTML = '';
  archiveGrid.innerHTML  = '';

  if (sorted.length === 0) {
    emptyState.classList.remove('hidden');
    document.getElementById('featured-section').style.display = 'none';
    archiveSec.style.display = 'none';
    return;
  }

  emptyState.classList.add('hidden');
  document.getElementById('featured-section').style.display = '';

  const featured = sorted.slice(0, 5);
  const archive  = sorted.slice(5);

  featured.forEach((col, i) => featuredGrid.appendChild(createCard(col, i)));

  if (archive.length > 0) {
    archiveSec.style.display = '';
    archive.forEach((col, i) => archiveGrid.appendChild(createCard(col, i)));
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

render();
