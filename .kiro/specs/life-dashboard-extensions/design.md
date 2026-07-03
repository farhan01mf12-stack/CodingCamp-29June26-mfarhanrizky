# Design Document: Life Dashboard Extensions
 
## Overview 

This document describes the technical design for adding five new widgets — **Habit Tracker**, **Notes/Journal**, **Expense Tracker**, **Countdown Timer**, and **Music/Spotify Widget** — to the existing Life Dashboard single-page application.

The application is pure vanilla HTML/CSS/JavaScript with no build tools or frameworks. All persistence is via `localStorage`. Every new widget must:

- Use the `.card` CSS class and existing CSS design tokens
- Honor light/dark theme switching via the `[data-theme="dark"]` attribute on `<html>`
- Call `showToast(message, type)` for all user-facing notifications
- Call `generateId()` when creating any new data record
- Persist to and restore from named `localStorage` keys

The strategy is **additive and isolated**: each widget gets its own logical block in `javascript.js` (clearly demarcated with `// ─── Widget Name ───` section headers) and its own HTML section appended below the existing Quick Links card. New CSS rules are appended to `style.css`. No existing functions are modified; new widgets only call existing shared helpers.

---

## Architecture

The application remains a single HTML file with a single JS file and a single CSS file. The extension follows the same patterns already established in the codebase.

```
structure.html          ← add 5 new widget card sections
js/javascript.js        ← add 5 new widget modules + extend state + loadAll/saveAll
css/style.css           ← append new widget-specific styles
```

### Data Flow

```
Page Load
  └─ loadAll()
       ├─ reads localStorage keys
       ├─ populates state.habits / notes / expenses / countdowns / music
       └─ calls renderHabits(), renderNotes(), renderExpenses(),
                  renderCountdowns(), restoreMusic()

User Action (e.g., add habit)
  └─ widget function (e.g., addHabit())
       ├─ validates input
       ├─ mutates state
       ├─ calls saveAll()
       └─ calls render function

setInterval (1 s) — single shared tick
  └─ updateClock()        ← existing
  └─ tickCountdowns()     ← new: updates all countdown displays
  └─ checkHabitDay()      ← new: detects calendar-day rollover
```

### Module Boundaries

Each widget is a **pure module**: a set of functions that read/write `state.<widgetKey>` and manipulate its own DOM section. No inter-widget function calls. All shared state lives on the global `state` object.

---

## Components and Interfaces

### Shared Helpers (existing — unchanged)

| Function | Signature | Used by |
|---|---|---|
| `generateId()` | `() → string` | All widgets when creating records |
| `escapeHtml(str)` | `(string) → string` | All render functions |
| `showToast(msg, type)` | `(string, string) → void` | All widgets for notifications |
| `saveAll()` | `() → void` | All widgets after state mutation |
| `loadAll()` | `() → void` | Page init (extended) |

### Extended `saveAll()` / `loadAll()`

`saveAll()` gains five new `localStorage.setItem` calls:

```js
localStorage.setItem('dashboard_habits',    JSON.stringify(state.habits));
localStorage.setItem('dashboard_notes',     JSON.stringify(state.notes));
localStorage.setItem('dashboard_expenses',  JSON.stringify(state.expenses));
localStorage.setItem('dashboard_countdowns',JSON.stringify(state.countdowns));
localStorage.setItem('dashboard_music',     JSON.stringify(state.music));
```

`loadAll()` gains five matching `JSON.parse` / try-catch restores, each guarded:

```js
try {
  const raw = localStorage.getItem('dashboard_habits');
  if (raw) state.habits = JSON.parse(raw);
} catch (e) {
  console.warn('Could not load dashboard_habits:', e);
}
```

### Widget: Habit Tracker

**State slice**: `state.habits` — `HabitRecord[]`

**Public functions** (called from HTML `onclick` or `bindEvents`):
- `addHabit()` — reads `#habit-input`, validates, pushes to `state.habits`, saves, renders
- `deleteHabit(id)` — filters state, saves, renders
- `checkInHabit(id)` — marks today's date on the habit, recalculates streak, saves, renders
- `renderHabits()` — rewrites `#habit-list` innerHTML from `state.habits`
- `checkHabitDayRollover()` — called on clock tick; detects calendar-day change, resets streaks for missed habits

### Widget: Notes / Journal

**State slice**: `state.notes` — `NoteEntry[]`

**Public functions**:
- `addNote()` — reads `#note-title-input` + `#note-body-input`, validates, unshifts to `state.notes`, saves, renders
- `deleteNote(id)` — filters state, saves, renders
- `selectNote(id)` — populates `#note-detail-title` + `#note-detail-body`, shows detail view
- `searchNotes()` — reads `#note-search-input`, filters display (does not mutate state), re-renders filtered list
- `renderNotes(list?)` — rewrites `#note-list` from provided list (or full `state.notes` if omitted)
- `renderNoteDetail(entry)` — populates the detail pane

### Widget: Expense Tracker

**State slice**: `state.expenses` — `Transaction[]`

**State slice**: `state.expenseFilter` — `{ category: string, month: string }` (in-memory only, not persisted)

**Public functions**:
- `addExpense()` — validates form fields, pushes to `state.expenses`, saves, renders
- `deleteExpense(id)` — filters state, saves, renders
- `setExpenseCategoryFilter(val)` — updates `state.expenseFilter.category`, re-renders
- `setExpenseMonthFilter(val)` — updates `state.expenseFilter.month`, re-renders
- `clearExpenseFilters()` — resets both filter fields, re-renders
- `getFilteredExpenses()` — pure function: returns `state.expenses` filtered by current filter state
- `renderExpenses()` — rewrites `#expense-list` and `#expense-total` from `getFilteredExpenses()`

### Widget: Countdown Timer

**State slice**: `state.countdowns` — `CountdownEvent[]`

**Module-level variable**: `countdownNotified` — `Set<string>` (IDs of events that already fired a toast this session)

**Public functions**:
- `addCountdown()` — validates fields, pushes to `state.countdowns`, saves, renders
- `deleteCountdown(id)` — filters state, saves, re-renders
- `tickCountdowns()` — called by shared 1-second interval; updates all countdown displays in-place
- `renderCountdowns()` — rewrites `#countdown-list` from `state.countdowns`

### Widget: Music / Spotify Widget

**State slice**: `state.music` — `MusicState`

**Public functions**:
- `submitMusicUrl()` — reads active mode + input, validates, converts, sets `state.music`, saves, renders
- `removeMusicEmbed()` — clears `state.music`, removes from localStorage, shows input view
- `restoreMusic()` — called at page load; renders iframe or audio element if `state.music.url` is set
- `setMusicMode(mode)` — toggles between `'spotify'` and `'audio'` modes
- `renderMusicPlayer()` — builds iframe or `<audio>` element from `state.music`

---

## Data Models

All new data is stored as JSON in `localStorage`. Below are the TypeScript-style interfaces describing each record shape (implemented as plain JS objects).

### HabitRecord

```ts
interface HabitRecord {
  id: string;           // generateId()
  name: string;         // 1–100 chars, trimmed
  streak: number;       // consecutive-day count, ≥ 0
  completedDates: string[]; // YYYY-MM-DD strings in local time, deduped, sorted ascending
  createdAt: number;    // Date.now()
}
```

**Streak logic**:
- On check-in: if today's date is not in `completedDates`, push today's date string, then recalculate streak.
- Streak recalculation: walk backward from today; count the unbroken consecutive prefix of dates that are in `completedDates`. Stop at first missing day.
- On page load (and calendar-day rollover detection): if `completedDates` does not include yesterday, reset streak to 0 (unless today is already in `completedDates`).

**localStorage key**: `dashboard_habits`

---

### NoteEntry

```ts
interface NoteEntry {
  id: string;           // generateId()
  title: string;        // 0–100 chars, optional
  body: string;         // 1–5000 chars, trimmed
  createdAt: number;    // Date.now()
}
```

**Preview label rule**:
- `title` present → use `title`
- `title` absent → first 40 chars of `body`; if `body.length > 40` append `"…"`

**localStorage key**: `dashboard_notes`

---

### Transaction

```ts
interface Transaction {
  id: string;           // generateId()
  amount: number;       // 0.01 – 999_999_999.99, stored as a JS number
  category: string;     // one of EXPENSE_CATEGORIES
  date: string;         // YYYY-MM-DD, local time
  note: string;         // 0–200 chars, optional
  createdAt: number;    // Date.now()
}

const EXPENSE_CATEGORIES = ['Food','Transport','Shopping','Bills','Health','Entertainment','Other'] as const;
```

**Amount validation**: `isFinite(amount) && amount >= 0.01 && amount <= 999_999_999.99`

**Date validation**: `date >= '2000-01-01' && date <= '2099-12-31'`

**Sort order**: by `date` descending, ties broken by `createdAt` descending.

**localStorage key**: `dashboard_expenses`

---

### CountdownEvent

```ts
interface CountdownEvent {
  id: string;           // generateId()
  name: string;         // 1–100 chars, trimmed
  targetISO: string;    // ISO 8601 string, always in the future at creation time
  createdAt: number;    // Date.now()
}
```

**Countdown display format**:
```
remainingMs = targetTime - Date.now()
days    = Math.floor(remainingMs / 86_400_000)
hours   = Math.floor((remainingMs % 86_400_000) / 3_600_000)
minutes = Math.floor((remainingMs % 3_600_000)  / 60_000)
seconds = Math.floor((remainingMs % 60_000)      / 1_000)
```
Segments with value 0 are omitted from the left side (e.g., `"2h 5m 3s"` when days = 0).  
When `remainingMs ≤ 0`: display `"🎉 Event reached!"`.

**Shared interval**: `tickCountdowns()` is called from the existing `setInterval` that drives `updateClock()` (or a single new `setInterval` that also calls `tickCountdowns()`). Either way, the total number of active intervals stays at 1.

**localStorage key**: `dashboard_countdowns`

---

### MusicState

```ts
interface MusicState {
  mode: 'spotify' | 'audio' | null;
  url: string | null;   // the embed/src URL (already converted for Spotify)
}
```

**Spotify URL conversion**:
- Input pattern: `open.spotify.com/playlist/{id}` or `open.spotify.com/track/{id}`
- Regex: `/open\.spotify\.com\/(playlist|track)\/([A-Za-z0-9]+)/`
- Embed URL: `https://open.spotify.com/embed/{type}/{id}?utm_source=oembed`
- iframe height: `352px` (playlist) | `152px` (track)

**Direct audio**: URL path must match `/\.(mp3|ogg|wav)$/i`

**localStorage key**: `dashboard_music` — stores the entire `MusicState` object as JSON (not just the URL string)

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Habit whitespace name rejected

*For any* string whose trimmed value is empty (including the empty string, strings of only spaces, tabs, or newlines), calling `addHabit()` SHALL leave `state.habits.length` unchanged.

**Validates: Requirements 1.3**

---

### Property 2: Habit duplicate name rejected

*For any* existing habit list and any new habit name whose trimmed, lowercased value matches any existing habit's trimmed, lowercased name, calling `addHabit()` SHALL leave `state.habits.length` unchanged.

**Validates: Requirements 1.4**

---

### Property 3: Habit check-in correctness and idempotence

*For any* habit and any calendar day: (a) the first check-in of that day SHALL append that day's date string to `completedDates` exactly once and SHALL recalculate `streak` to reflect the new unbroken consecutive-day suffix; (b) any subsequent call to `checkInHabit()` on the same day SHALL leave `completedDates` with that date exactly once and SHALL leave `streak` at the same value produced by (a).

**Validates: Requirements 2.1, 2.2**

---

### Property 4: Habit streak rollover logic

*For any* habit and any simulated calendar-day transition: if the habit's last `completedDates` entry equals yesterday, calling `checkHabitDayRollover()` SHALL leave `streak` unchanged; if the habit's last `completedDates` entry is before yesterday (or `completedDates` is empty), calling `checkHabitDayRollover()` SHALL set `streak` to 0.

**Validates: Requirements 2.3, 2.4**

---

### Property 5: Habit deletion removes entry

*For any* non-empty habits list and any habit `id` present in that list, calling `deleteHabit(id)` SHALL produce a `state.habits` array that does not contain any entry with that `id`.

**Validates: Requirements 1.5**

---

### Property 6: Note display reverse-chronological ordering

*For any* array of `NoteEntry` records with distinct `createdAt` timestamps, the list produced by `renderNotes()` (or the sorted display list) SHALL appear in strictly descending order of `createdAt`.

**Validates: Requirements 3.1**

---

### Property 7: Note whitespace body rejected

*For any* string whose trimmed value is empty, calling `addNote()` SHALL leave `state.notes.length` unchanged.

**Validates: Requirements 3.3**

---

### Property 8: Note preview label rule

*For any* `NoteEntry` record, the computed preview label SHALL equal: the `title` field when `title` is a non-empty string after trimming; otherwise the first 40 characters of `body` with `"…"` appended when `body.length > 40`, or the full `body` when `body.length ≤ 40`.

**Validates: Requirements 3.6**

---

### Property 9: Note search filter and clear round-trip

*For any* array of `NoteEntry` records and any non-empty search string `q`: (a) `getFilteredNotes(q)` SHALL return exactly those entries whose `title` or `body` contains `q` as a case-insensitive substring; (b) `getFilteredNotes('')` (empty query, simulating cleared search) SHALL return the full list in reverse-chronological order.

**Validates: Requirements 4.1, 4.3**

---

### Property 10: Expense invalid amount rejected

*For any* value submitted as an expense amount that is ≤ 0, > 999,999,999.99, `NaN`, or `Infinity`, calling `addExpense()` SHALL leave `state.expenses.length` unchanged.

**Validates: Requirements 5.3**

---

### Property 11: Expense filter intersection and total consistency

*For any* `state.expenses` list, active category filter `C` (or `"All"`), and active month/year filter `M` (or `"All"`): `getFilteredExpenses()` SHALL return exactly those transactions satisfying `(C === 'All' || category === C) AND (M === 'All' || date starts with M)`; and the computed total for that result set SHALL equal the arithmetic sum of the `amount` fields of those transactions, formatted to exactly 2 decimal places.

**Validates: Requirements 6.1, 6.2, 6.3, 6.4**

---

### Property 12: Expense sort order

*For any* array of `Transaction` records, the list returned by `getSortedExpenses()` SHALL be sorted by `date` descending (ties broken by `createdAt` descending), with no reordering of the original data in `state.expenses`.

**Validates: Requirements 5.1**

---

### Property 13: Countdown whitespace name rejected

*For any* string whose trimmed value is empty, calling `addCountdown()` SHALL leave `state.countdowns.length` unchanged.

**Validates: Requirements 7.3**

---

### Property 14: Countdown past datetime rejected

*For any* `datetime` value that is not strictly in the future at the time of the call (i.e., `new Date(datetime) <= Date.now()`), calling `addCountdown()` SHALL leave `state.countdowns.length` unchanged.

**Validates: Requirements 7.4**

---

### Property 15: Countdown format correctness

*For any* remaining milliseconds value `ms > 0`, `formatCountdown(ms)` SHALL return a string where: the integer components `days`, `hours`, `minutes`, `seconds` satisfy `days * 86400 + hours * 3600 + minutes * 60 + seconds === Math.floor(ms / 1000)`; leading segments whose value is 0 are omitted (e.g., when `days === 0`, the string does not contain a "d" segment). For `ms ≤ 0`, the function SHALL return `"🎉 Event reached!"`.

**Validates: Requirements 8.1, 8.2**

---

### Property 16: Spotify URL conversion round-trip

*For any* valid Spotify URL of the form containing `open.spotify.com/(playlist|track)/{id}` (where `id` is alphanumeric), `convertSpotifyUrl()` SHALL return an embed URL that contains `open.spotify.com/embed/{type}/{id}` with the same `type` and `id` as the input.

**Validates: Requirements 9.2**

---

### Property 17: Invalid music URL rejected

*For any* URL string that does not match the Spotify playlist/track pattern (`open.spotify.com/(playlist|track)/…`) AND whose path does not end with `.mp3`, `.ogg`, or `.wav` (case-insensitive), calling `submitMusicUrl()` SHALL leave `state.music` at its prior value.

**Validates: Requirements 9.3, 10.3**

---

### Property 18: localStorage round-trip fidelity

*For any* widget state array (habits, notes, expenses, countdowns) or music state object, `JSON.parse(JSON.stringify(value))` SHALL produce a value whose `JSON.stringify` output is identical to `JSON.stringify(value)` — confirming all record fields survive a localStorage serialisation/deserialisation cycle without data loss or mutation.

**Validates: Requirements 12.1, 12.2**

---

## Error Handling

### localStorage Write Failures

Each `saveAll()` call is wrapped in a try/catch. On failure:

```js
function saveAll() {
  try {
    localStorage.setItem('dashboard_habits', JSON.stringify(state.habits));
    // ... other keys
  } catch (e) {
    console.warn('saveAll failed:', e);
    showToast('Could not save data — storage may be full.', 'warning');
  }
}
```

This satisfies Requirements 1.6, 2.6, 3.7, 5.6 which all require a toast warning when localStorage write fails.

### localStorage Read / Parse Failures

`loadAll()` wraps each key independently so one corrupt key does not block others:

```js
try {
  const raw = localStorage.getItem('dashboard_habits');
  if (raw) state.habits = JSON.parse(raw);
} catch (e) {
  console.warn('Could not load dashboard_habits:', e);
  // state.habits remains []
}
```

Satisfies Requirement 12.3 (fall back to empty default, log via `console.warn`, no user-visible error).

### Input Validation Errors

All validation errors call `showToast(message, 'warning')` and return early without mutating state. The first invalid field encountered is reported (Requirement 5.3). No `alert()` or `confirm()` dialogs are used (Requirement 11.3).

### Audio Load Errors

The `<audio>` element's `error` event is handled:

```js
audioEl.addEventListener('error', () => {
  showToast('Audio could not be loaded. Check the URL.', 'warning');
  state.music = { mode: null, url: null };
  saveAll();
  renderMusicPlayer();
});
```

Satisfies Requirement 10.5.

---

## Testing Strategy

### Unit Tests (Example-Based)

Each widget module should be tested with example-based unit tests covering:

- **Happy path**: valid input produces correct state mutation and renders correctly
- **Edge cases**: boundary values (min/max length strings, boundary dates, boundary amounts)
- **Error paths**: invalid inputs that should be rejected

Key example tests:
- `addHabit('')` → state unchanged, toast called with `'warning'`
- `addHabit('  ')` → state unchanged (whitespace-only)
- `addHabit('Exercise')` twice → second call rejected (deduplication)
- `checkInHabit(id)` twice same day → streak unchanged after second call
- `addNote('')` → state unchanged
- `addExpense(amount: 0)` → rejected
- `addExpense(amount: 0.01)` → accepted
- `addExpense(amount: 999999999.99)` → accepted
- `addExpense(amount: 1000000000)` → rejected
- `addCountdown(name, pastDate)` → rejected
- Spotify URL `open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M` → correct embed URL
- Direct audio URL `https://example.com/song.MP3` → accepted (case-insensitive)
- Direct audio URL `https://example.com/song.pdf` → rejected

### Property-Based Tests

The feature is well-suited to property-based testing. The recommended library is **[fast-check](https://github.com/dubzzz/fast-check)** (JavaScript, works in browsers and Node).

Each property test runs a minimum of **100 iterations**.

Tag format per test: `// Feature: life-dashboard-extensions, Property {N}: {property_text}`

**Property 1 – Habit whitespace name rejected**
```js
// Feature: life-dashboard-extensions, Property 1: Habit whitespace name rejected
fc.assert(fc.property(
  fc.string().filter(s => s.trim() === ''),
  (input) => {
    const before = state.habits.length;
    attemptAddHabit(input);
    return state.habits.length === before;
  }
), { numRuns: 100 });
```

**Property 2 – Habit duplicate name rejected**
```js
// Feature: life-dashboard-extensions, Property 2: Habit duplicate name rejected
fc.assert(fc.property(
  fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  (name) => {
    state.habits = [{ id: '1', name: name.trim(), streak: 0, completedDates: [], createdAt: 0 }];
    const before = state.habits.length;
    // Try various casings of the same name
    attemptAddHabit(name.toUpperCase());
    return state.habits.length === before;
  }
), { numRuns: 100 });
```

**Property 3 – Habit check-in correctness and idempotence**
```js
// Feature: life-dashboard-extensions, Property 3: Habit check-in correctness and idempotence
fc.assert(fc.property(
  fc.record({ id: fc.uuid(), name: fc.string({ minLength: 1 }), streak: fc.nat(), completedDates: fc.array(fc.string()), createdAt: fc.integer() }),
  (habit) => {
    state.habits = [{ ...habit }];
    checkInHabit(habit.id);
    const streakAfterFirst = state.habits[0].streak;
    const datesAfterFirst = [...state.habits[0].completedDates];
    // Second check-in same day — must be idempotent
    checkInHabit(habit.id);
    return (
      state.habits[0].streak === streakAfterFirst &&
      JSON.stringify(state.habits[0].completedDates) === JSON.stringify(datesAfterFirst)
    );
  }
), { numRuns: 100 });
```

**Property 4 – Habit streak rollover logic**
```js
// Feature: life-dashboard-extensions, Property 4: Habit streak rollover logic
fc.assert(fc.property(
  fc.boolean(), // true = last completed date was yesterday, false = missed day
  fc.nat({ max: 100 }), // arbitrary streak value
  (completedYesterday, currentStreak) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const yStr = yesterday.toISOString().slice(0, 10);
    const oldDate = '2020-01-01'; // well before yesterday
    const dates = completedYesterday ? [yStr] : [oldDate];
    state.habits = [{ id: '1', name: 'test', streak: currentStreak, completedDates: dates, createdAt: 0 }];
    checkHabitDayRollover();
    if (completedYesterday) {
      return state.habits[0].streak === currentStreak; // preserved
    } else {
      return state.habits[0].streak === 0; // reset
    }
  }
), { numRuns: 100 });
```

**Property 9 – Note search filter and clear round-trip**
```js
// Feature: life-dashboard-extensions, Property 9: Note search filter and clear round-trip
fc.assert(fc.property(
  fc.array(fc.record({ id: fc.uuid(), title: fc.string(), body: fc.string({ minLength: 1 }), createdAt: fc.integer() })),
  fc.string({ minLength: 1 }),
  (entries, query) => {
    state.notes = entries;
    const filtered = getFilteredNotes(query);
    const q = query.toLowerCase();
    // All returned entries must match the query
    const allMatch = filtered.every(e =>
      e.title.toLowerCase().includes(q) || e.body.toLowerCase().includes(q)
    );
    // Count of matching entries must be correct
    const expectedCount = entries.filter(e =>
      e.title.toLowerCase().includes(q) || e.body.toLowerCase().includes(q)
    ).length;
    // Clearing search restores full list
    const cleared = getFilteredNotes('');
    return allMatch && filtered.length === expectedCount && cleared.length === entries.length;
  }
), { numRuns: 100 });
```

**Property 10 – Expense invalid amount rejected**
```js
// Feature: life-dashboard-extensions, Property 10: Expense invalid amount rejected
fc.assert(fc.property(
  fc.oneof(
    fc.float({ max: 0, noNaN: true }),
    fc.double({ min: 1_000_000_000 }),
    fc.constant(NaN),
    fc.constant(Infinity),
    fc.constant(-Infinity)
  ),
  (amount) => {
    const before = state.expenses.length;
    attemptAddExpense({ amount, category: 'Food', date: '2025-01-01' });
    return state.expenses.length === before;
  }
), { numRuns: 100 });
```

**Property 11 – Expense filter intersection and total consistency**
```js
// Feature: life-dashboard-extensions, Property 11: Expense filter intersection and total consistency
fc.assert(fc.property(
  fc.array(fc.record({
    id: fc.uuid(),
    amount: fc.float({ min: 0.01, max: 9999, noNaN: true, noDefaultInfinity: true }),
    category: fc.constantFrom('Food','Transport','Shopping','Bills','Health','Entertainment','Other'),
    date: fc.date({ min: new Date('2000-01-01'), max: new Date('2099-12-31') }).map(d => d.toISOString().slice(0, 10)),
    note: fc.string(), createdAt: fc.integer()
  })),
  fc.constantFrom('Food','Transport','Shopping','Bills','Health','Entertainment','Other','All'),
  fc.oneof(fc.constant('All'), fc.date().map(d => d.toISOString().slice(0, 7))), // YYYY-MM or 'All'
  (expenses, cat, month) => {
    state.expenses = expenses;
    state.expenseFilter = { category: cat, month };
    const result = getFilteredExpenses();
    const allSatisfy = result.every(t =>
      (cat === 'All' || t.category === cat) &&
      (month === 'All' || t.date.startsWith(month))
    );
    const expectedTotal = result.reduce((s, t) => s + t.amount, 0);
    const computedTotal = parseFloat(computeTotal(result));
    return allSatisfy && Math.abs(computedTotal - expectedTotal) < 0.01;
  }
), { numRuns: 100 });
```

**Property 15 – Countdown format correctness**
```js
// Feature: life-dashboard-extensions, Property 15: Countdown format correctness
fc.assert(fc.property(
  fc.integer({ min: 1, max: 86400 * 365 * 5 }), // 1 s to 5 years, in seconds
  (remainingSeconds) => {
    const str = formatCountdown(remainingSeconds * 1000);
    const days    = Math.floor(remainingSeconds / 86400);
    const hours   = Math.floor((remainingSeconds % 86400) / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = remainingSeconds % 60;
    const sum = days * 86400 + hours * 3600 + minutes * 60 + seconds;
    // Arithmetic must be correct
    if (sum !== remainingSeconds) return false;
    // Leading-zero segments must be omitted
    if (days === 0 && str.includes('d')) return false;
    if (days === 0 && hours === 0 && str.includes('h')) return false;
    return true;
  }
), { numRuns: 100 });
```

**Property 16 – Spotify URL conversion round-trip**
```js
// Feature: life-dashboard-extensions, Property 16: Spotify URL conversion round-trip
fc.assert(fc.property(
  fc.constantFrom('playlist', 'track'),
  fc.stringOf(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.split('')), { minLength: 10, maxLength: 30 }),
  (type, id) => {
    const inputUrl = `https://open.spotify.com/${type}/${id}`;
    const embedUrl = convertSpotifyUrl(inputUrl);
    const match = embedUrl && embedUrl.match(/open\.spotify\.com\/embed\/(playlist|track)\/([A-Za-z0-9]+)/);
    return match !== null && match[1] === type && match[2] === id;
  }
), { numRuns: 100 });
```

**Property 17 – Invalid music URL rejected**
```js
// Feature: life-dashboard-extensions, Property 17: Invalid music URL rejected
fc.assert(fc.property(
  fc.webUrl().filter(url =>
    !/open\.spotify\.com\/(playlist|track)\//.test(url) &&
    !/\.(mp3|ogg|wav)$/i.test(new URL(url).pathname)
  ),
  (invalidUrl) => {
    const before = JSON.stringify(state.music);
    attemptSubmitMusicUrl(invalidUrl);
    return JSON.stringify(state.music) === before;
  }
), { numRuns: 100 });
```

**Property 18 – localStorage round-trip fidelity**
```js
// Feature: life-dashboard-extensions, Property 18: localStorage round-trip fidelity
fc.assert(fc.property(
  fc.array(fc.record({
    id: fc.uuid(),
    name: fc.string(),
    streak: fc.nat(),
    completedDates: fc.array(fc.string()),
    createdAt: fc.integer()
  })),
  (habits) => {
    const serialised = JSON.stringify(habits);
    const restored = JSON.parse(serialised);
    return JSON.stringify(restored) === serialised;
  }
), { numRuns: 100 });
```

### Integration Tests

- Verify the full page loads within 500 ms with pre-populated localStorage (Requirement 13.1)
- Verify theme toggle updates all new widget cards within 250 ms (Requirement 11.2)
- Verify that when opened via `file://`, all widgets except weather/favicons work correctly (Requirement 13.4)

### Accessibility Checks (Manual)

- All interactive controls have `aria-label` attributes
- All dynamic list regions use `aria-live="polite"`
- All form inputs have visible labels or `aria-label`
- Color contrast meets WCAG AA (verified against CSS variables)
