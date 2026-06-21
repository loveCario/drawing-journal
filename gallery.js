let siteData    = null;
let currentSort = 'date';
let activeTag   = null;

async function init() {
  try {
    const res = await fetch('collections.json?t=' + Date.now());
    siteData = await res.json();
  } catch (e) {
    siteData = { title: '小0.6的画画成长之旅', tagline: '', collections: [] };
  }
  document.title = siteData.title;
  const titleEl = document.getElementById('site-title');
  if (titleEl) titleEl.textContent = siteData.title;

  renderTagFilters();
  render();
}

// ── 标签 ──────────────────────────────────

function collectAllTags() {
  const set = new Set();
  (siteData.collections || []).forEach(col => {
    (col.paintings || []).forEach(p => {
      (p.tags || []).forEach(t => set.add(t));
    });
  });
  return [...set];
}

function renderTagFilters() {
  const tags = collectAllTags();
  const row  = document.getElementById('tag-filter-row');

  if (tags.length === 0) {
    row.classList.add('hidden');
    return;
  }

  row.classList.remove('hidden');
  row.innerHTML = '';

  const allBtn = document.createElement('button');
  allBtn.className = 'tag-filter-btn' + (activeTag === null ? ' active' : '');
  allBtn.textContent = '全部';
  allBtn.addEventListener('click', () => setTag(null));
  row.appendChild(allBtn);

  tags.forEach(tag => {
    const btn = document.createElement('button');
    btn.className = 'tag-filter-btn' + (activeTag === tag ? ' active' : '');
    btn.textContent = tag;
    btn.addEventListener('click', () => setTag(tag));
    row.appendChild(btn);
  });
}

function setTag(tag) {
  activeTag = tag;
  renderTagFilters();
  render();
}

// ── 渲染 ──────────────────────────────────

function getSorted() {
  const list = [...(siteData.collections || [])];
  if (currentSort === 'date') {
    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }
  return list.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}

function render() {
  const featuredSec   = document.getElementById('featured-section');
  const archiveSec    = document.getElementById('archive-section');
  const filteredSec   = document.getElementById('filtered-section');
  const emptyState    = document.getElementById('empty-state');

  if (activeTag !== null) {
    featuredSec.style.display  = 'none';
    archiveSec.style.display   = 'none';
    filteredSec.classList.remove('hidden');
    renderFiltered(activeTag);
    emptyState.classList.add('hidden');
    return;
  }

  filteredSec.classList.add('hidden');
  featuredSec.style.display = '';
  archiveSec.style.display  = '';

  const sorted       = getSorted();
  const featuredGrid = document.getElementById('featured-grid');
  const archiveGrid  = document.getElementById('archive-grid');
  featuredGrid.innerHTML = '';
  archiveGrid.innerHTML  = '';

  if (sorted.length === 0) {
    emptyState.classList.remove('hidden');
    featuredSec.style.display = 'none';
    archiveSec.style.display  = 'none';
    return;
  }

  emptyState.classList.add('hidden');
  sorted.slice(0, 5).forEach((col, i) => featuredGrid.appendChild(createColCard(col, i)));

  const rest = sorted.slice(5);
  if (rest.length > 0) {
    rest.forEach((col, i) => archiveGrid.appendChild(createColCard(col, i)));
    archiveSec.style.display = '';
  } else {
    archiveSec.style.display = 'none';
  }
}

function renderFiltered(tag) {
  const grid  = document.getElementById('filtered-grid');
  const label = document.getElementById('filtered-label');
  grid.innerHTML = '';
  label.textContent = `✦ 标签：${tag}`;

  const matches = [];
  (siteData.collections || []).forEach(col => {
    (col.paintings || []).forEach(p => {
      if ((p.tags || []).includes(tag)) matches.push({ col, p });
    });
  });

  matches.sort((a, b) => new Date(b.p.date || b.col.date) - new Date(a.p.date || a.col.date));

  if (matches.length === 0) {
    grid.innerHTML = '<p style="color:#aaa;font-size:13px;padding:20px 0">该标签下还没有画作</p>';
    return;
  }

  matches.forEach(({ col, p }, i) => {
    grid.appendChild(createPaintingCard(col, p, i));
  });
}

// ── 卡片 ──────────────────────────────────

function createColCard(col, delay) {
  const a = document.createElement('a');
  a.className = 'collection-card';
  const firstPainting = (col.paintings || [])[0];
  a.href = firstPainting
    ? `painting.html?col=${col.id}&id=${firstPainting.id}`
    : '#';
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

function createPaintingCard(col, painting, delay) {
  const a = document.createElement('a');
  a.className = 'collection-card';
  a.href = `painting.html?col=${col.id}&id=${painting.id}`;
  a.style.animationDelay = `${delay * 0.07}s`;

  const cover = document.createElement('div');
  cover.className = 'card-cover';
  const img = document.createElement('img');
  img.src = `images/${painting.image}`;
  img.alt = painting.name || col.title;
  img.loading = 'lazy';
  cover.appendChild(img);

  const info = document.createElement('div');
  info.className = 'card-info';
  info.innerHTML = `
    <h3 class="card-title">${painting.name || col.title}</h3>
    <span class="card-date">${formatDate(painting.date || col.date)}</span>
  `;

  a.appendChild(cover);
  a.appendChild(info);
  return a;
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
