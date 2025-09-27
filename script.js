// State variables
let time = 0;
let isRunning = false;
let currentActivity = '';
let customActivityName = '';
let dailyActivities = {};
let dailyProgress = {};
let showAddActivity = false;
let newActivityName = '';
let newActivityTarget = 120;
let intervalId = null;

// DOM elements
const timerDisplay = document.getElementById('timer-display');
const sessionDisplay = document.getElementById('session-display');
const currentDateEl = document.getElementById('current-date');
const customActivityInput = document.getElementById('custom-activity-input');
const addActivityBtn = document.getElementById('add-activity-btn');
const addActivityModal = document.getElementById('add-activity-modal');
const newActivityNameInput = document.getElementById('new-activity-name');
const newActivityTargetInput = document.getElementById('new-activity-target');
const confirmAddActivityBtn = document.getElementById('confirm-add-activity');
const cancelAddActivityBtn = document.getElementById('cancel-add-activity');
const startTimerBtn = document.getElementById('start-timer-btn');
const pauseTimerBtn = document.getElementById('pause-timer-btn');
const stopTimerBtn = document.getElementById('stop-timer-btn');
const resetTimerBtn = document.getElementById('reset-timer-btn');
const existingActivitiesEl = document.getElementById('existing-activities');
const progressSection = document.getElementById('progress-section');
const progressGrid = document.getElementById('progress-grid');
const overviewGrid = document.getElementById('overview-grid');
const sessionsList = document.getElementById('sessions-list');

// LocalStorage keys
const STORAGE_KEYS = {
  dailyActivities: 'dailyActivities',
  dailyProgress: 'dailyProgress'
};

// Utility functions
const getTodayKey = () => {
  return new Date().toISOString().split('T')[0];
};

const formatDate = (dateKey) => {
  return new Date(dateKey + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatTime = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatTimeDisplay = (seconds) => {
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

const getRandomColor = () => {
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-red-500', 
    'bg-yellow-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500',
    'bg-orange-500', 'bg-cyan-500'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

const getActivityColor = (activityKey) => {
  const today = getTodayKey();
  const todayActivities = dailyActivities[today] || {};
  const activity = todayActivities[activityKey];
  return activity?.color || 'bg-gray-500';
};

// Persistence functions
const loadData = () => {
  const activities = localStorage.getItem(STORAGE_KEYS.dailyActivities);
  const progress = localStorage.getItem(STORAGE_KEYS.dailyProgress);
  if (activities) dailyActivities = JSON.parse(activities);
  if (progress) dailyProgress = JSON.parse(progress);
};

const saveData = () => {
  localStorage.setItem(STORAGE_KEYS.dailyActivities, JSON.stringify(dailyActivities));
  localStorage.setItem(STORAGE_KEYS.dailyProgress, JSON.stringify(dailyProgress));
};

// Timer functions
const startTimer = () => {
  if (!currentActivity && !customActivityName.trim()) return;
  isRunning = true;
  intervalId = setInterval(() => {
    time++;
    updateTimerDisplay();
  }, 1000);
  updateControls();
};

const pauseTimer = () => {
  isRunning = false;
  clearInterval(intervalId);
  updateControls();
};

const stopTimer = () => {
  if (time > 0) {
    const today = getTodayKey();
    const minutesWorked = Math.floor(time / 60);
    
    let activityKey = currentActivity;
    let activityDisplayName = '';
    
    if (currentActivity) {
      const todayActivities = dailyActivities[today] || {};
      activityDisplayName = todayActivities[currentActivity]?.name || currentActivity;
    } else if (customActivityName.trim()) {
      activityKey = 'custom_' + Date.now();
      activityDisplayName = customActivityName.trim();
    }
    
    const todayData = dailyProgress[today] || { sessions: [] };
    dailyProgress[today] = {
      ...todayData,
      [activityKey]: (todayData[activityKey] || 0) + minutesWorked,
      sessions: [
        ...todayData.sessions,
        {
          id: Date.now(),
          activity: activityKey,
          activityName: activityDisplayName,
          minutes: minutesWorked,
          time: new Date().toLocaleTimeString(),
          timestamp: Date.now()
        }
      ]
    };
    
    saveData();
    renderProgress();
    renderOverview();
    renderSessions();
    customActivityName = '';
    customActivityInput.value = '';
  }
  
  time = 0;
  isRunning = false;
  clearInterval(intervalId);
  currentActivity = '';
  updateTimerDisplay();
  updateControls();
  renderExistingActivities();
};

const resetTimer = () => {
  time = 0;
  isRunning = false;
  clearInterval(intervalId);
  currentActivity = '';
  customActivityName = '';
  customActivityInput.value = '';
  updateTimerDisplay();
  updateControls();
  renderExistingActivities();
};

// Activity functions
const addActivity = () => {
  if (!newActivityName.trim()) return;
  
  const today = getTodayKey();
  const activityKey = newActivityName.toLowerCase().replace(/\s+/g, '_');
  
  if (!dailyActivities[today]) dailyActivities[today] = {};
  dailyActivities[today][activityKey] = {
    name: newActivityName.trim(),
    target: newActivityTarget,
    color: getRandomColor()
  };
  
  saveData();
  newActivityName = '';
  newActivityTarget = 120;
  newActivityNameInput.value = '';
  newActivityTargetInput.value = '120';
  showAddActivity = false;
  addActivityModal.classList.add('hidden');
  renderExistingActivities();
  renderProgress();
};

const removeActivity = (activityKey) => {
  const today = getTodayKey();
  if (dailyActivities[today]) {
    delete dailyActivities[today][activityKey];
    saveData();
  }
  
  if (currentActivity === activityKey) {
    currentActivity = '';
    resetTimer();
  }
  
  renderExistingActivities();
  renderProgress();
  renderSessions();
};

const updateActivityTarget = (activityKey, newTarget) => {
  const today = getTodayKey();
  if (dailyActivities[today] && dailyActivities[today][activityKey]) {
    dailyActivities[today][activityKey].target = Math.max(15, parseInt(newTarget) || 15);
    saveData();
    renderProgress();
  }
};

const deleteSession = (sessionId) => {
  const today = getTodayKey();
  if (dailyProgress[today] && dailyProgress[today].sessions) {
    const sessionIndex = dailyProgress[today].sessions.findIndex(s => s.id === sessionId);
    if (sessionIndex !== -1) {
      const session = dailyProgress[today].sessions[sessionIndex];
      dailyProgress[today][session.activity] = Math.max(0, (dailyProgress[today][session.activity] || 0) - session.minutes);
      dailyProgress[today].sessions = dailyProgress[today].sessions.filter(s => s.id !== sessionId);
      saveData();
      renderProgress();
      renderOverview();
      renderSessions();
    }
  }
};

// Render functions
const updateTimerDisplay = () => {
  timerDisplay.textContent = formatTime(time);
  sessionDisplay.textContent = `Current session: ${formatTimeDisplay(time)}`;
};

const renderExistingActivities = () => {
  const today = getTodayKey();
  const todayActivities = dailyActivities[today] || {};
  existingActivitiesEl.innerHTML = '';
  
  Object.entries(todayActivities).forEach(([key, activity]) => {
    const btn = document.createElement('button');
    btn.className = `flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
      currentActivity === key 
        ? `${activity.color} text-white` 
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }`;
    btn.innerHTML = `
      ${activity.name}
      <span class="text-xs cursor-pointer hover:bg-red-500 hover:text-white rounded-full p-0.5 ml-auto" onclick="event.stopPropagation(); removeActivity('${key}');">✕</span>
    `;
    btn.onclick = () => {
      currentActivity = key;
      customActivityName = '';
      customActivityInput.value = '';
      updateControls();
      renderExistingActivities();
    };
    existingActivitiesEl.appendChild(btn);
  });
  
  // Show/hide progress section
  progressSection.classList.toggle('hidden', Object.keys(todayActivities).length === 0);
};

const renderProgress = () => {
  const today = getTodayKey();
  const todayActivities = dailyActivities[today] || {};
  const todayProgressData = dailyProgress[today] || {};
  progressGrid.innerHTML = '';
  
  Object.entries(todayActivities).forEach(([key, activity]) => {
    const progress = todayProgressData[key] || 0;
    const percentage = Math.min((progress / activity.target) * 100, 100);
    
    const div = document.createElement('div');
    div.className = 'bg-gray-50 p-4 rounded-lg';
    div.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <span class="font-medium text-gray-800">${activity.name}</span>
        <div class="flex items-center gap-2">
          <span class="text-gray-600">
            ${formatTimeDisplay(progress * 60)} / ${formatTimeDisplay(activity.target * 60)}
          </span>
          <input
            type="number"
            value="${activity.target}"
            step="15"
            min="15"
            class="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            onchange="updateActivityTarget('${key}', this.value)"
            placeholder="min"
          />
          <span class="text-xs text-gray-500">min</span>
        </div>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-3">
        <div
          class="h-3 rounded-full transition-all duration-300 ${activity.color}"
          style="width: ${percentage}%"
        ></div>
      </div>
    `;
    progressGrid.appendChild(div);
  });
};

const getRecentDays = (days = 7) => {
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().split('T')[0];
    result.push({
      key,
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      data: dailyProgress[key] || {},
      activities: dailyActivities[key] || {}
    });
  }
  return result;
};

const renderOverview = () => {
  const recentDays = getRecentDays();
  overviewGrid.innerHTML = '';
  
  recentDays.forEach(day => {
    const totalMinutes = Object.values(day.data).reduce((sum, val) => {
      return sum + (typeof val === 'number' ? val : 0);
    }, 0);
    
    const div = document.createElement('div');
    div.className = 'text-center p-3 border rounded-lg';
    let activitiesHtml = '';
    Object.entries(day.activities).slice(0, 3).forEach(([key, activity]) => {
      activitiesHtml += `
        <div class="text-xs">
          <span class="truncate block">${activity.name}</span>
          <span class="text-gray-600">${formatTimeDisplay((day.data[key] || 0) * 60)}</span>
        </div>
      `;
    });
    if (Object.keys(day.activities).length > 3) {
      activitiesHtml += `<div class="text-xs text-gray-500">+${Object.keys(day.activities).length - 3} more</div>`;
    }
    div.innerHTML = `
      <div class="text-xs font-medium text-gray-600 mb-2">${day.date}</div>
      <div class="space-y-1">
        ${activitiesHtml}
        <div class="text-xs font-medium text-gray-700 pt-1 border-t">
          Total: ${formatTimeDisplay(totalMinutes * 60)}
        </div>
      </div>
    `;
    overviewGrid.appendChild(div);
  });
};

const renderSessions = () => {
  const today = getTodayKey();
  const todayProgressData = dailyProgress[today] || { sessions: [] };
  const sessions = todayProgressData.sessions || [];
  
  if (sessions.length === 0) {
    sessionsList.innerHTML = '<p class="text-gray-600 text-center py-8">No sessions recorded today. Start your first timer!</p>';
    return;
  }
  
  sessionsList.innerHTML = '';
  sessions.slice().reverse().forEach(session => {
    const div = document.createElement('div');
    div.className = 'bg-gray-50 p-4 rounded-lg border border-gray-200 flex items-center justify-between';
    div.innerHTML = `
      <div class="flex-1">
        <div class="flex items-center gap-3 mb-1">
          <span class="px-3 py-1 rounded text-xs font-medium text-white ${getActivityColor(session.activity)}">
            ${session.activityName}
          </span>
        </div>
        <div class="text-sm text-gray-600">
          ${formatTimeDisplay(session.minutes * 60)} • ${session.time}
        </div>
      </div>
      <button
        onclick="deleteSession(${session.id})"
        class="text-red-500 hover:text-red-700 px-2 py-1 text-sm transition-colors"
      >
        Delete
      </button>
    `;
    sessionsList.appendChild(div);
  });
};

const updateControls = () => {
  startTimerBtn.disabled = !currentActivity && !customActivityName.trim();
  stopTimerBtn.disabled = time === 0;
  pauseTimerBtn.classList.toggle('hidden', !isRunning);
  startTimerBtn.classList.toggle('hidden', isRunning);
  
  // Update start button text if custom
  if (isRunning) {
    startTimerBtn.innerHTML = '▶ Start Timer';
  }
};

const toggleAddModal = () => {
  showAddActivity = !showAddActivity;
  addActivityModal.classList.toggle('hidden', !showAddActivity);
};

// Event listeners
customActivityInput.addEventListener('input', (e) => {
  customActivityName = e.target.value;
  if (customActivityName) {
    currentActivity = '';
  }
  updateControls();
  renderExistingActivities();
});

addActivityBtn.addEventListener('click', toggleAddModal);

confirmAddActivityBtn.addEventListener('click', addActivity);

cancelAddActivityBtn.addEventListener('click', () => {
  showAddActivity = false;
  addActivityModal.classList.add('hidden');
  newActivityNameInput.value = '';
  newActivityTargetInput.value = '120';
});

newActivityNameInput.addEventListener('input', (e) => {
  newActivityName = e.target.value;
});

newActivityTargetInput.addEventListener('input', (e) => {
  newActivityTarget = Math.max(15, parseInt(e.target.value) || 15);
});

startTimerBtn.addEventListener('click', startTimer);

pauseTimerBtn.addEventListener('click', pauseTimer);

stopTimerBtn.addEventListener('click', stopTimer);

resetTimerBtn.addEventListener('click', resetTimer);

// Initialization
const init = () => {
  loadData();
  const today = getTodayKey();
  currentDateEl.textContent = formatDate(today);
  updateTimerDisplay();
  renderExistingActivities();
  renderProgress();
  renderOverview();
  renderSessions();
  updateControls();
};

window.addEventListener('load', init);
