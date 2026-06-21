const params = new URLSearchParams(window.location.search);
const colId = params.get('col');
const paintingId = params.get('id');

async function init() {
  let siteData;
  try {
    const res = await fetch('collections.json?t=' + Date.now());
    siteData = await res.json();
  } catch (e) {
    return;
  }

  const col = (siteData.collections || []).find(c => c.id === colId);
  if (!col) return;

  document.getElementById('back-btn').href = `collection.html?id=${colId}`;

  const paintings = col.paintings || [];
  const painting = paintings.find(p => p.id === paintingId);
  if (!painting) return;

  const name = painting.name || col.title;
  document.title = name + ' — ' + siteData.title;
  document.getElementById('painting-name').textContent = name;

  const img = document.getElementById('painting-img');
  img.src = `images/${painting.image}`;
  img.alt = name;

  set('note-name', painting.name);
  set('note-author', painting.author);
  set('note-date', formatDate(painting.date));
  set('note-inspiration', painting.inspiration);
  set('note-gains', painting.gains);

  const lightbox = document.getElementById('lightbox');
  const lbImg = document.getElementById('lb-img');

  img.addEventListener('click', () => {
    lbImg.src = img.src;
    lightbox.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  });

  document.querySelector('.lb-close').addEventListener('click', closeLb);
  document.querySelector('.lb-overlay').addEventListener('click', closeLb);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeLb();
  });

  function closeLb() {
    lightbox.classList.add('hidden');
    document.body.style.overflow = '';
  }
}

function set(id, val) {
  document.getElementById(id).textContent = val || '—';
}

function formatDate(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  return `${y} 年 ${parseInt(m)} 月 ${parseInt(d)} 日`;
}

init();
