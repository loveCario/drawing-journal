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

  const paintings = col.paintings && col.paintings.length > 0
    ? col.paintings
    : (col.images || []).map((img, i) => ({
        id: `${col.id}_${i}`, image: img, name: '', author: '小0.6',
        date: col.date, inspiration: '', gains: '', tags: []
      }));
  const grid = document.getElementById('images-grid');

  if (paintings.length === 0) {
    grid.innerHTML = '<p style="text-align:center;color:#aaa;padding:40px">还没有画作</p>';
    return;
  }

  paintings.forEach((p, i) => {
    const a = document.createElement('a');
    a.className = 'image-item';
    a.href = `painting.html?col=${col.id}&id=${p.id}`;
    a.style.animationDelay = `${i * 0.05}s`;

    const img = document.createElement('img');
    img.src = p.image && p.image.startsWith('http') ? p.image : `images/${p.image}`;
    img.alt = p.name || col.title;
    img.loading = 'lazy';

    a.appendChild(img);
    grid.appendChild(a);
  });
}

function formatDate(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  return `${y} 年 ${parseInt(m)} 月 ${parseInt(d)} 日`;
}

init();
