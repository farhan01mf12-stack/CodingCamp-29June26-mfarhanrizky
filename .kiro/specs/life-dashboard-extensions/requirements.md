# Requirements Document
  
## Introduction 

This document defines requirements for extending the existing Life Dashboard single-page application with five new widgets: Habit Tracker, Notes/Journal, Expense Tracker, Countdown Timer, and Music/Spotify Widget. The dashboard is built with vanilla HTML, CSS, and JavaScript; all data persists in browser localStorage with no backend server. Each new widget must integrate visually and functionally with the existing dashboard — matching the glassmorphism card design, the light/dark theme system, and the toast notification pattern already established.

---

## Glossary

- **Dashboard**: The single-page Life Dashboard application (`structure.html` + `js/javascript.js` + `css/style.css`)
- **Widget**: A self-contained card section rendered inside the Dashboard
- **Habit_Tracker**: The Widget that manages and displays daily habits and streaks
- **Notes_Widget**: The Widget that provides quick note-taking and daily journaling
- **Expense_Tracker**: The Widget that logs, categorizes, and summarizes spending
- **Countdown_Widget**: The Widget that displays countdowns to named future events
- **Music_Widget**: The Widget that embeds a music player or playlist via an iframe or audio element
- **LocalStorage**: The browser's `localStorage` API used as the sole persistence layer
- **Streak**: A consecutive-day count of a habit being marked complete
- **Entry**: A single note or journal record with a timestamp and body text
- **Transaction**: A single expense record with amount, category, date, and optional note
- **Category**: A user-defined or preset label used to classify Transactions
- **Event**: A named future date/datetime used by the Countdown_Widget
- **Toast**: The existing slide-in notification component (`showToast()`) used across the Dashboard

---

## Requirements

### Requirement 1: Habit Tracker — Define and Display Habits

**User Story:** As a user, I want to create named daily habits so that I can see all the habits I am tracking in one place.

#### Acceptance Criteria

1. THE Habit_Tracker SHALL display a list of all saved habits, each showing the habit name and its current Streak count (the number of consecutive calendar days marked complete, initialised to 0 for a new habit).
2. WHEN the user submits a habit name between 1 and 100 characters (after trimming leading/trailing whitespace), THE Habit_Tracker SHALL add the habit to the list and immediately persist it to LocalStorage.
3. IF the user submits an empty or whitespace-only habit name, THEN THE Habit_Tracker SHALL display a Toast warning (type `warning`, visible for 3 000 ms) and SHALL NOT add the habit.
4. IF the user submits a habit name that already exists (case-insensitive match after trimming), THEN THE Habit_Tracker SHALL display a Toast warning and SHALL NOT add a duplicate habit.
5. WHEN the user deletes a habit, THE Habit_Tracker SHALL remove the habit entry, its Streak count, and all associated completion-date records from LocalStorage.
6. IF writing to LocalStorage fails (e.g., storage quota exceeded), THEN THE Habit_Tracker SHALL display a Toast warning indicating the save failed and SHALL retain the habit in the in-memory list for the current session.

### Requirement 2: Habit Tracker — Daily Check-In and Streaks

**User Story:** As a user, I want to mark habits as done each day and see my streak grow so that I stay motivated to maintain consistency.

#### Acceptance Criteria

1. WHEN the user marks a habit as complete for the current local calendar day, THE Habit_Tracker SHALL increment the Streak by 1 and record the completion date (YYYY-MM-DD in local time) in LocalStorage.
2. WHILE a habit is already marked complete for the current local calendar day, THE Habit_Tracker SHALL display the habit with a visible checkmark indicator and a differentiated background or text style, and SHALL disable the check-in control so a second check-in for that day is not possible.
3. WHEN the local calendar day changes and a habit was marked complete on that immediately preceding day, THE Habit_Tracker SHALL keep the Streak value unchanged until the user either checks in on the new day (incrementing it) or the Dashboard is loaded/the day changes again without a check-in (resetting Streak to 0 per criterion 4).
4. IF the user did not mark a habit complete on the immediately preceding local calendar day, THEN THE Habit_Tracker SHALL reset the Streak to 0 the next time the Dashboard is loaded or the local calendar day changes.
5. THE Habit_Tracker SHALL persist all habit completion dates and Streak counts in LocalStorage so that data survives page refresh.
6. IF writing to LocalStorage fails during a check-in, THEN THE Habit_Tracker SHALL display a Toast warning indicating the save failed and SHALL retain the updated Streak in the in-memory state for the current session.

### Requirement 3: Notes / Journal — Create and Browse Entries

**User Story:** As a user, I want to write quick notes or daily journal entries so that I can capture thoughts and review them later.

#### Acceptance Criteria

1. THE Notes_Widget SHALL display a list of saved Entries in reverse-chronological order, each showing the Entry timestamp and a preview label.
2. WHEN the user saves a note body between 1 and 5 000 characters (after trimming), THE Notes_Widget SHALL create a new Entry with the current local date/time timestamp and persist it to LocalStorage.
3. IF the user attempts to save an empty or whitespace-only body, THEN THE Notes_Widget SHALL display a Toast warning and SHALL NOT create an Entry.
4. WHEN the user selects an Entry, THE Notes_Widget SHALL display the full body text together with the Entry's title (if present) in a detail view.
5. WHEN the user deletes an Entry, THE Notes_Widget SHALL remove it from the list and from LocalStorage.
6. THE Notes_Widget SHALL support an optional title field of up to 100 characters. WHEN a title is provided, THE Notes_Widget SHALL use the title as the preview label. WHEN no title is provided, THE Notes_Widget SHALL display the first 40 characters of the body text as the preview label, appending "…" if the body exceeds 40 characters.
7. IF writing to LocalStorage fails when saving an Entry, THEN THE Notes_Widget SHALL display a Toast warning indicating the save failed and SHALL retain the Entry in the in-memory list for the current session.

### Requirement 4: Notes / Journal — Search Entries

**User Story:** As a user, I want to search my notes by keyword so that I can quickly find a specific entry.

#### Acceptance Criteria

1. WHEN the user types a search string of 1 to 200 characters in the search field, THE Notes_Widget SHALL filter the displayed Entry list within 300 ms to show only Entries whose title or body contains the search string (case-insensitive substring match).
2. IF no Entries match the search string, THEN THE Notes_Widget SHALL display an empty-state message indicating no results were found.
3. WHEN the search field is cleared (length returns to 0), THE Notes_Widget SHALL restore the full Entry list within 300 ms.

### Requirement 5: Expense Tracker — Log Transactions

**User Story:** As a user, I want to log spending with an amount, category, and date so that I know where my money goes.

#### Acceptance Criteria

1. THE Expense_Tracker SHALL display a list of saved Transactions sorted by date descending, each showing the amount (formatted to 2 decimal places), Category, date, and optional note (up to 200 characters).
2. WHEN the user submits a Transaction with a positive numeric amount (between 0.01 and 999 999 999.99 inclusive, up to 2 decimal places), a selected Category, and a date no earlier than 1 January 2000 and no later than 31 December 2099, THE Expense_Tracker SHALL add it to the list and persist it to LocalStorage.
3. IF the user submits a Transaction with a missing amount, a non-positive or out-of-range amount, a missing Category, or a missing or out-of-range date, THEN THE Expense_Tracker SHALL display a Toast warning identifying the first invalid field encountered and SHALL NOT add the Transaction.
4. WHEN the user deletes a Transaction, THE Expense_Tracker SHALL remove it from the list and from LocalStorage.
5. THE Expense_Tracker SHALL provide the following preset Categories selectable from a dropdown: Food, Transport, Shopping, Bills, Health, Entertainment, and Other.
6. IF writing to LocalStorage fails when saving a Transaction, THEN THE Expense_Tracker SHALL display a Toast warning indicating the save failed and SHALL retain the Transaction in the in-memory list for the current session.

### Requirement 6: Expense Tracker — Summary and Filtering

**User Story:** As a user, I want to see total spending and filter by category or date range so that I can understand my spending patterns.

#### Acceptance Criteria

1. THE Expense_Tracker SHALL display the sum of the amounts of all currently visible Transactions, formatted to 2 decimal places with a currency symbol, updating immediately whenever the visible set changes.
2. WHEN the user selects a Category filter value, THE Expense_Tracker SHALL immediately show only Transactions whose Category matches that value and SHALL recalculate and display the updated total.
3. WHEN the user selects a month/year filter (e.g., "June 2026"), THE Expense_Tracker SHALL immediately show only Transactions whose date falls within that calendar month and year and SHALL recalculate and display the updated total.
4. WHEN both a Category filter and a month/year filter are active simultaneously, THE Expense_Tracker SHALL show only Transactions that satisfy both conditions (logical AND) and SHALL display the combined total.
5. WHEN the user clears all active filters (resets both Category and month/year filter to their default "All" state), THE Expense_Tracker SHALL restore the full Transaction list and recalculate the total to reflect all Transactions.

### Requirement 7: Countdown Timer — Manage Events

**User Story:** As a user, I want to add named future events with dates so that I can see how much time is left until each one.

#### Acceptance Criteria

1. THE Countdown_Widget SHALL display a list of all saved Events, each showing the event name and a live countdown formatted as days, hours, minutes, and seconds remaining.
2. WHEN the user submits an event name between 1 and 100 characters (after trimming) and a target datetime that is strictly after the current local time at the moment of submission, THE Countdown_Widget SHALL add the Event and persist it to LocalStorage.
3. IF the user submits an empty or whitespace-only event name, THEN THE Countdown_Widget SHALL display a Toast warning and SHALL NOT add the Event.
4. IF the user submits a target datetime that is not strictly in the future at the moment of submission, THEN THE Countdown_Widget SHALL display a Toast warning and SHALL NOT add the Event.
5. WHEN the user deletes an Event, THE Countdown_Widget SHALL remove it from the list and from LocalStorage, and SHALL stop updating its countdown display.

### Requirement 8: Countdown Timer — Live Countdown Updates

**User Story:** As a user, I want the countdown to update every second so that I always see an accurate time remaining.

#### Acceptance Criteria

1. WHILE the Dashboard is open and an Event's target datetime is in the future, THE Countdown_Widget SHALL update each Event's countdown display every second (using a single shared `setInterval`) showing the remaining time in the format "Xd Xh Xm Xs", omitting leading zero segments (e.g., "2h 5m 3s" when days are 0) without requiring a page refresh.
2. WHEN an Event's countdown reaches zero, THE Countdown_Widget SHALL replace the countdown display with a "🎉 Event reached!" label.
3. WHEN an Event's countdown reaches zero for the first time in the current page session, THE Countdown_Widget SHALL display a Toast notification containing the event name.
4. WHEN the page loads and an Event was already past its target datetime prior to the load, THE Countdown_Widget SHALL display the "🎉 Event reached!" label without firing a Toast notification for that Event.
5. WHILE an Event has reached its target datetime, THE Countdown_Widget SHALL continue displaying the event in the list with the "reached" label until the user explicitly deletes it.

### Requirement 9: Music / Spotify Widget — Embed a Player

**User Story:** As a user, I want to embed a Spotify playlist or track so that I can play music directly from my dashboard.

#### Acceptance Criteria

1. THE Music_Widget SHALL display an input field and a submit control (button or Enter key) that accept a Spotify playlist URL or track URL from the user.
2. WHEN the user submits a URL matching the pattern `open.spotify.com/playlist/{id}` or `open.spotify.com/track/{id}`, THE Music_Widget SHALL convert it to the Spotify embed URL format (`https://open.spotify.com/embed/playlist/{id}` or `https://open.spotify.com/embed/track/{id}`) and render it inside an `<iframe>` with a height of 152 px for a track and 352 px for a playlist.
3. IF the user submits a URL that does not match a recognized Spotify playlist or track pattern, THEN THE Music_Widget SHALL display a Toast warning and SHALL NOT render or update the iframe.
4. WHEN a Spotify embed is active, THE Music_Widget SHALL persist the embed URL in LocalStorage under the key `dashboard_music` so that the player is restored on the next page load.
5. WHEN the page loads and `dashboard_music` contains a persisted Spotify embed URL, THE Music_Widget SHALL render the iframe immediately without requiring the user to re-enter the URL.
6. WHEN the user removes the current embed (via a visible "Remove" button), THE Music_Widget SHALL clear the iframe from the DOM, remove the `dashboard_music` key from LocalStorage, and display the URL input field again.

### Requirement 10: Music / Spotify Widget — Fallback Audio Player

**User Story:** As a user who does not use Spotify, I want to be able to paste a direct audio URL so that I can still play music on my dashboard.

#### Acceptance Criteria

1. THE Music_Widget SHALL provide a "Direct Audio" mode selector; WHEN the user selects "Direct Audio", THE Music_Widget SHALL display a URL input field and hide the Spotify input field.
2. WHEN the user submits (via button click or Enter key) a URL whose path ends with `.mp3`, `.ogg`, or `.wav` (case-insensitive), THE Music_Widget SHALL set it as the `src` attribute of an HTML `<audio controls>` element visible in the widget and persist it to LocalStorage under `dashboard_music`.
3. IF the user submits a URL that does not end in `.mp3`, `.ogg`, or `.wav` and is not a Spotify URL, THEN THE Music_Widget SHALL display a Toast warning and SHALL NOT set or update the `<audio>` source.
4. WHEN the page loads and `dashboard_music` contains a persisted direct audio URL, THE Music_Widget SHALL render the `<audio controls>` element with the persisted URL as its source without requiring the user to re-enter the URL.
5. IF the `<audio>` element fires an `error` event after the source is set, THEN THE Music_Widget SHALL display a Toast warning indicating the audio could not be loaded and SHALL clear the invalid source from LocalStorage.

### Requirement 11: Theme and Visual Integration

**User Story:** As a user, I want all new widgets to look and behave consistently with the existing dashboard so that the interface feels unified.

#### Acceptance Criteria

1. THE Dashboard SHALL render all new Widgets as cards using the existing `.card` CSS class and the full set of design tokens defined in `:root`: `--bg-card`, `--bg-card-solid`, `--bg-main`, `--text-primary`, `--text-secondary`, `--text-muted`, `--accent`, `--accent-hover`, `--accent-light`, `--border`, `--shadow`, `--shadow-sm`, `--radius`, `--radius-sm`, `--transition`, `--danger`, `--success`, and `--warning`.
2. WHEN the user toggles the theme, THE Dashboard SHALL apply the `[data-theme="dark"]` attribute change to `<html>` and all new Widget cards SHALL visually update to the new theme within 250 ms (governed by `--transition: 0.25s ease`), persisting the choice to LocalStorage.
3. THE Dashboard SHALL use the existing `showToast(message, type)` function for all new Widget notifications, passing one of the supported type values (`'success'`, `'warning'`, `'danger'`, or `'info'`), rather than native `alert()` or `confirm()` dialogs.
4. THE Dashboard SHALL use the existing `generateId()` function to assign unique IDs to all new data records (habits, notes/entries, transactions, and countdown events) at the time of creation.

### Requirement 12: Data Persistence and Isolation

**User Story:** As a user, I want all my data to be saved automatically so that nothing is lost on page refresh.

#### Acceptance Criteria

1. WHEN the user makes any change to a Widget's state (adding, editing, or deleting tasks or links; toggling theme; updating the user name; changing the timer duration; adding or deleting habits, notes, transactions, or countdown events; updating the music embed), THE Dashboard SHALL immediately write the updated state to the corresponding LocalStorage key: `dashboard_tasks`, `dashboard_links`, `dashboard_theme`, `dashboard_name`, `dashboard_timer_minutes`, `dashboard_habits`, `dashboard_notes`, `dashboard_expenses`, `dashboard_countdowns`, and `dashboard_music`.
2. WHEN the page loads, THE Dashboard SHALL read each LocalStorage key and restore the corresponding Widget's state before populating any widget's UI with data.
3. IF a LocalStorage key contains malformed JSON, THEN THE Dashboard SHALL fall back to an empty default state for that Widget without displaying an error to the user, and SHALL log a warning message to the browser console using `console.warn`.
4. THE Dashboard SHALL not store any personally identifiable information beyond the data values explicitly entered by the user (such as task text, link names and URLs, habit names, note bodies, expense notes, event names, and the user's display name), and SHALL not transmit any stored data to external servers (excluding the Spotify embed iframe loaded by the user's own URL).

### Requirement 13: Performance and Browser Compatibility

**User Story:** As a user, I want the dashboard to remain fast and work across all modern browsers so that I can use it anywhere.

#### Acceptance Criteria

1. WHEN the `DOMContentLoaded` event fires, THE Dashboard SHALL have all Widgets rendered and their LocalStorage data restored within 500 ms on a connection of at least 25 Mbps, where "rendered and data restored" means each widget's DOM is populated with the data previously written to `dashboard_tasks`, `dashboard_links`, `dashboard_habits`, `dashboard_notes`, `dashboard_expenses`, `dashboard_countdowns`, and `dashboard_music`.
2. THE Dashboard SHALL operate in the latest stable versions of Chrome, Firefox, Edge, and Safari without JavaScript exceptions logged to the console or layout rendering failures visible to the user.
3. THE Countdown_Widget SHALL use a single shared `setInterval` tick with a 1-second interval to drive all active countdown updates rather than one interval per Event, so that the total number of active intervals does not exceed 1 regardless of how many Events are saved.
4. WHEN the Dashboard is opened as a local HTML file via the `file://` protocol, all features except the Weather Widget (which requires geolocation and the Open-Meteo API) and Quick Links favicons (which require the Google Favicon API) SHALL remain fully functional without network access.
