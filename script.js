// ok so here we set up some main timer variables
let timeLeft = 25 * 60; // starting at 25 mins (converted to seconds)
let timerInterval = null; // so we can start/stop it later
let isRunning = false; // flag to check if timer is going
let currentMode = 'work'; // modes: work, short break, long break
let originalTime = 25 * 60; // save original duration so we can reset

// store your stats in local storage so it remembers even after refresh
let progressData = JSON.parse(localStorage.getItem('pomodoroProgress')) || {
    daily: {},
    total: 0,
    streak: 0,
    lastDate: null
};

// todo list storage stuff
let todos = JSON.parse(localStorage.getItem('pomodoroTodos')) || [];
let nextTodoId = parseInt(localStorage.getItem('nextTodoId')) || 1;

let chart = null; // will hold our chart.js instance

// switch between home / stats / planner pages
function showSection(section, event) {
    // remove "active" class from all nav items
    document.querySelectorAll('.headertwo span').forEach(span => {
        span.classList.remove('active');
    });
    if (event) event.target.classList.add('active'); // highlight clicked nav

    // hide all pages
    document.querySelectorAll('.page-section').forEach(page => {
        page.classList.remove('active');
    });

    // show the chosen page + do extra setup for it
    if (section === 'home') {
        document.getElementById('homePage').classList.add('active');
    } else if (section === 'stats') {
        document.getElementById('statsPage').classList.add('active');
        updateStatsPage();
        setTimeout(() => initChart(), 100); // wait a bit to init chart
    } else if (section === 'planner') {
        document.getElementById('plannerPage').classList.add('active');
        renderTodos();
    }
}

// update the numbers on the timer display
function updateDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.getElementById('timer').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function startTimer() {
    if (!isRunning) {
        isRunning = true;
        document.getElementById('start').textContent = 'Running...';

        // only try to animate tomato if it exists
        const tomatoEl = document.getElementById('tomato');
        if (tomatoEl) tomatoEl.classList.add('running');

        timerInterval = setInterval(() => {
            timeLeft--;
            updateDisplay();
            if (timeLeft <= 0) {
                completeTimer();
            }
        }, 1000);
    }
}

function pauseTimer() {
    if (isRunning) {
        isRunning = false;
        clearInterval(timerInterval);
        document.getElementById('start').textContent = 'Start';

        const tomatoEl = document.getElementById('tomato');
        if (tomatoEl) tomatoEl.classList.remove('running');
    }
}

function resetTimer() {
    pauseTimer();
    timeLeft = originalTime;
    updateDisplay();
    document.getElementById('start').textContent = 'Start';

    const tomatoEl = document.getElementById('tomato');
    if (tomatoEl) tomatoEl.classList.remove('running', 'completed');
}

function completeTimer() {
    pauseTimer();

    const tomatoEl = document.getElementById('tomato');
    if (tomatoEl) tomatoEl.classList.add('completed');

    showAlert();

    if (currentMode === 'work') {
        addCompletedPomodoro();
    }

    setTimeout(() => {
        resetTimer();
    }, 3000);
}

// start a break session (short or long)
function startBreak(minutes) {
    pauseTimer();
    currentMode = minutes === 5 ? 'shortBreak' : 'longBreak';
    timeLeft = minutes * 60;
    originalTime = minutes * 60;
    document.getElementById('modeIndicator').textContent = 
        minutes === 5 ? 'Short Break' : 'Long Break';
    updateDisplay();
    document.getElementById('start').textContent = 'Start';
}

// lil popup when a session ends
function showAlert() {
    const alert = document.getElementById('alert');
    if (!alert) return;

    const messages = {
        'work': 'Work session complete! Time for a break! 🍅',
        'shortBreak': 'Break over! Ready to work? 💪',
        'longBreak': 'Long break complete! Let\'s get productive! 🚀'
    };
    
    alert.textContent = messages[currentMode];
    alert.classList.add('show');
    
    setTimeout(() => {
        alert.classList.remove('show');
    }, 3000);
}

// track completed sessions
function addCompletedPomodoro() {
    const today = new Date().toDateString();

    if (!progressData.daily[today]) {
        progressData.daily[today] = 0;
    }
    progressData.daily[today]++;
    progressData.total++;

    if (progressData.lastDate === today) {
        // same day, streak continues
    } else if (isYesterday(progressData.lastDate)) {
        progressData.streak++;
    } else {
        progressData.streak = 1;
    }
    progressData.lastDate = today;

    localStorage.setItem('pomodoroProgress', JSON.stringify(progressData));
    updateStats();
    updateChart();
}

// check if a date string is literally yesterday
function isYesterday(dateString) {
    if (!dateString) return false;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return dateString === yesterday.toDateString();
}

// update stats on home page
function updateStats() {
    const today = new Date().toDateString();
    const todayCount = progressData.daily[today] || 0;
    document.getElementById('todayPomodoros').textContent = todayCount;
    document.getElementById('totalPomodoros').textContent = progressData.total;
    document.getElementById('streak').textContent = progressData.streak;
}

// update stats on stats page
function updateStatsPage() {
    const today = new Date().toDateString();
    const todayCount = progressData.daily[today] || 0;
    const days = Object.keys(progressData.daily).length || 1;
    const average = Math.round(progressData.total / days * 10) / 10;

    document.getElementById('statsTodayPomodoros').textContent = todayCount;
    document.getElementById('statsTotalPomodoros').textContent = progressData.total;
    document.getElementById('statsStreak').textContent = progressData.streak;
    document.getElementById('avgDaily').textContent = average;
}

// todo list functions
function addTodo() {
    const input = document.getElementById('todoInput');
    const text = input.value.trim();
    if (text === '') return;

    const todo = {
        id: nextTodoId++,
        text: text,
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    todos.unshift(todo);
    input.value = '';
    saveTodos();
    renderTodos();
}

function deleteTodo(id) {
    todos = todos.filter(todo => todo.id !== id);
    saveTodos();
    renderTodos();
}

function toggleTodo(id) {
    const todo = todos.find(todo => todo.id === id);
    if (todo) {
        todo.completed = !todo.completed;
        saveTodos();
        renderTodos();
    }
}

function editTodo(id, newText) {
    const todo = todos.find(todo => todo.id === id);
    if (todo && newText.trim() !== '') {
        todo.text = newText.trim();
        saveTodos();
        renderTodos();
    }
}

function saveTodos() {
    localStorage.setItem('pomodoroTodos', JSON.stringify(todos));
    localStorage.setItem('nextTodoId', nextTodoId.toString());
}

function renderTodos() {
    const todoList = document.getElementById('todoList');
    if (todos.length === 0) {
        todoList.innerHTML = '<li class="empty-state">No tasks yet. Add one above to get started! 🚀</li>';
        return;
    }
    
    todoList.innerHTML = todos.map(todo => `
        <li class="todo-item ${todo.completed ? 'completed' : ''}">
            <input type="text" 
                   class="todo-text" 
                   value="${todo.text}" 
                   onblur="editTodo(${todo.id}, this.value)"
                   onkeypress="if(event.key==='Enter') this.blur()">
            <div class="todo-actions">
                <button class="action-btn complete-btn" 
                        onclick="toggleTodo(${todo.id})" 
                        title="${todo.completed ? 'Mark as incomplete' : 'Mark as complete'}">
                    ${todo.completed ? '↶' : '✓'}
                </button>
                <button class="action-btn delete-btn" 
                        onclick="deleteTodo(${todo.id})" 
                        title="Delete task">
                    ✕
                </button>
            </div>
        </li>
    `).join('');
}

// chart stuff
function initChart() {
    const ctx = document.getElementById('progressChart');
    if (!ctx) return;

    const last7Days = getLast7Days();
    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: last7Days.map(date => {
                const d = new Date(date);
                return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            }),
            datasets: [{
                label: 'Pomodoros Completed',
                data: last7Days.map(date => progressData.daily[date] || 0),
                borderColor: '#ff5252',
                backgroundColor: 'rgba(255, 82, 82, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#ff5252',
                pointRadius: 6,
                pointHoverRadius: 8 // fixed from broken pointH
            }]
        }
    });
}

// helper for chart
function getLast7Days() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toDateString());
    }
    return days;
}

function updateChart() {
    if (chart) {
        const last7Days = getLast7Days();
        chart.data.datasets[0].data = last7Days.map(date => progressData.daily[date] || 0);
        chart.update();
    }
}
