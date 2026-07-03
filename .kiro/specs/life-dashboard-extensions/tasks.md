# Implementation Plan: Life Dashboard Extensions
 
## Overview 
   
Five new widgets — Habit Tracker, Notes/Journal, Expense Tracker, Countdown Timer, and Music/Spotify Widget — are added to the existing vanilla HTML/CSS/JS Life Dashboard. All code changes are additive: new sections appended to `structure.html`, `js/javascript.js`, and `css/style.css`. No existing functions are modified. All persistence uses `localStorage`. Property-based tests use **fast-check** loaded via CDN `<script>` tag in a separate `tests/pbt.html` test runner file.

---

## Tasks

- [x] 1. Extend shared state, storage helpers, and load fast-check test runner scaffold
  - Add `habits`, `notes`, `expenses`, `countdowns`, and `music` arrays/objects to the `state` constant in `js/javascript.js`
  - Extend `saveAll()` to write the five new `localStorage` keys: `dashboard_habits`, `dashboard_notes`, `dashboard_expenses`, `dashboard_countdowns`, `dashboard_music`
  - Extend `loadAll()` with five independent try/catch blocks that `JSON.parse` each new key and fall back to empty defaults; log failures with `console.warn`
  - Create `tests/pbt.html`: an HTML file that loads fast-check via CDN (`https://cdn.jsdelivr.net/npm/fast-check/lib/bundle/fast-check.min.js`), loads `js/javascript.js` via `<script>`, and provides a minimal test harness that logs pass/fail to the page and `console`
  - _Requirements: 12.1, 12.2, 12.3_

- [x] 2. Implement Habit Tracker widget
  - [x] 2.1 Add Habit Tracker HTML card to `structure.html`
    - Insert a new `<div class="card habit-card">` section after the Quick Links card
    - Include `#habit-input` text input (maxlength 100), an "Add Habit" button (`#add-habit-btn`), and a `<ul id="habit-list">` with `aria-live="polite"`
    - _Requirements: 1.1, 11.1_

  - [x] 2.2 Implement `addHabit()`, `deleteHabit(id)`, and `renderHabits()` in `js/javascript.js`
    - `addHabit()`: reads `#habit-input`, trims, rejects empty/whitespace (toast `warning`) and case-insensitive duplicates (toast `warning`), pushes a new `HabitRecord` (`id: generateId()`, `streak: 0`, `completedDates: []`, `createdAt: Date.now()`), calls `saveAll()` and `renderHabits()`
    - `deleteHabit(id)`: filters `state.habits`, calls `saveAll()` and `renderHabits()`
    - `renderHabits()`: rebuilds `#habit-list` innerHTML; each list item shows habit name, streak count, a check-in button (disabled if already checked in today), and a delete button; uses `escapeHtml()`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 11.3, 11.4_

  - [x] 2.3 Implement `checkInHabit(id)` and `checkHabitDayRollover()` in `js/javascript.js`
    - `checkInHabit(id)`: gets today's date string (`YYYY-MM-DD` in local time); if already in `completedDates`, returns early; otherwise pushes the date string, recalculates streak by walking backward from today through consecutive days in `completedDates`, calls `saveAll()` and `renderHabits()`
    - `checkHabitDayRollover()`: called on the existing 1-second clock interval; detects when the local calendar day has changed (compare stored `lastCheckedDate` day against today); for each habit whose last `completedDates` entry is not yesterday, resets `streak` to 0 (unless today is already checked in); calls `saveAll()` and `renderHabits()` only when a change occurred
    - Bind `addHabit()` to `#add-habit-btn` click and Enter key on `#habit-input` inside `bindEvents()`
    - Call `renderHabits()` at the end of the `DOMContentLoaded` / init block
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_


- [x] 3. Add Habit Tracker styles to `css/style.css`
  - Append `.habit-card`, `.habit-list`, `.habit-item`, `.habit-name`, `.habit-streak`, `.habit-checkin-btn` (with `.checked` state), and `.habit-delete-btn` styles using existing CSS tokens (`--bg-card`, `--accent`, `--border`, `--radius-sm`, `--transition`, `--success`, etc.)
  - Checked-in habit items get a visually distinct background (`--accent-light`) and a checkmark indicator
  - _Requirements: 11.1, 11.2_

- [x] 4. Checkpoint — Habit Tracker
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement Notes / Journal widget
  - [x] 5.1 Add Notes/Journal HTML card to `structure.html`
    - Insert `<div class="card notes-card">` after the Habit Tracker card
    - Include `#note-search-input` (type text, maxlength 200), `#note-title-input` (maxlength 100), `#note-body-input` (`<textarea>`, maxlength 5000), an "Add Note" button (`#add-note-btn`), `<ul id="note-list" aria-live="polite">`, and a detail pane `#note-detail` (initially hidden) with `#note-detail-title`, `#note-detail-body`, and a "Close" button
    - _Requirements: 3.1, 3.6, 4.1, 11.1_

  - [x] 5.2 Implement `addNote()`, `deleteNote(id)`, `selectNote(id)`, and `renderNotes(list?)` in `js/javascript.js`
    - `addNote()`: trims title (optional, ≤100 chars) and body (required, 1–5000 chars); rejects empty/whitespace body (toast `warning`); unshifts a `NoteEntry` with `generateId()` and `createdAt: Date.now()`; calls `saveAll()` and `renderNotes()`
    - `deleteNote(id)`: filters `state.notes`, calls `saveAll()` and `renderNotes()`
    - `selectNote(id)`: finds the entry, populates `#note-detail-title` and `#note-detail-body`, shows `#note-detail` pane
    - `renderNotes(list?)`: renders `state.notes` (or provided filtered list) sorted descending by `createdAt`; each item shows the preview label (title if present, else first 40 chars of body + `"…"` if truncated)
    - Bind `addNote()` to `#add-note-btn` click and Enter key modifier on `#note-body-input` (Ctrl+Enter); bind close button; call `renderNotes()` at init
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 11.3, 11.4_

  - [x] 5.3 Implement `getFilteredNotes(query)` and `searchNotes()` in `js/javascript.js`
    - `getFilteredNotes(query)`: pure function; returns `state.notes` filtered by case-insensitive substring match against title and body; when `query === ''`, returns the full list sorted reverse-chronologically
    - `searchNotes()`: reads `#note-search-input` value; calls `getFilteredNotes(value)` and passes result to `renderNotes()`; bind to `input` event on `#note-search-input`
    - _Requirements: 4.1, 4.2, 4.3_


- [x] 6. Add Notes/Journal styles to `css/style.css`
  - Append `.notes-card`, `.note-search-row`, `.note-input-area`, `.note-list`, `.note-item`, `.note-preview`, `.note-timestamp`, `.note-delete-btn`, `.note-detail` styles using existing tokens
  - Detail pane is hidden by default (`display: none`) and shown via an `.active` class
  - _Requirements: 11.1, 11.2_

- [x] 7. Checkpoint — Notes/Journal
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement Expense Tracker widget
  - [x] 8.1 Add Expense Tracker HTML card to `structure.html`
    - Insert `<div class="card expense-card">` after the Notes card
    - Include an amount input (`#expense-amount`, type number, step 0.01), a category `<select id="expense-category">` with the seven preset options (Food, Transport, Shopping, Bills, Health, Entertainment, Other), a date input (`#expense-date`, type date), a note input (`#expense-note`, maxlength 200), an "Add" button (`#add-expense-btn`), filter controls (`#expense-filter-category` select and `#expense-filter-month` input type month), a "Clear Filters" button (`#clear-expense-filters-btn`), `#expense-total` display, and `<ul id="expense-list" aria-live="polite">`
    - _Requirements: 5.1, 5.5, 6.1, 11.1_

  - [x] 8.2 Implement `addExpense()`, `deleteExpense(id)`, `getFilteredExpenses()`, and `renderExpenses()` in `js/javascript.js`
    - `addExpense()`: validates amount (0.01–999,999,999.99, finite), category (non-empty), and date (2000-01-01 to 2099-12-31); on first invalid field fires toast `warning` identifying that field and returns; on success pushes a `Transaction` with `generateId()`, calls `saveAll()` and `renderExpenses()`
    - `deleteExpense(id)`: filters `state.expenses`, calls `saveAll()` and `renderExpenses()`
    - `getFilteredExpenses()`: pure function; applies `state.expenseFilter.category` and `state.expenseFilter.month` as logical AND; returns result sorted by `date` descending, ties by `createdAt` descending
    - `renderExpenses()`: rewrites `#expense-list` from `getFilteredExpenses()`; renders amount to 2 decimal places; updates `#expense-total` to sum of filtered amounts (2 dp, prefixed with currency symbol `$`)
    - Bind all controls in `bindEvents()`; call `renderExpenses()` at init; add `state.expenseFilter = { category: 'All', month: 'All' }` to state
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.1, 11.3, 11.4_

  - [x] 8.3 Implement `setExpenseCategoryFilter()`, `setExpenseMonthFilter()`, and `clearExpenseFilters()` in `js/javascript.js`
    - Each setter updates the corresponding key in `state.expenseFilter` and calls `renderExpenses()`
    - `clearExpenseFilters()` resets both to `'All'`, resets the filter input values in the DOM, and calls `renderExpenses()`
    - _Requirements: 6.2, 6.3, 6.4, 6.5_



- [x] 9. Add Expense Tracker styles to `css/style.css`
  - Append `.expense-card`, `.expense-form-grid`, `.expense-filter-row`, `.expense-list`, `.expense-item`, `.expense-amount`, `.expense-category-badge`, `.expense-date`, `.expense-note-text`, `.expense-delete-btn`, `.expense-total-row` styles using existing tokens
  - _Requirements: 11.1, 11.2_

- [x] 10. Checkpoint — Expense Tracker
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implement Countdown Timer widget
  - [x] 11.1 Add Countdown Timer HTML card to `structure.html`
    - Insert `<div class="card countdown-card">` after the Expense Tracker card
    - Include `#countdown-name-input` (text, maxlength 100), `#countdown-datetime-input` (type datetime-local), an "Add" button (`#add-countdown-btn`), and `<ul id="countdown-list" aria-live="polite">`
    - _Requirements: 7.1, 11.1_

  - [x] 11.2 Implement `addCountdown()`, `deleteCountdown(id)`, and `renderCountdowns()` in `js/javascript.js`
    - `addCountdown()`: validates name (non-empty after trim) and datetime (strictly in the future at moment of call); on failure fires toast `warning`; on success pushes a `CountdownEvent` with `generateId()` and `targetISO: new Date(inputValue).toISOString()`; calls `saveAll()` and `renderCountdowns()`
    - `deleteCountdown(id)`: filters `state.countdowns`; deletes from `countdownNotified` set; calls `saveAll()` and `renderCountdowns()`
    - `renderCountdowns()`: rewrites `#countdown-list`; for each event, renders a countdown display element with `data-countdown-id` attribute; uses `formatCountdown()` for initial display; events already past show `"🎉 Event reached!"` without toasting (page load path)
    - Declare `const countdownNotified = new Set()` at module level; bind controls in `bindEvents()`; call `renderCountdowns()` at init
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 8.4, 11.4_

  - [x] 11.3 Implement `formatCountdown(ms)` and `tickCountdowns()` in `js/javascript.js`
    - `formatCountdown(ms)`: for `ms ≤ 0` return `"🎉 Event reached!"`; otherwise compute `days`, `hours`, `minutes`, `seconds`; build string omitting leading-zero segments (e.g., skip "d" part when `days === 0`)
    - `tickCountdowns()`: called inside the existing 1-second `setInterval` (or new single shared interval); for each event, computes remaining ms, updates its countdown display element in-place via `data-countdown-id` selector; when an event first crosses zero and its id is not in `countdownNotified`, fires a toast and adds the id to `countdownNotified`
    - Hook `tickCountdowns()` into the existing `setInterval` (the one already calling `updateClock()`) or create one new shared interval that calls both — ensuring the total active interval count stays at 1
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 13.3_



- [x] 12. Add Countdown Timer styles to `css/style.css`
  - Append `.countdown-card`, `.countdown-form-row`, `.countdown-list`, `.countdown-item`, `.countdown-name`, `.countdown-time`, `.countdown-reached`, `.countdown-delete-btn` styles using existing tokens
  - _Requirements: 11.1, 11.2_

- [x] 13. Checkpoint — Countdown Timer
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Implement Music / Spotify Widget
  - [x] 14.1 Add Music/Spotify Widget HTML card to `structure.html`
    - Insert `<div class="card music-card">` after the Countdown Timer card
    - Include a mode selector (`#music-mode-spotify` and `#music-mode-audio` radio buttons or toggle buttons), `#music-spotify-input` text input (shown when Spotify mode is active), `#music-audio-input` text input (shown when Audio mode is active), a "Load" button (`#music-submit-btn`), a "Remove" button (`#music-remove-btn`), and a player container `#music-player-container`
    - _Requirements: 9.1, 10.1, 11.1_

  - [x] 14.2 Implement `convertSpotifyUrl(url)`, `submitMusicUrl()`, and `removeMusicEmbed()` in `js/javascript.js`
    - `convertSpotifyUrl(url)`: applies regex `/open\.spotify\.com\/(playlist|track)\/([A-Za-z0-9]+)/`; returns embed URL `https://open.spotify.com/embed/{type}/{id}?utm_source=oembed` or `null` if no match
    - `submitMusicUrl()`: reads active mode and appropriate input; for Spotify mode: calls `convertSpotifyUrl()`, rejects null result with toast `warning`, sets `state.music = { mode: 'spotify', url: embedUrl }`, saves, renders; for Audio mode: validates URL path ends with `.mp3`, `.ogg`, or `.wav` (case-insensitive), rejects non-matching with toast `warning`, sets `state.music = { mode: 'audio', url: submittedUrl }`, saves, renders
    - `removeMusicEmbed()`: sets `state.music = { mode: null, url: null }`, calls `saveAll()`, and calls `renderMusicPlayer()` to clear the player and show input fields
    - _Requirements: 9.1, 9.2, 9.3, 9.6, 10.1, 10.2, 10.3, 11.3_

  - [x] 14.3 Implement `renderMusicPlayer()`, `restoreMusic()`, and `setMusicMode(mode)` in `js/javascript.js`
    - `renderMusicPlayer()`: if `state.music.url` is null, shows input UI and hides player container; if Spotify mode, creates `<iframe>` with correct `src`, `height` (152 for track, 352 for playlist), `frameborder="0"`, `allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"`, appends to `#music-player-container`; if Audio mode, creates `<audio controls>` element, binds `error` event (fires toast + clears state + saves + re-renders), sets `src`, appends to container; shows Remove button
    - `restoreMusic()`: called during page init; reads `state.music` (already populated by `loadAll()`); calls `renderMusicPlayer()` if `state.music.url` is set
    - `setMusicMode(mode)`: updates active mode, toggles visibility of Spotify vs Audio input fields
    - Bind all controls in `bindEvents()`; call `restoreMusic()` at init
    - _Requirements: 9.4, 9.5, 9.6, 10.2, 10.4, 10.5, 11.4_


- [x] 15. Add Music Widget styles to `css/style.css`
  - Append `.music-card`, `.music-mode-row`, `.music-input-row`, `.music-player-container`, `#music-remove-btn` styles using existing tokens
  - The iframe and audio element are given `width: 100%` and `border-radius: var(--radius-sm)` to match the card aesthetic
  - _Requirements: 11.1, 11.2_

- [x] 16. Implement localStorage round-trip fidelity test and localStorage write failure handling
  - [x] 16.1 Wrap `saveAll()` in a try/catch and call `showToast()` on failure
    - Verify the try/catch wraps all five new `localStorage.setItem` calls together
    - _Requirements: 1.6, 2.6, 3.7, 5.6, 12.1_


- [x] 17. Wire all widgets into `bindEvents()` and the init block
  - Confirm `bindEvents()` registers event listeners for all five new widgets (add, delete, check-in, search, filter, mode toggle, load, remove)
  - Confirm the `DOMContentLoaded` / init block calls `renderHabits()`, `renderNotes()`, `renderExpenses()`, `renderCountdowns()`, and `restoreMusic()` after `loadAll()`
  - Confirm `checkHabitDayRollover()` and `tickCountdowns()` are wired into the shared 1-second interval
  - _Requirements: 11.4, 12.2, 13.1, 13.3_

- [x] 18. Final checkpoint — full integration
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- All property tests live in `tests/pbt.html`; open this file in a browser to run — no build step required
- fast-check is loaded via CDN: `https://cdn.jsdelivr.net/npm/fast-check/lib/bundle/fast-check.min.js`
- Each task references specific requirements for traceability
- The single shared `setInterval` approach (task 11.3) keeps active intervals at 1 regardless of event count, satisfying Requirement 13.3
- The `state.expenseFilter` object is in-memory only and is not persisted to localStorage

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "5.1", "8.1", "11.1", "14.1"] },
    { "id": 2, "tasks": ["2.2", "3", "5.2", "8.2", "11.2", "14.2"] },
    { "id": 3, "tasks": ["2.3", "5.3", "8.3", "11.3", "14.3"] },
    { "id": 4, "tasks": ["2.4", "2.5", "2.6", "2.7", "2.8", "5.4", "5.5", "5.6", "5.7", "8.4", "8.5", "8.6", "11.4", "11.5", "11.6", "14.4", "14.5", "16.1"] },
    { "id": 5, "tasks": ["6", "9", "12", "15", "16.2"] },
    { "id": 6, "tasks": ["17"] }
  ]
}
```
