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

  renderStats();
  renderTagFilters();
  render();
}

// ── 所有画作（展平） ──────────────────────

function getAllPaintings() {
  const result = [];
  (siteData.collections || []).forEach(col => {
    getPaintings(col).forEach(p => result.push({ col, p }));
  });
  return result;
}

function getSorted(all) {
  const list = [...all];
  if (currentSort === 'date') {
    return list.sort((a, b) => new Date(b.p.date || b.col.date) - new Date(a.p.date || a.col.date));
  }
  return list.sort((a, b) => (a.col.order ?? 999) - (b.col.order ?? 999));
}

// ── 统计 ──────────────────────────────────

function renderStats() {
  const all = getAllPaintings();
  if (all.length === 0) return;

  const dates = all.map(({ col, p }) => new Date(p.date || col.date)).filter(d => !isNaN(d));
  const earliest = new Date(Math.min(...dates));
  const latest   = new Date(Math.max(...dates));
  const days = Math.max(1, Math.round((latest - earliest) / 86400000) + 1);

  document.getElementById('stat-count').textContent = `共 ${all.length} 幅画`;
  document.getElementById('stat-days').textContent  = `已坚持 ${days} 天`;
  document.getElementById('stats-bar').classList.remove('hidden');
}

// ── 标签 ──────────────────────────────────

function collectAllTags() {
  const set = new Set();
  getAllPaintings().forEach(({ p }) => (p.tags || []).forEach(t => set.add(t)));
  return [...set];
}

function renderTagFilters() {
  const tags = collectAllTags();
  const row  = document.getElementById('tag-filter-row');
  if (tags.length === 0) { row.classList.add('hidden'); return; }

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

// ── 渲染网格 ──────────────────────────────

function render() {
  const grid       = document.getElementById('gallery-grid');
  const emptyState = document.getElementById('empty-state');
  grid.innerHTML   = '';

  let all = getAllPaintings();

  if (activeTag !== null) {
    all = all.filter(({ p }) => (p.tags || []).includes(activeTag));
  }

  const sorted = getSorted(all);

  if (sorted.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  sorted.forEach(({ col, p }, i) => {
    grid.appendChild(createCard(col, p, i));
  });
}

function createCard(col, p, delay) {
  const a = document.createElement('a');
  a.className = 'painting-card';
  a.href = `painting.html?col=${col.id}&id=${p.id}`;
  a.style.animationDelay = `${delay * 0.04}s`;

  const imgWrap = document.createElement('div');
  imgWrap.className = 'painting-card-img';

  const img = document.createElement('img');
  img.src     = imgSrc(p.image);
  img.alt     = p.name || col.title;
  img.loading = 'lazy';
  imgWrap.appendChild(img);

  const info = document.createElement('div');
  info.className = 'painting-card-info';
  info.innerHTML = `
    <div class="painting-card-title">${p.name || col.title}</div>
    <div class="painting-card-date">${formatDate(p.date || col.date)}</div>
  `;

  a.appendChild(imgWrap);
  a.appendChild(info);
  return a;
}

// ── 工具 ──────────────────────────────────

function imgSrc(path) {
  if (!path) return '';
  return path.startsWith('http') ? path : `images/${path}`;
}

function getPaintings(col) {
  if (col.paintings && col.paintings.length > 0) return col.paintings;
  return (col.images || []).map((img, i) => ({
    id: `${col.id}_${i}`, image: img, name: '', author: '小0.6',
    date: col.date, inspiration: '', gains: '', tags: []
  }));
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
