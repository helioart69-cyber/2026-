(() => {
  "use strict";

  const YEAR = 2026;
  const STORAGE_KEY = "green-day-2026-todos";
  const monthNames = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
  const weekdayNames = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
  const today = new Date();
  const isCurrentYear = today.getFullYear() === YEAR;

  let selectedDate = isCurrentYear ? new Date(YEAR, today.getMonth(), today.getDate()) : new Date(YEAR, 0, 1);
  let visibleMonth = selectedDate.getMonth();
  let filter = "all";
  let todos = loadTodos();
  let toastTimer;

  const els = {
    monthNumber: document.querySelector("#monthNumber"),
    monthName: document.querySelector("#monthName"),
    calendarGrid: document.querySelector("#calendarGrid"),
    selectedWeekday: document.querySelector("#selectedWeekday"),
    selectedDateTitle: document.querySelector("#selectedDateTitle"),
    taskCount: document.querySelector("#taskCount"),
    todoForm: document.querySelector("#todoForm"),
    todoInput: document.querySelector("#todoInput"),
    todoList: document.querySelector("#todoList"),
    emptyState: document.querySelector("#emptyState"),
    daySummaryText: document.querySelector("#daySummaryText"),
    clearCompleted: document.querySelector("#clearCompleted"),
    monthPicker: document.querySelector("#monthPicker"),
    monthPickerButton: document.querySelector("#monthPickerButton"),
    toast: document.querySelector("#toast")
  };

  function loadTodos() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function saveTodos() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }

  function dateKey(date) {
    return `${YEAR}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function renderCalendar() {
    els.monthNumber.textContent = String(visibleMonth + 1).padStart(2, "0");
    els.monthName.textContent = monthNames[visibleMonth];
    const first = new Date(YEAR, visibleMonth, 1);
    const start = new Date(YEAR, visibleMonth, 1 - first.getDay());
    els.calendarGrid.innerHTML = "";

    for (let index = 0; index < 42; index += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const dayTasks = date.getFullYear() === YEAR ? (todos[key] || []) : [];
      const button = document.createElement("button");
      button.type = "button";
      button.className = "day-cell";
      button.setAttribute("role", "gridcell");
      button.setAttribute("aria-label", `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일, 할 일 ${dayTasks.length}개`);
      if (date.getMonth() !== visibleMonth) button.classList.add("outside");
      if (date.getFullYear() === YEAR && date.getMonth() === selectedDate.getMonth() && date.getDate() === selectedDate.getDate()) button.classList.add("selected");
      if (isCurrentYear && date.getMonth() === today.getMonth() && date.getDate() === today.getDate()) button.classList.add("is-today");

      const preview = dayTasks.slice(0, 2).map(task => `<span class="cell-task${task.done ? " done" : ""}">${escapeHTML(task.text)}</span>`).join("");
      const more = dayTasks.length > 2 ? `<span class="cell-more">+${dayTasks.length - 2}개 더</span>` : "";
      button.innerHTML = `<span class="day-number">${date.getDate()}</span>${dayTasks.length ? `<span class="cell-tasks${dayTasks.every(task => task.done) ? " all-done" : ""}">${preview}${more}</span>` : ""}`;
      button.addEventListener("click", () => {
        if (date.getFullYear() !== YEAR) return;
        selectedDate = new Date(YEAR, date.getMonth(), date.getDate());
        visibleMonth = date.getMonth();
        render();
        els.todoInput.focus();
      });
      els.calendarGrid.appendChild(button);
    }

    [...els.monthPicker.children].forEach((button, index) => button.classList.toggle("active", index === visibleMonth));
  }

  function renderTodos() {
    const key = dateKey(selectedDate);
    const dayTodos = todos[key] || [];
    const filtered = dayTodos.filter(task => filter === "all" || (filter === "done" ? task.done : !task.done));
    els.selectedWeekday.textContent = weekdayNames[selectedDate.getDay()];
    els.selectedDateTitle.textContent = `${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일`;
    els.taskCount.textContent = `${dayTodos.length}개`;
    els.todoList.innerHTML = "";

    filtered.forEach(task => {
      const item = document.createElement("li");
      item.className = `todo-item${task.done ? " done" : ""}`;
      item.innerHTML = `<input class="todo-check" type="checkbox" ${task.done ? "checked" : ""} aria-label="${escapeAttribute(task.text)} 완료 상태 변경"><span class="todo-text">${escapeHTML(task.text)}</span><button class="delete-button" type="button" aria-label="${escapeAttribute(task.text)} 삭제">×</button>`;
      item.querySelector(".todo-check").addEventListener("change", event => toggleTodo(task.id, event.target.checked));
      item.querySelector(".delete-button").addEventListener("click", () => deleteTodo(task.id));
      els.todoList.appendChild(item);
    });

    els.emptyState.hidden = filtered.length > 0;
    els.emptyState.querySelector("p").textContent = dayTodos.length && !filtered.length ? "이 필터에는 항목이 없어요." : "아직 할 일이 없어요.";
    els.emptyState.querySelector("small").textContent = dayTodos.length && !filtered.length ? "다른 필터를 선택해 보세요." : "작은 계획부터 가볍게 적어보세요.";
    const doneCount = dayTodos.filter(task => task.done).length;
    els.clearCompleted.disabled = doneCount === 0;
    els.daySummaryText.textContent = dayTodos.length ? `${dayTodos.length}개 중 ${doneCount}개를 완료했어요.` : "오늘의 첫 계획을 기다리고 있어요.";
  }

  function renderProgress() {
    const start = new Date(YEAR, 0, 1);
    const end = new Date(YEAR + 1, 0, 1);
    let percent = 0;
    let detail = "새로운 시작을 준비해요";
    if (today >= end) {
      percent = 100;
      detail = "2026년의 기록이 완성되었어요";
    } else if (today >= start) {
      percent = Math.min(100, Math.max(0, Math.round(((today - start) / (end - start)) * 100)));
      const day = Math.floor((today - start) / 86400000) + 1;
      detail = `365일 중 ${day}일째를 지나고 있어요`;
    }
    document.querySelector("#yearProgressText").textContent = `${percent}%`;
    document.querySelector("#yearProgressBar").style.width = `${percent}%`;
    document.querySelector("#yearProgressDetail").textContent = detail;
    const bar = document.querySelector(".progress-track");
    bar.setAttribute("aria-valuenow", String(percent));
  }

  function addTodo(text) {
    const clean = String(text || "").trim();
    if (!clean) throw new Error("할 일 내용을 입력해 주세요.");
    if (clean.length > 80) throw new Error("할 일은 80자 이하로 입력해 주세요.");
    const key = dateKey(selectedDate);
    todos[key] = todos[key] || [];
    const task = { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, text: clean, done: false };
    todos[key].push(task);
    saveTodos();
    render();
    return task;
  }

  function toggleTodo(id, done) {
    const key = dateKey(selectedDate);
    const task = (todos[key] || []).find(item => item.id === id);
    if (!task) throw new Error("할 일을 찾을 수 없어요.");
    task.done = Boolean(done);
    saveTodos();
    render();
    if (task.done) showToast("하나를 해냈어요!");
    return task;
  }

  function deleteTodo(id) {
    const key = dateKey(selectedDate);
    const before = todos[key] || [];
    const task = before.find(item => item.id === id);
    if (!task) throw new Error("할 일을 찾을 수 없어요.");
    todos[key] = before.filter(item => item.id !== id);
    if (!todos[key].length) delete todos[key];
    saveTodos();
    render();
    showToast("할 일을 삭제했어요.");
    return task;
  }

  function selectDate(value) {
    const match = /^(2026)-(\d{2})-(\d{2})$/.exec(String(value));
    if (!match) throw new Error("날짜는 2026-MM-DD 형식이어야 해요.");
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const date = new Date(YEAR, month, day);
    if (date.getMonth() !== month || date.getDate() !== day) throw new Error("유효한 2026년 날짜를 입력해 주세요.");
    selectedDate = date;
    visibleMonth = month;
    render();
    return dateKey(date);
  }

  function render() {
    renderCalendar();
    renderTodos();
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.classList.add("show");
    toastTimer = setTimeout(() => els.toast.classList.remove("show"), 1800);
  }

  function escapeHTML(value) {
    const node = document.createElement("div");
    node.textContent = value;
    return node.innerHTML;
  }

  function escapeAttribute(value) {
    return String(value).replace(/[&"'<>]/g, character => ({ "&": "&amp;", '"': "&quot;", "'": "&#39;", "<": "&lt;", ">": "&gt;" })[character]);
  }

  document.querySelector("#prevMonth").addEventListener("click", () => {
    visibleMonth = (visibleMonth + 11) % 12;
    selectedDate = new Date(YEAR, visibleMonth, 1);
    render();
  });

  document.querySelector("#nextMonth").addEventListener("click", () => {
    visibleMonth = (visibleMonth + 1) % 12;
    selectedDate = new Date(YEAR, visibleMonth, 1);
    render();
  });

  document.querySelector("#todayButton").addEventListener("click", () => {
    selectedDate = isCurrentYear ? new Date(YEAR, today.getMonth(), today.getDate()) : new Date(YEAR, 0, 1);
    visibleMonth = selectedDate.getMonth();
    render();
  });

  document.querySelector("#themeButton").addEventListener("click", event => {
    const enabled = document.body.classList.toggle("focus-mode");
    event.currentTarget.setAttribute("aria-pressed", String(enabled));
    event.currentTarget.setAttribute("aria-label", enabled ? "집중 모드 끄기" : "집중 모드 켜기");
    showToast(enabled ? "집중 모드를 켰어요." : "집중 모드를 껐어요.");
  });

  els.monthPickerButton.addEventListener("click", () => {
    const open = els.monthPicker.hidden;
    els.monthPicker.hidden = !open;
    els.monthPickerButton.setAttribute("aria-expanded", String(open));
  });

  monthNames.forEach((name, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `${index + 1}월`;
    button.setAttribute("aria-label", `${index + 1}월 보기`);
    button.addEventListener("click", () => {
      visibleMonth = index;
      selectedDate = new Date(YEAR, index, 1);
      els.monthPicker.hidden = true;
      els.monthPickerButton.setAttribute("aria-expanded", "false");
      render();
    });
    els.monthPicker.appendChild(button);
  });

  els.todoForm.addEventListener("submit", event => {
    event.preventDefault();
    try {
      addTodo(els.todoInput.value);
      els.todoInput.value = "";
      els.todoInput.focus();
      showToast("할 일을 추가했어요.");
    } catch (error) {
      showToast(error.message);
    }
  });

  document.querySelectorAll(".filter-tabs button").forEach(button => {
    button.addEventListener("click", () => {
      filter = button.dataset.filter;
      document.querySelectorAll(".filter-tabs button").forEach(tab => tab.setAttribute("aria-selected", String(tab === button)));
      renderTodos();
    });
  });

  els.clearCompleted.addEventListener("click", () => {
    const key = dateKey(selectedDate);
    todos[key] = (todos[key] || []).filter(task => !task.done);
    if (!todos[key].length) delete todos[key];
    saveTodos();
    render();
    showToast("완료한 항목을 정리했어요.");
  });

  function registerWebMCP() {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const tools = [
      {
        name: "select_calendar_date",
        title: "달력 날짜 선택",
        description: "2026년 달력에서 날짜를 선택하고 해당 날짜의 할 일을 표시합니다.",
        inputSchema: { type: "object", properties: { date: { type: "string", pattern: "^2026-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])$" } }, required: ["date"], additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute(input) { return { selectedDate: selectDate(input?.date), taskCount: (todos[input.date] || []).length }; }
      },
      {
        name: "create_calendar_todo",
        title: "할 일 추가",
        description: "선택한 2026년 날짜에 새 할 일을 추가합니다.",
        inputSchema: { type: "object", properties: { text: { type: "string", minLength: 1, maxLength: 80 } }, required: ["text"], additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute(input) { const task = addTodo(input?.text); return { date: dateKey(selectedDate), id: task.id, text: task.text, done: false }; }
      },
      {
        name: "list_calendar_todos",
        title: "할 일 목록 보기",
        description: "선택한 날짜의 할 일과 완료 상태를 조회합니다.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute() { return { date: dateKey(selectedDate), todos: (todos[dateKey(selectedDate)] || []).map(({ id, text, done }) => ({ id, text, done })) }; }
      }
    ];
    tools.forEach(tool => { try { void Promise.resolve(context.registerTool(tool)).catch(() => {}); } catch {} });
  }

  renderProgress();
  render();
  registerWebMCP();
})();
