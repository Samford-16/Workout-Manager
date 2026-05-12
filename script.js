/* ============================================
   FitTrack — Weekly Workout Planner
   ============================================ */

'use strict';

// ---------- Constants ----------
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const FULL_DAY_NAMES = {
    Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday',
    Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday'
};
const STORAGE_KEY = 'fittrack_data_v1';
const THEME_KEY = 'fittrack_theme';
const DATA_VERSION = 1;

// Pre-loaded exercise library (~30 common exercises)
const EXERCISE_LIBRARY = [
    // Chest
    { name: 'Bench Press', muscle: 'Chest', sets: 4, reps: 8, weight: 135 },
    { name: 'Incline Dumbbell Press', muscle: 'Chest', sets: 3, reps: 10, weight: 50 },
    { name: 'Push-Ups', muscle: 'Chest', sets: 3, reps: 15, weight: 0 },
    { name: 'Cable Fly', muscle: 'Chest', sets: 3, reps: 12, weight: 30 },
    // Back
    { name: 'Deadlift', muscle: 'Back', sets: 4, reps: 5, weight: 225 },
    { name: 'Pull-Ups', muscle: 'Back', sets: 3, reps: 8, weight: 0 },
    { name: 'Bent-Over Row', muscle: 'Back', sets: 4, reps: 8, weight: 135 },
    { name: 'Lat Pulldown', muscle: 'Back', sets: 3, reps: 12, weight: 120 },
    { name: 'Seated Cable Row', muscle: 'Back', sets: 3, reps: 10, weight: 110 },
    // Legs
    { name: 'Back Squat', muscle: 'Legs', sets: 4, reps: 6, weight: 185 },
    { name: 'Romanian Deadlift', muscle: 'Legs', sets: 3, reps: 10, weight: 135 },
    { name: 'Leg Press', muscle: 'Legs', sets: 3, reps: 12, weight: 270 },
    { name: 'Walking Lunges', muscle: 'Legs', sets: 3, reps: 12, weight: 30 },
    { name: 'Leg Curl', muscle: 'Legs', sets: 3, reps: 12, weight: 80 },
    { name: 'Calf Raises', muscle: 'Legs', sets: 4, reps: 15, weight: 90 },
    // Shoulders
    { name: 'Overhead Press', muscle: 'Shoulders', sets: 4, reps: 8, weight: 95 },
    { name: 'Lateral Raise', muscle: 'Shoulders', sets: 3, reps: 12, weight: 15 },
    { name: 'Face Pulls', muscle: 'Shoulders', sets: 3, reps: 15, weight: 40 },
    { name: 'Front Raise', muscle: 'Shoulders', sets: 3, reps: 12, weight: 15 },
    // Arms
    { name: 'Barbell Curl', muscle: 'Arms', sets: 3, reps: 10, weight: 60 },
    { name: 'Tricep Pushdown', muscle: 'Arms', sets: 3, reps: 12, weight: 50 },
    { name: 'Hammer Curl', muscle: 'Arms', sets: 3, reps: 10, weight: 25 },
    { name: 'Skull Crushers', muscle: 'Arms', sets: 3, reps: 10, weight: 50 },
    // Core
    { name: 'Plank', muscle: 'Core', sets: 3, reps: 60, weight: 0, notes: 'Hold for 60 seconds' },
    { name: 'Hanging Leg Raise', muscle: 'Core', sets: 3, reps: 12, weight: 0 },
    { name: 'Russian Twist', muscle: 'Core', sets: 3, reps: 20, weight: 20 },
    { name: 'Cable Crunch', muscle: 'Core', sets: 3, reps: 15, weight: 60 },
    // Cardio
    { name: 'Treadmill Run', muscle: 'Cardio', sets: 1, reps: 30, weight: 0, notes: '30 minutes steady pace' },
    { name: 'Stationary Bike', muscle: 'Cardio', sets: 1, reps: 20, weight: 0, notes: '20 minutes intervals' },
    { name: 'Rowing Machine', muscle: 'Cardio', sets: 1, reps: 15, weight: 0, notes: '15 min moderate effort' },
    { name: 'Jump Rope', muscle: 'Cardio', sets: 5, reps: 100, weight: 0 }
];

// ---------- State ----------
let state = {
    currentDay: DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1],
    workouts: {
        Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: []
    },
    // Map of "YYYY-MM-DD" -> number of exercises completed on that date
    history: {},
    editingId: null,
    libraryFilter: 'All',
    librarySearch: ''
};

// Timer state
let timer = {
    duration: 90,
    remaining: 90,
    running: false,
    intervalId: null,
    exerciseName: ''
};

// ---------- Persistence ----------
function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const saved = JSON.parse(raw);
            if (saved.workouts) state.workouts = { ...state.workouts, ...saved.workouts };
            if (saved.history && typeof saved.history === 'object') {
                state.history = saved.history;
            }
        }
    } catch (e) {
        console.warn('Failed to load saved data:', e);
    }
}

function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            version: DATA_VERSION,
            workouts: state.workouts,
            history: state.history
        }));
    } catch (e) {
        console.warn('Failed to save data:', e);
        showToast('Could not save — storage may be full');
    }
}

// ---------- Theme ----------
function loadTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    if (current === 'dark') {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem(THEME_KEY, 'light');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem(THEME_KEY, 'dark');
    }
}

// ---------- Helpers ----------
function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove('show'), 2200);
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// ---------- Date / history helpers ----------
function todayKey() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function dateKey(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function logWorkoutToday() {
    const key = todayKey();
    state.history[key] = (state.history[key] || 0) + 1;
}

// Calculate current streak: consecutive days ending today or yesterday
function calculateStreak() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let streak = 0;
    let cursor = new Date(today);

    // If today has no workout, check if yesterday does (allow today to be in-progress)
    if (!state.history[dateKey(cursor)]) {
        cursor.setDate(cursor.getDate() - 1);
        if (!state.history[dateKey(cursor)]) return 0;
    }

    // Count backwards while we have consecutive days
    while (state.history[dateKey(cursor)]) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
}

function calculateLongestStreak() {
    const dates = Object.keys(state.history).sort();
    if (dates.length === 0) return 0;

    let longest = 1;
    let current = 1;
    for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1]);
        const curr = new Date(dates[i]);
        const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
            current++;
            longest = Math.max(longest, current);
        } else {
            current = 1;
        }
    }
    return longest;
}

function totalWorkoutDays() {
    return Object.keys(state.history).length;
}

// ---------- Rendering ----------
function renderDayTabs() {
    document.querySelectorAll('.day-tab').forEach(tab => {
        const day = tab.dataset.day;
        tab.classList.toggle('active', day === state.currentDay);
    });
    DAYS.forEach(day => {
        const countEl = document.querySelector(`[data-count="${day}"]`);
        if (countEl) countEl.textContent = state.workouts[day].length;
    });
}

function renderDayPanel() {
    const day = state.currentDay;
    const exercises = state.workouts[day];

    document.getElementById('currentDay').textContent = FULL_DAY_NAMES[day];

    const list = document.getElementById('exerciseList');
    const emptyState = document.getElementById('emptyState');
    const daySub = document.getElementById('daySub');

    if (exercises.length === 0) {
        list.innerHTML = '';
        emptyState.classList.remove('hidden');
        daySub.textContent = 'No exercises yet — add one to get started.';
    } else {
        emptyState.classList.add('hidden');
        const done = exercises.filter(e => e.done).length;
        daySub.textContent = `${exercises.length} exercise${exercises.length === 1 ? '' : 's'} · ${done} completed`;
        list.innerHTML = exercises.map(ex => renderExercise(ex)).join('');
    }

    renderDayProgress();
}

function renderExercise(ex) {
    const parts = [];
    if (ex.sets > 0 && ex.reps > 0) parts.push(`${ex.sets} × ${ex.reps}`);
    if (ex.weight > 0) parts.push(`${ex.weight} lbs`);
    const stats = parts.length ? `<span class="ex-stats">${escapeHtml(parts.join(' · '))}</span>` : '';

    const notes = ex.notes
        ? `<div class="ex-notes">${escapeHtml(ex.notes)}</div>`
        : '';

    return `
        <li class="exercise-item ${ex.done ? 'done' : ''}" data-id="${ex.id}" draggable="true">
            <span class="ex-drag" aria-label="Drag to reorder" title="Drag to reorder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="9" cy="6" r="1"></circle>
                    <circle cx="9" cy="12" r="1"></circle>
                    <circle cx="9" cy="18" r="1"></circle>
                    <circle cx="15" cy="6" r="1"></circle>
                    <circle cx="15" cy="12" r="1"></circle>
                    <circle cx="15" cy="18" r="1"></circle>
                </svg>
            </span>
            <button class="ex-checkbox ${ex.done ? 'checked' : ''}" data-action="toggle" aria-label="Mark as done">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            </button>
            <div class="ex-info">
                <div class="ex-name">${escapeHtml(ex.name)}</div>
                <div class="ex-meta">
                    <span class="ex-tag">${escapeHtml(ex.muscle)}</span>
                    ${stats}
                </div>
                ${notes}
            </div>
            <div class="ex-actions">
                <button class="ex-action timer" data-action="timer" aria-label="Start rest timer" title="Rest timer">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="13" r="8"></circle>
                        <path d="M12 9v4l2 2"></path>
                        <path d="M9 2h6"></path>
                    </svg>
                </button>
                <button class="ex-action" data-action="edit" aria-label="Edit">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path>
                    </svg>
                </button>
                <button class="ex-action delete" data-action="delete" aria-label="Delete">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        </li>
    `;
}

function renderDayProgress() {
    const exercises = state.workouts[state.currentDay];
    const total = exercises.length;
    const done = exercises.filter(e => e.done).length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);

    document.getElementById('dayBar').style.width = `${pct}%`;
    document.getElementById('dayProgressText').textContent = `${pct}%`;
}

function renderWeeklyStats() {
    let total = 0, done = 0, activeDays = 0;
    DAYS.forEach(day => {
        const exercises = state.workouts[day];
        if (exercises.length > 0) activeDays++;
        total += exercises.length;
        done += exercises.filter(e => e.done).length;
    });
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);

    document.getElementById('weeklyPercent').textContent = `${pct}%`;
    document.getElementById('weeklyDone').textContent = done;
    document.getElementById('weeklyTotal').textContent = total;
    document.getElementById('activeDays').textContent = activeDays;
    document.getElementById('weeklyBar').style.width = `${pct}%`;

    const streak = calculateStreak();
    document.getElementById('streakCount').textContent = streak;
    document.getElementById('streakFlame').classList.toggle('active', streak > 0);
}

function renderAll() {
    renderDayTabs();
    renderDayPanel();
    renderWeeklyStats();
}

// ---------- Exercise modal ----------
function openExerciseModal(exerciseId = null) {
    state.editingId = exerciseId;
    const modal = document.getElementById('exerciseModal');
    const title = document.getElementById('modalTitle');

    if (exerciseId) {
        const ex = state.workouts[state.currentDay].find(e => e.id === exerciseId);
        if (!ex) return;
        title.textContent = 'Edit exercise';
        document.getElementById('exName').value = ex.name;
        document.getElementById('exMuscle').value = ex.muscle;
        document.getElementById('exSets').value = ex.sets;
        document.getElementById('exReps').value = ex.reps;
        document.getElementById('exWeight').value = ex.weight;
        document.getElementById('exNotes').value = ex.notes || '';
    } else {
        title.textContent = 'Add exercise';
        document.getElementById('exName').value = '';
        document.getElementById('exMuscle').value = 'Chest';
        document.getElementById('exSets').value = 3;
        document.getElementById('exReps').value = 10;
        document.getElementById('exWeight').value = 0;
        document.getElementById('exNotes').value = '';
    }

    modal.classList.add('open');
    setTimeout(() => document.getElementById('exName').focus(), 50);
}

function closeAllModals() {
    document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('open'));
    state.editingId = null;
}

function saveExercise() {
    const name = document.getElementById('exName').value.trim();
    if (!name) {
        showToast('Please enter an exercise name');
        document.getElementById('exName').focus();
        return;
    }

    const data = {
        name,
        muscle: document.getElementById('exMuscle').value,
        sets: parseInt(document.getElementById('exSets').value) || 0,
        reps: parseInt(document.getElementById('exReps').value) || 0,
        weight: parseFloat(document.getElementById('exWeight').value) || 0,
        notes: document.getElementById('exNotes').value.trim()
    };

    if (state.editingId) {
        const list = state.workouts[state.currentDay];
        const idx = list.findIndex(e => e.id === state.editingId);
        if (idx !== -1) {
            list[idx] = { ...list[idx], ...data };
            showToast('Exercise updated');
        }
    } else {
        state.workouts[state.currentDay].push({
            id: uid(),
            ...data,
            done: false
        });
        showToast('Exercise added');
    }

    saveState();
    closeAllModals();
    renderAll();
}

// ---------- Library ----------
function openLibrary() {
    state.libraryFilter = 'All';
    state.librarySearch = '';
    document.getElementById('librarySearch').value = '';
    document.querySelectorAll('#filterChips .chip').forEach(c => {
        c.classList.toggle('active', c.dataset.filter === 'All');
    });
    renderLibrary();
    document.getElementById('libraryModal').classList.add('open');
}

function renderLibrary() {
    const list = document.getElementById('libraryList');
    const search = state.librarySearch.toLowerCase();
    const filter = state.libraryFilter;

    const filtered = EXERCISE_LIBRARY.filter(ex => {
        if (filter !== 'All' && ex.muscle !== filter) return false;
        if (search && !ex.name.toLowerCase().includes(search)) return false;
        return true;
    });

    if (filtered.length === 0) {
        list.innerHTML = '<li class="library-empty">No exercises match your search.</li>';
        return;
    }

    list.innerHTML = filtered.map(ex => `
        <li class="library-item">
            <div class="lib-info">
                <span class="lib-name">${escapeHtml(ex.name)}</span>
                <span class="lib-muscle">${escapeHtml(ex.muscle)}</span>
            </div>
            <button class="add-from-lib" data-lib-name="${escapeHtml(ex.name)}">
                Add to ${FULL_DAY_NAMES[state.currentDay]}
            </button>
        </li>
    `).join('');
}

function addFromLibrary(name) {
    const template = EXERCISE_LIBRARY.find(e => e.name === name);
    if (!template) return;
    state.workouts[state.currentDay].push({
        id: uid(),
        name: template.name,
        muscle: template.muscle,
        sets: template.sets,
        reps: template.reps,
        weight: template.weight,
        notes: template.notes || '',
        done: false
    });
    saveState();
    renderAll();
    showToast(`Added to ${FULL_DAY_NAMES[state.currentDay]}`);
}

// ---------- Copy day ----------
function openCopyDay() {
    const exercises = state.workouts[state.currentDay];
    if (exercises.length === 0) {
        showToast('Nothing to copy — add exercises first');
        return;
    }

    document.getElementById('copyIntro').textContent =
        `Copy ${exercises.length} exercise${exercises.length === 1 ? '' : 's'} from ${FULL_DAY_NAMES[state.currentDay]} to:`;

    const grid = document.getElementById('copyDayGrid');
    grid.innerHTML = DAYS.map(day => {
        const isSelf = day === state.currentDay;
        const count = state.workouts[day].length;
        return `
            <button class="copy-day-btn ${isSelf ? 'disabled' : ''}" data-target="${day}" ${isSelf ? 'aria-disabled="true"' : ''}>
                <span class="copy-day-name">${day}</span>
                <span class="copy-day-count">${count} ex</span>
            </button>
        `;
    }).join('');

    document.getElementById('copyDayModal').classList.add('open');
}

function copyDayTo(targetDay) {
    const sourceDay = state.currentDay;
    if (targetDay === sourceDay) return;
    if (!DAYS.includes(targetDay)) return;

    // Deep copy with fresh IDs, reset done state
    state.workouts[targetDay] = state.workouts[sourceDay].map(ex => ({
        ...ex,
        id: uid(),
        done: false
    }));

    saveState();
    closeAllModals();
    state.currentDay = targetDay;
    renderAll();
    showToast(`Copied to ${FULL_DAY_NAMES[targetDay]}`);
}

// ---------- Clear / Reset ----------
function clearDay() {
    const day = state.currentDay;
    const count = state.workouts[day].length;
    if (count === 0) {
        showToast('Day is already empty');
        return;
    }
    if (!confirm(`Clear all ${count} exercise${count === 1 ? '' : 's'} from ${FULL_DAY_NAMES[day]}?`)) {
        return;
    }
    state.workouts[day] = [];
    saveState();
    renderAll();
    showToast(`${FULL_DAY_NAMES[day]} cleared`);
}

function resetWeek() {
    let total = 0;
    DAYS.forEach(d => total += state.workouts[d].length);
    if (total === 0) {
        showToast('Week is already empty');
        return;
    }
    if (!confirm(`Reset the entire week? This will delete all ${total} exercises across all 7 days. This cannot be undone.`)) {
        return;
    }
    DAYS.forEach(d => { state.workouts[d] = []; });
    saveState();
    renderAll();
    showToast('Week reset');
}

// ---------- Export / Import ----------
function exportData() {
    const data = {
        version: DATA_VERSION,
        exported: new Date().toISOString(),
        workouts: state.workouts,
        history: state.history
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `fittrack-backup-${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Backup downloaded');
}

function importData(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.workouts || typeof data.workouts !== 'object') {
                throw new Error('Invalid file format');
            }

            // Validate structure — each day should be an array
            const validated = {};
            DAYS.forEach(day => {
                const arr = data.workouts[day];
                if (Array.isArray(arr)) {
                    validated[day] = arr.map(ex => ({
                        id: ex.id || uid(),
                        name: String(ex.name || 'Unnamed'),
                        muscle: String(ex.muscle || 'Full Body'),
                        sets: parseInt(ex.sets) || 0,
                        reps: parseInt(ex.reps) || 0,
                        weight: parseFloat(ex.weight) || 0,
                        notes: String(ex.notes || ''),
                        done: Boolean(ex.done)
                    }));
                } else {
                    validated[day] = [];
                }
            });

            if (!confirm('Import will replace your current week. Continue?')) return;

            state.workouts = validated;
            // Import history if present and valid
            if (data.history && typeof data.history === 'object') {
                const importedHistory = {};
                Object.keys(data.history).forEach(k => {
                    if (/^\d{4}-\d{2}-\d{2}$/.test(k) && typeof data.history[k] === 'number') {
                        importedHistory[k] = data.history[k];
                    }
                });
                state.history = importedHistory;
            }
            saveState();
            renderAll();
            showToast('Data imported');
        } catch (err) {
            console.error('Import error:', err);
            showToast('Could not import — invalid file');
        }
    };
    reader.onerror = () => showToast('Could not read file');
    reader.readAsText(file);
}

// ---------- Rest timer ----------
let audioCtx = null;
function beep(freq = 880, duration = 0.15, type = 'sine') {
    try {
        if (!audioCtx) {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return;
            audioCtx = new Ctx();
        }
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.value = 0.0001;
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        const now = audioCtx.currentTime;
        gain.gain.exponentialRampToValueAtTime(0.25, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        osc.start(now);
        osc.stop(now + duration);
    } catch (e) {
        // Audio not available — fail silently
    }
}

function openTimer(exerciseId) {
    const ex = state.workouts[state.currentDay].find(e => e.id === exerciseId);
    timer.exerciseName = ex ? ex.name : '';
    document.getElementById('timerExName').textContent = timer.exerciseName || 'Rest';
    resetTimer();
    document.getElementById('timerOverlay').classList.add('open');
}

function closeTimer() {
    stopTimerInterval();
    document.getElementById('timerOverlay').classList.remove('open');
    document.getElementById('timerOverlay').classList.remove('warning', 'finished');
}

function setTimerDuration(secs) {
    timer.duration = secs;
    timer.remaining = secs;
    stopTimerInterval();
    updateTimerDisplay();
    document.querySelectorAll('.timer-preset').forEach(b => {
        b.classList.toggle('active', parseInt(b.dataset.secs) === secs);
    });
    document.getElementById('timerOverlay').classList.remove('warning', 'finished');
    updateStartBtn(false);
}

function startTimer() {
    if (timer.running) {
        // Pause
        stopTimerInterval();
        updateStartBtn(false);
        return;
    }
    if (timer.remaining <= 0) {
        timer.remaining = timer.duration;
        document.getElementById('timerOverlay').classList.remove('finished');
    }
    timer.running = true;
    updateStartBtn(true);
    // Prime the audio context on user gesture
    beep(0, 0.001);
    timer.intervalId = setInterval(() => {
        timer.remaining--;
        updateTimerDisplay();

        if (timer.remaining <= 3 && timer.remaining > 0) {
            beep(660, 0.1);
            document.getElementById('timerOverlay').classList.add('warning');
        }
        if (timer.remaining <= 0) {
            stopTimerInterval();
            updateStartBtn(false);
            document.getElementById('timerOverlay').classList.remove('warning');
            document.getElementById('timerOverlay').classList.add('finished');
            // Three rising beeps
            beep(880, 0.15);
            setTimeout(() => beep(1100, 0.15), 180);
            setTimeout(() => beep(1320, 0.3), 360);
            showToast('Rest complete!');
        }
    }, 1000);
}

function stopTimerInterval() {
    if (timer.intervalId) {
        clearInterval(timer.intervalId);
        timer.intervalId = null;
    }
    timer.running = false;
}

function resetTimer() {
    stopTimerInterval();
    timer.remaining = timer.duration;
    document.getElementById('timerOverlay').classList.remove('warning', 'finished');
    updateTimerDisplay();
    updateStartBtn(false);
}

function updateTimerDisplay() {
    document.getElementById('timerText').textContent = formatTime(Math.max(0, timer.remaining));
    const circumference = 2 * Math.PI * 54; // r=54
    const pct = timer.duration > 0 ? timer.remaining / timer.duration : 0;
    const offset = circumference * (1 - pct);
    document.getElementById('timerRingFg').style.strokeDashoffset = offset;
}

function updateStartBtn(running) {
    const btn = document.getElementById('timerStartBtn');
    btn.classList.toggle('running', running);
    btn.innerHTML = running
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                <rect x="6" y="4" width="4" height="16"></rect>
                <rect x="14" y="4" width="4" height="16"></rect>
            </svg> Pause`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                <polygon points="6 3 20 12 6 21 6 3"></polygon>
            </svg> Start`;
}

// ---------- Drag and drop ----------
let dragSrcId = null;

function onDragStart(e) {
    const item = e.target.closest('.exercise-item');
    if (!item) return;
    dragSrcId = item.dataset.id;
    item.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    // Required for Firefox
    try { e.dataTransfer.setData('text/plain', dragSrcId); } catch (_) {}
}

function onDragOver(e) {
    const item = e.target.closest('.exercise-item');
    if (!item || item.dataset.id === dragSrcId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const rect = item.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    item.classList.remove('drag-over-top', 'drag-over-bottom');
    if (e.clientY < midpoint) {
        item.classList.add('drag-over-top');
    } else {
        item.classList.add('drag-over-bottom');
    }
}

function onDragLeave(e) {
    const item = e.target.closest('.exercise-item');
    if (item) item.classList.remove('drag-over-top', 'drag-over-bottom');
}

function onDrop(e) {
    e.preventDefault();
    const item = e.target.closest('.exercise-item');
    if (!item || !dragSrcId || item.dataset.id === dragSrcId) {
        cleanupDrag();
        return;
    }

    const list = state.workouts[state.currentDay];
    const srcIdx = list.findIndex(x => x.id === dragSrcId);
    const dstIdx = list.findIndex(x => x.id === item.dataset.id);
    if (srcIdx === -1 || dstIdx === -1) {
        cleanupDrag();
        return;
    }

    const rect = item.getBoundingClientRect();
    const before = e.clientY < rect.top + rect.height / 2;
    const [moved] = list.splice(srcIdx, 1);
    // After removing src, dst index may shift
    let insertAt = list.findIndex(x => x.id === item.dataset.id);
    if (!before) insertAt += 1;
    list.splice(insertAt, 0, moved);

    cleanupDrag();
    saveState();
    renderAll();
}

function onDragEnd() {
    cleanupDrag();
}

function cleanupDrag() {
    document.querySelectorAll('.exercise-item').forEach(it => {
        it.classList.remove('dragging', 'drag-over-top', 'drag-over-bottom');
    });
    dragSrcId = null;
}

// ---------- Workout history modal ----------
function openHistoryModal() {
    renderHistoryModal();
    document.getElementById('historyModal').classList.add('open');
}

function renderHistoryModal() {
    const streak = calculateStreak();
    const longest = calculateLongestStreak();
    const total = totalWorkoutDays();

    document.getElementById('histCurrentStreak').textContent = streak;
    document.getElementById('histLongestStreak').textContent = longest;
    document.getElementById('histTotalWorkouts').textContent = total;
    document.getElementById('histStreakPlural').textContent = streak === 1 ? '' : 's';
    document.getElementById('histLongestPlural').textContent = longest === 1 ? '' : 's';

    renderHeatmap();
    renderHistoryLog();
}

function renderHeatmap() {
    const heatmap = document.getElementById('historyHeatmap');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKeyStr = dateKey(today);

    // Find the most recent Monday (or today if Monday)
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() - daysSinceMonday);

    // Go back 11 weeks for 12 weeks total
    const startDate = new Date(thisMonday);
    startDate.setDate(thisMonday.getDate() - 11 * 7);

    const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

    // Build grid: 7 rows (days of week) x 13 cols (12 weeks + label column)
    // We iterate row by row
    let html = '';
    for (let row = 0; row < 7; row++) {
        html += `<span class="heatmap-day-label">${dayLabels[row]}</span>`;
        for (let week = 0; week < 12; week++) {
            const cellDate = new Date(startDate);
            cellDate.setDate(startDate.getDate() + week * 7 + row);

            // Don't render cells after today
            if (cellDate > today) {
                html += `<span class="heatmap-cell heatmap-empty"></span>`;
                continue;
            }

            const key = dateKey(cellDate);
            const count = state.history[key] || 0;
            const isToday = key === todayKeyStr;
            const tooltip = `${monthFormatter.format(cellDate)} · ${count} exercise${count === 1 ? '' : 's'}`;
            html += `<span class="heatmap-cell ${count > 0 ? 'active' : ''} ${isToday ? 'today' : ''}" data-tooltip="${tooltip}"></span>`;
        }
    }
    heatmap.innerHTML = html;
}

function renderHistoryLog() {
    const log = document.getElementById('historyLog');
    const entries = Object.entries(state.history)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, 20); // last 20 entries

    if (entries.length === 0) {
        log.innerHTML = '<li class="history-empty">No completed workouts yet. Check off some exercises to start your streak.</li>';
        return;
    }

    const formatter = new Intl.DateTimeFormat('en-US', {
        weekday: 'long', month: 'short', day: 'numeric'
    });

    log.innerHTML = entries.map(([date, count]) => {
        const [y, m, d] = date.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        const isToday = date === todayKey();
        const label = isToday ? 'Today' : formatter.format(dateObj);
        return `
            <li class="history-log-item">
                <span class="history-log-date">${label}</span>
                <span class="history-log-count">${count} exercise${count === 1 ? '' : 's'} completed</span>
            </li>
        `;
    }).join('');
}

// ---------- Print ----------
function buildPrintExerciseHtml(ex) {
    const parts = [];
    if (ex.sets > 0 && ex.reps > 0) parts.push(`${ex.sets} × ${ex.reps}`);
    if (ex.weight > 0) parts.push(`${ex.weight} lbs`);
    const stats = parts.length ? `<span class="print-exercise-stats">${escapeHtml(parts.join(' · '))}</span>` : '<span></span>';
    const notes = ex.notes
        ? `<div class="print-exercise-notes">Note: ${escapeHtml(ex.notes)}</div>`
        : '';
    return `
        <li class="print-exercise">
            <span class="print-checkbox ${ex.done ? 'checked' : ''}"></span>
            <div>
                <span class="print-exercise-name">${escapeHtml(ex.name)}</span>
                <span class="print-exercise-muscle">— ${escapeHtml(ex.muscle)}</span>
                ${notes}
            </div>
            ${stats}
        </li>
    `;
}

function buildPrintDayHtml(day) {
    const exercises = state.workouts[day];
    const done = exercises.filter(e => e.done).length;
    const meta = exercises.length > 0
        ? `${exercises.length} exercise${exercises.length === 1 ? '' : 's'} · ${done} completed`
        : 'Rest day';

    const exercisesHtml = exercises.length === 0
        ? '<div class="print-day-empty">No exercises planned.</div>'
        : `<ul class="print-exercises">${exercises.map(buildPrintExerciseHtml).join('')}</ul>`;

    return `
        <section class="print-day">
            <div class="print-day-header">
                <h2>${FULL_DAY_NAMES[day]}</h2>
                <span class="print-day-meta">${meta}</span>
            </div>
            ${exercisesHtml}
        </section>
    `;
}

function printDay(dayOnly = false) {
    const root = document.getElementById('printRoot');
    const dateStr = new Intl.DateTimeFormat('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    }).format(new Date());

    const days = dayOnly ? [state.currentDay] : DAYS;
    const subtitle = dayOnly
        ? `${FULL_DAY_NAMES[state.currentDay]} workout · ${dateStr}`
        : `Weekly workout plan · ${dateStr}`;

    root.innerHTML = `
        <div class="print-header">
            <h1>FitTrack</h1>
            <div class="print-subtitle">${escapeHtml(subtitle)}</div>
        </div>
        ${days.map(buildPrintDayHtml).join('')}
        <div class="print-footer">Generated by FitTrack · ${escapeHtml(dateStr)}</div>
    `;

    // Print runs synchronously; cleanup after
    window.print();

    // Clear out after print to keep DOM tidy
    setTimeout(() => { root.innerHTML = ''; }, 100);
}


function toggleDropdown(menuId) {
    const menu = document.getElementById(menuId);
    const wasOpen = menu.classList.contains('open');
    // Close all dropdowns
    document.querySelectorAll('.dropdown.open').forEach(d => d.classList.remove('open'));
    if (!wasOpen) menu.classList.add('open');
}

function closeAllDropdowns() {
    document.querySelectorAll('.dropdown.open').forEach(d => d.classList.remove('open'));
}

// ---------- Event handlers ----------
function attachEvents() {
    // Day tabs
    document.querySelectorAll('.day-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            state.currentDay = tab.dataset.day;
            renderAll();
        });
    });

    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    // Add exercise
    document.getElementById('addExerciseBtn').addEventListener('click', () => openExerciseModal());

    // Library
    document.getElementById('libraryBtn').addEventListener('click', openLibrary);

    // Save exercise
    document.getElementById('saveExerciseBtn').addEventListener('click', saveExercise);

    // Close modals
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });
    document.querySelectorAll('.modal-backdrop').forEach(bd => {
        bd.addEventListener('click', (e) => {
            if (e.target === bd) closeAllModals();
        });
    });

    // Exercise list (delegate)
    const exList = document.getElementById('exerciseList');
    exList.addEventListener('click', (e) => {
        const item = e.target.closest('.exercise-item');
        if (!item) return;
        const actionBtn = e.target.closest('[data-action]');
        if (!actionBtn) return;
        const id = item.dataset.id;
        const action = actionBtn.dataset.action;

        if (action === 'toggle') {
            const ex = state.workouts[state.currentDay].find(x => x.id === id);
            if (ex) {
                ex.done = !ex.done;
                // Log to history only when marking as done (not when un-checking)
                if (ex.done) logWorkoutToday();
                saveState();
                renderAll();
            }
        } else if (action === 'edit') {
            openExerciseModal(id);
        } else if (action === 'timer') {
            openTimer(id);
        } else if (action === 'delete') {
            if (confirm('Delete this exercise?')) {
                state.workouts[state.currentDay] = state.workouts[state.currentDay].filter(x => x.id !== id);
                saveState();
                renderAll();
                showToast('Exercise deleted');
            }
        }
    });

    // Drag and drop on exercise list
    exList.addEventListener('dragstart', onDragStart);
    exList.addEventListener('dragover', onDragOver);
    exList.addEventListener('dragleave', onDragLeave);
    exList.addEventListener('drop', onDrop);
    exList.addEventListener('dragend', onDragEnd);

    // Library list (delegate)
    document.getElementById('libraryList').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-lib-name]');
        if (btn) addFromLibrary(btn.dataset.libName);
    });

    // Library search
    document.getElementById('librarySearch').addEventListener('input', (e) => {
        state.librarySearch = e.target.value;
        renderLibrary();
    });

    // Library filter chips
    document.getElementById('filterChips').addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        document.querySelectorAll('#filterChips .chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.libraryFilter = chip.dataset.filter;
        renderLibrary();
    });

    // Enter to save in modal
    document.getElementById('exerciseModal').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            saveExercise();
        }
    });

    // Dropdown menus
    document.getElementById('dataMenuBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown('dataMenu');
    });
    document.getElementById('dayMenuBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown('dayMenu');
    });

    // Close dropdowns on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.menu-wrap')) closeAllDropdowns();
    });

    // Data menu actions
    document.getElementById('exportBtn').addEventListener('click', () => {
        closeAllDropdowns();
        exportData();
    });
    document.getElementById('importBtn').addEventListener('click', () => {
        closeAllDropdowns();
        document.getElementById('importFile').click();
    });
    document.getElementById('importFile').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) importData(file);
        e.target.value = ''; // reset so same file can be re-selected
    });
    document.getElementById('resetWeekBtn').addEventListener('click', () => {
        closeAllDropdowns();
        resetWeek();
    });

    // Day menu actions
    document.getElementById('copyDayBtn').addEventListener('click', () => {
        closeAllDropdowns();
        openCopyDay();
    });
    document.getElementById('printDayBtn').addEventListener('click', () => {
        closeAllDropdowns();
        printDay(true);
    });
    document.getElementById('printWeekBtn').addEventListener('click', () => {
        closeAllDropdowns();
        printDay(false);
    });
    document.getElementById('clearDayBtn').addEventListener('click', () => {
        closeAllDropdowns();
        clearDay();
    });

    // Streak button → open history modal
    document.getElementById('streakBtn').addEventListener('click', openHistoryModal);

    // Copy day grid (delegate)
    document.getElementById('copyDayGrid').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-target]');
        if (btn && !btn.classList.contains('disabled')) {
            copyDayTo(btn.dataset.target);
        }
    });

    // Timer controls
    document.getElementById('timerCloseBtn').addEventListener('click', closeTimer);
    document.getElementById('timerStartBtn').addEventListener('click', startTimer);
    document.getElementById('timerResetBtn').addEventListener('click', resetTimer);
    document.querySelectorAll('.timer-preset').forEach(btn => {
        btn.addEventListener('click', () => setTimerDuration(parseInt(btn.dataset.secs)));
    });

    // Escape closes modals & timer
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
            closeTimer();
            closeAllDropdowns();
        }
    });
}

// ---------- Init ----------
function init() {
    loadTheme();
    loadState();
    attachEvents();
    renderAll();
}

document.addEventListener('DOMContentLoaded', init);
