const params = new URLSearchParams(window.location.search);
const id = params.get('id');

async function init() {
  let siteData;
  try {
    const res = await fetch('collections.json?t=' + Date.now());
    siteData = await res.json();
  } catch (e) {
    document.querySelector('.collection-main').innerHTML =
      '<p style="text-align:center;padding:60px;color:#aaa">加载失败，请刷新重试</p>';
    return;
  }

  const col = (siteData.collections || []).find(c => c.id === id);

  if (!col) {
    document.querySelector('.collection-main').innerHTML =
      '<p style="text-align:center;padding:60px;color:#aaa">找不到这个陈列栏</p>';
    return;
  }

  document.title = col.title + ' — ' + siteData.title;
  document.getElementById('col-title').textContent = col.title;
  document.getElementById('col-date').textContent = formatDate(col.date);

  const descEl = document.getElementById('col-desc');
  if (col.description) {
    descEl.textContent = col.description;
  } else {
    descEl.remove();
  }

  const images = col.images || [];
  const grid = document.getElementById('images-grid');

  images.forEach((file, i) => {
    const item = document.createElement('div');
    item.className = 'image-item';
    item.style.animationDelay = `${i * 0.05}s`;
    const img = document.createElement('img');
    img.src = `images/${file}`;
    img.alt = `${col.title} ${i + 1}`;
    img.loading = 'lazy';
    img.addEventListener('click', () => openLightbox(i));
    item.appendChild(img);
    grid.appendChild(item);
  });

  let current = 0;
  const lightbox = document.getElementById('lightbox');
  const lbImg    = document.getElementById('lb-img');

  function openLightbox(i) {
    current = i;
    lbImg.src = `images/${images[i]}`;
    lightbox.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.add('hidden');
    document.body.style.overflow = '';
  }

  function go(dir) {
    current = (current + dir + images.length) % images.length;
    lbImg.src = `images/${images[current]}`;
  }

  document.querySelector('.lb-close').addEventListener('click', closeLightbox);
  document.querySelector('.lb-overlay').addEventListener('click', closeLightbox);
  document.querySelector('.lb-prev').addEventListener('click', () => go(-1));
  document.querySelector('.lb-next').addEventListener('click', () => go(1));

  document.addEventListener('keydown', e => {
    if (lightbox.classList.contains('hidden')) return;
    if (e.key === 'Escape')     closeLightbox();
    if (e.key === 'ArrowLeft')  go(-1);
    if (e.key === 'ArrowRight') go(1);
  });

  if (images.length <= 1) {
    document.querySelector('.lb-prev').style.display = 'none';
    document.querySelector('.lb-next').style.display = 'none';
  }
}

function formatDate(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  return `${y} 年 ${parseInt(m)} 月 ${parseInt(d)} 日`;
}

init();
