const gallery = document.getElementById("gallery");
const emptyState = document.getElementById("empty-state");
const titleEl = document.getElementById("site-title");
const taglineEl = document.getElementById("site-tagline");

titleEl.textContent = SITE_DATA.title;
taglineEl.textContent = SITE_DATA.tagline;
document.title = SITE_DATA.title;

const records = SITE_DATA.records;

if (records.length === 0) {
  emptyState.classList.remove("hidden");
} else {
  records.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "card";
    card.style.animationDelay = `${index * 0.08}s`;

    const imgArea = document.createElement("div");
    imgArea.className = "card-img";

    if (item.image) {
      const img = document.createElement("img");
      img.src = `images/${item.image}`;
      img.alt = item.description;
      img.loading = "lazy";
      imgArea.appendChild(img);
    } else {
      imgArea.classList.add("card-img-placeholder");
      imgArea.innerHTML = `<span>🎨</span>`;
    }

    const info = document.createElement("div");
    info.className = "card-info";

    const date = document.createElement("span");
    date.className = "card-date";
    date.textContent = formatDate(item.date);

    const desc = document.createElement("p");
    desc.className = "card-desc";
    desc.textContent = item.description;

    info.appendChild(date);
    info.appendChild(desc);
    card.appendChild(imgArea);
    card.appendChild(info);
    gallery.appendChild(card);
  });
}

function formatDate(str) {
  if (!str) return "";
  const [y, m, d] = str.split("-");
  return `${y} 年 ${parseInt(m)} 月 ${parseInt(d)} 日`;
}
