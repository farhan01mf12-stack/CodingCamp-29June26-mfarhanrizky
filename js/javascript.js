/* =============================================
   TO-DO LIST LIFE DASHBOARD - newjs.js
   ============================================= */

// ─── State ────────────────────────────────────────────────────────────────────

const state = {
  tasks: [],
  links: [],
  filter: 'all',       // 'all' | 'active' | 'done' | 'high' | 'medium' | 'low'
  sort: 'newest',
  timerMinutes: 25,
  timerSeconds: 0,
  timerTotal: 25 * 60,
  timerRemaining: 25 * 60,
  timerRunning: false,
  timerInterval: null,
  timerMode: 'pomodoro',
  theme: 'light',
  userName: 'Friend',
  // pending meta for next task
  pendingPriority: null,  // 'high' | 'medium' | 'low' | null
  pendingIcon: null,      // emoji string | null
  // ── New widget state ──────────────────────────────────────────────────────
  habits: [],           // HabitRecord[]
  notes: [],            // NoteEntry[]
  expenses: [],         // Transaction[]
  expenseFilter: { category: 'All', month: 'All' }, // in-memory only, not persisted
  countdowns: [],       // CountdownEvent[]
  music: { mode: null, url: null }, // MusicState
};

const TIMER_PRESETS = {
  pomodoro: 25,
  short: 5,
  long: 15,
};

// ─── Storage Helpers ─────────────────────────────────────────────────────────

function saveAll() {
  try {
    localStorage.setItem('dashboard_tasks',      JSON.stringify(state.tasks));
    localStorage.setItem('dashboard_links',      JSON.stringify(state.links));
    localStorage.setItem('dashboard_theme',      state.theme);
    localStorage.setItem('dashboard_name',       state.userName);
    localStorage.setItem('dashboard_timer_minutes', state.timerMinutes);
    localStorage.setItem('dashboard_habits',     JSON.stringify(state.habits));
    localStorage.setItem('dashboard_notes',      JSON.stringify(state.notes));
    localStorage.setItem('dashboard_expenses',   JSON.stringify(state.expenses));
    localStorage.setItem('dashboard_countdowns', JSON.stringify(state.countdowns));
    localStorage.setItem('dashboard_music',      JSON.stringify(state.music));
  } catch (e) {
    console.warn('saveAll failed:', e);
    showToast('Could not save data — storage may be full.', 'warning');
  }
}

function loadAll() {
  try {
    const tasks = localStorage.getItem('dashboard_tasks');
    if (tasks) state.tasks = JSON.parse(tasks);
  } catch (e) {
    console.warn('Could not load dashboard_tasks:', e);
  }

  try {
    const links = localStorage.getItem('dashboard_links');
    if (links) state.links = JSON.parse(links);
  } catch (e) {
    console.warn('Could not load dashboard_links:', e);
  }

  try {
    const theme = localStorage.getItem('dashboard_theme');
    if (theme) state.theme = theme;
  } catch (e) {
    console.warn('Could not load dashboard_theme:', e);
  }

  try {
    const name = localStorage.getItem('dashboard_name');
    if (name) state.userName = name;
  } catch (e) {
    console.warn('Could not load dashboard_name:', e);
  }

  try {
    const timerMin = localStorage.getItem('dashboard_timer_minutes');
    if (timerMin) {
      state.timerMinutes   = parseInt(timerMin, 10);
      state.timerTotal     = state.timerMinutes * 60;
      state.timerRemaining = state.timerTotal;
    }
  } catch (e) {
    console.warn('Could not load dashboard_timer_minutes:', e);
  }

  try {
    const raw = localStorage.getItem('dashboard_habits');
    if (raw) state.habits = JSON.parse(raw);
  } catch (e) {
    console.warn('Could not load dashboard_habits:', e);
  }

  try {
    const raw = localStorage.getItem('dashboard_notes');
    if (raw) state.notes = JSON.parse(raw);
  } catch (e) {
    console.warn('Could not load dashboard_notes:', e);
  }

  try {
    const raw = localStorage.getItem('dashboard_expenses');
    if (raw) state.expenses = JSON.parse(raw);
  } catch (e) {
    console.warn('Could not load dashboard_expenses:', e);
  }

  try {
    const raw = localStorage.getItem('dashboard_countdowns');
    if (raw) state.countdowns = JSON.parse(raw);
  } catch (e) {
    console.warn('Could not load dashboard_countdowns:', e);
  }

  try {
    const raw = localStorage.getItem('dashboard_music');
    if (raw) state.music = JSON.parse(raw);
  } catch (e) {
    console.warn('Could not load dashboard_music:', e);
  }
}

// ─── DOM References ───────────────────────────────────────────────────────────

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ─── Clock & Greeting ─────────────────────────────────────────────────────────

const DAYS_ID   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS_ID = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getGreeting(hour) {
  if (hour >= 5  && hour < 12) return 'Good Morning ☀️';
  if (hour >= 12 && hour < 15) return 'Good Afternoon 🌤️';
  if (hour >= 15 && hour < 19) return 'Good Evening 🌅';
  return 'Good Night 🌙';
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function updateClock() {
  const now   = new Date();
  const h     = now.getHours();
  const m     = now.getMinutes();
  const s     = now.getSeconds();

  const timeStr = `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
  const dateStr = `${DAYS_ID[now.getDay()]}, ${now.getDate()} ${MONTHS_ID[now.getMonth()]} ${now.getFullYear()}`;

  const timeEl = $('#greeting-time');
  const dateEl = $('#greeting-date');
  const msgEl  = $('#greeting-message');

  if (timeEl) timeEl.textContent = timeStr;
  if (dateEl) dateEl.textContent = dateStr;
  if (msgEl)  msgEl.innerHTML = `${getGreeting(h)}, <span class="greeting-name">${escapeHtml(state.userName)}</span>!`;}

// ─── Theme ────────────────────────────────────────────────────────────────────

function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);

  const btn  = $('#theme-toggle');
  const icon = btn && btn.querySelector('.icon');
  const label = btn && btn.querySelector('.label');

  if (icon)  icon.textContent = state.theme === 'dark' ? '☀️' : '🌙';
  if (label) label.textContent = state.theme === 'dark' ? 'Light Mode' : 'Dark Mode';}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
  saveAll();
}

// ─── Custom Name ──────────────────────────────────────────────────────────────

function openNameModal() {
  const overlay = $('#name-modal-overlay');
  const input   = $('#name-modal-input');
  if (!overlay || !input) return;
  input.value = state.userName;
  overlay.classList.add('show');
  input.focus();
}

function closeNameModal() {
  const overlay = $('#name-modal-overlay');
  if (overlay) overlay.classList.remove('show');
}

function saveName() {
  const input = $('#name-modal-input');
  if (!input) return;
  const val = input.value.trim();
  if (!val) return;
  state.userName = val;
  saveAll();
  updateClock();
  closeNameModal();
  showToast('Name updated successfully!', 'success');
}

// ─── Timer ────────────────────────────────────────────────────────────────────

function formatTimer(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${pad2(m)}:${pad2(s)}`;
}

function updateTimerDisplay() {
  const timeEl    = $('#timer-time');
  const statusEl  = $('#timer-status');
  const progressEl = $('#timer-ring-progress');

  if (timeEl) timeEl.textContent = formatTimer(state.timerRemaining);

  if (progressEl) {
    const circumference = 440;
    const fraction      = state.timerTotal > 0 ? state.timerRemaining / state.timerTotal : 1;
    progressEl.style.strokeDashoffset = circumference * (1 - fraction);
  }

  if (statusEl) {
    if (state.timerRunning) {
      statusEl.textContent = '⏱ Timer is running...';
    } else if (state.timerRemaining === 0) {
      statusEl.textContent = '✅ Session complete! Take a break.';
    } else {
      statusEl.textContent = `Set: ${state.timerMinutes} minutes`;
    }
  }
}

function timerTick() {
  if (state.timerRemaining <= 0) {
    clearInterval(state.timerInterval);
    state.timerRunning = false;
    state.timerRemaining = 0;
    updateTimerDisplay();
    showToast('⏰ Time is up! Focus session complete.', 'success');
    return;
  }
  state.timerRemaining -= 1;
  updateTimerDisplay();
}

function startTimer() {
  if (state.timerRunning) return;
  if (state.timerRemaining === 0) resetTimer();
  state.timerRunning = true;
  state.timerInterval = setInterval(timerTick, 1000);
  updateTimerDisplay();
}

function stopTimer() {
  if (!state.timerRunning) return;
  clearInterval(state.timerInterval);
  state.timerRunning = false;
  updateTimerDisplay();
}

function resetTimer() {
  clearInterval(state.timerInterval);
  state.timerRunning   = false;
  state.timerRemaining = state.timerTotal;
  updateTimerDisplay();
}

function setTimerMode(mode) {
  stopTimer();
  state.timerMode = mode;

  if (mode !== 'custom') {
    state.timerMinutes  = TIMER_PRESETS[mode];
    state.timerTotal    = state.timerMinutes * 60;
    state.timerRemaining = state.timerTotal;
  }

  // Update active button
  $$('.timer-mode-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });

  updateTimerDisplay();
  saveAll();
}

function applyCustomTime() {
  const input = $('#custom-time-input');
  if (!input) return;
  const val = parseInt(input.value, 10);
  if (isNaN(val) || val < 1 || val > 180) {
    showToast('Enter minutes between 1 – 180', 'warning');
    return;
  }
  stopTimer();
  state.timerMinutes   = val;
  state.timerTotal     = val * 60;
  state.timerRemaining = state.timerTotal;
  state.timerMode      = 'custom';
  $$('.timer-mode-btn').forEach((btn) => btn.classList.remove('active'));
  updateTimerDisplay();
  saveAll();
  showToast(`Timer set to ${val} minutes`, 'success');
}

// ─── Tasks ─────────────────────────────────────────────────────────────────────

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isDuplicateTask(text) {
  return state.tasks.some(
    (t) => t.text.trim().toLowerCase() === text.trim().toLowerCase()
  );
}

function addTask() {
  const input    = $('#task-input');
  const deadlineEl = $('#task-deadline');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  const warnEl = $('#duplicate-warning');

  if (isDuplicateTask(text)) {
    if (warnEl) warnEl.classList.add('show');
    showToast('This task already exists!', 'warning');
    return;
  }

  if (warnEl) warnEl.classList.remove('show');

  state.tasks.unshift({
    id: generateId(),
    text,
    done: false,
    createdAt: Date.now(),
    deadline: deadlineEl ? deadlineEl.value : '',       // 'YYYY-MM-DD' or ''
    priority: state.pendingPriority || null,
    icon: state.pendingIcon || null,
  });

  // Reset inputs
  input.value = '';
  if (deadlineEl) deadlineEl.value = '';
  state.pendingPriority = null;
  state.pendingIcon     = null;
  updateMetaBtn();
  // Close panel & clear selections
  const panel = $('#task-meta-panel');
  if (panel) panel.style.display = 'none';
  $$('.meta-option').forEach((o) => o.classList.remove('selected'));
  const metaBtn = $('#task-meta-btn');
  if (metaBtn) metaBtn.classList.remove('active');

  saveAll();
  renderTasks();
  showToast('Task added!', 'success');
}

function deleteTask(id) {
  state.tasks = state.tasks.filter((t) => t.id !== id);
  saveAll();
  renderTasks();
}

function toggleTask(id) {
  const task = state.tasks.find((t) => t.id === id);
  if (task) {
    task.done = !task.done;
    saveAll();
    renderTasks();
  }
}

function startEditTask(id) {
  const item = $(`[data-task-id="${id}"]`);
  if (!item) return;

  const task    = state.tasks.find((t) => t.id === id);
  const textEl  = item.querySelector('.task-text');
  const actions = item.querySelector('.task-actions');

  if (!task || !textEl) return;

  // Replace text with input
  const editInput = document.createElement('input');
  editInput.type  = 'text';
  editInput.value = task.text;
  editInput.className = 'task-edit-input';
  editInput.setAttribute('data-edit-id', id);

  textEl.replaceWith(editInput);
  editInput.focus();
  editInput.select();

  // Swap edit button for save button
  const editBtn = item.querySelector('.task-edit-btn');
  if (editBtn) {
    editBtn.textContent = '💾';
    editBtn.className   = 'task-action-btn task-save-btn';
    editBtn.onclick     = () => saveEditTask(id);
  }

  // Save on Enter
  editInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveEditTask(id);
    if (e.key === 'Escape') renderTasks();
  });
}

function saveEditTask(id) {
  const editInput = $(`[data-edit-id="${id}"]`);
  if (!editInput) return;

  const newText = editInput.value.trim();
  if (!newText) return;

  const task = state.tasks.find((t) => t.id === id);
  if (!task) return;

  // Duplicate check (excluding self)
  const dup = state.tasks.some(
    (t) => t.id !== id && t.text.trim().toLowerCase() === newText.toLowerCase()
  );

  if (dup) {
    showToast('This task already exists!', 'warning');
    return;
  }

  task.text = newText;
  saveAll();
  renderTasks();
  showToast('Task updated!', 'success');
}

function getFilteredSortedTasks() {
  let list = [...state.tasks];

  // Filter
  if (state.filter === 'active') list = list.filter((t) => !t.done);
  if (state.filter === 'done')   list = list.filter((t) => t.done);
  if (state.filter === 'high')   list = list.filter((t) => t.priority === 'high');
  if (state.filter === 'medium') list = list.filter((t) => t.priority === 'medium');
  if (state.filter === 'low')    list = list.filter((t) => t.priority === 'low');

  // Sort
  if (state.sort === 'newest')   list.sort((a, b) => b.createdAt - a.createdAt);
  if (state.sort === 'oldest')   list.sort((a, b) => a.createdAt - b.createdAt);
  if (state.sort === 'alpha')    list.sort((a, b) => a.text.localeCompare(b.text));
  if (state.sort === 'status')   list.sort((a, b) => Number(a.done) - Number(b.done));
  if (state.sort === 'priority') {
    const order = { high: 0, medium: 1, low: 2, null: 3 };
    list.sort((a, b) => (order[a.priority] ?? 3) - (order[b.priority] ?? 3));
  }
  if (state.sort === 'deadline') {
    list.sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;   // no deadline → last
      if (!b.deadline) return -1;
      return a.deadline.localeCompare(b.deadline);
    });
  }

  return list;
}

function formatDeadline(dateStr) {
  if (!dateStr) return null;
  // dateStr = 'YYYY-MM-DD'
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${String(y).slice(2)}`;
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(dateStr + 'T00:00:00');
  return deadline < today;
}

const PRIORITY_ICON = { high: '🔴', medium: '🟡', low: '🟢' };

function updateMetaBtn() {
  const btn = $('#task-meta-btn');
  if (!btn) return;
  const p = state.pendingPriority ? PRIORITY_ICON[state.pendingPriority] : '';
  const i = state.pendingIcon || '';
  btn.textContent = (p || i) ? `${p}${i}` : '🏳️';
}

function renderTasks() {
  const listEl  = $('#task-list');
  const countEl = $('#task-count');
  const warnEl  = $('#duplicate-warning');

  if (!listEl) return;
  if (warnEl) warnEl.classList.remove('show');

  const filtered  = getFilteredSortedTasks();
  const totalDone = state.tasks.filter((t) => t.done).length;

  if (countEl) {
    countEl.textContent = `${totalDone}/${state.tasks.length} completed`;
  }

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <li class="task-empty">
        <span class="empty-icon">📋</span>
        ${state.filter === 'all'    ? 'No tasks yet. Add one now!'  :
          state.filter === 'active' ? 'No active tasks.'            :
          state.filter === 'done'   ? 'No completed tasks yet.'     :
                                      'No tasks with this priority.'}
      </li>`;
    return;
  }

  listEl.innerHTML = filtered.map((task) => {
    const deadlineStr = formatDeadline(task.deadline);
    const overdue     = !task.done && isOverdue(task.deadline);
    const deadlineBadge = deadlineStr
      ? `<span class="task-deadline-badge${overdue ? ' overdue' : ''}" title="Deadline">${deadlineStr}</span>`
      : '';
    const priorityBadge = task.priority
      ? `<span class="task-priority-badge" title="${task.priority} priority">${PRIORITY_ICON[task.priority]}</span>`
      : '';
    const iconBadge = task.icon
      ? `<span class="task-icon-badge">${task.icon}</span>`
      : '';

    return `
    <li class="task-item${task.done ? ' done' : ''}" data-task-id="${task.id}">
      <input
        class="task-checkbox"
        type="checkbox"
        ${task.done ? 'checked' : ''}
        onchange="toggleTask('${task.id}')"
        aria-label="Mark done"
      />
      ${iconBadge}
      <span class="task-text">${escapeHtml(task.text)}</span>
      <div class="task-meta">
        ${priorityBadge}
        ${deadlineBadge}
      </div>
      <div class="task-actions">
        <button class="task-action-btn task-edit-btn"   onclick="startEditTask('${task.id}')" title="Edit task"   aria-label="Edit task">✏️</button>
        <button class="task-action-btn task-delete-btn" onclick="deleteTask('${task.id}')"    title="Delete task" aria-label="Delete task">🗑️</button>
      </div>
    </li>`;
  }).join('');
}

function setFilter(filter) {
  state.filter = filter;
  $$('.filter-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  renderTasks();
}

function setSort(sort) {
  state.sort = sort;
  renderTasks();
}

// ─── Quick Links ──────────────────────────────────────────────────────────────

function addLink() {
  const nameInput = $('#link-name-input');
  const urlInput  = $('#link-url-input');
  if (!nameInput || !urlInput) return;

  const name = nameInput.value.trim();
  let url    = urlInput.value.trim();

  if (!name || !url) {
    showToast('Please fill in both name and URL', 'warning');
    return;
  }

  // Normalize URL
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  state.links.push({ id: generateId(), name, url });
  nameInput.value = '';
  urlInput.value  = '';
  saveAll();
  renderLinks();
  showToast('Link added!', 'success');
}

function deleteLink(id) {
  state.links = state.links.filter((l) => l.id !== id);
  saveAll();
  renderLinks();
}

function getLinkFavicon(url) {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return null;
  }
}

function renderLinks() {
  const container = $('#links-container');
  if (!container) return;

  if (state.links.length === 0) {
    container.innerHTML = '<span style="font-size:0.85rem;color:var(--text-muted)">No links yet. Add one below!</span>';
    return;
  }

  container.innerHTML = state.links.map((link) => {
    const favicon = getLinkFavicon(link.url);
    const iconHtml = favicon
      ? `<img src="${favicon}" alt="" width="16" height="16" style="border-radius:3px;flex-shrink:0;" onerror="this.style.display='none'">`
      : '🔗';
    return `
    <a
      class="link-item"
      href="${escapeHtml(link.url)}"
      target="_blank"
      rel="noopener noreferrer"
    >
      ${iconHtml} ${escapeHtml(link.name)}
      <button
        class="link-delete-btn"
        onclick="event.preventDefault(); deleteLink('${link.id}')"
        title="Delete link"
        aria-label="Delete link"
      >✕</button>
    </a>
  `;
  }).join('');
}

// ─── Daily Quote ─────────────────────────────────────────────────────────────

const QUOTES = [
  { text: "The only way to do great work is to love what you do.", author: "— Steve Jobs" },
  { text: "In the middle of every difficulty lies opportunity.", author: "— Albert Einstein" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "— Winston Churchill" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "— Eleanor Roosevelt" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "— Confucius" },
  { text: "Believe you can and you're halfway there.", author: "— Theodore Roosevelt" },
  { text: "In the end, it's not the years in your life that count. It's the life in your years.", author: "— Abraham Lincoln" },
  { text: "The greatest glory in living lies not in never falling, but in rising every time we fall.", author: "— Nelson Mandela" },
  { text: "It is during our darkest moments that we must focus to see the light.", author: "— Aristotle" },
  { text: "Darkness cannot drive out darkness; only light can do that.", author: "— Martin Luther King Jr." },
];

let quoteIndex = 0;

function renderQuote() {
  const quoteEl  = $('.daily-quote');
  const textEl   = $('#quote-text');
  const authorEl = $('#quote-author');
  if (!textEl || !quoteEl) return;

  const quote = QUOTES[quoteIndex];

  // Phase 1: exit (slide right out)
  quoteEl.classList.add('quote-exit');

  setTimeout(() => {
    // Phase 2: swap content, snap to left (enter position)
    textEl.textContent   = `"${quote.text}"`;
    if (authorEl) authorEl.textContent = quote.author;

    quoteEl.classList.remove('quote-exit');
    quoteEl.classList.add('quote-enter');

    // Force reflow so transition fires
    void quoteEl.offsetWidth;

    // Phase 3: slide into place
    quoteEl.classList.replace('quote-enter', 'quote-enter-active');

    setTimeout(() => {
      quoteEl.classList.remove('quote-enter-active');
    }, 350);

  }, 300);
}

function startQuoteRotation() {
  // Pick random starting index
  quoteIndex = Math.floor(Math.random() * QUOTES.length);
  renderQuote();
  setInterval(() => {
    quoteIndex = (quoteIndex + 1) % QUOTES.length;
    renderQuote();
  }, 7000);
}

// ─── Weather ──────────────────────────────────────────────────────────────────

// Mapping WMO weather code → { icon emoji, label }
const WMO_CODES = {
  0:  { icon: '☀️',  label: 'Clear' },
  1:  { icon: '🌤️', label: 'Mostly Clear' },
  2:  { icon: '⛅',  label: 'Partly Cloudy' },
  3:  { icon: '☁️',  label: 'Overcast' },
  45: { icon: '🌫️', label: 'Foggy' },
  48: { icon: '🌫️', label: 'Freezing Fog' },
  51: { icon: '🌦️', label: 'Light Drizzle' },
  53: { icon: '🌦️', label: 'Drizzle' },
  55: { icon: '🌧️', label: 'Heavy Drizzle' },
  61: { icon: '🌧️', label: 'Light Rain' },
  63: { icon: '🌧️', label: 'Rain' },
  65: { icon: '🌧️', label: 'Heavy Rain' },
  71: { icon: '🌨️', label: 'Light Snow' },
  73: { icon: '🌨️', label: 'Snow' },
  75: { icon: '❄️',  label: 'Heavy Snow' },
  80: { icon: '🌦️', label: 'Rain Showers' },
  81: { icon: '🌧️', label: 'Heavy Showers' },
  82: { icon: '⛈️', label: 'Violent Showers' },
  95: { icon: '⛈️', label: 'Thunderstorm' },
  96: { icon: '⛈️', label: 'Thunderstorm + Hail' },
  99: { icon: '⛈️', label: 'Severe Thunderstorm' },
};

// Sesuaikan icon berdasarkan malam/siang jika kondisi cerah
function getWeatherIcon(code, isNight) {
  if (isNight && (code === 0 || code === 1)) return '🌙';
  return (WMO_CODES[code] || { icon: '🌡️' }).icon;
}

function getWeatherLabel(code) {
  return (WMO_CODES[code] || { label: 'Tidak diketahui' }).label;
}

async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error('Weather API error');
  return res.json();
}

async function fetchCityName(lat, lon) {
  // Nominatim reverse geocoding (OpenStreetMap, free)
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
  const res  = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  if (!res.ok) return 'Your Location';
  const data = await res.json();
  const addr = data.address || {};
  return addr.city || addr.town || addr.village || addr.county || addr.state || 'Your Location';
}

async function initWeather() {
  const widgetEl = $('#weather-widget');
  const tempEl   = $('#weather-temp');
  if (!widgetEl || !tempEl) return;

  // Cek apakah browser mendukung geolocation
  if (!navigator.geolocation) {
    tempEl.textContent = 'Geolocation not supported';
    tempEl.className   = 'weather-loading';
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      try {
        const { latitude: lat, longitude: lon } = pos.coords;

        // Fetch cuaca dan nama kota secara paralel
        const [weatherData, cityName] = await Promise.all([
          fetchWeather(lat, lon),
          fetchCityName(lat, lon),
        ]);

        const cw      = weatherData.current_weather;
        const temp    = Math.round(cw.temperature);
        const code    = cw.weathercode;
        const isNight = cw.is_day === 0;
        const icon    = getWeatherIcon(code, isNight);
        const label   = getWeatherLabel(code);

        // Update tampilan
        const iconEl = widgetEl.querySelector('.weather-icon');
        if (iconEl) iconEl.textContent = icon;

        widgetEl.querySelector('.weather-info').innerHTML = `
          <span class="weather-temp">${temp}°C · ${label}</span>
          <span class="weather-city">📍 ${escapeHtml(cityName)}</span>
        `;
      } catch (err) {
        console.warn('Weather fetch failed:', err);
        tempEl.textContent = 'Weather unavailable';
        tempEl.className   = 'weather-loading';
      }
    },
    (err) => {
      console.warn('Geolocation denied:', err);
      tempEl.textContent = 'Allow location for weather';
      tempEl.className   = 'weather-loading';
    },
    { timeout: 8000 }
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function showToast(message, type = 'info') {
  const container = $('#toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// ─── Event Listeners ─────────────────────────────────────────────────────────

function bindEvents() {
  // Theme toggle
  const themeBtn = $('#theme-toggle');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  // Greeting name
  const nameEditBtn = $('#name-edit-btn');
  if (nameEditBtn) nameEditBtn.addEventListener('click', openNameModal);

  const nameModalClose = $('#name-modal-close');
  if (nameModalClose) nameModalClose.addEventListener('click', closeNameModal);

  const nameModalSave = $('#name-modal-save');
  if (nameModalSave) nameModalSave.addEventListener('click', saveName);

  const nameModalOverlay = $('#name-modal-overlay');
  if (nameModalOverlay) {
    nameModalOverlay.addEventListener('click', (e) => {
      if (e.target === nameModalOverlay) closeNameModal();
    });
  }

  const nameInput = $('#name-modal-input');
  if (nameInput) {
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveName();
      if (e.key === 'Escape') closeNameModal();
    });
  }

  // Timer mode buttons
  $$('.timer-mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => setTimerMode(btn.dataset.mode));
  });

  // Timer controls
  const startBtn = $('#timer-start');
  const stopBtn  = $('#timer-stop');
  const resetBtn = $('#timer-reset');
  if (startBtn) startBtn.addEventListener('click', startTimer);
  if (stopBtn)  stopBtn.addEventListener('click', stopTimer);
  if (resetBtn) resetBtn.addEventListener('click', resetTimer);

  // Custom time
  const applyBtn = $('#custom-time-apply');
  if (applyBtn) applyBtn.addEventListener('click', applyCustomTime);

  const customInput = $('#custom-time-input');
  if (customInput) {
    customInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') applyCustomTime();
    });
  }

  // Task add
  const addTaskBtn = $('#add-task-btn');
  if (addTaskBtn) addTaskBtn.addEventListener('click', addTask);

  const taskInput = $('#task-input');
  if (taskInput) {
    taskInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addTask();
    });
    // Live duplicate check hint
    taskInput.addEventListener('input', () => {
      const warnEl = $('#duplicate-warning');
      if (!warnEl) return;
      if (isDuplicateTask(taskInput.value.trim())) {
        warnEl.classList.add('show');
      } else {
        warnEl.classList.remove('show');
      }
    });
  }

  // Meta panel toggle
  const metaBtn   = $('#task-meta-btn');
  const metaPanel = $('#task-meta-panel');
  if (metaBtn && metaPanel) {
    metaBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = metaPanel.style.display === 'none' || metaPanel.style.display === '';
      metaPanel.style.display = open ? 'block' : 'none';
      metaBtn.classList.toggle('active', open);
    });

    document.addEventListener('click', () => {
      metaPanel.style.display = 'none';
      metaBtn.classList.remove('active');
    });

    // Prevent clicks inside panel from closing it
    metaPanel.addEventListener('click', (e) => e.stopPropagation());
  }

  // Priority selection
  $$('.priority-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.priority;
      if (state.pendingPriority === val) {
        // deselect
        state.pendingPriority = null;
        btn.classList.remove('selected');
      } else {
        state.pendingPriority = val;
        $$('.priority-option').forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
      }
      updateMetaBtn();
    });
  });

  // Icon selection
  $$('.icon-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.icon;
      if (state.pendingIcon === val) {
        state.pendingIcon = null;
        btn.classList.remove('selected');
      } else {
        state.pendingIcon = val;
        $$('.icon-option').forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
      }
      updateMetaBtn();
    });
  });

  // Filter & sort
  $$('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => setFilter(btn.dataset.filter));
  });

  // Custom sort dropdown
  const sortTrigger = $('#sort-trigger');
  const sortMenu    = $('#sort-menu');

  if (sortTrigger && sortMenu) {
    sortTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = sortMenu.classList.toggle('open');
      sortTrigger.setAttribute('aria-expanded', open);
    });

    sortMenu.querySelectorAll('.custom-select-option').forEach((opt) => {
      opt.addEventListener('click', () => {
        sortMenu.querySelectorAll('.custom-select-option').forEach((o) => o.classList.remove('active'));
        opt.classList.add('active');
        $('#sort-label').textContent = opt.textContent;
        sortMenu.classList.remove('open');
        sortTrigger.setAttribute('aria-expanded', 'false');
        setSort(opt.dataset.value);
      });
    });

    document.addEventListener('click', () => {
      sortMenu.classList.remove('open');
      sortTrigger.setAttribute('aria-expanded', 'false');
    });
  }

  // Quick links
  const addLinkBtn = $('#add-link-btn');
  if (addLinkBtn) addLinkBtn.addEventListener('click', addLink);

  const linkUrlInput = $('#link-url-input');
  if (linkUrlInput) {
    linkUrlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addLink();
    });
  }

  // ── Habit Tracker ────────────────────────────────────────────────────────
  const addHabitBtn = $('#add-habit-btn');
  if (addHabitBtn) addHabitBtn.addEventListener('click', addHabit);

  const habitInput = $('#habit-input');
  if (habitInput) {
    habitInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addHabit();
    });
  }

  // ── Notes / Journal ──────────────────────────────────────────────────────
  const addNoteBtn = $('#add-note-btn');
  if (addNoteBtn) addNoteBtn.addEventListener('click', addNote);

  const noteBodyInput = $('#note-body-input');
  if (noteBodyInput) {
    noteBodyInput.addEventListener('keydown', (e) => {
      // Ctrl+Enter submits the note
      if (e.key === 'Enter' && e.ctrlKey) addNote();
    });
  }

  const noteDetailClose = $('#note-detail-close');
  if (noteDetailClose) {
    noteDetailClose.addEventListener('click', () => {
      const detail = $('#note-detail');
      if (detail) detail.style.display = 'none';
    });
  }

  const noteSearchInput = $('#note-search-input');
  if (noteSearchInput) {
    noteSearchInput.addEventListener('input', () => {
      if (typeof searchNotes === 'function') searchNotes();
    });
  }

  // ── Countdown Timer ──────────────────────────────────────────────────────
  const addCountdownBtn = $('#add-countdown-btn');
  if (addCountdownBtn) addCountdownBtn.addEventListener('click', addCountdown);

  const countdownNameInput = $('#countdown-name-input');
  if (countdownNameInput) {
    countdownNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addCountdown();
    });
  }

  // ── Music / Spotify Widget ───────────────────────────────────────────────
  const musicSubmitBtn = $('#music-submit-btn');
  if (musicSubmitBtn) musicSubmitBtn.addEventListener('click', submitMusicUrl);

  const musicRemoveBtn = $('#music-remove-btn');
  if (musicRemoveBtn) musicRemoveBtn.addEventListener('click', removeMusicEmbed);

  const musicModeSpotify = $('#music-mode-spotify');
  if (musicModeSpotify) {
    musicModeSpotify.addEventListener('change', function () {
      setMusicMode(this.value);
    });
  }

  const musicModeAudio = $('#music-mode-audio');
  if (musicModeAudio) {
    musicModeAudio.addEventListener('change', function () {
      setMusicMode(this.value);
    });
  }

  // ── Expense Tracker ───────────────────────────────────────────────────────
  const addExpenseBtn = $('#add-expense-btn');
  if (addExpenseBtn) addExpenseBtn.addEventListener('click', addExpense);

  const expenseAddBtn = $('#expense-add-btn');
  if (expenseAddBtn) expenseAddBtn.addEventListener('click', addExpense);

  const expenseFilterCategory = $('#expense-filter-category');
  if (expenseFilterCategory) {
    expenseFilterCategory.addEventListener('change', function () {
      setExpenseCategoryFilter(this.value);
    });
  }

  const expenseFilterMonth = $('#expense-filter-month');
  if (expenseFilterMonth) {
    expenseFilterMonth.addEventListener('change', function () {
      setExpenseMonthFilter(this.value);
    });
  }

  const clearExpenseFiltersBtn = $('#clear-expense-filters-btn');
  if (clearExpenseFiltersBtn) clearExpenseFiltersBtn.addEventListener('click', clearExpenseFilters);
}

// ─── Init ─────────────────────────────────────────────────────────────────────

function init() {
  loadAll();
  applyTheme();
  updateClock();
  setInterval(() => { updateClock(); tickCountdowns(); checkHabitDayRollover(); }, 1000);
  updateTimerDisplay();
  renderTasks();
  renderLinks();
  startQuoteRotation();
  initWeather();
  bindEvents();
  renderHabits();
  renderNotes();
  renderExpenses();
  renderCountdowns();
  restoreMusic();

  // Set active timer mode button
  $$('.timer-mode-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === state.timerMode);
  });

  // Sync custom time input with stored value
  const customInput = $('#custom-time-input');
  if (customInput) customInput.value = state.timerMinutes;
}

document.addEventListener('DOMContentLoaded', init);

// ─── Habit Tracker ────────────────────────────────────────────────────────────

/**
 * getTodayDateString()
 * Returns the current local calendar date as a YYYY-MM-DD string.
 * @returns {string}
 */
function getTodayDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * addHabit()
 * Reads #habit-input, validates the value, and pushes a new HabitRecord to
 * state.habits if valid. Rejects empty/whitespace names and case-insensitive
 * duplicates with a toast warning. Saves and re-renders on success.
 */
function addHabit() {
  const input = $('#habit-input');
  if (!input) return;

  const trimmed = input.value.trim();

  // Reject empty / whitespace-only names
  if (!trimmed) {
    showToast('Habit name cannot be empty.', 'warning');
    return;
  }

  // Reject case-insensitive duplicates
  const lowerTrimmed = trimmed.toLowerCase();
  const isDuplicate = state.habits.some(
    (h) => h.name.trim().toLowerCase() === lowerTrimmed
  );
  if (isDuplicate) {
    showToast('A habit with that name already exists.', 'warning');
    return;
  }

  // Build the new HabitRecord
  const newHabit = {
    id: generateId(),
    name: trimmed,
    streak: 0,
    completedDates: [],
    createdAt: Date.now(),
  };

  state.habits.push(newHabit);
  saveAll();
  renderHabits();

  // Clear the input field
  input.value = '';
}

/**
 * deleteHabit(id)
 * Removes the habit with the given id from state.habits, then saves and
 * re-renders.
 * @param {string} id
 */
function deleteHabit(id) {
  state.habits = state.habits.filter((h) => h.id !== id);
  saveAll();
  renderHabits();
}

/**
 * renderHabits()
 * Rebuilds the #habit-list innerHTML from state.habits. Each list item shows:
 *   - the habit name
 *   - the current streak count
 *   - a check-in button (disabled if today's date is already in completedDates)
 *   - a delete button
 * Items already checked in today receive the class "checked".
 * All user-supplied text is escaped via escapeHtml().
 */
function renderHabits() {
  const list = $('#habit-list');
  if (!list) return;

  if (state.habits.length === 0) {
    list.innerHTML = '<li class="habit-empty">No habits yet. Add one above!</li>';
    return;
  }

  const today = getTodayDateString();

  list.innerHTML = state.habits
    .map((habit) => {
      const checkedToday = habit.completedDates.includes(today);
      const itemClass = checkedToday ? 'habit-item checked' : 'habit-item';
      const btnDisabled = checkedToday ? 'disabled' : '';
      const btnTitle = checkedToday ? 'Already checked in today' : 'Mark as done today';

      return `
        <li class="${itemClass}" data-habit-id="${escapeHtml(habit.id)}">
          <span class="habit-name">${escapeHtml(habit.name)}</span>
          <span class="habit-streak" aria-label="Streak: ${habit.streak} day${habit.streak !== 1 ? 's' : ''}">
            🔥 ${habit.streak}
          </span>
          <button
            class="habit-checkin-btn"
            onclick="checkInHabit('${escapeHtml(habit.id)}')"
            ${btnDisabled}
            title="${btnTitle}"
            aria-label="Check in habit: ${escapeHtml(habit.name)}"
          >✔</button>
          <button
            class="habit-delete-btn"
            onclick="deleteHabit('${escapeHtml(habit.id)}')"
            title="Delete habit"
            aria-label="Delete habit: ${escapeHtml(habit.name)}"
          >✕</button>
        </li>`.trim();
    })
    .join('\n');
}

// ─── Expense Tracker ──────────────────────────────────────────────────────────

const EXPENSE_CATEGORIES = [
  'Food',
  'Transport',
  'Shopping',
  'Bills',
  'Health',
  'Entertainment',
  'Other',
];

/**
 * addExpense()
 * Reads the expense form fields, validates each in order, and on success
 * pushes a new Transaction to state.expenses. Fires a toast warning for the
 * first invalid field found and returns early without mutating state.
 * On success calls saveAll() and renderExpenses(), then resets the form.
 *
 * Validation rules (Requirements 5.2, 5.3):
 *   amount   — must be finite, >= 0.01, <= 999 999 999.99
 *   category — must be a non-empty string (one of EXPENSE_CATEGORIES)
 *   date     — must satisfy '2000-01-01' <= date <= '2099-12-31'
 */
function addExpense() {
  const amountEl   = $('#expense-amount');
  const categoryEl = $('#expense-category');
  const dateEl     = $('#expense-date');
  const noteEl     = $('#expense-note');

  if (!amountEl || !categoryEl || !dateEl) return;

  // ── Amount validation ────────────────────────────────────────────────────
  const rawAmount = amountEl.value;
  const amount    = parseFloat(rawAmount);

  if (!isFinite(amount) || amount < 0.01 || amount > 999999999.99) {
    showToast('Invalid amount', 'warning');
    return;
  }

  // ── Category validation ──────────────────────────────────────────────────
  const category = categoryEl.value;
  if (!category || !category.trim()) {
    showToast('Please select a category', 'warning');
    return;
  }

  // ── Date validation ──────────────────────────────────────────────────────
  const date = dateEl.value; // 'YYYY-MM-DD' or ''
  if (!date || date < '2000-01-01' || date > '2099-12-31') {
    showToast('Invalid date', 'warning');
    return;
  }

  // ── Build the Transaction record ─────────────────────────────────────────
  const note = noteEl ? noteEl.value.trim() : '';

  const transaction = {
    id:        generateId(),
    amount:    parseFloat(amount),
    category:  category,
    date:      date,
    note:      note,
    createdAt: Date.now(),
  };

  state.expenses.push(transaction);
  saveAll();
  renderExpenses();

  // Reset form fields
  amountEl.value   = '';
  categoryEl.value = '';
  dateEl.value     = '';
  if (noteEl) noteEl.value = '';
}

/**
 * deleteExpense(id)
 * Removes the transaction with the given id from state.expenses, then calls
 * saveAll() and renderExpenses().
 * @param {string} id
 */
function deleteExpense(id) {
  state.expenses = state.expenses.filter((t) => t.id !== id);
  saveAll();
  renderExpenses();
}

/**
 * getFilteredExpenses()
 * Pure function. Returns a filtered and sorted copy of state.expenses.
 *
 * Filtering (logical AND — Requirements 6.1, 6.2, 6.3, 6.4):
 *   category filter — if state.expenseFilter.category !== 'All', keep only
 *                     transactions whose category matches exactly.
 *   month filter    — if state.expenseFilter.month !== 'All', keep only
 *                     transactions whose date starts with the YYYY-MM string.
 *
 * Sort order (Requirement 5.1):
 *   Primary  : date descending
 *   Secondary: createdAt descending (tie-breaker)
 *
 * @returns {Transaction[]}
 */
function getFilteredExpenses() {
  let result = state.expenses.slice(); // shallow copy — do not mutate state

  const { category, month } = state.expenseFilter;

  if (category && category !== 'All') {
    result = result.filter((t) => t.category === category);
  }

  if (month && month !== 'All') {
    result = result.filter((t) => t.date.startsWith(month));
  }

  // Sort: date desc, then createdAt desc as tie-breaker
  result.sort((a, b) => {
    if (b.date < a.date) return -1;
    if (b.date > a.date) return  1;
    return b.createdAt - a.createdAt;
  });

  return result;
}

/**
 * renderExpenses()
 * Rewrites #expense-list from the result of getFilteredExpenses() and updates
 * #expense-total to the sum of all visible transaction amounts.
 *
 * Each list item shows:
 *   - amount formatted to 2 dp, prefixed with '$'
 *   - category badge
 *   - date
 *   - note (if non-empty)
 *   - delete button
 *
 * Shows an empty-state message when the filtered list is empty.
 * All user-supplied text is escaped via escapeHtml().
 *
 * Requirements: 5.1, 5.4, 5.5, 6.1, 11.3, 11.4
 */
function renderExpenses() {
  const listEl  = $('#expense-list');
  const totalEl = $('#expense-total');

  if (!listEl) return;

  const filtered = getFilteredExpenses();

  // ── Total ────────────────────────────────────────────────────────────────
  const sum = filtered.reduce((acc, t) => acc + t.amount, 0);
  if (totalEl) {
    totalEl.textContent = `Rp ${Math.round(sum).toLocaleString('id-ID')}`;
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (filtered.length === 0) {
    listEl.innerHTML = '<li class="expense-empty">No expenses yet. Add one above!</li>';
    return;
  }

  // ── Render items ─────────────────────────────────────────────────────────
  listEl.innerHTML = filtered
    .map((t) => {
      const noteHtml = t.note
        ? `<span class="expense-note-text">${escapeHtml(t.note)}</span>`
        : '';

      return `
        <li class="expense-item" data-expense-id="${escapeHtml(t.id)}">
          <div class="expense-info">
            <span class="expense-amount">Rp ${Math.round(t.amount).toLocaleString('id-ID')}</span>
            <span class="expense-category-badge">${escapeHtml(t.category)}</span>
            <span class="expense-date">${escapeHtml(t.date)}</span>
            ${noteHtml}
          </div>
          <button
            class="expense-delete-btn"
            onclick="deleteExpense('${escapeHtml(t.id)}')"
            title="Delete expense"
            aria-label="Delete expense"
          >✕</button>
        </li>`.trim();
    })
    .join('\n');
}

// ─── Notes / Journal ─────────────────────────────────────────────────────────

/**
 * addNote()
 * Reads #note-title-input (optional, max 100 chars) and #note-body-input
 * (required, 1–5000 chars after trimming). Rejects empty/whitespace-only body
 * with a toast warning. On success unshifts a new NoteEntry into state.notes,
 * calls saveAll() and renderNotes(), then clears both inputs.
 * Requirements: 3.1, 3.2, 3.3, 3.6, 3.7, 11.3, 11.4
 */
function addNote() {
  const titleInput = $('#note-title-input');
  const bodyInput  = $('#note-body-input');
  if (!bodyInput) return;

  const trimmedTitle = titleInput ? titleInput.value.trim().slice(0, 100) : '';
  const trimmedBody  = bodyInput.value.trim();

  // Reject empty / whitespace-only body
  if (!trimmedBody) {
    showToast('Note body cannot be empty', 'warning');
    return;
  }

  // Enforce body max length (5000 chars)
  const body = trimmedBody.slice(0, 5000);

  /** @type {NoteEntry} */
  const entry = {
    id:        generateId(),
    title:     trimmedTitle,
    body:      body,
    createdAt: Date.now(),
  };

  state.notes.unshift(entry);
  saveAll();
  renderNotes();

  // Clear inputs
  if (titleInput) titleInput.value = '';
  bodyInput.value = '';
}

/**
 * deleteNote(id)
 * Removes the note with the given id from state.notes, then calls saveAll()
 * and renderNotes().
 * Requirements: 3.5
 * @param {string} id
 */
function deleteNote(id) {
  state.notes = state.notes.filter((n) => n.id !== id);
  saveAll();
  renderNotes();
}

/**
 * selectNote(id)
 * Finds the note with the given id and populates the detail pane:
 *   - #note-detail-title textContent ← entry.title (or '')
 *   - #note-detail-body  textContent ← entry.body
 * Then shows #note-detail by setting style.display = 'block'.
 * Requirements: 3.4
 * @param {string} id
 */
function selectNote(id) {
  const entry = state.notes.find((n) => n.id === id);
  if (!entry) return;

  const titleEl  = $('#note-detail-title');
  const bodyEl   = $('#note-detail-body');
  const detailEl = $('#note-detail');

  if (titleEl) titleEl.textContent = entry.title || '';
  if (bodyEl)  bodyEl.textContent  = entry.body;
  if (detailEl) detailEl.style.display = 'block';
}

/**
 * renderNotes(list?)
 * Renders state.notes (or a provided filtered list) sorted descending by
 * createdAt. Preview label:
 *   - title if non-empty after trim
 *   - else first 40 chars of body + "…" if body.length > 40
 * Each item has a "View" button (calls selectNote) and a delete button.
 * All user text is passed through escapeHtml(). Shows empty-state when empty.
 * Requirements: 3.1, 3.2, 3.6, 11.4
 * @param {NoteEntry[]} [list]
 */
function renderNotes(list) {
  const listEl = $('#note-list');
  if (!listEl) return;

  // Use provided list or full state sorted desc by createdAt
  const notes = (list !== undefined ? list : state.notes.slice()).sort(
    (a, b) => b.createdAt - a.createdAt
  );

  if (notes.length === 0) {
    listEl.innerHTML = '<li class="note-empty">No notes yet. Add one above!</li>';
    return;
  }

  listEl.innerHTML = notes.map((entry) => {
    // Compute preview label
    const trimmedTitle = entry.title ? entry.title.trim() : '';
    let preview;
    if (trimmedTitle) {
      preview = trimmedTitle;
    } else {
      preview = entry.body.length > 40
        ? entry.body.slice(0, 40) + '…'
        : entry.body;
    }

    return `
      <li class="note-item" data-note-id="${escapeHtml(entry.id)}">
        <span class="note-preview">${escapeHtml(preview)}</span>
        <span class="note-timestamp">${new Date(entry.createdAt).toLocaleString()}</span>
        <div class="note-actions">
          <button
            class="note-view-btn"
            onclick="selectNote('${escapeHtml(entry.id)}')"
            title="View note"
            aria-label="View note"
          >View</button>
          <button
            class="note-delete-btn"
            onclick="deleteNote('${escapeHtml(entry.id)}')"
            title="Delete note"
            aria-label="Delete note"
          >✕</button>
        </div>
      </li>`.trim();
  }).join('\n');
}

// ─── Countdown Timer ─────────────────────────────────────────────────────────

/** Set of countdown event IDs that have already fired a "reached" toast this session. */
const countdownNotified = new Set();

/**
 * addCountdown()
 * Reads #countdown-name-input (trims) and #countdown-datetime-input. Validates:
 *   - name non-empty (toast warning "Please enter an event name")
 *   - datetime strictly in the future (toast warning "Please select a future date and time")
 * On success pushes a CountdownEvent to state.countdowns, calls saveAll() and
 * renderCountdowns(), then clears both inputs.
 * Requirements: 7.1, 7.2, 7.3, 7.4, 11.3, 11.4
 */
function addCountdown() {
  const nameInput     = $('#countdown-name-input');
  const datetimeInput = $('#countdown-datetime-input');
  if (!nameInput || !datetimeInput) return;

  const name  = nameInput.value.trim();
  const value = datetimeInput.value; // 'YYYY-MM-DDTHH:MM' from datetime-local

  // Validate name
  if (!name) {
    showToast('Please enter an event name', 'warning');
    return;
  }

  // Validate datetime is strictly in the future
  if (!value || new Date(value) <= new Date()) {
    showToast('Please select a future date and time', 'warning');
    return;
  }

  /** @type {CountdownEvent} */
  const event = {
    id:        generateId(),
    name:      name,
    targetISO: new Date(value).toISOString(),
    createdAt: Date.now(),
  };

  state.countdowns.push(event);
  saveAll();
  renderCountdowns();

  // Clear inputs
  nameInput.value     = '';
  datetimeInput.value = '';
}

/**
 * deleteCountdown(id)
 * Removes the countdown with the given id from state.countdowns, removes it
 * from countdownNotified, then calls saveAll() and renderCountdowns().
 * Requirements: 7.5
 * @param {string} id
 */
function deleteCountdown(id) {
  state.countdowns = state.countdowns.filter((c) => c.id !== id);
  countdownNotified.delete(id);
  saveAll();
  renderCountdowns();
}

/**
 * renderCountdowns()
 * Rewrites #countdown-list. For each event renders:
 *   <li class="countdown-item">
 *     <span class="countdown-name">  (escaped)
 *     <span class="countdown-time" data-countdown-id="{id}">  (formatCountdown or '...' or reached label)
 *     delete button
 * Shows empty state when no events. All user text escaped.
 * Requirements: 7.1, 7.2, 8.4, 11.4
 */
function renderCountdowns() {
  const listEl = $('#countdown-list');
  if (!listEl) return;

  if (state.countdowns.length === 0) {
    listEl.innerHTML = '<li class="countdown-empty">No events yet. Add one above!</li>';
    return;
  }

  listEl.innerHTML = state.countdowns.map((ev) => {
    const remainingMs = new Date(ev.targetISO) - Date.now();
    let timeDisplay;
    if (remainingMs <= 0) {
      timeDisplay = '🎉 Event reached!';
    } else if (typeof formatCountdown === 'function') {
      timeDisplay = formatCountdown(remainingMs);
    } else {
      timeDisplay = '...';
    }

    return `
      <li class="countdown-item" data-countdown-id="${escapeHtml(ev.id)}">
        <span class="countdown-name">${escapeHtml(ev.name)}</span>
        <span class="countdown-time" data-countdown-id="${escapeHtml(ev.id)}">${escapeHtml(timeDisplay)}</span>
        <button
          class="countdown-delete-btn"
          onclick="deleteCountdown('${escapeHtml(ev.id)}')"
          title="Delete event"
          aria-label="Delete event: ${escapeHtml(ev.name)}"
        >✕</button>
      </li>`.trim();
  }).join('\n');
}

// ─── Music / Spotify Widget ───────────────────────────────────────────────────

/**
 * convertSpotifyUrl(url)
 * Extracts the type ('playlist' or 'track') and id from a Spotify URL and
 * returns the embed URL, or null if the URL does not match.
 * Regex: /open\.spotify\.com\/(playlist|track)\/([A-Za-z0-9]+)/
 * Embed: https://open.spotify.com/embed/{type}/{id}?utm_source=oembed
 * Requirements: 9.2
 * @param {string} url
 * @returns {string|null}
 */
function convertSpotifyUrl(url) {
  const match = url.match(/open\.spotify\.com\/(playlist|track)\/([A-Za-z0-9]+)/);
  if (!match) return null;
  const type = match[1];
  const id   = match[2];
  return `https://open.spotify.com/embed/${type}/${id}?utm_source=oembed`;
}

/**
 * submitMusicUrl()
 * Reads the active mode from #music-mode-spotify radio (checked = spotify).
 *
 * Spotify mode:
 *   - Reads #music-spotify-input
 *   - Calls convertSpotifyUrl(); rejects null with toast warning
 *     "Invalid Spotify playlist or track URL"
 *   - Sets state.music = { mode: 'spotify', url: embedUrl }, saves, renders
 *
 * Audio mode:
 *   - Reads #music-audio-input
 *   - Validates path ends with .mp3, .ogg, or .wav (case-insensitive)
 *   - Rejects non-matching with toast warning
 *     "Audio URL must end with .mp3, .ogg, or .wav"
 *   - Sets state.music = { mode: 'audio', url }, saves, renders
 *
 * Requirements: 9.1, 9.2, 9.3, 10.1, 10.2, 10.3, 11.3
 */
function submitMusicUrl() {
  const spotifyRadio = $('#music-mode-spotify');
  const isSpotify    = spotifyRadio && spotifyRadio.checked;

  if (isSpotify) {
    const input    = $('#music-spotify-input');
    const rawUrl   = input ? input.value.trim() : '';
    const embedUrl = convertSpotifyUrl(rawUrl);

    if (!embedUrl) {
      showToast('Invalid Spotify playlist or track URL', 'warning');
      return;
    }

    state.music = { mode: 'spotify', url: embedUrl };
    saveAll();
    renderMusicPlayer();
  } else {
    const input  = $('#music-audio-input');
    const rawUrl = input ? input.value.trim() : '';

    if (!(/\.(mp3|ogg|wav)$/i.test(rawUrl))) {
      showToast('Audio URL must end with .mp3, .ogg, or .wav', 'warning');
      return;
    }

    state.music = { mode: 'audio', url: rawUrl };
    saveAll();
    renderMusicPlayer();
  }
}

/**
 * removeMusicEmbed()
 * Clears state.music, saves, and re-renders the music player (which will show
 * the input UI again).
 * Requirements: 9.6
 */
function removeMusicEmbed() {
  state.music = { mode: null, url: null };
  saveAll();
  renderMusicPlayer();
}

// ─── Habit Tracker (continued) ────────────────────────────────────────────────

/**
 * lastCheckedDate
 * Module-level variable used by checkHabitDayRollover() to detect when the
 * local calendar day has changed.
 */
let lastCheckedDate = getTodayDateString();

/**
 * checkInHabit(id)
 * Marks a habit as complete for today.
 *   1. Gets today's YYYY-MM-DD date string.
 *   2. If today's date is already in habit.completedDates, returns early (idempotent).
 *   3. Otherwise pushes today's date string into completedDates.
 *   4. Recalculates streak by walking backward from today: start at 1, for each
 *      prior day check if its YYYY-MM-DD string is in completedDates — stop at
 *      the first missing day.
 *   5. Calls saveAll() and renderHabits().
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 * @param {string} id
 */
function checkInHabit(id) {
  const today = getTodayDateString();
  const habit = state.habits.find((h) => h.id === id);
  if (!habit) return;

  // Idempotent — already checked in today
  if (habit.completedDates.includes(today)) return;

  // Record today
  habit.completedDates.push(today);

  // Recalculate streak by walking backward from today
  let streak = 0;
  const dateSet = new Set(habit.completedDates);
  const cursor = new Date();
  // Start counting from today (day 0 offset)
  while (true) {
    const y = cursor.getFullYear();
    const mo = String(cursor.getMonth() + 1).padStart(2, '0');
    const d = String(cursor.getDate()).padStart(2, '0');
    const dateStr = `${y}-${mo}-${d}`;
    if (!dateSet.has(dateStr)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  habit.streak = streak;

  saveAll();
  renderHabits();
}

/**
 * checkHabitDayRollover()
 * Called on every clock tick (1-second interval). Detects when the local
 * calendar day changes and resets streaks for habits that were not checked in
 * yesterday.
 *
 * Logic:
 *   - Get today's date string; if equal to lastCheckedDate, return immediately.
 *   - On day change: update lastCheckedDate = today.
 *   - For each habit:
 *       - If today is already in completedDates, skip (already checked in).
 *       - Otherwise compute yesterday's date string.
 *         If the last entry of completedDates is NOT yesterday (or completedDates
 *         is empty), reset streak to 0.
 *   - Call saveAll() and renderHabits() only if at least one habit changed.
 * Requirements: 2.3, 2.4, 2.5
 */
function checkHabitDayRollover() {
  const today = getTodayDateString();
  if (today === lastCheckedDate) return; // no day change

  lastCheckedDate = today;

  // Compute yesterday's date string
  const yesterdayCursor = new Date();
  yesterdayCursor.setDate(yesterdayCursor.getDate() - 1);
  const yy = yesterdayCursor.getFullYear();
  const ym = String(yesterdayCursor.getMonth() + 1).padStart(2, '0');
  const yd = String(yesterdayCursor.getDate()).padStart(2, '0');
  const yesterday = `${yy}-${ym}-${yd}`;

  let changed = false;

  for (const habit of state.habits) {
    // Skip if already checked in today
    if (habit.completedDates.includes(today)) continue;

    // Check if last completedDate was yesterday
    const lastDate = habit.completedDates[habit.completedDates.length - 1];
    if (lastDate !== yesterday) {
      habit.streak = 0;
      changed = true;
    }
  }

  if (changed) {
    saveAll();
    renderHabits();
  }
}

// ─── Notes / Journal (continued) ─────────────────────────────────────────────

/**
 * getFilteredNotes(query)
 * Pure function — does NOT mutate state.
 *   - If query is '' (empty string): returns state.notes sorted descending by
 *     createdAt (full list).
 *   - Otherwise: filters state.notes where entry.title.toLowerCase().includes(q)
 *     OR entry.body.toLowerCase().includes(q), case-insensitive, q = query.toLowerCase().
 *   - Returns the result sorted descending by createdAt.
 * Requirements: 4.1, 4.2, 4.3
 * @param {string} query
 * @returns {NoteEntry[]}
 */
function getFilteredNotes(query) {
  const sortDesc = (a, b) => b.createdAt - a.createdAt;

  if (query === '') {
    return state.notes.slice().sort(sortDesc);
  }

  const q = query.toLowerCase();
  return state.notes
    .filter(
      (entry) =>
        entry.title.toLowerCase().includes(q) ||
        entry.body.toLowerCase().includes(q)
    )
    .sort(sortDesc);
}

/**
 * searchNotes()
 * Reads the value from #note-search-input, calls getFilteredNotes(value), and
 * passes the result to renderNotes(filteredList).
 * Requirements: 4.1, 4.2, 4.3
 */
function searchNotes() {
  const searchInput = $('#note-search-input');
  const value = searchInput ? searchInput.value : '';
  const filteredList = getFilteredNotes(value);
  renderNotes(filteredList);
}

// ─── Expense Tracker (continued) ─────────────────────────────────────────────

/**
 * setExpenseCategoryFilter(val)
 * Sets state.expenseFilter.category to val and calls renderExpenses().
 * Requirements: 6.2
 * @param {string} val
 */
function setExpenseCategoryFilter(val) {
  state.expenseFilter.category = val;
  renderExpenses();
}

/**
 * setExpenseMonthFilter(val)
 * Sets state.expenseFilter.month to val and calls renderExpenses().
 * Requirements: 6.3
 * @param {string} val
 */
function setExpenseMonthFilter(val) {
  state.expenseFilter.month = val;
  renderExpenses();
}

/**
 * clearExpenseFilters()
 * Resets both filters to their default "All" / empty state, resets the
 * corresponding DOM inputs, and calls renderExpenses().
 * Requirements: 6.4, 6.5
 */
function clearExpenseFilters() {
  state.expenseFilter = { category: 'All', month: 'All' };

  const catEl = $('#expense-filter-category');
  if (catEl) catEl.value = 'All';

  const monthEl = $('#expense-filter-month');
  if (monthEl) monthEl.value = '';

  renderExpenses();
}

// ─── Countdown Timer (continued) ─────────────────────────────────────────────

/**
 * formatCountdown(ms)
 * Converts a millisecond duration into a human-readable countdown string,
 * omitting leading-zero segments (days/hours/minutes only shown when non-zero
 * unless it is the smallest segment).
 *
 * For ms <= 0: returns '🎉 Event reached!'
 *
 * Segment logic:
 *   days    = Math.floor(ms / 86400000)
 *   hours   = Math.floor((ms % 86400000) / 3600000)
 *   minutes = Math.floor((ms % 3600000) / 60000)
 *   seconds = Math.floor((ms % 60000) / 1000)
 *
 * Build segments array:
 *   if days > 0                             push `${days}d`
 *   if days > 0 || hours > 0               push `${hours}h`
 *   if days > 0 || hours > 0 || minutes > 0 push `${minutes}m`
 *   always                                  push `${seconds}s`
 *
 * Requirements: 8.1, 8.2
 * @param {number} ms
 * @returns {string}
 */
function formatCountdown(ms) {
  if (ms <= 0) return '🎉 Event reached!';

  const days    = Math.floor(ms / 86400000);
  const hours   = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);

  const segments = [];
  if (days > 0)                             segments.push(`${days}d`);
  if (days > 0 || hours > 0)               segments.push(`${hours}h`);
  if (days > 0 || hours > 0 || minutes > 0) segments.push(`${minutes}m`);
  segments.push(`${seconds}s`);

  return segments.join(' ');
}

/**
 * tickCountdowns()
 * Called on every 1-second interval tick. Updates each countdown's display
 * span in-place without rebuilding the entire list.
 *
 * For each event in state.countdowns:
 *   - Computes remainingMs = new Date(event.targetISO) - Date.now()
 *   - Finds the .countdown-time span via [data-countdown-id="…"] selector
 *   - If element not found, skips
 *   - If remainingMs <= 0:
 *       sets element.textContent = '🎉 Event reached!'
 *       if event.id NOT in countdownNotified: calls showToast and adds to set
 *   - If remainingMs > 0:
 *       sets element.textContent = formatCountdown(remainingMs)
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */
function tickCountdowns() {
  for (const event of state.countdowns) {
    const remainingMs = new Date(event.targetISO) - Date.now();

    // Target the .countdown-time span specifically (not the li)
    const el = document.querySelector(`.countdown-time[data-countdown-id="${event.id}"]`);
    if (!el) continue;

    if (remainingMs <= 0) {
      el.textContent = '🎉 Event reached!';
      if (!countdownNotified.has(event.id)) {
        showToast(`🎉 ${event.name} reached!`, 'info');
        countdownNotified.add(event.id);
      }
    } else {
      el.textContent = formatCountdown(remainingMs);
    }
  }
}

// ─── Music / Spotify Widget (continued) ──────────────────────────────────────

/**
 * setMusicMode(mode)
 * Toggles the visible input row and checks the correct radio button.
 *   'spotify' → show #music-spotify-row, hide #music-audio-row, check #music-mode-spotify
 *   'audio'   → hide #music-spotify-row, show #music-audio-row, check #music-mode-audio
 * Requirements: 10.1
 * @param {'spotify'|'audio'} mode
 */
function setMusicMode(mode) {
  const spotifyRow = $('#music-spotify-row');
  const audioRow   = $('#music-audio-row');
  const spotifyRadio = $('#music-mode-spotify');
  const audioRadio   = $('#music-mode-audio');

  if (mode === 'spotify') {
    if (spotifyRow) spotifyRow.style.display = '';
    if (audioRow)   audioRow.style.display   = 'none';
    if (spotifyRadio) spotifyRadio.checked = true;
  } else if (mode === 'audio') {
    if (spotifyRow) spotifyRow.style.display = 'none';
    if (audioRow)   audioRow.style.display   = '';
    if (audioRadio) audioRadio.checked = true;
  }
}

/**
 * renderMusicPlayer()
 * Builds the music player UI inside #music-player-container based on
 * state.music.
 *
 * When state.music.url is null:
 *   - Shows the input UI rows, hides #music-remove-btn.
 *
 * When state.music.mode === 'spotify':
 *   - Creates an <iframe> with the embed src, correct height (152 for /track/,
 *     else 352), frameborder='0', allow attribute, loading='lazy', width='100%',
 *     border-radius via inline style; appends to container.
 *   - Shows #music-remove-btn.
 *
 * When state.music.mode === 'audio':
 *   - Creates an <audio controls> with src=state.music.url, style.width='100%'.
 *   - Adds 'error' event listener that fires a toast, clears state, saves, re-renders.
 *   - Appends to container; shows #music-remove-btn.
 *
 * Requirements: 9.4, 9.5, 9.6, 10.2, 10.4, 10.5, 11.4
 */
function renderMusicPlayer() {
  const container  = $('#music-player-container');
  const removeBtn  = $('#music-remove-btn');
  const spotifyRow = $('#music-spotify-row');
  const audioRow   = $('#music-audio-row');

  if (!container) return;

  // Clear existing player content
  container.innerHTML = '';

  if (!state.music.url) {
    // No embed active — show input UI, hide remove button
    if (removeBtn) removeBtn.style.display = 'none';
    // Restore the correct input row based on mode (or default to spotify)
    const mode = state.music.mode || 'spotify';
    setMusicMode(mode);
    return;
  }

  if (state.music.mode === 'spotify') {
    const iframe = document.createElement('iframe');
    const height = state.music.url.includes('/track/') ? 152 : 352;
    iframe.src    = state.music.url;
    iframe.height = height;
    iframe.width  = '100%';
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allow', 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture');
    iframe.setAttribute('loading', 'lazy');
    iframe.style.borderRadius = 'var(--radius-sm)';
    container.appendChild(iframe);
    if (removeBtn) removeBtn.style.display = '';
  } else if (state.music.mode === 'audio') {
    const audio = document.createElement('audio');
    audio.controls = true;
    audio.src = state.music.url;
    audio.style.width = '100%';
    audio.addEventListener('error', () => {
      showToast('Audio could not be loaded. Check the URL.', 'warning');
      state.music = { mode: null, url: null };
      saveAll();
      renderMusicPlayer();
    });
    container.appendChild(audio);
    if (removeBtn) removeBtn.style.display = '';
  }
}

/**
 * restoreMusic()
 * Called at page load (after loadAll()). If state.music.url is set, calls
 * renderMusicPlayer() to restore the persisted player. Also restores the
 * correct mode toggle.
 * Requirements: 9.5, 10.4
 */
function restoreMusic() {
  if (state.music.url) {
    renderMusicPlayer();
  }
  if (state.music.mode) {
    setMusicMode(state.music.mode);
  }
}
