const REPO = 'loveCario/drawing-journal';
const API  = 'https://api.github.com';

let token    = localStorage.getItem('gh_token') || '';
let siteData = null;
let files    = [];

// 生成 Token 的链接
document.getElementById('token-link').href =
  'https://github.com/settings/tokens/new?scopes=public_repo&description=drawing-journal-admin';

// 如果已有 token 直接进入
if (token) loadAndShowMain();

// 连接按钮
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

function renderList() {
  const cols = siteData.collections || [];
  document.getElementById('col-count').textContent =
    cols.length === 0 ? '还没有陈列栏' : `共 ${cols.length} 个陈列栏`;

  const list = document.getElementById('col-list');
  list.innerHTML = '';

  if (cols.length === 0) {
    list.innerHTML = '<p class="empty-tip">点右上角"新建陈列栏"开始添加</p>';
    return;
  }

  cols.forEach(col => {
    const row = document.createElement('div');
    row.className = 'col-row';
    row.innerHTML = `
      <div class="row-info">
        <span class="row-title">${col.title}</span>
        <span class="row-meta">${col.date} · ${(col.images||[]).length} 张图片</span>
      </div>
      <button class="btn-delete" data-id="${col.id}">删除</button>
    `;
    list.appendChild(row);
  });

  list.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteCol(btn.dataset.id));
  });
}

// 新建按钮
document.getElementById('new-btn').addEventListener('click', () => {
  document.getElementById('admin-main').classList.add('hidden');
  document.getElementById('new-form').classList.remove('hidden');
  document.getElementById('f-date').value = new Date().toISOString().split('T')[0];
  files = [];
  document.getElementById('preview-area').innerHTML = '';
  document.getElementById('f-images').value = '';
  document.getElementById('cover-row').classList.add('hidden');
  document.getElementById('progress-bar').classList.add('hidden');
  document.getElementById('form-submit').disabled = false;
});

document.getElementById('form-cancel').addEventListener('click', backToMain);

function backToMain() {
  document.getElementById('new-form').classList.add('hidden');
  document.getElementById('admin-main').classList.remove('hidden');
}

// 图片预览
document.getElementById('f-images').addEventListener('change', e => {
  files = Array.from(e.target.files);
  const area = document.getElementById('preview-area');
  const coverSel = document.getElementById('f-cover');
  area.innerHTML = '';
  coverSel.innerHTML = '';

  files.forEach((f, i) => {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(f);
    img.className = 'preview-img';
    area.appendChild(img);

    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = f.name;
    coverSel.appendChild(opt);
  });

  document.getElementById('cover-row').classList.toggle('hidden', files.length === 0);
});

// 发布
document.getElementById('form-submit').addEventListener('click', async () => {
  const title = document.getElementById('f-title').value.trim();
  const date  = document.getElementById('f-date').value;
  const desc  = document.getElementById('f-desc').value.trim();
  const order = parseInt(document.getElementById('f-order').value) || 99;
  const coverIdx = parseInt(document.getElementById('f-cover').value) || 0;

  if (!title)          return alert('请填写标题');
  if (!date)           return alert('请选择日期');
  if (files.length===0) return alert('请选择图片');

  const btn = document.getElementById('form-submit');
  btn.disabled = true;

  const bar  = document.getElementById('progress-bar');
  const fill = document.getElementById('progress-fill');
  const txt  = document.getElementById('progress-text');
  bar.classList.remove('hidden');

  try {
    const id = Date.now().toString();
    const imageNames = [];

    for (let i = 0; i < files.length; i++) {
      const f    = files[i];
      const ext  = f.name.split('.').pop().toLowerCase();
      const name = `${id}-${i}.${ext}`;

      setProgress(fill, txt, i, files.length, `上传图片 ${i+1} / ${files.length}`);

      const b64 = await toBase64(f);
      await putFile(`images/${name}`, b64, `add image ${name}`);
      imageNames.push(name);
    }

    setProgress(fill, txt, files.length, files.length, '保存陈列栏信息...');

    const coverExt  = files[coverIdx].name.split('.').pop().toLowerCase();
    const coverName = `${id}-${coverIdx}.${coverExt}`;

    siteData.collections.push({
      id, title, date, order,
      description: desc || undefined,
      cover: coverName,
      images: imageNames
    });

    await saveCollections();

    txt.textContent = '✓ 发布成功！画廊将在约 1 分钟后更新';
    fill.style.width = '100%';

    setTimeout(() => {
      backToMain();
      renderList();
      document.getElementById('f-title').value = '';
      document.getElementById('f-desc').value  = '';
      document.getElementById('f-order').value = '99';
      bar.classList.add('hidden');
      btn.disabled = false;
    }, 2500);

  } catch (e) {
    txt.textContent = '❌ 失败：' + e.message;
    btn.disabled = false;
  }
});

async function deleteCol(id) {
  if (!confirm('确定删除这个陈列栏吗？')) return;
  siteData.collections = siteData.collections.filter(c => c.id !== id);
  await saveCollections();
  renderList();
}

// ── GitHub API ────────────────────────────

async function fetchCollections() {
  const file = await ghGet('collections.json');
  const json = decodeBase64(file.content);
  return JSON.parse(json);
}

async function saveCollections() {
  const current = await ghGet('collections.json');
  const content = encodeBase64(JSON.stringify(siteData, null, 2));
  await putFile('collections.json', content, 'update collections', current.sha);
}

async function putFile(path, base64Content, message, sha) {
  let existingSha = sha;
  if (!existingSha) {
    try {
      const f = await ghGet(path);
      existingSha = f.sha;
    } catch (e) { /* new file */ }
  }

  const body = { message, content: base64Content };
  if (existingSha) body.sha = existingSha;

  const res = await fetch(`${API}/repos/${REPO}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `token ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || '上传失败');
  }
  return res.json();
}

async function ghGet(path) {
  const res = await fetch(`${API}/repos/${REPO}/contents/${path}`, {
    headers: { Authorization: `token ${token}` }
  });
  if (!res.ok) throw new Error(`获取 ${path} 失败`);
  return res.json();
}

// ── 工具函数 ──────────────────────────────

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function encodeBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

function decodeBase64(str) {
  return decodeURIComponent(escape(atob(str.replace(/\n/g, ''))));
}

function setProgress(fill, txt, current, total, msg) {
  fill.style.width = `${Math.round((current / total) * 100)}%`;
  txt.textContent  = msg;
}

function setStatus(msg) {
  document.getElementById('github-status').textContent = msg;
}
