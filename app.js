const SUPABASE_URL = "https://roynxgyqegcifhxbyctr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_yW08oN21828j6YrZGRmMfw_humBU2ng";

let supabase = null;
let isSupabaseReady = false;

if (
  SUPABASE_URL !== "YOUR_SUPABASE_URL" &&
  SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY" &&
  typeof window.supabase !== "undefined"
) {
  try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    isSupabaseReady = true;
  } catch (error) {
    console.warn("Supabase init failed, fallback local:", error);
  }
}

const list = document.getElementById("list");
const cardTpl = document.getElementById("cardTpl");
const addPanel = document.getElementById("addPanel");

const LOCAL_KEY = "phone-management-devices";

const APPS_SCRIPT_CODE = `function doGet(e) {
  var sheetId = e && e.parameter && e.parameter.sheetId;
  if (!sheetId) {
    return ContentService.createTextOutput("Missing sheetId");
  }
  var ss = SpreadsheetApp.openById(sheetId);
  var sheet = ss.getSheets()[0]; // Lấy sheet đầu tiên
  var data = sheet.getDataRange().getValues();
  
  var headers = data[0];
  var jsonArray = [];
  
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = data[i][j];
    }
    jsonArray.push(obj);
  }
  
  return ContentService.createTextOutput(JSON.stringify(jsonArray))
    .setMimeType(ContentService.MimeType.JSON);
}`;

function toStatusLabel(status) {
  if (status === "running") return "Đang chạy";
  if (status === "stopped") return "Đã dừng";
  return "Chờ";
}

function getLocalDevices() {
  const raw = localStorage.getItem(LOCAL_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function setLocalDevices(devices) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(devices));
}

function updateSelectedCount() {
  if (!list || !selectedCount || !selectAll || !bulkRun || !bulkStop) return;
  const boxes = list.querySelectorAll(".pick-box");
  let count = 0;
  boxes.forEach((box) => {
    if (box.checked) count += 1;
  });
  selectedCount.textContent = `${count} đã chọn`;
  selectAll.checked = boxes.length > 0 && count === boxes.length;
  bulkRun.disabled = count === 0;
  bulkStop.disabled = count === 0;
}

function getSelectedIds() {
  const boxes = list.querySelectorAll(".pick-box");
  const ids = [];
  boxes.forEach((box) => {
    if (box.checked) ids.push(box.dataset.id);
  });
  return ids;
}

async function runBulk(status) {
  const ids = getSelectedIds();
  if (!ids.length) return;

  const items = deviceCache.filter((device) => ids.includes(device.id));
  for (const device of items) {
    const url = status === "running" ? device.start_url : device.stop_url;
    await triggerWebhook(device.id, url, status);
  }
  await loadDevices();
}

const addBtn = document.getElementById("addBtn");
const saveBtn = document.getElementById("saveBtn");
const cancelBtn = document.getElementById("cancelBtn");
const clearBtn = document.getElementById("clearBtn");

const selectAll = document.getElementById("selectAll");
const selectedCount = document.getElementById("selectedCount");
const bulkRun = document.getElementById("bulkRun");
const bulkStop = document.getElementById("bulkStop");
const sortToggle = document.getElementById("sortToggle");

let sortMode = false;
let dragItem = null;

let deviceCache = [];

const nameInput = document.getElementById("nameInput");
const startInput = document.getElementById("startInput");
const stopInput = document.getElementById("stopInput");

const baseUrlInput = document.getElementById("baseUrlInput");
const targetUrlInput = document.getElementById("targetUrlInput");
const jsonLinkOutput = document.getElementById("jsonLinkOutput");
const generateJsonBtn = document.getElementById("generateJsonBtn");
const copyJsonBtn = document.getElementById("copyJsonBtn");

const tabButtons = document.querySelectorAll(".tab-btn");
const tabPanels = document.querySelectorAll(".tab-panel");
const layout = document.getElementById("layout");
const sidebarToggle = document.getElementById("sidebarToggle");
const pageTitle = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("pageSubtitle");

const on = (el, event, handler) => {
  if (el) el.addEventListener(event, handler);
};

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabButtons.forEach((item) => item.classList.remove("active"));
    tabPanels.forEach((panel) => panel.classList.remove("active"));

    btn.classList.add("active");
    const target = document.getElementById(`tab-${btn.dataset.tab}`);
    if (target) {
      target.classList.add("active");
    }

    const title = btn.dataset.title || "";
    const subtitle = btn.dataset.subtitle || "";
    if (pageTitle) pageTitle.textContent = title;
    if (pageSubtitle) pageSubtitle.textContent = subtitle;
  });
});

on(sidebarToggle, "click", () => {
  if (layout) layout.classList.toggle("collapsed");
});

on(addBtn, "click", () => {
  if (addPanel) addPanel.classList.remove("hidden");
  if (nameInput) nameInput.focus();
});

on(cancelBtn, "click", () => {
  if (addPanel) addPanel.classList.add("hidden");
  resetForm();
});

on(clearBtn, "click", () => {
  resetForm();
  if (nameInput) nameInput.focus();
});

on(selectAll, "change", () => {
  if (!list || !selectAll) return;
  const boxes = list.querySelectorAll(".pick-box");
  boxes.forEach((box) => {
    box.checked = selectAll.checked;
  });
  updateSelectedCount();
});

on(bulkRun, "click", () => {
  runBulk("running");
});

on(bulkStop, "click", () => {
  runBulk("stopped");
});

on(sortToggle, "click", () => {
  sortMode = !sortMode;
  if (list) list.classList.toggle("sorting", sortMode);
  sortToggle.textContent = sortMode ? "Xong" : "Sắp xếp";
});

if (generateJsonBtn && baseUrlInput && targetUrlInput && jsonLinkOutput) {
  generateJsonBtn.addEventListener("click", () => {
    const baseUrl = baseUrlInput.value.trim();
    if (!baseUrl) {
      alert("Thiếu phần 1 (link cố định)");
      return;
    }

    const targetUrl = targetUrlInput.value.trim();
    if (!targetUrl) {
      alert("Thiếu phần 2 (link cần ghép)");
      return;
    }

    jsonLinkOutput.value = buildCombinedUrl(baseUrl, targetUrl);
  });
}

if (copyJsonBtn && jsonLinkOutput) {
  copyJsonBtn.addEventListener("click", async () => {
    const value = jsonLinkOutput.value.trim();
    if (!value) {
      alert("Chưa có link để copy");
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
    } catch (error) {
      jsonLinkOutput.select();
      document.execCommand("copy");
    }
  });
}

on(saveBtn, "click", async () => {
  if (!nameInput || !startInput || !stopInput) return;
  const name = nameInput.value.trim();
  const start_url = startInput.value.trim();
  const stop_url = stopInput.value.trim();

  if (!name || !start_url || !stop_url) {
    alert("Nhập đầy đủ thông tin");
    return;
  }

  if (isSupabaseReady) {
    const { error } = await supabase.from("devices").insert({
      name,
      start_url,
      stop_url,
      status: "idle",
    });

    if (error) {
      alert("Lỗi lưu dữ liệu: " + error.message);
      return;
    }
  } else {
    const devices = getLocalDevices();
    devices.push({
      id: crypto.randomUUID(),
      name,
      start_url,
      stop_url,
      status: "idle",
      created_at: new Date().toISOString(),
      sort_order: devices.length,
      note: "",
      logs: [],
    });
    setLocalDevices(devices);
  }

  if (addPanel) addPanel.classList.add("hidden");
  resetForm();
  await loadDevices();
});

function resetForm() {
  nameInput.value = "";
  startInput.value = "";
  stopInput.value = "";
}

function buildCombinedUrl(baseUrl, targetUrl) {
  const normalizedBase = baseUrl.trim();
  const separator = normalizedBase.includes("?") ? "" : "?";
  return `${normalizedBase}${separator}${targetUrl}`;
}

async function loadDevices() {
  let data = [];

  if (isSupabaseReady) {
    const { data: remoteData, error } = await supabase
      .from("devices")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      list.innerHTML = `<p>Lỗi tải danh sách: ${error.message}</p>`;
      return;
    }

    data = remoteData || [];
  } else {
    data = getLocalDevices();
  }

  data = data.slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  list.innerHTML = "";
  if (!data.length) {
    list.innerHTML =
      "<p>Chưa có máy. Bấm “+ Thêm máy” để tạo.</p>";
    deviceCache = [];
    updateSelectedCount();
    return;
  }

  deviceCache = data;
  data.forEach((device) => list.appendChild(renderCard(device)));
  updateSelectedCount();
}

function renderCard(device) {
  const node = cardTpl.content.cloneNode(true);
  const article = node.querySelector(".card");

  node.querySelector(".name").textContent = device.name;
  const statusEl = node.querySelector(".status");
  const statusText = device.status || "idle";
  statusEl.textContent = toStatusLabel(statusText);
  statusEl.dataset.state = statusText;

  const nameEl = node.querySelector(".name");
  const startEl = node.querySelector(".start");
  const stopEl = node.querySelector(".stop-link");
  const notePanel = node.querySelector(".note-panel");
  const noteText = node.querySelector(".note-text");
  const noteBtn = node.querySelector(".note-btn");
  const noteSave = node.querySelector(".note-save");
  const noteCancel = node.querySelector(".note-cancel");
  const logPanel = node.querySelector(".log-panel");
  const logBtn = node.querySelector(".log-btn");
  const logList = node.querySelector(".log-list");
  const logPrev = node.querySelector(".log-prev");
  const logNext = node.querySelector(".log-next");
  const logPage = node.querySelector(".log-page");

  let logPageIndex = 1;

  nameEl.textContent = device.name;
  startEl.textContent = device.start_url;
  stopEl.textContent = device.stop_url;
  if (noteText) noteText.value = device.note || "";
  if (logList && logPage) renderLogList(logList, logPage, device.logs || [], logPageIndex);

  article.dataset.id = device.id;
  const pickBox = node.querySelector(".pick-box");
  pickBox.dataset.id = device.id;
  pickBox.addEventListener("change", () => {
    updateSelectedCount();
  });

  nameEl.addEventListener("click", () => {
    beginEditField(article, device, "name");
  });

  startEl.addEventListener("click", () => {
    beginEditField(article, device, "start_url");
  });

  stopEl.addEventListener("click", () => {
    beginEditField(article, device, "stop_url");
  });

  on(noteBtn, "click", () => {
    if (!notePanel) return;
    notePanel.classList.toggle("active");
    notePanel.setAttribute("aria-hidden", notePanel.classList.contains("active") ? "false" : "true");
    if (logPanel) {
      logPanel.classList.remove("active");
      logPanel.setAttribute("aria-hidden", "true");
    }
    if (notePanel.classList.contains("active") && noteText) {
      noteText.focus();
    }
  });

  on(logBtn, "click", () => {
    if (!logPanel) return;
    logPanel.classList.toggle("active");
    logPanel.setAttribute("aria-hidden", logPanel.classList.contains("active") ? "false" : "true");
    if (notePanel) {
      notePanel.classList.remove("active");
      notePanel.setAttribute("aria-hidden", "true");
    }
    if (logPanel.classList.contains("active") && logList && logPage) {
      renderLogList(logList, logPage, device.logs || [], logPageIndex);
    }
  });

  on(logPrev, "click", () => {
    if (!logList || !logPage) return;
    const totalPages = getLogPageCount(device.logs || []);
    if (totalPages <= 1) return;
    logPageIndex = Math.max(1, logPageIndex - 1);
    renderLogList(logList, logPage, device.logs || [], logPageIndex);
  });

  on(logNext, "click", () => {
    if (!logList || !logPage) return;
    const totalPages = getLogPageCount(device.logs || []);
    if (totalPages <= 1) return;
    logPageIndex = Math.min(totalPages, logPageIndex + 1);
    renderLogList(logList, logPage, device.logs || [], logPageIndex);
  });

  on(noteCancel, "click", () => {
    if (noteText) noteText.value = device.note || "";
    if (notePanel) {
      notePanel.classList.remove("active");
      notePanel.setAttribute("aria-hidden", "true");
    }
  });

  on(noteSave, "click", async () => {
    if (!noteText) return;
    const value = noteText.value.trim();
    const ok = await updateDevice(device, { note: value });
    if (ok && notePanel) {
      device.note = value;
      notePanel.classList.remove("active");
      notePanel.setAttribute("aria-hidden", "true");
    }
  });

  node.querySelector(".run").addEventListener("click", async () => {
    const ok = await triggerWebhook(device.id, device.start_url, "running");
    if (ok) {
      await logDeviceAction(device, "Chạy");
      await loadDevices();
    }
  });

  node.querySelector(".stop-btn").addEventListener("click", async () => {
    const ok = await triggerWebhook(device.id, device.stop_url, "stopped");
    if (ok) {
      await logDeviceAction(device, "Dừng");
      await loadDevices();
    }
  });

  const handle = node.querySelector(".drag-handle");
  handle.addEventListener("pointerdown", (event) => {
    if (!sortMode) return;
    event.preventDefault();
    handle.setPointerCapture(event.pointerId);
    dragItem = article;
    dragItem.classList.add("dragging");
  });


  node.querySelector(".remove").addEventListener("click", async () => {
    await removeDevice(device.id);
  });

  return article;
}

async function triggerWebhook(id, url, status) {
  if (!url) return false;

  try {
    await fetch(url, { method: "POST" });
  } catch (error) {
    alert("Không gọi được webhook: " + error.message);
    return false;
  }

  if (isSupabaseReady) {
    const { error } = await supabase
      .from("devices")
      .update({ status })
      .eq("id", id);

    if (error) {
      alert("Lỗi cập nhật: " + error.message);
      return false;
    }
  } else {
    const devices = getLocalDevices();
    const next = devices.map((device) =>
      device.id === id ? { ...device, status } : device
    );
    setLocalDevices(next);
  }

  return true;
}

async function updateDevice(device, nextValues) {
  if (isSupabaseReady) {
    const { error } = await supabase
      .from("devices")
      .update(nextValues)
      .eq("id", device.id);

    if (error) {
      alert("Lỗi cập nhật: " + error.message);
      return false;
    }
  } else {
    const devices = getLocalDevices();
    const next = devices.map((item) =>
      item.id === device.id ? { ...item, ...nextValues } : item
    );
    setLocalDevices(next);
  }

  return true;
}

function getLogPageCount(logs) {
  return Math.max(1, Math.ceil(logs.length / 3));
}

function renderLogList(container, pageEl, logs, pageIndex) {
  container.innerHTML = "";
  const totalPages = getLogPageCount(logs);
  const clampedPage = Math.min(Math.max(1, pageIndex), totalPages);
  pageEl.textContent = `${clampedPage}/${totalPages}`;

  if (!logs.length) {
    container.innerHTML = "<div class=\"log-item\"><span>Chưa có log</span></div>";
    return;
  }

  const reversed = logs.slice().reverse();
  const start = (clampedPage - 1) * 3;
  const items = reversed.slice(start, start + 3);

  items.forEach((entry) => {
    const item = document.createElement("div");
    item.className = "log-item";

    const action = document.createElement("span");
    action.textContent = entry.action;

    const time = document.createElement("span");
    time.textContent = entry.time;

    item.appendChild(action);
    item.appendChild(time);
    container.appendChild(item);
  });
}

async function logDeviceAction(device, action) {
  const timestamp = new Date().toLocaleString("vi-VN");
  const nextLogs = [...(device.logs || []), { action, time: timestamp }];
  const ok = await updateDevice(device, { logs: nextLogs });
  if (ok) {
    device.logs = nextLogs;
  }
  return ok;
}

function beginEditField(row, device, field) {
  if (row.classList.contains("editing")) return;
  row.classList.add("editing");

  const fieldMap = {
    name: {
      el: row.querySelector(".name"),
      type: "text",
      value: device.name,
      label: "Tên máy",
    },
    start_url: {
      el: row.querySelector(".start"),
      type: "url",
      value: device.start_url,
      label: "Link chạy",
    },
    stop_url: {
      el: row.querySelector(".stop-link"),
      type: "url",
      value: device.stop_url,
      label: "Link dừng",
    },
  };

  const target = fieldMap[field];
  if (!target) return;

  const input = document.createElement("input");
  input.type = target.type;
  input.value = target.value;
  input.className = "inline-input";

  target.el.replaceWith(input);
  input.focus();
  input.select();

  const actions = row.querySelector(".card-actions");
  const oldActions = actions.innerHTML;
  actions.innerHTML = "";

  const saveBtn = document.createElement("button");
  saveBtn.className = "primary";
  saveBtn.textContent = "Lưu";

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "ghost";
  cancelBtn.textContent = "Hủy";

  actions.appendChild(saveBtn);
  actions.appendChild(cancelBtn);

  const finish = () => {
    actions.innerHTML = oldActions;
    row.classList.remove("editing");
    loadDevices();
  };

  cancelBtn.addEventListener("click", () => {
    finish();
  });

  const validate = (value) => {
    if (!value) {
      alert(`${target.label} không được trống`);
      return false;
    }
    return true;
  };

  saveBtn.addEventListener("click", async () => {
    const value = input.value.trim();
    if (!validate(value)) return;

    const ok = await updateDevice(device, { [field]: value });
    if (ok) {
      finish();
    }
  });
}

async function removeDevice(id) {
  const ok = confirm("Xóa máy này?");
  if (!ok) return;

  if (isSupabaseReady) {
    const { error } = await supabase.from("devices").delete().eq("id", id);

    if (error) {
      alert("Lỗi xóa: " + error.message);
      return;
    }
  } else {
    const devices = getLocalDevices();
    const next = devices.filter((device) => device.id !== id);
    setLocalDevices(next);
  }

  await loadDevices();
}

document.addEventListener("pointermove", (event) => {
  if (!sortMode || !dragItem) return;

  const element = document.elementFromPoint(event.clientX, event.clientY);
  const target = element ? element.closest(".card") : null;
  if (!target || target === dragItem) return;

  const rect = target.getBoundingClientRect();
  const isAfter = event.clientY > rect.top + rect.height / 2;
  if (isAfter) {
    target.after(dragItem);
  } else {
    target.before(dragItem);
  }
});

document.addEventListener("pointerup", () => {
  if (!dragItem) return;
  dragItem.classList.remove("dragging");
  dragItem = null;
  persistOrder();
});

async function persistOrder() {
  const cards = Array.from(list.querySelectorAll(".card"));
  const ids = cards.map((card) => card.dataset.id).filter(Boolean);
  if (!ids.length) return;

  if (isSupabaseReady) {
    const updates = ids.map((id, index) => ({ id, sort_order: index }));
    const { error } = await supabase.from("devices").upsert(updates);
    if (error) {
      alert("Lỗi lưu thứ tự: " + error.message);
      return;
    }
  } else {
    const devices = getLocalDevices();
    const map = new Map(devices.map((item) => [item.id, item]));
    const next = ids.map((id, index) => ({
      ...map.get(id),
      sort_order: index,
    }));
    setLocalDevices(next);
  }
}

loadDevices();
