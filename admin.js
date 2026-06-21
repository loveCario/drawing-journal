const REPO = 'loveCario/drawing-journal';
const API  = 'https://api.github.com';

let token        = localStorage.getItem('gh_token') || '';
let siteData     = null;
let files        = [];
let editingColId = null;

document.getElementById('token-link').href =
  'https://github.com/settings/tokens/new?scopes=public_repo&description=drawing-journal-admin';

if (token) loadAndShowMain();

document.getElementById('token-btn').addEventListener('click', async () => {
  const t = document.getElementById('token-input').value.trim();
  if (!t) return alert('请先粘贴 Token');
  token = t;
  localStorage.setItem('gh_token', t);
  await loadAndShowMain();
});

async function loadAndShowMain() {
  setStatus('连接中...');
  try {
    siteData = await fetchCollections();
    setStatus('● 已连接');
    document.getElementById('token-section').classList.add('hidden');
    document.getElementById('admin-main').classList.remove('hidden');
    renderList();
  } catch (e) {
    setStatus('● 连接失败');
    localStorage.removeItem('gh_token');
    token = '';
    alert('Token 无效或网络错误，请重新粘贴 Token');
  }
}

// ── 列表 ──────────────────────────────────

function renderList() {
  const cols = siteData.collections || [];
  document.getElementById('col-count').textContent =
    cols.length === 0 ? '还没有记录' : `共 ${cols.length} 条记录`;

  const list = document.getElementById('col-list');
  list.innerHTML = '';

  if (cols.length === 0) {
    list.innerHTML = '<p class="empty-tip">点右上角"新建记录"开始添加</p>';
    return;
  }

  cols.forEach(col => {
    const count = (col.paintings || []).length;
    const row = document.createElement('div');
    row.className = 'col-row';
    row.innerHTML = `
      <div class="row-info">
        <span class="row-title">${col.title}</span>
        <span class="row-meta">${col.date} · ${count} 张</span>
      </div>
      <div class="row-actions">
        <button class="btn-edit"   data-id="${col.id}">编辑</button>
        <button class="btn-delete" data-id="${col.id}">删除</button>
      </div>
    `;
    list.appendChild(row);
  });

  list.querySelectorAll('.btn-delete').forEach(btn =>
    btn.addEventListener('click', () => deleteCol(btn.dataset.id)));
  list.querySelectorAll('.btn-edit').forEach(btn =>
    btn.addEventListener('click', () => openEdit(btn.dataset.id)));
}

// ── 新建 ──────────────────────────────────

document.getElementById('new-btn').addEventListener('click', () => {
  document.getElementById('admin-main').classList.add('hidden');
  document.getElementById('new-form').classList.remove('hidden');
  document.getElementById('f-date').value = new Date().toISOString().split('T')[0];
  files = [];
  document.getElementById('paintings-forms').innerHTML = '';
  document.getElementById('f-images').value = '';
  document.getElementById('cover-row').classList.add('hidden');
  document.getElementById('progress-bar').classList.add('hidden');
  document.getElementById('form-submit').disabled = false;
});

document.getElementById('form-cancel').addEventListener('click', backToMain);

function backToMain() {
  document.getElementById('new-form').classList.add('hidden');
  document.getElementById('edit-panel').classList.add('hidden');
  document.getElementById('admin-main').classList.remove('hidden');
}

document.getElementById('f-images').addEventListener('change', e => {
  files = Array.from(e.target.files);
  const coverSel = document.getElementById('f-cover');
  const pfArea   = document.getElementById('paintings-forms');
  coverSel.innerHTML = '';
  pfArea.innerHTML   = '';

  if (files.length === 0) {
    document.getElementById('cover-row').classList.add('hidden');
    return;
  }

  const colDate = document.getElementById('f-date').value;

  files.forEach((f, i) => {
    const url = URL.createObjectURL(f);

    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = f.name;
    coverSel.appendChild(opt);

    const card = document.createElement('div');
    card.className = 'pf-card';
    card.dataset.index = i;
    card.innerHTML = `
      <img class="pf-thumb" src="${url}" alt="">
      <div class="pf-fields">
        <input type="text"  class="pf-name"        placeholder="画名（选填）">
        <input type="text"  class="pf-author"       placeholder="作者" value="小0.6">
        <input type="date"  class="pf-date"         value="${colDate}">
        <input type="text"  class="pf-inspiration"  placeholder="灵感来源（选填）">
        <textarea           class="pf-gains"        placeholder="收获（选填）" rows="2"></textarea>
      </div>
    `;
    pfArea.appendChild(card);
  });

  document.getElementById('cover-row').classList.remove('hidden');
});

document.getElementById('form-submit').addEventListener('click', async () => {
  const title    = document.getElementById('f-title').value.trim();
  const date     = document.getElementById('f-date').value;
  const desc     = document.getElementById('f-desc').value.trim();
  const order    = parseInt(document.getElementById('f-order').value) || 99;
  const coverIdx = parseInt(document.getElementById('f-cover').value) || 0;

  if (!title)            return alert('请填写标题');
  if (!date)             return alert('请选择日期');
  if (files.length === 0) return alert('请选择图片');

  const btn  = document.getElementById('form-submit');
  const bar  = document.getElementById('progress-bar');
  const fill = document.getElementById('progress-fill');
  const txt  = document.getElementById('progress-text');
  btn.disabled = true;
  bar.classList.remove('hidden');

  try {
    const id       = Date.now().toString();
    const paintings = [];
    const pfCards  = document.querySelectorAll('.pf-card');

    for (let i = 0; i < files.length; i++) {
      const f       = files[i];
      const ext     = f.name.split('.').pop().toLowerCase();
      const imgName = `${id}-${i}.${ext}`;

      setProgress(fill, txt, i, files.length, `上传图片 ${i + 1} / ${files.length}`);
      const b64 = await toBase64(f);
      await putFile(`images/${imgName}`, b64, `add image ${imgName}`);

      const card = pfCards[i];
      paintings.push({
        id:          `${id}_${i}`,
        image:       imgName,
        name:        card.querySelector('.pf-name').value.trim(),
        author:      card.querySelector('.pf-author').value.trim() || '小0.6',
        date:        card.querySelector('.pf-date').value || date,
        inspiration: card.querySelector('.pf-inspiration').value.trim(),
        gains:       card.querySelector('.pf-gains').value.trim()
      });
    }

    setProgress(fill, txt, files.length, files.length, '保存记录...');

    const coverExt  = files[coverIdx].name.split('.').pop().toLowerCase();
    const coverName = `${id}-${coverIdx}.${coverExt}`;

    siteData.collections.push({
      id, title, date, order,
      description: desc || undefined,
      cover: coverName,
      paintings
    });

    await saveCollections();
    txt.textContent  = '✓ 发布成功！画廊将在约 1 分钟后更新';
    fill.style.width = '100%';

    setTimeout(() => {
      backToMain();
      renderList();
      document.getElementById('f-title').value = '';
      document.getElementById('f-desc').value  = '';
      document.getElementById('f-order').value = '99';
      document.getElementById('paintings-forms').innerHTML = '';
      bar.classList.add('hidden');
      btn.disabled = false;
    }, 2500);

  } catch (e) {
    txt.textContent = '❌ 失败：' + e.message;
    btn.disabled = false;
  }
});

// ── 编辑 ──────────────────────────────────

function openEdit(colId) {
  editingColId = colId;
  const col = siteData.collections.find(c => c.id === colId);
  if (!col) return;

  document.getElementById('e-title').value = col.title;
  document.getElementById('e-date').value  = col.date;
  document.getElementById('e-desc').value  = col.description || '';

  const list = document.getElementById('edit-paintings-list');
  list.innerHTML = '';

  (col.paintings || []).forEach(p => {
    const card = document.createElement('div');
    card.className = 'pf-card';
    card.dataset.pid = p.id;
    card.innerHTML = `
      <img class="pf-thumb" src="https://raw.githubusercontent.com/${REPO}/main/images/${p.image}" alt="">
      <div class="pf-fields">
        <input type="text"  class="pf-name"        placeholder="画名（选填）"       value="${p.name || ''}">
        <input type="text"  class="pf-author"       placeholder="作者"              value="${p.author || '小0.6'}">
        <input type="date"  class="pf-date"                                          value="${p.date || col.date}">
        <input type="text"  class="pf-inspiration"  placeholder="灵感来源（选填）"  value="${p.inspiration || ''}">
        <textarea           class="pf-gains"        placeholder="收获（选填）" rows="2">${p.gains || ''}</textarea>
      </div>
    `;
    list.appendChild(card);
  });

  document.getElementById('edit-progress-bar').classList.add('hidden');
  document.getElementById('edit-save').disabled = false;
  document.getElementById('admin-main').classList.add('hidden');
  document.getElementById('edit-panel').classList.remove('hidden');
}

document.getElementById('edit-cancel').addEventListener('click', backToMain);

document.getElementById('edit-save').addEventListener('click', async () => {
  const col = siteData.collections.find(c => c.id === editingColId);
  if (!col) return;

  col.title       = document.getElementById('e-title').value.trim() || col.title;
  col.date        = document.getElementById('e-date').value || col.date;
  const desc      = document.getElementById('e-desc').value.trim();
  col.description = desc || undefined;

  document.querySelectorAll('#edit-paintings-list .pf-card').forEach((card, i) => {
    if (!col.paintings[i]) return;
    col.paintings[i].name        = card.querySelector('.pf-name').value.trim();
    col.paintings[i].author      = card.querySelector('.pf-author').value.trim() || '小0.6';
    col.paintings[i].date        = card.querySelector('.pf-date').value;
    col.paintings[i].inspiration = card.querySelector('.pf-inspiration').value.trim();
    col.paintings[i].gains       = card.querySelector('.pf-gains').value.trim();
  });

  const btn  = document.getElementById('edit-save');
  const bar  = document.getElementById('edit-progress-bar');
  const fill = document.getElementById('edit-progress-fill');
  const txt  = document.getElementById('edit-progress-text');
  btn.disabled = true;
  bar.classList.remove('hidden');
  fill.style.width = '50%';
  txt.textContent  = '保存中...';

  try {
    await saveCollections();
    fill.style.width = '100%';
    txt.textContent  = '✓ 保存成功！';
    setTimeout(() => {
      backToMain();
      renderList();
      btn.disabled = false;
    }, 1500);
  } catch (e) {
    txt.textContent = '❌ 失败：' + e.message;
    btn.disabled = false;
  }
});

async function deleteCol(id) {
  if (!confirm('确定删除这条记录吗？')) return;
  siteData.collections = siteData.collections.filter(c => c.id !== id);
  await saveCollections();
  renderList();
}

// ── GitHub API ────────────────────────────

async function fetchCollections() {
  const file = await ghGet('collections.json');
  return JSON.parse(decodeBase64(file.content));
}

async function saveCollections() {
  const current = await ghGet('collections.json');
  const content = encodeBase64(JSON.stringify(siteData, null, 2));
  await putFile('collections.json', content, 'update collections', current.sha);
}

async function putFile(path, base64Content, message, sha) {
  let existingSha = sha;
  if (!existingSha) {
    try { existingSha = (await ghGet(path)).sha; } catch (e) {}
  }
  const body = { message, content: base64Content };
  if (existingSha) body.sha = existingSha;

  const res = await fetch(`${API}/repos/${REPO}/contents/${path}`, {
    method: 'PUT',
    headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) { const err = await res.json(); throw new Error(err.message || '上传失败'); }
  return res.json();
}

async function ghGet(path) {
  const res = await fetch(`${API}/repos/${REPO}/contents/${path}`, {
    headers: { Authorization: `token ${token}` }
  });
  if (!res.ok) throw new Error(`获取 ${path} 失败`);
  return res.json();
}

// ── 工具 ──────────────────────────────────

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function encodeBase64(str) { return btoa(unescape(encodeURIComponent(str))); }
function decodeBase64(str) { return decodeURIComponent(escape(atob(str.replace(/\n/g, '')))); }

function setProgress(fill, txt, current, total, msg) {
  fill.style.width = `${Math.round((current / total) * 100)}%`;
  txt.textContent  = msg;
}

function setStatus(msg) {
  document.getElementById('github-status').textContent = msg;
}
