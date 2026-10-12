(function () {
  const app = document.getElementById("app");
  const input = document.getElementById("search-input");
  const backBtn = document.getElementById("search-back");
  const clearBtn = document.getElementById("search-clear");
  const panel = document.getElementById("search-panel");
  const results = document.getElementById("search-results");

  const TYPE_LABELS = { sala: "Sala", wykladowca: "Wykładowca" };
  const MAX_RESULTS = 30;
  const POPULAR_LIMIT = 5;

  const API_BASE = window.API_BASE ?? "";

  let popularFromServer = null;

  function normalize(text) {
    return (text || "")
      .toLowerCase()
      .replace(/ł/g, "l")
      .normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  const index = (window.SEARCH_DATA || []).map((item, order) => ({
    item,
    order,
    label: normalize(item.label),
    haystack: normalize([item.label, item.id, item.sub, item.keywords].join(" ")),
  }));

  function score(entry, q, words) {
    if (entry.label === q) return 0;
    if (entry.label.startsWith(q)) return 1;
    const labelWords = entry.label.split(/\s+/);
    if (words.every((w) => labelWords.some((lw) => lw.startsWith(w)))) return 2;
    return 3;
  }

  function search(query) {
    const q = normalize(query).trim().replace(/\s+/g, " ");
    const words = q.split(" ").filter(Boolean);
    if (words.length === 0) return null;
    return index
      .filter(({ haystack }) => words.every((w) => haystack.includes(w)))
      .map((e) => ({ e, s: score(e, q, words) }))
      .sort((a, b) => a.s - b.s || a.e.order - b.e.order)
      .map(({ e }) => e.item)
      .slice(0, MAX_RESULTS);
  }

  function localPopular() {
    return index.map(({ item }) => item).filter((i) => i.popular);
  }

  function popularList() {
    return popularFromServer && popularFromServer.length ? popularFromServer : localPopular();
  }

  async function loadPopular() {
    try {
      const res = await fetch(`${API_BASE}/api/popular?limit=${POPULAR_LIMIT}`);
      if (!res.ok) return;
      const data = await res.json();
      popularFromServer = data.map((p) => {
        const local = index.find(({ item }) => item.type === p.type && item.id === p.id);
        return { ...(local ? local.item : {}), ...p };
      });
      if (isOpen() && !input.value) render();
    } catch (e) {
    }
  }

  function logSelection(item) {
    try {
      fetch(`${API_BASE}/api/search-log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: item.type, id: item.id, label: item.label }),
        keepalive: true,
      }).catch(() => {});
    } catch (e) {  }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function render() {
    const found = search(input.value);
    const list = found ?? popularList();
    const title = found ? (found.length ? "Wyniki" : "") : "Popularne";

    clearBtn.hidden = input.value === "";

    if (found && found.length === 0) {
      results.innerHTML = `<p class="search-empty">Brak wyników dla „${escapeHtml(input.value)}”</p>`;
      return;
    }
    if (!found && list.length === 0) {
      results.innerHTML = `<p class="search-empty">Wpisz numer sali albo nazwisko wykładowcy</p>`;
      return;
    }

    results.innerHTML =
      `<h2 class="search-section">${title}</h2>` +
      `<ul class="search-list">` +
      list.map((item, i) => `
        <li>
          <button class="search-item" data-i="${i}">
            <span class="search-icon search-icon--${item.type}" aria-hidden="true"></span>
            <span class="search-text">
              <span class="search-label">${escapeHtml(item.label)}</span>
              <span class="search-sub">${escapeHtml(TYPE_LABELS[item.type] || "")}${item.sub ? " · " + escapeHtml(item.sub) : ""}</span>
            </span>
          </button>
        </li>`).join("") +
      `</ul>`;

    results._items = list;
  }

  function isOpen() {
    return app.classList.contains("search-open");
  }

  function openSearch() {
    if (isOpen()) return;
    app.classList.add("search-open");
    panel.hidden = false;
    render();
    loadPopular();
    if (input.value) input.select();
    history.pushState({ search: true }, "");
  }

  function closeSearch({ fromHistory = false } = {}) {
    if (!isOpen()) return;
    app.classList.remove("search-open");
    panel.hidden = true;
    input.blur();
    if (!fromHistory && history.state && history.state.search) history.back();
  }

  input.addEventListener("focus", openSearch);
  input.addEventListener("input", render);

  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSearch();
    if (e.key === "Enter") {
      const first = results.querySelector(".search-item");
      if (first) first.click();
    }
  });

  backBtn.addEventListener("click", () => closeSearch());

  clearBtn.addEventListener("click", () => {
    input.value = "";
    render();
    input.focus();
  });

  results.addEventListener("click", (e) => {
    const btn = e.target.closest(".search-item");
    if (!btn) return;
    const item = results._items[+btn.dataset.i];
    input.value = item.label;
    closeSearch({ fromHistory: true });
    const opened = onSearchSelect(item);
    if (!opened && history.state && history.state.search) history.back();
  });

  window.addEventListener("popstate", () => closeSearch({ fromHistory: true }));

  function onSearchSelect(item) {
    logSelection(item);
    if (typeof window.showRoom !== "function") return false;
    if (item.type === "sala") {
      window.showRoom(item.id);
      return true;
    }
    if (item.type === "wykladowca" && item.room) {
      window.showRoom(item.room, { title: `Gabinet: ${item.label}` });
      return true;
    }
    return false;
  }

  window.searchUI = { open: openSearch, close: closeSearch };
})();
