/* ============================================================
   TaskFlow — Frontend Application Logic
   Handles: API calls, Kanban drag-drop, task rendering,
   workload balancing, modals, filters, toasts
   Falls back to localStorage when backend unavailable.
   ============================================================ */

const API = 'http://localhost:3001/api';

// ---- State ----
let state = {
  tasks: [],
  projects: [],
  users: [],
  workload: [],
  activeFilter: 'all',
  activeProjectId: null,
  dragTaskId: null,
  editingTaskId: null,
  selectedAssigneeIds: new Set(),
  useLocalFallback: false,
};

// ============================================================
// LOCAL STORAGE MOCK (Fallback when backend is unreachable)
// ============================================================
const SEED = {
  projects: [
    { id: 1, name: 'Product Launch', description: 'Q4 product launch coordination', created_at: new Date().toISOString() },
    { id: 2, name: 'Website Redesign', description: 'Complete overhaul of company website', created_at: new Date().toISOString() },
  ],
  users: [
    { id: 1, name: 'Alice Johnson', email: 'alice@team.com', avatar_color: '#6366f1', created_at: new Date().toISOString() },
    { id: 2, name: 'Bob Martinez', email: 'bob@team.com', avatar_color: '#ec4899', created_at: new Date().toISOString() },
    { id: 3, name: 'Carol White', email: 'carol@team.com', avatar_color: '#10b981', created_at: new Date().toISOString() },
    { id: 4, name: 'David Kim', email: 'david@team.com', avatar_color: '#f59e0b', created_at: new Date().toISOString() },
    { id: 5, name: 'Eva Chen', email: 'eva@team.com', avatar_color: '#3b82f6', created_at: new Date().toISOString() },
  ],
  tasks: [
    { id: 1, project_id: 1, title: 'Design mockups', description: 'Create Figma mockups for all screens', priority: 'high', status: 'todo', due_date: '2026-09-25', created_at: new Date().toISOString(), assignees: [{ id: 1, name: 'Alice Johnson', email: 'alice@team.com', avatar_color: '#6366f1' }] },
    { id: 2, project_id: 1, title: 'Setup CI/CD pipeline', description: 'Configure GitHub Actions for deployment', priority: 'medium', status: 'inprogress', due_date: '2026-09-20', created_at: new Date().toISOString(), assignees: [{ id: 2, name: 'Bob Martinez', email: 'bob@team.com', avatar_color: '#ec4899' }] },
    { id: 3, project_id: 1, title: 'Write unit tests', description: 'Cover all API endpoints with Jest tests', priority: 'low', status: 'todo', due_date: '2026-09-28', created_at: new Date().toISOString(), assignees: [] },
    { id: 4, project_id: 1, title: 'Database optimization', description: 'Index frequently queried columns', priority: 'high', status: 'done', due_date: '2026-09-15', created_at: new Date().toISOString(), assignees: [{ id: 4, name: 'David Kim', email: 'david@team.com', avatar_color: '#f59e0b' }] },
    { id: 5, project_id: 1, title: 'User authentication', description: 'Implement JWT-based auth flow', priority: 'high', status: 'inprogress', due_date: '2026-09-22', created_at: new Date().toISOString(), assignees: [{ id: 1, name: 'Alice Johnson', email: 'alice@team.com', avatar_color: '#6366f1' }] },
    { id: 6, project_id: 2, title: 'Content audit', description: 'Review and update all website copy', priority: 'medium', status: 'todo', due_date: '2026-09-30', created_at: new Date().toISOString(), assignees: [] },
    { id: 7, project_id: 2, title: 'SEO optimization', description: 'Fix meta tags and improve page speed', priority: 'high', status: 'inprogress', due_date: '2026-09-19', created_at: new Date().toISOString(), assignees: [{ id: 3, name: 'Carol White', email: 'carol@team.com', avatar_color: '#10b981' }] },
    { id: 8, project_id: 2, title: 'Mobile responsiveness', description: 'Ensure all pages work on mobile', priority: 'medium', status: 'done', due_date: '2026-09-14', created_at: new Date().toISOString(), assignees: [{ id: 5, name: 'Eva Chen', email: 'eva@team.com', avatar_color: '#3b82f6' }] },
  ],
};

function lsGet(key) {
  try {
    const raw = localStorage.getItem(`taskflow_${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function lsSet(key, val) {
  try { localStorage.setItem(`taskflow_${key}`, JSON.stringify(val)); } catch {}
}

function lsInit() {
  if (!lsGet('projects')) lsSet('projects', SEED.projects);
  if (!lsGet('users'))    lsSet('users',    SEED.users);
  if (!lsGet('tasks'))    lsSet('tasks',    SEED.tasks);
  if (!lsGet('nextId'))   lsSet('nextId',   100);
}

function lsNextId() {
  const id = (lsGet('nextId') || 100) + 1;
  lsSet('nextId', id);
  return id;
}

// ---- Local CRUD helpers ----
const Local = {
  getProjects: () => lsGet('projects') || [],
  getUsers:    () => lsGet('users')    || [],
  getTasks:    () => lsGet('tasks')    || [],

  createProject(data) {
    const projects = this.getProjects();
    const p = { id: lsNextId(), ...data, created_at: new Date().toISOString() };
    projects.unshift(p);
    lsSet('projects', projects);
    return p;
  },
  deleteProject(id) {
    lsSet('projects', this.getProjects().filter(p => p.id !== id));
    lsSet('tasks', this.getTasks().filter(t => t.project_id !== id));
  },

  createUser(data) {
    const users = this.getUsers();
    if (users.find(u => u.email === data.email)) throw new Error('Email already exists');
    const u = { id: lsNextId(), ...data, created_at: new Date().toISOString() };
    users.push(u);
    lsSet('users', users);
    return u;
  },

  createTask(data) {
    const tasks = this.getTasks();
    const users = this.getUsers();
    const assignees = (data.assignee_ids || []).map(uid => users.find(u => u.id === uid)).filter(Boolean);
    const t = {
      id: lsNextId(),
      project_id: data.project_id || null,
      title: data.title,
      description: data.description || '',
      priority: data.priority || 'medium',
      status: data.status || 'todo',
      due_date: data.due_date || null,
      created_at: new Date().toISOString(),
      assignees,
    };
    tasks.unshift(t);
    lsSet('tasks', tasks);
    return t;
  },

  updateTask(id, data) {
    const tasks = this.getTasks();
    const users = this.getUsers();
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1) throw new Error('Task not found');
    if (data.assignee_ids !== undefined) {
      data.assignees = data.assignee_ids.map(uid => users.find(u => u.id === uid)).filter(Boolean);
    }
    Object.assign(tasks[idx], data);
    lsSet('tasks', tasks);
    return tasks[idx];
  },

  deleteTask(id) {
    lsSet('tasks', this.getTasks().filter(t => t.id !== id));
  },

  getWorkload() {
    const users = this.getUsers();
    const tasks = this.getTasks();
    return users.map(u => {
      const myTasks = tasks.filter(t => t.assignees && t.assignees.some(a => a.id === u.id));
      const inprogress_count = myTasks.filter(t => t.status === 'inprogress').length;
      const todo_count = myTasks.filter(t => t.status === 'todo').length;
      const done_count = myTasks.filter(t => t.status === 'done').length;
      return {
        ...u,
        todo_count, inprogress_count, done_count,
        total_tasks: myTasks.length,
        burnout: inprogress_count > 5,
      };
    }).sort((a, b) => b.inprogress_count - a.inprogress_count);
  },
};

// ============================================================
// BOOTSTRAP
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  // Check if backend is reachable
  try {
    const res = await fetch(`${API}/health`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) throw new Error();
    state.useLocalFallback = false;
  } catch {
    state.useLocalFallback = true;
    lsInit();
    showBanner('Running in offline mode — data stored locally in your browser.');
  }

  await Promise.all([loadProjects(), loadUsers()]);
  await loadTasks();
  await loadWorkload();
  startWorkloadPolling();
  setupColorPicker();
});

function showBanner(msg) {
  const b = document.createElement('div');
  b.style.cssText = `position:fixed;top:0;left:0;right:0;z-index:9000;background:#f59e0b;color:#000;
    text-align:center;padding:7px 12px;font-size:0.8rem;font-weight:600;cursor:pointer;`;
  b.textContent = `⚡ ${msg} (Click to dismiss)`;
  b.onclick = () => b.remove();
  document.body.prepend(b);
}

// ============================================================
// API HELPERS
// ============================================================
async function apiFetch(path, options = {}) {
  try {
    const res = await fetch(`${API}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Request failed');
    }
    return await res.json();
  } catch (err) {
    showToast(err.message, 'error');
    throw err;
  }
}

// ============================================================
// LOAD DATA
// ============================================================
async function loadProjects() {
  try {
    if (state.useLocalFallback) {
      state.projects = Local.getProjects();
    } else {
      state.projects = await apiFetch('/projects');
    }
    renderProjectList();
    populateProjectSelect();
  } catch {}
}

async function loadUsers() {
  try {
    if (state.useLocalFallback) {
      state.users = Local.getUsers();
    } else {
      state.users = await apiFetch('/users');
    }
  } catch {}
}

async function loadTasks() {
  try {
    if (state.useLocalFallback) {
      let tasks = Local.getTasks();
      if (state.activeFilter !== 'all') tasks = tasks.filter(t => t.priority === state.activeFilter);
      if (state.activeProjectId) tasks = tasks.filter(t => t.project_id === state.activeProjectId);
      state.tasks = tasks;
    } else {
      const params = new URLSearchParams();
      if (state.activeFilter !== 'all') params.set('priority', state.activeFilter);
      if (state.activeProjectId) params.set('project_id', state.activeProjectId);
      state.tasks = await apiFetch(`/tasks?${params}`);
    }
    renderBoard();
  } catch {}
}

async function loadWorkload() {
  try {
    if (state.useLocalFallback) {
      state.workload = Local.getWorkload();
    } else {
      state.workload = await apiFetch('/users/workload/all');
    }
    renderWorkload();
  } catch {}
}

// ── Instant workload recompute from in-memory state (no API call) ──
// Called immediately on drag-drop for real-time sidebar updates
function computeWorkloadFromState() {
  const allTasks = state.useLocalFallback ? Local.getTasks() : state.tasks;
  const users = state.useLocalFallback ? Local.getUsers() : state.users;

  const workload = users.map(u => {
    // Include tasks from ALL statuses for workload (not filtered view)
    const myTasks = allTasks.filter(t =>
      Array.isArray(t.assignees) && t.assignees.some(a => a.id === u.id)
    );
    const inprogress_count = myTasks.filter(t => t.status === 'inprogress').length;
    const todo_count       = myTasks.filter(t => t.status === 'todo').length;
    const done_count       = myTasks.filter(t => t.status === 'done').length;
    return {
      ...u,
      todo_count,
      inprogress_count,
      done_count,
      total_tasks: myTasks.length,
      burnout: inprogress_count > 5,  // Business rule: >5 in-progress = burnout
    };
  }).sort((a, b) => b.inprogress_count - a.inprogress_count);

  state.workload = workload;
  renderWorkload();
}

function startWorkloadPolling() {
  // Poll every 5s to keep sidebar in sync with backend
  setInterval(async () => {
    await loadWorkload();
  }, 5000);
}

// ============================================================
// RENDER PROJECT LIST (Sidebar)
// ============================================================
function renderProjectList() {
  const container = document.getElementById('project-list');
  let html = `
    <div class="project-item ${state.activeProjectId === null ? 'active' : ''}"
         id="proj-all" onclick="selectProject(null)" tabindex="0" role="button" aria-pressed="${state.activeProjectId === null}">
      All Projects
    </div>`;
  state.projects.forEach(p => {
    const isActive = state.activeProjectId === p.id;
    html += `
      <div class="project-item ${isActive ? 'active' : ''}"
           id="proj-${p.id}" onclick="selectProject(${p.id})" tabindex="0" role="button" aria-pressed="${isActive}">
        ${escHtml(p.name)}
      </div>`;
  });
  container.innerHTML = html;
  populateProjectSelect();
}

function selectProject(id) {
  state.activeProjectId = id;
  const titleEl = document.getElementById('board-title');
  if (id === null) {
    titleEl.textContent = 'All Tasks';
  } else {
    const proj = state.projects.find(p => p.id === id);
    titleEl.textContent = proj ? proj.name : 'Project';
  }
  renderProjectList();
  loadTasks();
}

function populateProjectSelect() {
  const sel = document.getElementById('task-project');
  if (!sel) return;
  sel.innerHTML = `<option value="">No Project</option>`;
  state.projects.forEach(p => {
    sel.innerHTML += `<option value="${p.id}">${escHtml(p.name)}</option>`;
  });
  if (state.activeProjectId) sel.value = state.activeProjectId;
}

// ============================================================
// RENDER BOARD
// ============================================================
function renderBoard() {
  const columns = { todo: [], inprogress: [], done: [] };
  state.tasks.forEach(t => {
    if (columns[t.status] !== undefined) columns[t.status].push(t);
  });

  ['todo', 'inprogress', 'done'].forEach(status => {
    const container = document.getElementById(`tasks-${status}`);
    const countEl = document.getElementById(`count-${status}`);
    const tasks = columns[status];
    countEl.textContent = tasks.length;
    if (tasks.length === 0) {
      container.innerHTML = emptyState(status);
    } else {
      container.innerHTML = tasks.map(renderTaskCard).join('');
    }
  });
}

function emptyState(status) {
  const messages = {
    todo: 'No tasks yet. Create one!',
    inprogress: 'Nothing in progress.',
    done: 'No completed tasks yet.',
  };
  return `<div class="empty-state">
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
      <rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 9h6M9 13h4"/>
    </svg>
    <span>${messages[status]}</span>
  </div>`;
}

function renderTaskCard(task) {
  const dueInfo = getDueDateInfo(task.due_date);
  const assigneesHtml = (task.assignees || []).slice(0, 3).map(u =>
    `<div class="assignee-avatar" style="background:${u.avatar_color}" title="${escHtml(u.name)}">
       ${getInitials(u.name)}
     </div>`
  ).join('');
  const extraCount = (task.assignees || []).length - 3;

  return `
    <div class="task-card priority-${task.priority}" id="card-${task.id}"
         draggable="true"
         ondragstart="onDragStart(event, ${task.id})"
         ondragend="onDragEnd(event)"
         onclick="openTaskDetail(${task.id})"
         role="article"
         aria-label="Task: ${escHtml(task.title)}">
      <div class="card-top">
        <div class="card-title">${escHtml(task.title)}</div>
        <div class="card-actions" onclick="event.stopPropagation()">
          <button class="card-action-btn" onclick="openEditTask(${task.id})" title="Edit task" aria-label="Edit task">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="card-action-btn delete" onclick="deleteTask(${task.id})" title="Delete task" aria-label="Delete task">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
          </button>
        </div>
      </div>
      ${task.description ? `<div class="card-desc">${escHtml(task.description)}</div>` : ''}
      <div class="card-meta">
        <span class="priority-badge ${task.priority}">${task.priority}</span>
        ${task.due_date ? `<span class="due-date ${dueInfo.class}">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          ${dueInfo.label}
        </span>` : ''}
      </div>
      ${assigneesHtml ? `<div class="card-assignees">
        ${assigneesHtml}
        ${extraCount > 0 ? `<div class="assignee-avatar" style="background:#475569">+${extraCount}</div>` : ''}
      </div>` : ''}
    </div>`;
}

function getDueDateInfo(dueDateStr) {
  if (!dueDateStr) return { label: '', class: '' };
  const due = new Date(dueDateStr);
  const now = new Date();
  const diff = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  const label = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (diff < 0) return { label, class: 'overdue' };
  if (diff <= 3) return { label, class: 'soon' };
  return { label, class: '' };
}

// ============================================================
// RENDER WORKLOAD (Sidebar Team Panel)
// ============================================================
function renderWorkload() {
  const container = document.getElementById('team-workload-list');
  if (!state.workload || state.workload.length === 0) {
    container.innerHTML = '<div style="font-size:0.78rem;color:var(--text-muted)">No team members yet.</div>';
    return;
  }

  const maxTasks = Math.max(...state.workload.map(u => u.total_tasks), 1);

  container.innerHTML = state.workload.map(user => {
    const isBurnout = user.burnout; // server/local computed: inprogress_count > 5
    const pct = Math.round((user.total_tasks / maxTasks) * 100);
    return `
      <div class="team-member-row" id="member-${user.id}">
        <div class="avatar ${isBurnout ? 'burnout' : ''}"
             style="background:${isBurnout ? '#ef4444' : user.avatar_color}"
             title="${escHtml(user.name)}${isBurnout ? ' ⚠ Overloaded! (>5 In Progress)' : ''}">
          ${getInitials(user.name)}
        </div>
        <div class="member-info">
          <div class="member-name">${escHtml(user.name)}</div>
          <div class="member-tasks">
            In Progress: <span class="${isBurnout ? 'overloaded' : ''}">${user.inprogress_count}</span>
            &nbsp;·&nbsp; Total: ${user.total_tasks}
          </div>
        </div>
        <div class="workload-bar-wrap" title="${user.total_tasks} tasks">
          <div class="workload-bar">
            <div class="workload-bar-fill" style="width:${pct}%; background:${isBurnout ? '#ef4444' : 'var(--accent-primary)'}"></div>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ============================================================
// DRAG AND DROP
// ============================================================
function onDragStart(event, taskId) {
  state.dragTaskId = taskId;
  const card = document.getElementById(`card-${taskId}`);
  if (card) card.classList.add('dragging');
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', String(taskId));
}

function onDragEnd(event) {
  if (state.dragTaskId) {
    const card = document.getElementById(`card-${state.dragTaskId}`);
    if (card) card.classList.remove('dragging');
  }
  document.querySelectorAll('.kanban-column').forEach(col => col.classList.remove('drag-over'));
}

function onDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  event.currentTarget.classList.add('drag-over');
}

function onDragLeave(event) {
  if (!event.currentTarget.contains(event.relatedTarget)) {
    event.currentTarget.classList.remove('drag-over');
  }
}

async function onDrop(event, newStatus) {
  event.preventDefault();
  event.currentTarget.classList.remove('drag-over');
  const taskId = state.dragTaskId || parseInt(event.dataTransfer.getData('text/plain'));
  if (!taskId) return;

  const task = state.tasks.find(t => t.id === taskId);
  if (!task || task.status === newStatus) return;

  const oldStatus = task.status;
  task.status = newStatus; // Optimistic update in-memory

  // ── INSTANT updates — no API wait ──
  renderBoard();               // update Kanban columns + counters immediately
  computeWorkloadFromState();  // update team sidebar immediately

  try {
    if (state.useLocalFallback) {
      Local.updateTask(taskId, { status: newStatus });
    } else {
      await apiFetch(`/tasks/${taskId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
    }
    await loadWorkload();
    showToast(`Task moved to ${statusLabel(newStatus)}`, 'success');
  } catch {
    task.status = oldStatus; // Revert
    await loadTasks();
  }
  state.dragTaskId = null;
}

function statusLabel(s) {
  return { todo: 'To Do', inprogress: 'In Progress', done: 'Done' }[s] || s;
}

// ============================================================
// FILTER
// ============================================================
function setFilter(priority) {
  state.activeFilter = priority;
  ['all', 'high', 'medium', 'low'].forEach(p => {
    const btn = document.getElementById(`filter-${p}`);
    btn.classList.toggle('active', p === priority);
    btn.setAttribute('aria-pressed', p === priority ? 'true' : 'false');
  });
  loadTasks();
}

// ============================================================
// TASK DETAIL MODAL
// ============================================================
function openTaskDetail(taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;
  state.editingTaskId = taskId;

  const dueInfo = getDueDateInfo(task.due_date);
  const project = state.projects.find(p => p.id === task.project_id);
  const assignees = task.assignees || [];

  document.getElementById('task-detail-title').textContent = task.title;
  const pb = document.getElementById('detail-priority-badge');
  pb.className = `priority-badge ${task.priority}`;
  pb.textContent = task.priority;

  const body = document.getElementById('task-detail-body');
  body.innerHTML = `
    <div class="detail-row">
      <div class="detail-section">
        <div class="detail-label">Status</div>
        <div class="detail-value">${statusLabel(task.status)}</div>
      </div>
      <div class="detail-section">
        <div class="detail-label">Due Date</div>
        <div class="detail-value ${dueInfo.class}">${task.due_date ? new Date(task.due_date).toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' }) : '—'}</div>
      </div>
    </div>
    ${task.description ? `
    <div class="detail-section">
      <div class="detail-label">Description</div>
      <div class="detail-value">${escHtml(task.description)}</div>
    </div>` : ''}
    <div class="detail-row">
      <div class="detail-section">
        <div class="detail-label">Project</div>
        <div class="detail-value">${project ? escHtml(project.name) : '—'}</div>
      </div>
      <div class="detail-section">
        <div class="detail-label">Created</div>
        <div class="detail-value">${new Date(task.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}</div>
      </div>
    </div>
    ${assignees.length > 0 ? `
    <div class="detail-section">
      <div class="detail-label">Assignees</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:4px">
        ${assignees.map(u => `
          <div style="display:flex;align-items:center;gap:6px">
            <div class="assignee-avatar" style="background:${u.avatar_color};width:28px;height:28px;font-size:0.65rem">
              ${getInitials(u.name)}
            </div>
            <span style="font-size:0.85rem;color:var(--text-secondary)">${escHtml(u.name)}</span>
          </div>`).join('')}
      </div>
    </div>` : ''}
  `;

  openModal('task-detail-modal');
}

function editCurrentTask() {
  closeModal('task-detail-modal');
  if (state.editingTaskId) openEditTask(state.editingTaskId);
}

async function deleteCurrentTask() {
  if (!state.editingTaskId) return;
  if (!confirm('Delete this task?')) return;
  await deleteTask(state.editingTaskId);
  closeModal('task-detail-modal');
}

// ============================================================
// TASK CRUD MODALS
// ============================================================
function openCreateTaskModal(defaultStatus = 'todo') {
  state.editingTaskId = null;
  state.selectedAssigneeIds = new Set();
  const form = document.getElementById('task-form');
  form.reset();
  document.getElementById('task-edit-id').value = '';
  document.getElementById('task-modal-title').textContent = 'Create Task';
  document.getElementById('task-submit-btn').textContent = 'Create Task';
  document.getElementById('task-status').value = defaultStatus;
  populateProjectSelect();
  renderAssigneePicker();
  openModal('task-modal');
  document.getElementById('task-title').focus();
}

function openEditTask(taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;
  state.editingTaskId = taskId;
  state.selectedAssigneeIds = new Set((task.assignees || []).map(u => u.id));

  document.getElementById('task-modal-title').textContent = 'Edit Task';
  document.getElementById('task-submit-btn').textContent = 'Save Changes';
  document.getElementById('task-edit-id').value = task.id;
  document.getElementById('task-title').value = task.title;
  document.getElementById('task-description').value = task.description || '';
  document.getElementById('task-priority').value = task.priority;
  document.getElementById('task-status').value = task.status;
  document.getElementById('task-due-date').value = task.due_date ? task.due_date.split('T')[0] : '';
  populateProjectSelect();
  document.getElementById('task-project').value = task.project_id || '';
  renderAssigneePicker();
  openModal('task-modal');
  document.getElementById('task-title').focus();
}

function renderAssigneePicker() {
  const container = document.getElementById('assignee-picker');
  const users = state.useLocalFallback ? Local.getUsers() : state.users;
  if (!users || users.length === 0) {
    container.innerHTML = '<span style="font-size:0.78rem;color:var(--text-muted)">No team members yet. Add some first.</span>';
    return;
  }
  container.innerHTML = users.map(u => `
    <div class="assignee-chip ${state.selectedAssigneeIds.has(u.id) ? 'selected' : ''}"
         id="chip-${u.id}"
         onclick="toggleAssignee(${u.id})"
         role="checkbox" aria-checked="${state.selectedAssigneeIds.has(u.id)}"
         tabindex="0">
      <div class="chip-avatar" style="background:${u.avatar_color}">${getInitials(u.name)}</div>
      ${escHtml(u.name.split(' ')[0])}
    </div>`).join('');
}

function toggleAssignee(userId) {
  if (state.selectedAssigneeIds.has(userId)) {
    state.selectedAssigneeIds.delete(userId);
  } else {
    state.selectedAssigneeIds.add(userId);
  }
  renderAssigneePicker();
}

async function submitTaskForm(event) {
  event.preventDefault();
  const btn = document.getElementById('task-submit-btn');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  const payload = {
    title: document.getElementById('task-title').value.trim(),
    description: document.getElementById('task-description').value.trim(),
    priority: document.getElementById('task-priority').value,
    status: document.getElementById('task-status').value,
    due_date: document.getElementById('task-due-date').value || null,
    project_id: document.getElementById('task-project').value ? parseInt(document.getElementById('task-project').value) : null,
    assignee_ids: [...state.selectedAssigneeIds],
  };

  try {
    const editId = document.getElementById('task-edit-id').value;
    if (state.useLocalFallback) {
      if (editId) {
        Local.updateTask(parseInt(editId), payload);
        showToast('Task updated!', 'success');
      } else {
        Local.createTask(payload);
        showToast('Task created!', 'success');
      }
    } else {
      if (editId) {
        await apiFetch(`/tasks/${editId}`, { method: 'PUT', body: JSON.stringify(payload) });
        showToast('Task updated!', 'success');
      } else {
        await apiFetch('/tasks', { method: 'POST', body: JSON.stringify(payload) });
        showToast('Task created!', 'success');
      }
    }
    closeModal('task-modal');
    await loadTasks();
    computeWorkloadFromState(); // instant sidebar update
    loadWorkload();             // sync with backend in background
  } catch {}
  finally {
    btn.disabled = false;
    btn.textContent = state.editingTaskId ? 'Save Changes' : 'Create Task';
  }
}

async function deleteTask(taskId) {
  if (!confirm('Are you sure you want to delete this task?')) return;
  try {
    if (state.useLocalFallback) {
      Local.deleteTask(taskId);
    } else {
      await apiFetch(`/tasks/${taskId}`, { method: 'DELETE' });
    }
    showToast('Task deleted', 'info');
    await loadTasks();
    computeWorkloadFromState(); // instant sidebar update
    loadWorkload();             // sync with backend in background
  } catch {}
}

// ============================================================
// USER MODAL
// ============================================================
function openAddUserModal() {
  document.getElementById('user-form').reset();
  openModal('user-modal');
  document.getElementById('user-name').focus();
}

async function submitUserForm(event) {
  event.preventDefault();
  const payload = {
    name: document.getElementById('user-name').value.trim(),
    email: document.getElementById('user-email').value.trim(),
    avatar_color: document.getElementById('user-color').value,
  };
  try {
    if (state.useLocalFallback) {
      Local.createUser(payload);
    } else {
      await apiFetch('/users', { method: 'POST', body: JSON.stringify(payload) });
    }
    showToast(`${payload.name} added to team!`, 'success');
    closeModal('user-modal');
    await loadUsers();
    await loadWorkload();
  } catch (err) {
    // error already shown by apiFetch or thrown by Local
    showToast(err.message || 'Failed to add user', 'error');
  }
}

function setupColorPicker() {
  const colorInput = document.getElementById('user-color');
  const swatch = document.getElementById('color-preview-swatch');
  if (!colorInput || !swatch) return;
  const update = () => { swatch.textContent = colorInput.value; swatch.style.color = colorInput.value; };
  colorInput.addEventListener('input', update);
  update();
}

// ============================================================
// PROJECT MODAL
// ============================================================
function openNewProjectModal() {
  document.getElementById('project-form').reset();
  openModal('project-modal');
  document.getElementById('project-name').focus();
}

async function submitProjectForm(event) {
  event.preventDefault();
  const payload = {
    name: document.getElementById('project-name').value.trim(),
    description: document.getElementById('project-desc').value.trim(),
  };
  try {
    if (state.useLocalFallback) {
      Local.createProject(payload);
    } else {
      await apiFetch('/projects', { method: 'POST', body: JSON.stringify(payload) });
    }
    showToast(`Project "${payload.name}" created!`, 'success');
    closeModal('project-modal');
    await loadProjects();
  } catch {}
}

// ============================================================
// MODAL HELPERS
// ============================================================
function openModal(id) {
  const el = document.getElementById(id);
  el.classList.add('open');
  el.addEventListener('click', outsideClickClose);
  document.addEventListener('keydown', escapeClose);
}

function closeModal(id) {
  const el = document.getElementById(id);
  el.classList.remove('open');
  el.removeEventListener('click', outsideClickClose);
  document.removeEventListener('keydown', escapeClose);
}

function outsideClickClose(event) {
  if (event.target === event.currentTarget) {
    event.currentTarget.classList.remove('open');
    document.removeEventListener('keydown', escapeClose);
  }
}

function escapeClose(event) {
  if (event.key === 'Escape') {
    document.querySelectorAll('.modal-backdrop.open').forEach(el => el.classList.remove('open'));
    document.removeEventListener('keydown', escapeClose);
  }
}

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span> <span>${escHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ============================================================
// UTILITIES
// ============================================================
function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map(n => n[0].toUpperCase()).join('');
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
