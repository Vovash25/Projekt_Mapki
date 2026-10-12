(function () {
  const API_BASE = window.API_BASE ?? "";
  const panel = document.getElementById("room-panel");
  const infoCard = document.getElementById("room-info");
  const scheduleCard = document.getElementById("room-schedule");

  let currentRequest = 0;

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function floorText(floor) {
    if (floor === null || floor === undefined) return null;
    return floor === 0 ? "parter" : `${floor}. piętro`;
  }

  const CLOSE_BTN = `
    <button class="card-close" type="button" aria-label="Zamknij">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      </svg>
    </button>`;

  async function getJSON(url) {
    const res = await fetch(API_BASE + url);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const err = new Error((data && data.error) || `Błąd ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  function renderInfoLoading(roomId) {
    infoCard.innerHTML = `
      <header class="card-head">
        <div><h2 class="card-title">Sala ${esc(roomId)}</h2><p class="card-sub">Ładowanie…</p></div>
        ${CLOSE_BTN}
      </header>`;
  }

  function renderInfoError(roomId, err) {
    const msg = err.status === 404
      ? "Nie znaleziono tej sali w bazie."
      : "Nie udało się połączyć z serwerem.";
    infoCard.innerHTML = `
      <header class="card-head">
        <div><h2 class="card-title">Sala ${esc(roomId)}</h2></div>
        ${CLOSE_BTN}
      </header>
      <p class="card-msg">${msg}</p>`;
  }

  function renderInfo(data, opts) {
    const r = data.room;
    const b = data.building || {};
    const sub = [r.room_type && r.room_type[0].toUpperCase() + r.room_type.slice(1),
                 floorText(r.floor),
                 r.wing && `skrzydło ${r.wing}`].filter(Boolean).join(" · ");

    const rows = [
      ["Pojemność", r.capacity != null ? `${r.capacity} miejsc` : null],
      ["Skrzydło", r.wing],
      ["Piętro", floorText(r.floor)],
      ["Wyposażenie", r.equipment],
      ["Właściciel", r.owner],
      ["Uwagi", r.notes],
    ].filter(([, v]) => v !== null && v !== undefined && v !== "");

    const noLift = b.elevator === false && r.floor > 0;

    infoCard.innerHTML = `
      <header class="card-head">
        <div>
          ${opts.title ? `<p class="card-kicker">${esc(opts.title)}</p>` : ""}
          <h2 class="card-title">Sala ${esc(r.number)}</h2>
          <p class="card-sub">${esc(sub)}</p>
        </div>
        ${CLOSE_BTN}
      </header>
      <dl class="info-list">
        ${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}
      </dl>
      ${noLift ? `
        <p class="info-warn">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 3l10 18H2L12 3z M12 10v5 M12 18v.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span>W budynku nie ma windy – do sali prowadzą tylko schody.</span>
        </p>` : ""}
      ${b.address ? `<p class="info-building">${esc(b.address)}</p>` : ""}`;
  }

  function todayLabel() {
    return new Date().toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" });
  }

  function nowHHMM() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  function renderScheduleShell(roomLabel, bodyHtml) {
    scheduleCard.innerHTML = `
      <header class="card-head">
        <div>
          <h2 class="card-title card-title--small">Plan sali ${esc(roomLabel)}</h2>
          <p class="card-sub">Dziś, ${esc(todayLabel())}</p>
        </div>
      </header>
      ${bodyHtml}`;
  }

  function renderSchedule(roomLabel, lessons) {
    if (!lessons.length) {
      renderScheduleShell(roomLabel, `<p class="card-msg">Dziś brak zajęć w tej sali.</p>`);
      return;
    }
    const now = nowHHMM();
    const items = lessons.map((l) => {
      const state = now >= l.end ? "past" : now >= l.start ? "now" : "";
      return `
        <li class="lesson ${state ? "lesson--" + state : ""}">
          <span class="lesson-time">${esc(l.start)}–${esc(l.end)}</span>
          <span class="lesson-body">
            <span class="lesson-title">${esc(l.title)}${state === "now" ? ' <em class="lesson-now">teraz</em>' : ""}</span>
            ${l.lecturer || l.group ? `<span class="lesson-meta">${esc([l.lecturer, l.group].filter(Boolean).join(" · "))}</span>` : ""}
          </span>
        </li>`;
    }).join("");
    renderScheduleShell(roomLabel, `<ul class="lesson-list">${items}</ul>`);
  }

  function isOpen() { return !panel.hidden; }

  function updateMapInset() {
    if (typeof window.setMapInset !== "function") return;
    if (!isOpen()) return window.setMapInset({ right: 0, bottom: 0 });
    const rect = panel.getBoundingClientRect();
    const wide = window.matchMedia("(min-width: 700px)").matches;
    window.setMapInset(wide
      ? { right: window.innerWidth - rect.left, bottom: 0 }
      : { right: 0, bottom: window.innerHeight - rect.top });
  }

  async function showRoom(roomId, opts = {}) {
    roomId = String(roomId);
    const req = ++currentRequest;

    if (history.state && history.state.search) {
      if (isOpen()) history.back();
      else history.replaceState({ roomPanel: true }, "");
    } else if (!isOpen()) {
      history.pushState({ roomPanel: true }, "");
    }
    panel.hidden = false;
    renderInfoLoading(roomId);
    renderScheduleShell(roomId, `<p class="card-msg">Ładowanie…</p>`);
    panel.scrollTop = 0;
    requestAnimationFrame(updateMapInset);

    const [info, schedule] = await Promise.allSettled([
      getJSON(`/api/rooms/${encodeURIComponent(roomId)}`),
      getJSON(`/api/rooms/${encodeURIComponent(roomId)}/schedule`),
    ]);
    if (req !== currentRequest) return;

    if (info.status === "fulfilled") renderInfo(info.value, opts);
    else renderInfoError(roomId, info.reason);

    const label = info.status === "fulfilled" ? info.value.room.number : roomId;
    if (schedule.status === "fulfilled") renderSchedule(label, schedule.value || []);
    else renderScheduleShell(label, `<p class="card-msg">Nie udało się pobrać planu.</p>`);

    requestAnimationFrame(updateMapInset);
  }

  function closeRoom({ fromHistory = false } = {}) {
    if (!isOpen()) return;
    currentRequest++;
    panel.hidden = true;
    updateMapInset();
    if (!fromHistory && history.state && history.state.roomPanel) history.back();
  }

  panel.addEventListener("click", (e) => {
    if (e.target.closest(".card-close")) closeRoom();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen() && !document.getElementById("app").classList.contains("search-open")) {
      closeRoom();
    }
  });
  window.addEventListener("popstate", (e) => {
    if (!(e.state && e.state.roomPanel)) closeRoom({ fromHistory: true });
  });
  window.addEventListener("resize", () => requestAnimationFrame(updateMapInset));

  window.showRoom = showRoom;
  window.closeRoom = closeRoom;
})();
