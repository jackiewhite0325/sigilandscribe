/**
 * Manuscript Map | Publishing Toolkit
 * Checklist · Metadata · Questionnaire · Assets · ARCs · Review Log
 * Local-first (localStorage) · Multi-project
 * All tools free. No paywall.
 */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ============================================================
//  MULTI-PROJECT
// ============================================================
const PROJECTS_KEY = "author-os-projects";
const CURRENT_PROJECT_KEY = "author-os-current-project";

const MODULE_KEYS = [
  "author-os-checklist",
  "author-os-checklist-dates",
  "author-os-metadata-vault",
  "author-os-questionnaire",
  "author-os-assets",
  "author-os-arcs",
  "author-os-reviews",
  "author-os-distribution",
  "author-os-sales",
  "author-os-ads",
  "author-os-editing",
  "author-os-promo",
];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function loadProjects() {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveProjects(list) {
  try {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(list));
  } catch (e) {
    setStatus("Save failed", "saving");
    console.error(e);
  }
}

function getCurrentProjectId() {
  return localStorage.getItem(CURRENT_PROJECT_KEY) || null;
}

function setCurrentProjectId(id) {
  localStorage.setItem(CURRENT_PROJECT_KEY, id);
}

/** Namespaced key for the active project */
function sk(baseKey) {
  const id = getCurrentProjectId();
  return id ? `${baseKey}::${id}` : baseKey;
}

function ensureProjectsMigrated() {
  let projects = loadProjects();
  let current = getCurrentProjectId();

  // Migrate legacy (un-namespaced) data into a default project
  const hasLegacy = MODULE_KEYS.some((k) => localStorage.getItem(k) != null);

  if (projects.length === 0) {
    const id = uid();
    const name = "My Book";
    projects = [{ id, name, createdAt: new Date().toISOString() }];
    saveProjects(projects);
    setCurrentProjectId(id);
    current = id;

    if (hasLegacy) {
      MODULE_KEYS.forEach((k) => {
        const val = localStorage.getItem(k);
        if (val != null) {
          localStorage.setItem(`${k}::${id}`, val);
          // keep legacy key for safety; optional: localStorage.removeItem(k);
        }
      });
    }
  } else if (!current || !projects.find((p) => p.id === current)) {
    setCurrentProjectId(projects[0].id);
  }
}

function getCurrentProject() {
  const id = getCurrentProjectId();
  return loadProjects().find((p) => p.id === id) || null;
}

function createProject(name) {
  const projects = loadProjects();
  const id = uid();
  const project = {
    id,
    name: name.trim() || "Untitled Project",
    createdAt: new Date().toISOString(),
    onboardingStage: undefined,
  };
  projects.push(project);
  saveProjects(projects);
  setCurrentProjectId(id);
  return project;
}

function renameProject(id, name) {
  const projects = loadProjects();
  const p = projects.find((x) => x.id === id);
  if (!p) return;
  p.name = name.trim() || p.name;
  saveProjects(projects);
}

function deleteProject(id) {
  let projects = loadProjects();
  if (projects.length <= 1) {
    alert("You need at least one project.");
    return false;
  }
  if (!confirm("Delete this project and all its data? This cannot be undone.")) return false;

  // Remove namespaced data
  MODULE_KEYS.forEach((k) => localStorage.removeItem(`${k}::${id}`));
  projects = projects.filter((p) => p.id !== id);
  saveProjects(projects);

  if (getCurrentProjectId() === id) {
    setCurrentProjectId(projects[0].id);
  }
  return true;
}

// ============================================================
//  ACCESS (all tools free)
// ============================================================
// Legacy unlock key may still exist in some browsers; we treat
// everyone as unlocked and never open a paywall.
const PRO_UNLOCK_KEY = "author-os-pro-unlocked";
const PRO_GATED_PAGES = [];

function isProUnlocked() {
  return true;
}

function unlockPro() {
  try {
    localStorage.setItem(PRO_UNLOCK_KEY, "1");
  } catch (_) {}
}

function updateProBadges() {
  // No Pro badges in the free build.
  document.querySelectorAll(".nav-pro-tag").forEach((el) => el.remove());
}

function openProModal(targetPage) {
  if (targetPage) showPage(targetPage);
}

function closeProModal() {}

function initProModal() {
  unlockPro();
  updateProBadges();
}

// ============================================================
//  ONBOARDING (first-run stage picker)
// ============================================================
const STAGE_TO_SECTION = {
  writing: "writing",
  editing: "editing",
  design: "design",
  publish: "distribution",
  published: "marketing",
};

function getOnboardingStage() {
  const project = getCurrentProject();
  return project ? project.onboardingStage : undefined;
}

function setOnboardingStage(stage) {
  const projects = loadProjects();
  const project = projects.find((p) => p.id === getCurrentProjectId());
  if (!project) return;
  project.onboardingStage = stage;
  saveProjects(projects);
}

function openOnboardingModal() {
  const modal = $("#onboardingModal");
  if (modal) modal.hidden = false;
}

function closeOnboardingModal() {
  const modal = $("#onboardingModal");
  if (modal) modal.hidden = true;
}

function maybeShowOnboarding() {
  if (getOnboardingStage() === undefined) {
    openOnboardingModal();
  }
}

function initOnboarding() {
  // Auto-show only for a project that's never been asked (stage is undefined,
  // not "skipped" — skipping is a real answer and shouldn't re-prompt).
  maybeShowOnboarding();

  $$(".onboarding-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      const stage = btn.dataset.stage;
      setOnboardingStage(stage);
      closeOnboardingModal();

      const sectionId = STAGE_TO_SECTION[stage];
      if (sectionId) {
        const state = loadChecklistState();
        const found = findFirstUncheckedInSection(sectionId, state);
        openChecklistSection(sectionId, found ? found.item.id : null);
      }
      renderDashboard();
    });
  });

  $("#btnSkipOnboarding")?.addEventListener("click", () => {
    setOnboardingStage("skipped");
    closeOnboardingModal();
    renderDashboard();
  });

  $("#btnReopenOnboarding")?.addEventListener("click", () => {
    openOnboardingModal();
  });
}

function switchProject(id) {
  if (id === getCurrentProjectId()) return;
  setCurrentProjectId(id);
  // Reload all module UIs for the new project
  reloadAllModules();
  renderProjectSwitcher();
  updateProjectTitles();
  setStatus("Switched project", "saved");
  maybeShowOnboarding();
}

function reloadAllModules() {
  renderChecklist();
  // Metadata form
  const meta = loadMetadata();
  if (meta) setFormData(meta);
  else {
    const f = $("#metadataForm");
    if (f) f.reset();
  }
  // Questionnaire
  const q = loadQuestionnaire();
  if (q) setQData(q);
  else {
    const f = $("#questionnaireForm");
    if (f) f.reset();
  }
  applyQuestionnaireAutoChecks();
  renderAssets();
  renderArcs();
  renderReviews();
  renderDistribution();
  renderSales();
  const roiToggle = $("#adsRoiToggle");
  if (roiToggle) roiToggle.checked = getRoiToggle();
  renderAds();
  renderEditing();
  renderPromo();
  calendarSelectedDate = null;
  renderCalendar();
  renderCalendarAgenda();
  updateProgress();
  renderDashboard();
}

function collectProjectBackup() {
  const project = getCurrentProject();
  const data = {};
  MODULE_KEYS.forEach((k) => {
    const raw = localStorage.getItem(sk(k));
    if (raw != null) {
      try {
        data[k] = JSON.parse(raw);
      } catch {
        data[k] = raw;
      }
    } else {
      data[k] = null;
    }
  });
  return {
    format: "author-os-project",
    version: 1,
    exportedAt: new Date().toISOString(),
    project: project
      ? { name: project.name, createdAt: project.createdAt }
      : { name: "Untitled" },
    data,
  };
}

// ============================================================
//  GOOGLE DRIVE BACKUP
// ============================================================
// Client ID is public by design — safe to ship in client-side code, unlike a client secret.
const GOOGLE_CLIENT_ID = "283452539082-s23o3vcikgpt53rt903n2o39ml5ppjqe.apps.googleusercontent.com";
// API key is restricted to this site's origin and to Drive/Picker APIs only — safe to ship.
const GOOGLE_API_KEY = "AIzaSyCBKH9IzQTdoEMST8IE3h6P9G0E4Qg8e28";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

// Kept in memory only, never localStorage — this is a static site with no backend,
// so there's no safe long-term place to hold a token. Reconnecting each session
// is the honest tradeoff of that, not an oversight.
let driveAccessToken = null;
let driveTokenClient = null;
// If something (like linking a Drive file) needs a token first, it queues itself
// here and the token callback runs it once a token actually comes back.
let pendingDriveAction = null;

function setDriveStatus(text, connected) {
  const el = $("#driveStatus");
  if (!el) return;
  el.textContent = text;
  el.classList.toggle("connected", Boolean(connected));
}

function initDriveTokenClient() {
  if (driveTokenClient || !window.google?.accounts?.oauth2) return driveTokenClient;
  driveTokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: DRIVE_SCOPE,
    callback: (response) => {
      if (response.error) {
        setDriveStatus("Connection failed — try again", false);
        setStatus("Google Drive connection failed", "saving");
        return;
      }
      driveAccessToken = response.access_token;
      setDriveStatus("Connected", true);
      const backupBtn = $("#btnDriveBackup");
      const connectBtn = $("#btnDriveConnect");
      if (backupBtn) backupBtn.hidden = false;
      if (connectBtn) connectBtn.textContent = "Reconnect";

      if (pendingDriveAction) {
        const action = pendingDriveAction;
        pendingDriveAction = null;
        action();
      }
    },
  });
  return driveTokenClient;
}

function connectGoogleDrive() {
  if (!navigator.onLine) {
    setDriveStatus("You're offline — connect once you're back online", false);
    return;
  }
  if (!window.google?.accounts?.oauth2) {
    setDriveStatus("Still loading — try again in a moment", false);
    return;
  }
  const client = initDriveTokenClient();
  if (!client) {
    setDriveStatus("Couldn't start Google sign-in — try again", false);
    return;
  }
  client.requestAccessToken();
}

async function backupProjectToDrive() {
  if (!navigator.onLine) {
    setStatus("Offline — Drive backup needs a connection", "saving");
    return;
  }
  if (!driveAccessToken) {
    setStatus("Connect Google Drive first", "saving");
    return;
  }

  const backup = collectProjectBackup();
  const projectName = (backup.project.name || "project").replace(/[^\w\- ]+/g, "").trim() || "project";
  const fileName = `${projectName} — Manuscript Map backup — ${new Date().toISOString().slice(0, 10)}.json`;

  const metadata = { name: fileName, mimeType: "application/json" };
  const boundary = "authoros-boundary-" + uid();
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    `${JSON.stringify(backup, null, 2)}\r\n` +
    `--${boundary}--`;

  setStatus("Backing up to Drive…", "saving");

  try {
    const res = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${driveAccessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body,
      }
    );

    if (res.status === 401) {
      driveAccessToken = null;
      setDriveStatus("Session expired — reconnect", false);
      const backupBtn = $("#btnDriveBackup");
      if (backupBtn) backupBtn.hidden = true;
      setStatus("Drive session expired — reconnect and try again", "saving");
      return;
    }

    if (!res.ok) {
      setStatus("Drive backup failed — try again", "saving");
      return;
    }

    const now = new Date().toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
    setDriveStatus(`Connected — last backup ${now}`, true);
    setStatus("Backed up to Google Drive", "saved");
  } catch (e) {
    console.error(e);
    setStatus("Drive backup failed — check your connection", "saving");
  }
}

function initDriveBackup() {
  $("#btnDriveConnect")?.addEventListener("click", connectGoogleDrive);
  $("#btnDriveBackup")?.addEventListener("click", backupProjectToDrive);
}

function ensureDriveConnectedThen(action) {
  if (driveAccessToken) {
    action();
    return;
  }
  if (!navigator.onLine) {
    setStatus("Offline — connect to Google Drive once you're back online", "saving");
    return;
  }
  pendingDriveAction = action;
  connectGoogleDrive();
}

// ============================================================
//  GOOGLE DRIVE PICKER — link an Asset Tracker entry to a real file
// ============================================================
let pickerApiLoaded = false;

function loadPickerApi(callback) {
  if (pickerApiLoaded) {
    callback();
    return;
  }
  if (!window.gapi) {
    setStatus("Google Picker still loading — try again in a moment", "saving");
    return;
  }
  gapi.load("picker", () => {
    pickerApiLoaded = true;
    callback();
  });
}

function openDrivePickerForAsset() {
  loadPickerApi(() => {
    const view = new google.picker.DocsView().setIncludeFolders(false).setSelectFolderEnabled(false);
    const picker = new google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(driveAccessToken)
      .setDeveloperKey(GOOGLE_API_KEY)
      .setCallback(onDriveFileSelected)
      .build();
    picker.setVisible(true);
  });
}

async function onDriveFileSelected(data) {
  if (data.action !== google.picker.Action.PICKED) return;
  const doc = data.docs && data.docs[0];
  if (!doc) return;

  setStatus("Fetching file details…", "saving");
  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${doc.id}?fields=id,name,modifiedTime,webViewLink`,
      { headers: { Authorization: `Bearer ${driveAccessToken}` } }
    );
    if (!res.ok) throw new Error("Drive metadata fetch failed");
    const file = await res.json();
    applyDriveFileToForm(file);
    setStatus("Linked to Google Drive", "saved");
  } catch (e) {
    console.error(e);
    setStatus("Couldn't fetch file details — try again", "saving");
  }
}

function applyDriveFileToForm(file) {
  $("#assetDriveFileId").value = file.id;
  $("#assetDriveFileName").value = file.name;
  $("#assetDriveModified").value = file.modifiedTime;
  $("#assetLocation").value = file.webViewLink;
  renderDriveLinkStatus();
}

function renderDriveLinkStatus() {
  const statusEl = $("#driveLinkStatus");
  const unlinkBtn = $("#btnUnlinkDriveFile");
  const linkBtn = $("#btnLinkDriveFile");
  if (!statusEl) return;

  const fileId = $("#assetDriveFileId")?.value;
  const fileName = $("#assetDriveFileName")?.value;
  const modified = $("#assetDriveModified")?.value;

  if (fileId) {
    const modifiedText = modified
      ? new Date(modified).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
      : "unknown";
    statusEl.textContent = `Linked to "${fileName}" — last modified ${modifiedText}. This updates automatically whenever you refresh it.`;
    if (unlinkBtn) unlinkBtn.hidden = false;
    if (linkBtn) linkBtn.textContent = "Change linked file";
  } else {
    statusEl.textContent = "Not linked to a Drive file — Location above is just a plain note unless you link one.";
    if (unlinkBtn) unlinkBtn.hidden = true;
    if (linkBtn) linkBtn.textContent = "🔗 Link Google Drive File";
  }
}

function unlinkDriveFile() {
  $("#assetDriveFileId").value = "";
  $("#assetDriveFileName").value = "";
  $("#assetDriveModified").value = "";
  renderDriveLinkStatus();
}

async function refreshAssetDriveMetadata(assetId) {
  const list = loadAssets();
  const asset = list.find((a) => a.id === assetId);
  if (!asset || !asset.driveFileId) return;

  ensureDriveConnectedThen(async () => {
    setStatus("Checking Drive for updates…", "saving");
    try {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${asset.driveFileId}?fields=name,modifiedTime,webViewLink`,
        { headers: { Authorization: `Bearer ${driveAccessToken}` } }
      );
      if (res.status === 401) {
        driveAccessToken = null;
        setStatus("Drive session expired — reconnect on Asset Tracker", "saving");
        return;
      }
      if (!res.ok) throw new Error("refresh failed");
      const file = await res.json();

      const freshList = loadAssets();
      const target = freshList.find((a) => a.id === assetId);
      if (target) {
        target.driveFileName = file.name;
        target.driveModified = file.modifiedTime;
        target.location = file.webViewLink;
        saveAssets(freshList);
        renderAssets();
        setStatus("Updated from Drive", "saved");
      }
    } catch (e) {
      console.error(e);
      setStatus("Couldn't refresh from Drive — try again", "saving");
    }
  });
}

function exportCurrentProject() {
  const backup = collectProjectBackup();
  const safeName = (backup.project.name || "project")
    .replace(/[^\w\-]+/g, "-")
    .toLowerCase();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeName}-author-os-backup.json`;
  a.click();
  URL.revokeObjectURL(url);
  setStatus("Project exported", "saved");
}

function applyProjectBackup(backup, { asNewProject = false } = {}) {
  if (!backup || backup.format !== "author-os-project") {
    throw new Error("Not a Manuscript Map project backup");
  }
  const payload = backup.data || {};

  if (asNewProject) {
    const name =
      (backup.project && backup.project.name ? backup.project.name : "Imported") +
      " (import)";
    createProject(name);
  }

  MODULE_KEYS.forEach((k) => {
    if (payload[k] == null) {
      localStorage.removeItem(sk(k));
    } else {
      localStorage.setItem(sk(k), JSON.stringify(payload[k]));
    }
  });

  reloadAllModules();
  renderProjectSwitcher();
  updateProjectTitles();
  if (asNewProject) maybeShowOnboarding();
}

function importProjectBackup(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const backup = JSON.parse(e.target.result);
      if (backup.format !== "author-os-project") {
        alert("This file is not a Manuscript Map project backup.");
        return;
      }
      const asNew = confirm(
        `Import project “${(backup.project && backup.project.name) || "Untitled"}”?\n\nOK = Create as new project\nCancel = Overwrite current project`
      );
      // OK = new, Cancel = overwrite current
      // Note: Cancel still proceeds with overwrite after a second confirm for safety
      if (asNew) {
        applyProjectBackup(backup, { asNewProject: true });
        setStatus("Project imported as new", "saved");
      } else {
        if (!confirm("Overwrite all data in the current project with this backup?")) return;
        applyProjectBackup(backup, { asNewProject: false });
        setStatus("Project restored from backup", "saved");
      }
    } catch (err) {
      alert("Could not read that backup file.");
      console.error(err);
    }
  };
  reader.readAsText(file);
}

function renderProjectSwitcher() {
  const el = $("#projectSwitcher");
  if (!el) return;
  const projects = loadProjects();
  const current = getCurrentProjectId();

  el.innerHTML = `
    <label class="project-label">Project</label>
    <select id="projectSelect" class="project-select">
      ${projects
        .map(
          (p) =>
            `<option value="${p.id}" ${p.id === current ? "selected" : ""}>${escapeHtml(p.name)}</option>`
        )
        .join("")}
    </select>
    <div class="project-actions">
      <button type="button" class="btn btn-ghost btn-sm" id="btnNewProject" title="New project">+</button>
      <button type="button" class="btn btn-ghost btn-sm" id="btnRenameProject" title="Rename">✎</button>
      <button type="button" class="btn btn-ghost btn-sm" id="btnDeleteProject" title="Delete">×</button>
      <button type="button" class="btn btn-ghost btn-sm" id="btnExportProject" title="Export full project">↓</button>
      <button type="button" class="btn btn-ghost btn-sm" id="btnImportProject" title="Import project backup">↑</button>
    </div>
  `;

  $("#projectSelect")?.addEventListener("change", (e) => switchProject(e.target.value));
  $("#btnNewProject")?.addEventListener("click", () => {
    const name = prompt("New project name:", "New Book");
    if (name == null) return;
    createProject(name);
    reloadAllModules();
    renderProjectSwitcher();
    updateProjectTitles();
    setStatus("Project created", "saved");
    maybeShowOnboarding();
  });
  $("#btnRenameProject")?.addEventListener("click", () => {
    const p = getCurrentProject();
    if (!p) return;
    const name = prompt("Rename project:", p.name);
    if (name == null) return;
    renameProject(p.id, name);
    renderProjectSwitcher();
    updateProjectTitles();
    setStatus("Project renamed", "saved");
  });
  $("#btnDeleteProject")?.addEventListener("click", () => {
    const id = getCurrentProjectId();
    if (deleteProject(id)) {
      reloadAllModules();
      renderProjectSwitcher();
      updateProjectTitles();
      setStatus("Project deleted", "saved");
    }
  });
  $("#btnExportProject")?.addEventListener("click", exportCurrentProject);
  $("#btnImportProject")?.addEventListener("click", () => {
    pickJsonFile((file) => importProjectBackup(file));
  });
}

// ============================================================
//  SHARED HELPERS (cross-module)
// ============================================================
function getProjectMeta() {
  try {
    const raw = localStorage.getItem(sk("author-os-metadata-vault"));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getProjectTitle() {
  const m = getProjectMeta();
  if (!m) return "";
  return (m.finalTitle || m.workingTitle || "").trim();
}

function getProjectAuthor() {
  const m = getProjectMeta();
  return m && m.author ? m.author.trim() : "";
}

/** Show book title under every module header when Metadata is filled */
function updateProjectTitles() {
  const title = getProjectTitle();
  const author = getProjectAuthor();
  const label = title ? (author ? `${title} · ${author}` : title) : "";
  const project = getCurrentProject();

  $$(".page-header").forEach((header) => {
    let el = header.querySelector(".project-book-title");
    if (!label) {
      if (el) el.remove();
      return;
    }
    if (!el) {
      el = document.createElement("p");
      el.className = "project-book-title";
      const h1 = header.querySelector("h1");
      if (h1 && h1.nextElementSibling) {
        h1.parentNode.insertBefore(el, h1.nextElementSibling);
      } else if (h1) {
        h1.after(el);
      } else {
        header.prepend(el);
      }
    }
    el.textContent = label;
  });

  // Browser tab title
  const tabBits = [];
  if (title) tabBits.push(title);
  else if (project) tabBits.push(project.name);
  tabBits.push("Manuscript Map");
  document.title = tabBits.join(" · ");

  // Mobile bar title
  const mobileTitle = $("#mobileBar .mobile-bar-title");
  if (mobileTitle) mobileTitle.textContent = title || (project ? project.name : "Manuscript Map");
}

/**
 * Jump to Review Log and pre-fill from an ARC reader
 */
function logReviewFromArc(arc) {
  // Map ARC platform → Review Log platform
  const platformMap = {
    goodreads: "goodreads",
    amazon: "amazon",
    blog: "blog",
    instagram: "instagram",
    tiktok: "tiktok",
    youtube: "youtube",
    bookbub: "bookbub",
    netgalley: "netgalley",
    other: "other",
  };

  showPage("reviews");
  showReviewForm({
    id: null,
    platform: platformMap[arc.platform] || "other",
    rating: arc.rating || "",
    date: arc.dateSent || "",
    reviewer: arc.name || "",
    link: arc.reviewLink || "",
    excerpt: "",
    notes: `From ARC · ${arc.name}${arc.contact ? " · " + arc.contact : ""}`,
  });
  // Clear editing id so it creates a new review
  editingReviewId = null;
  $("#reviewId").value = "";
  setStatus("Pre-filled from ARC — review & save", "saving");
}

// ============================================================
//  ROUTING
// ============================================================
function showPage(page) {
  // Paywall removed. All pages are open.
  $$(".view").forEach((v) => (v.hidden = true));
  $$(".nav-item").forEach((n) => n.classList.remove("active"));

  const view = $(`#view-${page}`);
  const nav = $(`.nav-item[data-page="${page}"]`);
  if (view) view.hidden = false;
  if (nav) nav.classList.add("active");

  // Update URL hash without jump
  if (location.hash !== `#${page}`) {
    history.replaceState(null, "", `#${page}`);
  }

  // Refresh progress when switching to checklist
  if (page === "checklist") updateProgress();
  if (page === "dashboard") renderDashboard();

  // Keep book title visible across modules
  updateProjectTitles();
}

function openSidebar() {
  $("#sidebar")?.classList.add("open");
  const bd = $("#sidebarBackdrop");
  if (bd) bd.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeSidebar() {
  $("#sidebar")?.classList.remove("open");
  const bd = $("#sidebarBackdrop");
  if (bd) bd.hidden = true;
  document.body.style.overflow = "";
}

function initMobileNav() {
  $("#menuBtn")?.addEventListener("click", openSidebar);
  $("#sidebarClose")?.addEventListener("click", closeSidebar);
  $("#sidebarBackdrop")?.addEventListener("click", closeSidebar);

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    closeSidebar();
    hideAssetForm();
    hideArcForm();
    hideReviewForm();
  });
}

function findFirstUncheckedInSection(sectionId, state) {
  const section = CHECKLIST_DATA.find((s) => s.id === sectionId);
  if (!section) return null;
  const item = section.items.find((i) => !state[i.id]);
  return item ? { section, item } : null;
}

function renderPlanningContext(container) {
  if (!container) return;
  const q = loadQuestionnaire();
  const hasContent = q && (q.q_oneSentence || q.q_genre || q.q_idealReader || q.q_comparable);

  if (!hasContent) {
    container.innerHTML = "";
    return;
  }

  const rows = [
    ["Premise", q.q_oneSentence],
    ["Genre", q.q_genre],
    ["Ideal reader", q.q_idealReader],
    ["Comps", q.q_comparable],
  ].filter(([, val]) => val);

  container.innerHTML = `
    <div class="planning-context-card">
      <div class="planning-context-label">From your Questionnaire</div>
      ${rows.map(([label, val]) => `<div class="planning-context-row"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(val).slice(0, 140)}${val.length > 140 ? "…" : ""}</div>`).join("")}
      <a href="#questionnaire" class="planning-context-link" data-goto="questionnaire">Edit in Questionnaire →</a>
    </div>
  `;

  container.querySelector(".planning-context-link")?.addEventListener("click", (e) => {
    e.preventDefault();
    showPage("questionnaire");
  });
}

// Maps a checklist item id to the Questionnaire fields that, once all filled,
// auto-check it. Fires once per item — never re-fires or re-forces a box the
// person has since unchecked on their own.
const CHECKLIST_QUESTIONNAIRE_LINKS = {
  p1: ["q_genre", "q_idealReader"],
};

function applyQuestionnaireAutoChecks() {
  const q = loadQuestionnaire();
  if (!q) return;
  const state = loadChecklistState();
  let changed = false;

  Object.entries(CHECKLIST_QUESTIONNAIRE_LINKS).forEach(([itemId, fields]) => {
    const flagKey = `_qauto_${itemId}`;
    if (state[flagKey]) return; // already applied once — don't override manual choices after this
    const allFilled = fields.every((f) => q[f] && String(q[f]).trim());
    if (allFilled) {
      state[itemId] = true;
      state[flagKey] = true;
      changed = true;
    }
  });

  if (changed) {
    saveChecklistState(state);
    renderChecklist();
    renderDashboard();
    setStatus("Checked off from your Questionnaire answers", "saved");
  }
}

// ============================================================
//  CHECKLIST DUE DATES + LAUNCH CALENDAR
// ============================================================
const CHECKLIST_DATES_KEY = "author-os-checklist-dates";
let calendarViewDate = new Date();
calendarViewDate.setDate(1);
let calendarSelectedDate = null;

function loadChecklistDates() {
  try {
    const raw = localStorage.getItem(sk(CHECKLIST_DATES_KEY));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveChecklistDates(dates) {
  try {
    localStorage.setItem(sk(CHECKLIST_DATES_KEY), JSON.stringify(dates));
  } catch (e) {
    console.error(e);
  }
}

function getDatedChecklistItems() {
  const dates = loadChecklistDates();
  const state = loadChecklistState();
  const items = [];
  CHECKLIST_DATA.forEach((section) => {
    section.items.forEach((item) => {
      const date = dates[item.id];
      if (date) {
        items.push({
          id: item.id,
          label: item.label,
          sectionTitle: section.title,
          date,
          done: Boolean(state[item.id]),
        });
      }
    });
  });
  return items;
}

function renderCalendar() {
  const grid = $("#calGrid");
  const label = $("#calMonthLabel");
  if (!grid || !label) return;

  const year = calendarViewDate.getFullYear();
  const month = calendarViewDate.getMonth();
  label.textContent = calendarViewDate.toLocaleDateString([], { month: "long", year: "numeric" });

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const byDate = {};
  getDatedChecklistItems().forEach((it) => {
    (byDate[it.date] = byDate[it.date] || []).push(it);
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  let html = "";

  for (let i = 0; i < firstWeekday; i++) {
    html += `<div class="calendar-day empty"></div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dayItems = byDate[dateStr] || [];
    const hasUndone = dayItems.some((it) => !it.done);
    const classes = [
      "calendar-day",
      dayItems.length ? "has-items" : "",
      dateStr === todayStr ? "today" : "",
      dateStr === calendarSelectedDate ? "selected" : "",
      dateStr < todayStr && hasUndone ? "overdue" : "",
    ].filter(Boolean).join(" ");

    html += `
      <button type="button" class="${classes}" data-date="${dateStr}">
        <span class="calendar-day-num">${d}</span>
        ${dayItems.length ? `<span class="calendar-day-dot"></span>` : ""}
      </button>
    `;
  }

  grid.innerHTML = html;

  grid.querySelectorAll(".calendar-day[data-date]").forEach((cell) => {
    cell.addEventListener("click", () => {
      calendarSelectedDate = cell.dataset.date === calendarSelectedDate ? null : cell.dataset.date;
      renderCalendar();
      renderCalendarAgenda();
    });
  });
}

function renderCalendarAgenda() {
  const list = $("#calAgendaList");
  const empty = $("#calAgendaEmpty");
  const title = $("#calAgendaTitle");
  const showAllBtn = $("#btnCalShowUpcoming");
  if (!list || !title) return;

  const dated = getDatedChecklistItems();
  const todayStr = new Date().toISOString().slice(0, 10);
  let itemsToShow;

  if (calendarSelectedDate) {
    title.textContent = new Date(`${calendarSelectedDate}T00:00:00`).toLocaleDateString([], {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    itemsToShow = dated.filter((it) => it.date === calendarSelectedDate);
    if (showAllBtn) showAllBtn.hidden = false;
  } else {
    title.textContent = "Upcoming";
    itemsToShow = dated
      .filter((it) => !it.done)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 15);
    if (showAllBtn) showAllBtn.hidden = true;
  }

  if (itemsToShow.length === 0) {
    list.innerHTML = "";
    if (empty) {
      empty.textContent = calendarSelectedDate
        ? "Nothing dated for this day."
        : "Nothing dated yet — add a date to a checklist item to see it here.";
      empty.hidden = false;
    }
    return;
  }
  if (empty) empty.hidden = true;

  list.innerHTML = itemsToShow
    .map((it) => {
      const overdue = it.date < todayStr && !it.done;
      return `
        <div class="check-item${it.done ? " done" : ""}">
          <input type="checkbox" data-agenda-id="${it.id}" ${it.done ? "checked" : ""} />
          <div class="check-item-content">
            <label class="check-item-label">${escapeHtml(it.label)}</label>
            <div class="check-item-hint">${escapeHtml(it.sectionTitle)} · ${
        overdue ? `<span class="overdue-tag">Overdue — ${escapeHtml(it.date)}</span>` : escapeHtml(it.date)
      }</div>
          </div>
        </div>
      `;
    })
    .join("");

  list.querySelectorAll("[data-agenda-id]").forEach((cb) => {
    cb.addEventListener("change", () => {
      const s = loadChecklistState();
      s[cb.dataset.agendaId] = cb.checked;
      saveChecklistState(s);
      renderChecklist();
      renderCalendarAgenda();
      renderCalendar();
      renderDashboard();
    });
  });
}

function initCalendar() {
  renderCalendar();
  renderCalendarAgenda();

  $("#btnCalPrev")?.addEventListener("click", () => {
    calendarViewDate.setMonth(calendarViewDate.getMonth() - 1);
    renderCalendar();
  });
  $("#btnCalNext")?.addEventListener("click", () => {
    calendarViewDate.setMonth(calendarViewDate.getMonth() + 1);
    renderCalendar();
  });
  $("#btnCalToday")?.addEventListener("click", () => {
    calendarViewDate = new Date();
    calendarViewDate.setDate(1);
    calendarSelectedDate = new Date().toISOString().slice(0, 10);
    renderCalendar();
    renderCalendarAgenda();
  });
  $("#btnCalShowUpcoming")?.addEventListener("click", () => {
    calendarSelectedDate = null;
    renderCalendar();
    renderCalendarAgenda();
  });
}

function openChecklistSection(sectionId, focusItemId) {
  showPage("checklist");
  requestAnimationFrame(() => {
    const secEl = document.querySelector(`.check-section[data-section="${sectionId}"]`);
    if (!secEl) return;
    if (!secEl.classList.contains("open")) {
      secEl.classList.add("open");
      const s = loadChecklistState();
      s[`_open_${sectionId}`] = true;
      saveChecklistState(s);
    }

    let scrollTarget = secEl;
    if (focusItemId) {
      const cb = document.getElementById(focusItemId);
      const row = cb ? cb.closest(".check-item") : null;
      if (row) {
        scrollTarget = row;
        row.classList.add("check-item-highlight");
        setTimeout(() => row.classList.remove("check-item-highlight"), 2600);
      }
    }
    scrollTarget.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

function initNavGroups() {
  $$(".nav-group").forEach((group) => {
    const id = group.dataset.group;
    const header = group.querySelector(".nav-group-header");
    if (!header) return;
    const stored = localStorage.getItem(`author-os-nav-group-${id}`);
    const open = stored === null ? true : stored === "open";

    group.classList.toggle("open", open);
    header.setAttribute("aria-expanded", String(open));

    header.addEventListener("click", () => {
      const isOpen = group.classList.toggle("open");
      header.setAttribute("aria-expanded", String(isOpen));
      localStorage.setItem(`author-os-nav-group-${id}`, isOpen ? "open" : "closed");
    });
  });
}

function initRouter() {
  $$(".nav-item:not(.disabled)").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const page = item.dataset.page;
      if (page) {
        showPage(page);
        closeSidebar();
      }
    });
  });

  // Handle initial hash or default
  const hash = (location.hash || "#dashboard").replace("#", "");
  const valid = ["dashboard", "checklist", "calendar", "metadata", "questionnaire", "assets", "arcs", "reviews", "distribution", "sales", "ads", "editing", "promo"].includes(hash)
    ? hash
    : "dashboard";
  showPage(valid);

  window.addEventListener("hashchange", () => {
    const p = (location.hash || "#dashboard").replace("#", "");
    if (["dashboard", "checklist", "calendar", "metadata", "questionnaire", "assets", "arcs", "reviews", "distribution", "sales", "ads", "editing", "promo"].includes(p)) showPage(p);
  });
}

// ============================================================
//  CHECKLIST
// ============================================================
const CHECKLIST_KEY = "author-os-checklist"; // use sk(CHECKLIST_KEY) for access

const CHECKLIST_DATA = [
  {
    id: "planning",
    title: "1. Planning & Setup",
    explainer:
      "This stage is about getting organized before writing daily, deciding roughly who the book is for and how it's structured. Start with the Author Questionnaire, your answers there (genre, audience, comps) directly inform the decisions below. Nothing here is locked in. A working title and a loose outline are enough to move forward.",
    items: [
      { id: "p0", label: "Complete the Author Questionnaire", hint: '<a href="#questionnaire">Open Questionnaire →</a>', page: "questionnaire" },
      { id: "p1", label: "Define target audience & genre", hint: "Who is this book for? Auto-checks once you've filled in Genre and Ideal Reader on the Questionnaire." },
      { id: "p2", label: "Choose working title", hint: "Can change later" },
      { id: "p3", label: "Outline structure (chapters / acts)", hint: "Even a loose outline helps" },
      { id: "p4", label: "Set word-count goal & deadline", hint: "Realistic > ambitious" },
      { id: "p5", label: "Decide formats (ebook, print, audio)", hint: "Affects ISBN needs" },
    ],
  },
  {
    id: "writing",
    title: "2. Writing",
    explainer:
      "The goal here is a complete draft, not a perfect one. Editing, the next stage, is where prose actually gets polished — trying to perfect each chapter while still writing it is the most common way first drafts stall out.",
    items: [
      { id: "w1", label: "Complete first draft", hint: "Done is better than perfect" },
      { id: "w2", label: "Self-edit pass (structure & plot)", hint: "Big picture before line edits" },
      { id: "w3", label: "Beta readers / critique partners", hint: "3–5 trusted readers ideal" },
      { id: "w4", label: "Incorporate feedback", hint: "Not every suggestion needs to be taken" },
    ],
  },
  {
    id: "editing",
    title: "3. Professional Editing",
    explainer:
      "<p>These are four genuinely different jobs, not four names for the same thing.</p>" +
      "<p><strong>Developmental edit</strong> fixes big-picture story and structure issues. <strong>Line edit</strong> polishes prose style and flow. <strong>Copyedit</strong> fixes grammar, consistency, and technical errors. <strong>Proofreading</strong> is the final typo catch, done after formatting, not before.</p>" +
      "<p>You don't need all four for every book — but the single most expensive mistake authors make is paying for \"editing\" without knowing which type they're getting, then discovering the structural problems are still there after the invoice is paid. Ask any editor directly which of these four they're offering before you hire them.</p>",
    items: [
      { id: "e1", label: "Developmental / structural edit", hint: "Optional but high impact" },
      { id: "e2", label: "Line / copy edit", hint: "Strongly recommended" },
      { id: "e3", label: "Proofreading pass", hint: "Final clean-up before formatting" },
      { id: "e4", label: "Final manuscript locked", hint: "No more content changes" },
    ],
  },
  {
    id: "design",
    title: "4. Cover & Interior Design",
    explainer:
      "Cover design and interior formatting are separate skills from writing and editing. Genre expectations matter more than personal taste here, readers judge a cover against others in the same category in about half a second.",
    items: [
      { id: "d1", label: "Commission or create cover", hint: "Genre-appropriate is key" },
      { id: "d2", label: "Finalize back-cover / description text", hint: "Use Metadata Vault" },
      { id: "d3", label: "Interior formatting (print + ebook)", hint: "Vellum, Atticus, or pro formatter" },
      { id: "d4", label: "Review print proof / ebook sample", hint: "Check for layout issues" },
    ],
  },
  {
    id: "metadata",
    title: "5. Metadata & ISBNs",
    explainer:
      "This is the information retailers, libraries, and search engines use to find and categorize your book. It's a lot of fields, but most only get set once — the Metadata Vault explains where to find anything unfamiliar, like ISBNs or BISAC codes.",
    items: [
      { id: "m1", label: "Purchase ISBNs (one per format)", hint: "Bowker (US) or local agency" },
      { id: "m2", label: "Fill Metadata Vault completely", hint: '<a href="#metadata">Open Metadata Vault →</a>', page: "metadata" },
      { id: "m3", label: "Choose primary + secondary BISAC", hint: "Be specific" },
      { id: "m4", label: "Write keywords (7 strong ones)", hint: "Think like a reader searching" },
      { id: "m5", label: "Write short + full description", hint: "Sales copy, not synopsis" },
    ],
  },
  {
    id: "distribution",
    title: "6. Upload & Distribution",
    explainer:
      "<p>The first time you log into a platform like KDP, IngramSpark, or Draft2Digital, the dashboard can look like it's in a foreign language. Here's roughly what you're looking at.</p>" +
      "<p>A <strong>Title/Details</strong> tab holds your metadata (title, description, keywords, categories), this is what you already filled in. A <strong>Content</strong> tab is where you upload the manuscript and cover files. A <strong>Pricing</strong> tab sets your price, territories, and royalty percentage.</p>" +
      "<p>Most of the rest of the dashboard you'll never touch. You don't need to understand the whole platform on day one, just these three areas.</p>",
    items: [
      { id: "u1", label: "Create KDP / IngramSpark / Draft2Digital accounts", hint: "Whichever you need" },
      { id: "u2", label: "Upload ebook files + metadata", hint: "Validate EPUB if required" },
      { id: "u3", label: "Upload print files + cover wrap", hint: "Check spine width calculation" },
      { id: "u4", label: "Set pricing & territories", hint: "Research comparable titles" },
      { id: "u5", label: "Order author copies / proof", hint: "Hold physical book before launch" },
      { id: "u6", label: "Approve and publish", hint: "Go live!" },
    ],
  },
  {
    id: "marketing",
    title: "7. Marketing & Launch",
    explainer:
      "Marketing doesn't need to happen everywhere at once. Pick one or two channels you can actually keep up with rather than trying to cover them all, a smaller, consistent effort beats a big push you can't sustain.",
    items: [
      { id: "k1", label: "Build landing page / author site update", hint: "Simple is fine" },
      { id: "k2", label: "Prepare ARC list & send copies", hint: "Goodreads, BookSirens, etc." },
      { id: "k3", label: "Schedule social / email announcements", hint: "Pre-order → launch → post" },
      { id: "k4", label: "Request early reviews", hint: "Never buy reviews" },
      { id: "k5", label: "Launch day checklist executed", hint: "Celebrate, then keep going" },
    ],
  },
  {
    id: "post",
    title: "8. Post-Launch",
    explainer:
      "Publishing isn't the finish line, it's closer to the starting line for the business side of things. The first 30 days matter most for gathering real signal on what's actually working.",
    items: [
      { id: "x1", label: "Monitor sales & reviews first 30 days", hint: "Respond to reader feedback" },
      { id: "x2", label: "Update ads / keywords if needed", hint: "Data > guesswork" },
      { id: "x3", label: "Plan next book or series entry", hint: "Momentum matters" },
    ],
  },
];

function loadChecklistState() {
  try {
    const raw = localStorage.getItem(sk(CHECKLIST_KEY));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveChecklistState(state) {
  try {
    localStorage.setItem(sk(CHECKLIST_KEY), JSON.stringify(state));
    setStatus("Checklist saved", "saved");
  } catch (e) {
    setStatus("Save failed", "saving");
    console.error(e);
  }
}

function renderChecklist() {
  const root = $("#checklistRoot");
  const state = loadChecklistState();
  root.innerHTML = "";

  CHECKLIST_DATA.forEach((section) => {
    const doneCount = section.items.filter((i) => state[i.id]).length;
    const total = section.items.length;
    const isOpen = state[`_open_${section.id}`] !== false; // default open

    const sec = document.createElement("div");
    sec.className = `check-section${isOpen ? " open" : ""}`;
    sec.dataset.section = section.id;

    sec.innerHTML = `
      <div class="check-section-header">
        <span class="chevron">▶</span>
        <h2>${section.title}</h2>
        <span class="section-count">${doneCount}/${total}</span>
      </div>
      <div class="check-section-body"></div>
    `;

    const body = sec.querySelector(".check-section-body");
    if (section.explainer) {
      const explainer = document.createElement("div");
      explainer.className = "check-section-explainer";
      explainer.innerHTML = section.explainer;
      body.appendChild(explainer);
    }
    if (section.id === "planning") {
      const context = document.createElement("div");
      context.id = "planningQContext";
      body.appendChild(context);
      renderPlanningContext(context);
    }
    section.items.forEach((item) => {
      const checked = Boolean(state[item.id]);
      const dates = loadChecklistDates();
      const dueDate = dates[item.id] || "";
      const row = document.createElement("div");
      row.className = `check-item${checked ? " done" : ""}`;
      row.innerHTML = `
        <input type="checkbox" id="${item.id}" ${checked ? "checked" : ""} />
        <div class="check-item-content">
          <label class="check-item-label" for="${item.id}">${item.label}</label>
          ${item.hint ? `<div class="check-item-hint">${item.hint}</div>` : ""}
        </div>
        <input type="date" class="check-item-date" data-item-id="${item.id}" value="${dueDate}" title="Set a date — shows on the Launch Calendar" />
      `;
      body.appendChild(row);
    });

    // Toggle section
    sec.querySelector(".check-section-header").addEventListener("click", () => {
      const open = sec.classList.toggle("open");
      const s = loadChecklistState();
      s[`_open_${section.id}`] = open;
      saveChecklistState(s);
    });

    // Checkbox changes
    body.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.addEventListener("change", () => {
        const s = loadChecklistState();
        s[cb.id] = cb.checked;
        saveChecklistState(s);
        cb.closest(".check-item").classList.toggle("done", cb.checked);
        // Update section count
        const countEl = sec.querySelector(".section-count");
        const newDone = section.items.filter((i) => s[i.id]).length;
        countEl.textContent = `${newDone}/${total}`;
        updateProgress();
      });
    });

    // Date changes
    body.querySelectorAll(".check-item-date").forEach((input) => {
      input.addEventListener("change", () => {
        const dates = loadChecklistDates();
        if (input.value) dates[input.dataset.itemId] = input.value;
        else delete dates[input.dataset.itemId];
        saveChecklistDates(dates);
        renderCalendar();
        renderCalendarAgenda();
      });
    });

    root.appendChild(sec);
  });

  updateProgress();
}

function updateProgress() {
  const state = loadChecklistState();
  let total = 0;
  let done = 0;
  CHECKLIST_DATA.forEach((sec) => {
    sec.items.forEach((item) => {
      total++;
      if (state[item.id]) done++;
    });
  });
  const pct = total ? Math.round((done / total) * 100) : 0;
  const fill = $("#progressFill");
  const text = $("#progressText");
  if (fill) fill.style.width = pct + "%";
  if (text) text.textContent = pct + "%";
}

function resetChecklist() {
  if (!confirm("Reset the entire checklist? All progress will be lost.")) return;
  localStorage.removeItem(sk(CHECKLIST_KEY));
  renderChecklist();
  setStatus("Checklist reset", "saved");
}

// ============================================================
//  METADATA VAULT
// ============================================================
const META_KEY = "author-os-metadata-vault";

const FIELDS = [
  "workingTitle", "finalTitle", "subtitle", "author", "contributors",
  "seriesName", "seriesNumber", "publisher", "pubDate", "language",
  "status", "pageCount", "wordCount",
  "fmtPaperback", "isbnPaperback", "pricePaperback",
  "fmtHardcover", "isbnHardcover", "priceHardcover",
  "fmtEbook", "isbnEbook", "priceEbook",
  "fmtAudio", "isbnAudio", "priceAudio",
  "bisacPrimary", "bisacSecondary", "keywords", "audience",
  "shortDesc", "fullDesc", "notes",
];

const CHECKBOX_FIELDS = ["fmtPaperback", "fmtHardcover", "fmtEbook", "fmtAudio"];

const form = () => $("#metadataForm");
const saveStatus = () => $("#saveStatus");

let statusTimer = null;
function setStatus(text, state = "") {
  const el = saveStatus();
  if (!el) return;
  el.textContent = text;
  el.className = "save-status" + (state ? ` ${state}` : "");
  clearTimeout(statusTimer);
  if (state === "saved") {
    statusTimer = setTimeout(() => {
      el.textContent = "Ready";
      el.className = "save-status";
    }, 2500);
  }
}

function getFormData() {
  const f = form();
  if (!f) return {};
  const data = {};
  FIELDS.forEach((name) => {
    const el = f.elements[name];
    if (!el) return;
    data[name] = CHECKBOX_FIELDS.includes(name) ? el.checked : el.value.trim();
  });
  data.updatedAt = new Date().toISOString();
  return data;
}

function setFormData(data) {
  if (!data) return;
  const f = form();
  if (!f) return;
  FIELDS.forEach((name) => {
    const el = f.elements[name];
    if (!el) return;
    if (CHECKBOX_FIELDS.includes(name)) {
      el.checked = Boolean(data[name]);
    } else if (data[name] != null) {
      el.value = data[name];
    }
  });
}

function saveMetadata() {
  try {
    localStorage.setItem(sk(META_KEY), JSON.stringify(getFormData()));
    setStatus("Metadata saved · " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), "saved");
    updateProjectTitles(); // cross-link: show title in all module headers
    return true;
  } catch (e) {
    setStatus("Save failed", "saving");
    console.error(e);
    return false;
  }
}

function loadMetadata() {
  try {
    const raw = localStorage.getItem(sk(META_KEY));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearMetadata() {
  if (!confirm("Clear all metadata fields? This cannot be undone.")) return;
  form()?.reset();
  localStorage.removeItem(sk(META_KEY));
  setStatus("Metadata cleared", "saved");
}

function exportJSON() {
  const data = getFormData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const title = (data.finalTitle || data.workingTitle || "metadata").replace(/[^\w\-]+/g, "-").toLowerCase();
  a.href = url;
  a.download = `${title}-metadata.json`;
  a.click();
  URL.revokeObjectURL(url);
  setStatus("Exported", "saved");
}

function importJSON(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      setFormData(data);
      saveMetadata();
      setStatus("Imported & saved", "saved");
    } catch {
      alert("Could not read that JSON file.");
    }
  };
  reader.readAsText(file);
}

let metaSaveTimer = null;
function scheduleMetaSave() {
  setStatus("Saving…", "saving");
  clearTimeout(metaSaveTimer);
  metaSaveTimer = setTimeout(saveMetadata, 550);
}

// ============================================================
//  FORM WIZARD (guided step-by-step mode for long forms)
// ============================================================
function initFormWizard(formEl, { storageKey, toggleBtn, encouragements = [], onFinish } = {}) {
  if (!formEl) return;
  const cards = Array.from(formEl.querySelectorAll(":scope > section.card"));
  if (cards.length === 0) return;

  const footer = formEl.querySelector(".form-footer");
  const modeKey = `${storageKey}-mode`;
  let mode = localStorage.getItem(modeKey) || (window.innerWidth <= 640 ? "guided" : "full");
  let step = 0;

  const nav = document.createElement("div");
  nav.className = "wizard-nav card";
  nav.innerHTML = `
    <div class="wizard-dots"></div>
    <div class="wizard-step-label"></div>
    <p class="wizard-encourage"></p>
    <div class="wizard-buttons">
      <button type="button" class="btn btn-ghost" data-wizard="back">← Back</button>
      <button type="button" class="btn btn-primary" data-wizard="next">Continue →</button>
    </div>
  `;
  formEl.insertBefore(nav, footer);

  const dotsEl = nav.querySelector(".wizard-dots");
  const labelEl = nav.querySelector(".wizard-step-label");
  const encourageEl = nav.querySelector(".wizard-encourage");
  const backBtn = nav.querySelector('[data-wizard="back"]');
  const nextBtn = nav.querySelector('[data-wizard="next"]');

  dotsEl.innerHTML = cards.map((_, i) => `<span class="wizard-dot" data-dot="${i}"></span>`).join("");

  function cardTitle(card) {
    return card.querySelector("h2")?.textContent?.trim() || `Step ${step + 1}`;
  }

  function render() {
    const guided = mode === "guided";
    formEl.classList.toggle("wizard-mode", guided);
    cards.forEach((c, i) => {
      c.hidden = guided && i !== step;
    });
    nav.hidden = !guided;
    if (footer) footer.hidden = guided && step !== cards.length - 1;

    if (guided) {
      labelEl.textContent = `Step ${step + 1} of ${cards.length} — ${cardTitle(cards[step])}`;
      encourageEl.textContent = encouragements[step] || "";
      backBtn.hidden = step === 0;
      nextBtn.textContent = step === cards.length - 1 ? "Save & finish" : "Continue →";
      dotsEl.querySelectorAll(".wizard-dot").forEach((d, i) => {
        d.classList.toggle("active", i === step);
        d.classList.toggle("done", i < step);
      });
    }

    if (toggleBtn) {
      toggleBtn.textContent = guided ? "Show full form" : "Switch to step-by-step";
    }
  }

  backBtn.addEventListener("click", () => {
    if (step > 0) {
      step -= 1;
      render();
      nav.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  nextBtn.addEventListener("click", () => {
    if (step < cards.length - 1) {
      step += 1;
      render();
      nav.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      // Last step: save, then drop into full-form view so they can review everything at once.
      if (typeof onFinish === "function") onFinish();
      mode = "full";
      localStorage.setItem(modeKey, mode);
      step = 0;
      render();
      formEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  dotsEl.addEventListener("click", (e) => {
    const dot = e.target.closest(".wizard-dot");
    if (!dot) return;
    step = Number(dot.dataset.dot);
    render();
    nav.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  toggleBtn?.addEventListener("click", () => {
    mode = mode === "guided" ? "full" : "guided";
    localStorage.setItem(modeKey, mode);
    step = 0;
    render();
    formEl.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  render();
}

function initMetadata() {
  const saved = loadMetadata();
  if (saved) setFormData(saved);

  const f = form();
  if (!f) return;

  f.addEventListener("input", scheduleMetaSave);
  f.addEventListener("change", scheduleMetaSave);
  f.addEventListener("submit", (e) => {
    e.preventDefault();
    saveMetadata();
  });

  $("#btnSave")?.addEventListener("click", (e) => {
    e.preventDefault();
    saveMetadata();
  });
  $("#btnClear")?.addEventListener("click", clearMetadata);
  $("#btnExport")?.addEventListener("click", exportJSON);
  $("#btnImport")?.addEventListener("click", () => $("#importFile").click());
  $("#importFile")?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) importJSON(file);
    e.target.value = "";
  });

  initFormWizard(f, {
    storageKey: "author-os-meta-wizard",
    toggleBtn: $("#btnMetaWizardToggle"),
    encouragements: [
      "Let's start with the basics, just a title and your name to begin.",
      "Nice, moving right along. A few publication details next.",
      "This is the part that trips people up most, take your time, the hints are here to help.",
      "Almost there. This helps readers actually find your book.",
      "Last stretch, this is your book's sales pitch. You've got this.",
    ],
    onFinish: saveMetadata,
  });
}

// ============================================================
//  QUESTIONNAIRE
// ============================================================
const Q_KEY = "author-os-questionnaire";

const Q_FIELDS = [
  "q_oneSentence", "q_whyWrite", "q_comparable", "q_unique",
  "q_idealReader", "q_genre", "q_heat", "q_promise",
  "q_primaryGoal", "q_salesTarget", "q_timeline", "q_successLooksLike",
  "q_existingAudience", "q_budget", "q_hours", "q_help", "q_blockers", "q_notes"
];

const Q_CHECKBOXES = [
  "q_mkt_email", "q_mkt_social", "q_mkt_ads", "q_mkt_podcast",
  "q_mkt_events", "q_mkt_arcs", "q_mkt_none"
];

function getQData() {
  const f = $("#questionnaireForm");
  if (!f) return {};
  const data = {};
  Q_FIELDS.forEach((name) => {
    const el = f.elements[name];
    if (el) data[name] = el.value.trim();
  });
  Q_CHECKBOXES.forEach((name) => {
    const el = f.elements[name];
    if (el) data[name] = el.checked;
  });
  data.updatedAt = new Date().toISOString();
  return data;
}

function setQData(data) {
  if (!data) return;
  const f = $("#questionnaireForm");
  if (!f) return;
  Q_FIELDS.forEach((name) => {
    const el = f.elements[name];
    if (el && data[name] != null) el.value = data[name];
  });
  Q_CHECKBOXES.forEach((name) => {
    const el = f.elements[name];
    if (el) el.checked = Boolean(data[name]);
  });
}

function saveQuestionnaire() {
  try {
    localStorage.setItem(sk(Q_KEY), JSON.stringify(getQData()));
    setStatus("Questionnaire saved · " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), "saved");
    renderPlanningContext($("#planningQContext"));
    applyQuestionnaireAutoChecks();
    return true;
  } catch (e) {
    setStatus("Save failed", "saving");
    console.error(e);
    return false;
  }
}

function loadQuestionnaire() {
  try {
    const raw = localStorage.getItem(sk(Q_KEY));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearQuestionnaire() {
  if (!confirm("Clear all questionnaire answers?")) return;
  $("#questionnaireForm")?.reset();
  localStorage.removeItem(sk(Q_KEY));
  setStatus("Questionnaire cleared", "saved");
}

function exportQuestionnaire() {
  const data = getQData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "project-questionnaire.json";
  a.click();
  URL.revokeObjectURL(url);
  setStatus("Exported", "saved");
}

let qSaveTimer = null;
function scheduleQSave() {
  setStatus("Saving…", "saving");
  clearTimeout(qSaveTimer);
  qSaveTimer = setTimeout(saveQuestionnaire, 550);
}

function initQuestionnaire() {
  const saved = loadQuestionnaire();
  if (saved) setQData(saved);
  applyQuestionnaireAutoChecks();

  const f = $("#questionnaireForm");
  if (!f) return;

  f.addEventListener("input", scheduleQSave);
  f.addEventListener("change", scheduleQSave);
  f.addEventListener("submit", (e) => {
    e.preventDefault();
    saveQuestionnaire();
  });

  $("#btnSaveQ")?.addEventListener("click", (e) => {
    e.preventDefault();
    saveQuestionnaire();
  });
  $("#btnClearQ")?.addEventListener("click", clearQuestionnaire);
  $("#btnExportQ")?.addEventListener("click", exportQuestionnaire);
  $("#btnImportQ")?.addEventListener("click", () => {
    pickJsonFile((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (typeof data !== "object" || Array.isArray(data)) {
            alert("Expected a questionnaire JSON object.");
            return;
          }
          setQData(data);
          saveQuestionnaire();
          setStatus("Questionnaire imported", "saved");
        } catch {
          alert("Could not read that JSON file.");
        }
      };
      reader.readAsText(file);
    });
  });

  initFormWizard(f, {
    storageKey: "author-os-q-wizard",
    toggleBtn: $("#btnQWizardToggle"),
    encouragements: [
      "No wrong answers here, just get your first honest thoughts down.",
      "Now let's think about who you're actually writing this for.",
      "A little goal-setting, keep it honest, not aspirational.",
      "Let's talk marketing, at whatever level feels doable for you.",
      "Last section, just a gut check on time and support.",
    ],
    onFinish: saveQuestionnaire,
  });
}

// ============================================================
//  ASSET TRACKER
// ============================================================
const ASSETS_KEY = "author-os-assets";
let assetsFilter = "all";
let editingAssetId = null;

const CATEGORY_LABELS = {
  manuscript: "Manuscript",
  cover: "Cover",
  interior: "Interior",
  marketing: "Marketing",
  audio: "Audio",
  legal: "Legal",
  other: "Other",
};

const STATUS_LABELS = {
  draft: "Draft",
  "in-progress": "In Progress",
  review: "Needs Review",
  final: "Final",
  archived: "Archived",
};

function loadAssets() {
  try {
    const raw = localStorage.getItem(sk(ASSETS_KEY));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAssets(list) {
  try {
    localStorage.setItem(sk(ASSETS_KEY), JSON.stringify(list));
    setStatus("Assets saved", "saved");
  } catch (e) {
    setStatus("Save failed", "saving");
    console.error(e);
  }
}

function toggleCoverBriefFields() {
  const wrap = $("#coverBriefFields");
  if (!wrap) return;
  wrap.hidden = $("#assetCategory")?.value !== "cover";
}

function showAssetForm(asset = null) {
  const card = $("#assetFormCard");
  if (!card) return;
  card.hidden = false;
  editingAssetId = asset ? asset.id : null;
  $("#assetFormTitle").textContent = asset ? "Edit Asset" : "Add Asset";
  $("#assetId").value = asset ? asset.id : "";
  $("#assetName").value = asset ? asset.name : "";
  $("#assetCategory").value = asset ? asset.category : "manuscript";
  $("#assetStatus").value = asset ? asset.status : "draft";
  $("#assetVersion").value = asset ? asset.version || "" : "";
  $("#assetLocation").value = asset ? asset.location || "" : "";
  $("#assetDriveFileId").value = asset ? asset.driveFileId || "" : "";
  $("#assetDriveFileName").value = asset ? asset.driveFileName || "" : "";
  $("#assetDriveModified").value = asset ? asset.driveModified || "" : "";
  $("#assetMoodBoard").value = asset ? asset.moodBoard || "" : "";
  $("#assetCompCovers").value = asset ? asset.compCovers || "" : "";
  $("#assetNotes").value = asset ? asset.notes || "" : "";
  toggleCoverBriefFields();
  renderDriveLinkStatus();
  $("#assetName").focus();
}

function hideAssetForm() {
  const card = $("#assetFormCard");
  if (card) card.hidden = true;
  editingAssetId = null;
  $("#assetForm")?.reset();
}

function renderAssets() {
  const list = loadAssets();
  const filtered =
    assetsFilter === "all" ? list : list.filter((a) => a.category === assetsFilter);

  const container = $("#assetList");
  const empty = $("#assetEmpty");
  if (!container) return;

  // Sort: final first, then by updated
  filtered.sort((a, b) => {
    if (a.status === "final" && b.status !== "final") return -1;
    if (b.status === "final" && a.status !== "final") return 1;
    return (b.updatedAt || "").localeCompare(a.updatedAt || "");
  });

  container.innerHTML = "";

  if (filtered.length === 0) {
    if (empty) empty.hidden = list.length > 0; // only show full empty if no assets at all
    if (list.length > 0) {
      container.innerHTML = `<p class="hint" style="padding:12px 0">No assets in this category.</p>`;
    }
    return;
  }

  if (empty) empty.hidden = true;

  filtered.forEach((asset) => {
    const card = document.createElement("div");
    card.className = "asset-card";
    card.dataset.id = asset.id;

    const locHtml = asset.location
      ? asset.location.startsWith("http")
        ? `<div class="asset-location"><a href="${escapeHtml(asset.location)}" target="_blank" rel="noopener">${escapeHtml(asset.location)}</a></div>`
        : `<div class="asset-location">${escapeHtml(asset.location)}</div>`
      : "";

    const notesHtml = asset.notes
      ? `<div class="asset-notes">${escapeHtml(asset.notes)}</div>`
      : "";

    const coverBriefHtml =
      asset.category === "cover" && (asset.moodBoard || asset.compCovers)
        ? `<div class="asset-notes">
            ${asset.moodBoard ? `<strong>Mood board:</strong> ${escapeHtml(asset.moodBoard)}<br>` : ""}
            ${asset.compCovers ? `<strong>Comp covers:</strong> ${escapeHtml(asset.compCovers)}` : ""}
          </div>`
        : "";

    const driveSyncHtml = asset.driveFileId
      ? `<div class="asset-notes"><span class="drive-sync-tag" data-refresh-drive="${asset.id}">🔄 Synced from Drive · ${asset.driveModified ? escapeHtml(new Date(asset.driveModified).toLocaleDateString()) : "—"}</span></div>`
      : "";

    card.innerHTML = `
      <div class="asset-card-main">
        <div class="asset-name">${escapeHtml(asset.name)}</div>
        <div class="asset-meta">
          <span class="asset-tag">${CATEGORY_LABELS[asset.category] || asset.category}</span>
          <span class="asset-tag status-${asset.status}">${STATUS_LABELS[asset.status] || asset.status}</span>
          ${asset.version ? `<span class="asset-tag">${escapeHtml(asset.version)}</span>` : ""}
        </div>
        ${locHtml}
        ${driveSyncHtml}
        ${coverBriefHtml}
        ${notesHtml}
      </div>
      <div class="asset-actions">
        <button type="button" class="btn btn-ghost btn-edit-asset">Edit</button>
        <button type="button" class="btn btn-danger btn-delete-asset">Delete</button>
      </div>
    `;

    card.querySelector("[data-refresh-drive]")?.addEventListener("click", () => {
      refreshAssetDriveMetadata(asset.id);
    });

    card.querySelector(".btn-edit-asset").addEventListener("click", () => {
      showAssetForm(asset);
    });
    card.querySelector(".btn-delete-asset").addEventListener("click", () => {
      if (!confirm(`Delete “${asset.name}”?`)) return;
      const next = loadAssets().filter((a) => a.id !== asset.id);
      saveAssets(next);
      renderAssets();
    });

    container.appendChild(card);
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function exportAssets() {
  const data = loadAssets();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "assets-export.json";
  a.click();
  URL.revokeObjectURL(url);
  setStatus("Assets exported", "saved");
}

function importListFromFile(file, { load, save, render, label }) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data)) {
        alert("Expected a JSON array of items.");
        return;
      }
      const existing = load();
      const merge = confirm(
        `Import ${data.length} ${label}.\n\nOK = Merge with existing (${existing.length} items)\nCancel = Replace all`
      );
      let next;
      if (merge) {
        const ids = new Set(existing.map((x) => x.id).filter(Boolean));
        next = existing.slice();
        data.forEach((item) => {
          const copy = { ...item, id: item.id || uid() };
          if (item.id && ids.has(item.id)) {
            const idx = next.findIndex((x) => x.id === item.id);
            if (idx >= 0) next[idx] = { ...next[idx], ...copy };
          } else {
            next.push(copy);
          }
        });
      } else {
        next = data.map((item) => ({ ...item, id: item.id || uid() }));
      }
      save(next);
      render();
      setStatus(`Imported ${data.length} ${label}`, "saved");
    } catch (err) {
      alert("Could not read that JSON file.");
      console.error(err);
    }
  };
  reader.readAsText(file);
}

function pickJsonFile(callback) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,application/json";
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (file) callback(file);
  });
  input.click();
}

function initAssets() {
  renderAssets();

  $("#btnAddAsset")?.addEventListener("click", () => showAssetForm());
  $("#btnAddAssetEmpty")?.addEventListener("click", () => showAssetForm());
  $("#btnCancelAsset")?.addEventListener("click", hideAssetForm);
  $("#btnExportAssets")?.addEventListener("click", exportAssets);
  $("#btnImportAssets")?.addEventListener("click", () => {
    pickJsonFile((file) =>
      importListFromFile(file, {
        load: loadAssets,
        save: saveAssets,
        render: renderAssets,
        label: "assets",
      })
    );
  });

  $("#assetCategory")?.addEventListener("change", toggleCoverBriefFields);
  $("#btnLinkDriveFile")?.addEventListener("click", () => ensureDriveConnectedThen(openDrivePickerForAsset));
  $("#btnUnlinkDriveFile")?.addEventListener("click", unlinkDriveFile);

  // Filters
  $$("#assetFilters .filter-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      $$("#assetFilters .filter-chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      assetsFilter = chip.dataset.filter || "all";
      renderAssets();
    });
  });

  // Form submit
  $("#assetForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("#assetName").value.trim();
    if (!name) return;

    const list = loadAssets();
    const payload = {
      id: editingAssetId || uid(),
      name,
      category: $("#assetCategory").value,
      status: $("#assetStatus").value,
      version: $("#assetVersion").value.trim(),
      location: $("#assetLocation").value.trim(),
      driveFileId: $("#assetDriveFileId").value.trim(),
      driveFileName: $("#assetDriveFileName").value.trim(),
      driveModified: $("#assetDriveModified").value.trim(),
      moodBoard: $("#assetMoodBoard").value.trim(),
      compCovers: $("#assetCompCovers").value.trim(),
      notes: $("#assetNotes").value.trim(),
      updatedAt: new Date().toISOString(),
    };

    if (editingAssetId) {
      const idx = list.findIndex((a) => a.id === editingAssetId);
      if (idx >= 0) list[idx] = { ...list[idx], ...payload };
      else list.push(payload);
    } else {
      payload.createdAt = payload.updatedAt;
      list.push(payload);
    }

    saveAssets(list);
    hideAssetForm();
    renderAssets();
  });
}

// ============================================================
//  SALES & ROYALTY LOG (Pro)
// ============================================================
const SALES_KEY = "author-os-sales";
let salesFilter = "all";
let editingSaleId = null;

const SALES_PLATFORM_LABELS = {
  kdp: "KDP (Amazon)",
  apple: "Apple Books",
  kobo: "Kobo",
  ingram: "IngramSpark",
  d2d: "Draft2Digital",
  direct: "Direct",
  other: "Other",
};

function loadSales() {
  try {
    const raw = localStorage.getItem(sk(SALES_KEY));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSales(list) {
  try {
    localStorage.setItem(sk(SALES_KEY), JSON.stringify(list));
    setStatus("Sales saved", "saved");
  } catch (e) {
    setStatus("Save failed", "saving");
    console.error(e);
  }
}

function lastNMonths(n) {
  const months = [];
  const d = new Date();
  d.setDate(1); // avoid month-length overflow issues
  for (let i = 0; i < n; i++) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    months.push(`${y}-${m}`);
    d.setMonth(d.getMonth() - 1);
  }
  return months;
}

function getTrailingRevenue() {
  const list = loadSales();
  const months = new Set(lastNMonths(3));
  const total = list
    .filter((s) => months.has(s.month))
    .reduce((sum, s) => sum + (Number(s.revenue) || 0), 0);
  return { total, hasAny: list.length > 0 };
}

function showSaleForm(entry = null) {
  const card = $("#saleFormCard");
  if (!card) return;
  card.hidden = false;
  editingSaleId = entry ? entry.id : null;
  $("#saleFormTitle").textContent = entry ? "Edit Entry" : "Add Entry";
  $("#saleId").value = entry ? entry.id : "";
  $("#saleMonth").value = entry ? entry.month || "" : "";
  $("#salePlatform").value = entry ? entry.platform : "kdp";
  $("#saleFormat").value = entry ? entry.format : "ebook";
  $("#saleUnits").value = entry ? entry.units ?? "" : "";
  $("#salePageReads").value = entry ? entry.pageReads ?? "" : "";
  $("#saleRevenue").value = entry ? entry.revenue ?? "" : "";
  $("#saleNotes").value = entry ? entry.notes || "" : "";
  $("#saleMonth").focus();
}

function hideSaleForm() {
  const card = $("#saleFormCard");
  if (card) card.hidden = true;
  editingSaleId = null;
  $("#saleForm")?.reset();
}

function renderSales() {
  const list = loadSales();
  const filtered = salesFilter === "all" ? list : list.filter((s) => s.platform === salesFilter);

  const container = $("#saleList");
  const empty = $("#saleEmpty");
  if (!container) return;

  filtered.sort((a, b) => (b.month || "").localeCompare(a.month || ""));

  container.innerHTML = "";

  if (filtered.length === 0) {
    if (empty) empty.hidden = list.length > 0;
    if (list.length > 0) {
      container.innerHTML = `<p class="hint" style="padding:12px 0">No entries for this platform.</p>`;
    }
    return;
  }

  if (empty) empty.hidden = true;

  filtered.forEach((entry) => {
    const card = document.createElement("div");
    card.className = "asset-card";
    card.dataset.id = entry.id;

    const revenueText =
      entry.revenue != null && entry.revenue !== ""
        ? `$${Number(entry.revenue).toFixed(2)}`
        : "—";
    const unitsText = entry.units != null && entry.units !== "" ? `${entry.units} units` : "";
    const pageReadsText =
      entry.pageReads != null && entry.pageReads !== "" ? `${entry.pageReads} page-reads` : "";
    const notesHtml = entry.notes ? `<div class="asset-notes">${escapeHtml(entry.notes)}</div>` : "";

    card.innerHTML = `
      <div class="asset-card-main">
        <div class="asset-name">${escapeHtml(entry.month || "—")} · ${escapeHtml(revenueText)}</div>
        <div class="asset-meta">
          <span class="asset-tag">${escapeHtml(SALES_PLATFORM_LABELS[entry.platform] || entry.platform)}</span>
          <span class="asset-tag">${escapeHtml(DIST_FORMAT_LABELS[entry.format] || entry.format)}</span>
          ${unitsText ? `<span class="asset-tag">${escapeHtml(unitsText)}</span>` : ""}
          ${pageReadsText ? `<span class="asset-tag">${escapeHtml(pageReadsText)}</span>` : ""}
        </div>
        ${notesHtml}
      </div>
      <div class="asset-actions">
        <button type="button" class="btn btn-ghost btn-edit-sale">Edit</button>
        <button type="button" class="btn btn-danger btn-delete-sale">Delete</button>
      </div>
    `;

    card.querySelector(".btn-edit-sale").addEventListener("click", () => showSaleForm(entry));
    card.querySelector(".btn-delete-sale").addEventListener("click", () => {
      if (!confirm(`Delete the ${entry.month || ""} entry?`)) return;
      const next = loadSales().filter((s) => s.id !== entry.id);
      saveSales(next);
      renderSales();
      renderDashboard();
    });

    container.appendChild(card);
  });
}

function exportSales() {
  const data = loadSales();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sales-export.json";
  a.click();
  URL.revokeObjectURL(url);
  setStatus("Sales exported", "saved");
}

function initSales() {
  renderSales();

  $("#btnAddSale")?.addEventListener("click", () => showSaleForm());
  $("#btnAddSaleEmpty")?.addEventListener("click", () => showSaleForm());
  $("#btnCancelSale")?.addEventListener("click", hideSaleForm);
  $("#btnExportSales")?.addEventListener("click", exportSales);
  $("#btnImportSales")?.addEventListener("click", () => {
    pickJsonFile((file) =>
      importListFromFile(file, {
        load: loadSales,
        save: saveSales,
        render: renderSales,
        label: "sales entries",
      })
    );
  });

  $$("#salesFilters .filter-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      $$("#salesFilters .filter-chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      salesFilter = chip.dataset.filter || "all";
      renderSales();
    });
  });

  $("#saleForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const month = $("#saleMonth").value;
    if (!month) return;

    const list = loadSales();
    const payload = {
      id: editingSaleId || uid(),
      month,
      platform: $("#salePlatform").value,
      format: $("#saleFormat").value,
      units: $("#saleUnits").value === "" ? null : Number($("#saleUnits").value),
      pageReads: $("#salePageReads").value === "" ? null : Number($("#salePageReads").value),
      revenue: $("#saleRevenue").value === "" ? null : Number($("#saleRevenue").value),
      notes: $("#saleNotes").value.trim(),
      updatedAt: new Date().toISOString(),
    };

    if (editingSaleId) {
      const idx = list.findIndex((s) => s.id === editingSaleId);
      if (idx >= 0) list[idx] = { ...list[idx], ...payload };
      else list.push(payload);
    } else {
      payload.createdAt = payload.updatedAt;
      list.push(payload);
    }

    saveSales(list);
    hideSaleForm();
    renderSales();
    renderDashboard();
  });
}

// ============================================================
//  DISTRIBUTION TRACKER (Pro)
// ============================================================
const DIST_KEY = "author-os-distribution";
let distFilter = "all";
let editingDistId = null;

const DIST_CHANNEL_LABELS = {
  amazon: "Amazon",
  apple: "Apple Books",
  kobo: "Kobo",
  "google-play": "Google Play Books",
  bn: "Barnes & Noble",
  library: "Library systems",
  indie: "Independent bookstores",
  other: "Other",
};

const DIST_FORMAT_LABELS = {
  ebook: "Ebook",
  paperback: "Paperback",
  hardcover: "Hardcover",
  audio: "Audiobook",
};

const DIST_STATUS_LABELS = {
  "not-submitted": "Not Submitted",
  pending: "Pending",
  live: "Live",
  rejected: "Rejected",
};

function loadDistribution() {
  try {
    const raw = localStorage.getItem(sk(DIST_KEY));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDistribution(list) {
  try {
    localStorage.setItem(sk(DIST_KEY), JSON.stringify(list));
    setStatus("Distribution saved", "saved");
  } catch (e) {
    setStatus("Save failed", "saving");
    console.error(e);
  }
}

function getDistributionProgress() {
  const list = loadDistribution();
  const live = list.filter((d) => d.status === "live").length;
  return { live, total: list.length };
}

function showDistForm(entry = null) {
  const card = $("#distFormCard");
  if (!card) return;
  card.hidden = false;
  editingDistId = entry ? entry.id : null;
  $("#distFormTitle").textContent = entry ? "Edit Channel" : "Add Channel";
  $("#distId").value = entry ? entry.id : "";
  $("#distChannel").value = entry ? entry.channel : "amazon";
  $("#distFormat").value = entry ? entry.format : "ebook";
  $("#distStatus").value = entry ? entry.status : "not-submitted";
  $("#distDateLive").value = entry ? entry.dateLive || "" : "";
  $("#distLink").value = entry ? entry.link || "" : "";
  $("#distNotes").value = entry ? entry.notes || "" : "";
  $("#distChannel").focus();
}

function hideDistForm() {
  const card = $("#distFormCard");
  if (card) card.hidden = true;
  editingDistId = null;
  $("#distForm")?.reset();
}

function renderDistribution() {
  const list = loadDistribution();
  const filtered = distFilter === "all" ? list : list.filter((d) => d.status === distFilter);

  const container = $("#distList");
  const empty = $("#distEmpty");
  if (!container) return;

  filtered.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));

  container.innerHTML = "";

  if (filtered.length === 0) {
    if (empty) empty.hidden = list.length > 0;
    if (list.length > 0) {
      container.innerHTML = `<p class="hint" style="padding:12px 0">No channels in this status.</p>`;
    }
    return;
  }

  if (empty) empty.hidden = true;

  filtered.forEach((entry) => {
    const card = document.createElement("div");
    card.className = "asset-card";
    card.dataset.id = entry.id;

    const linkHtml = entry.link
      ? `<div class="asset-location"><a href="${escapeHtml(entry.link)}" target="_blank" rel="noopener">${escapeHtml(entry.link)}</a></div>`
      : "";
    const notesHtml = entry.notes ? `<div class="asset-notes">${escapeHtml(entry.notes)}</div>` : "";
    const statusClass =
      entry.status === "live" ? "final" : entry.status === "rejected" ? "archived" : "in-progress";

    card.innerHTML = `
      <div class="asset-card-main">
        <div class="asset-name">${escapeHtml(DIST_CHANNEL_LABELS[entry.channel] || entry.channel)}</div>
        <div class="asset-meta">
          <span class="asset-tag">${escapeHtml(DIST_FORMAT_LABELS[entry.format] || entry.format)}</span>
          <span class="asset-tag status-${statusClass}">${escapeHtml(DIST_STATUS_LABELS[entry.status] || entry.status)}</span>
          ${entry.dateLive ? `<span class="asset-tag">${escapeHtml(entry.dateLive)}</span>` : ""}
        </div>
        ${linkHtml}
        ${notesHtml}
      </div>
      <div class="asset-actions">
        <button type="button" class="btn btn-ghost btn-edit-dist">Edit</button>
        <button type="button" class="btn btn-danger btn-delete-dist">Delete</button>
      </div>
    `;

    card.querySelector(".btn-edit-dist").addEventListener("click", () => showDistForm(entry));
    card.querySelector(".btn-delete-dist").addEventListener("click", () => {
      if (!confirm(`Remove ${DIST_CHANNEL_LABELS[entry.channel] || entry.channel}?`)) return;
      const next = loadDistribution().filter((d) => d.id !== entry.id);
      saveDistribution(next);
      renderDistribution();
      renderDashboard();
    });

    container.appendChild(card);
  });
}

function exportDistribution() {
  const data = loadDistribution();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "distribution-export.json";
  a.click();
  URL.revokeObjectURL(url);
  setStatus("Distribution exported", "saved");
}

function initDistribution() {
  renderDistribution();

  $("#btnAddDist")?.addEventListener("click", () => showDistForm());
  $("#btnAddDistEmpty")?.addEventListener("click", () => showDistForm());
  $("#btnCancelDist")?.addEventListener("click", hideDistForm);
  $("#btnExportDist")?.addEventListener("click", exportDistribution);
  $("#btnImportDist")?.addEventListener("click", () => {
    pickJsonFile((file) =>
      importListFromFile(file, {
        load: loadDistribution,
        save: saveDistribution,
        render: renderDistribution,
        label: "distribution channels",
      })
    );
  });

  $$("#distFilters .filter-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      $$("#distFilters .filter-chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      distFilter = chip.dataset.filter || "all";
      renderDistribution();
    });
  });

  $("#distForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const list = loadDistribution();
    const payload = {
      id: editingDistId || uid(),
      channel: $("#distChannel").value,
      format: $("#distFormat").value,
      status: $("#distStatus").value,
      dateLive: $("#distDateLive").value,
      link: $("#distLink").value.trim(),
      notes: $("#distNotes").value.trim(),
      updatedAt: new Date().toISOString(),
    };

    if (editingDistId) {
      const idx = list.findIndex((d) => d.id === editingDistId);
      if (idx >= 0) list[idx] = { ...list[idx], ...payload };
      else list.push(payload);
    } else {
      payload.createdAt = payload.updatedAt;
      list.push(payload);
    }

    saveDistribution(list);
    hideDistForm();
    renderDistribution();
    renderDashboard();
  });
}

// ============================================================
//  AD SPEND & ROI TRACKER
// ============================================================
const ADS_KEY = "author-os-ads";
const ADS_ROI_TOGGLE_KEY = "author-os-ads-roi-toggle";
const ADS_ROI_EXPLAINED_KEY = "author-os-ads-roi-explained";
const ADS_LAST_PLATFORM_KEY = "author-os-ads-last-platform";
let editingAdId = null;
let adsFilter = "all";

const ADS_PLATFORM_LABELS = {
  "amazon-ads": "Amazon Ads",
  meta: "Meta",
  bookbub: "BookBub CPC",
  other: "Other",
};

function loadAds() {
  try {
    const raw = localStorage.getItem(sk(ADS_KEY));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAds(list) {
  try {
    localStorage.setItem(sk(ADS_KEY), JSON.stringify(list));
    setStatus("Ad spend saved", "saved");
  } catch (e) {
    setStatus("Save failed", "saving");
    console.error(e);
  }
}

function getRoiToggle() {
  return localStorage.getItem(sk(ADS_ROI_TOGGLE_KEY)) === "on";
}

function setRoiToggle(on) {
  localStorage.setItem(sk(ADS_ROI_TOGGLE_KEY), on ? "on" : "off");
}

function roiExplainerSeen() {
  return localStorage.getItem(sk(ADS_ROI_EXPLAINED_KEY)) === "1";
}

function markRoiExplainerSeen() {
  localStorage.setItem(sk(ADS_ROI_EXPLAINED_KEY), "1");
}

// Formats a spend/attributed ratio, or a dash on partial data — never a zero or an assumed value.
function formatRoi(spend, attributed) {
  if (spend == null || spend === "" || attributed == null || attributed === "") return "—";
  const s = Number(spend);
  const a = Number(attributed);
  if (!s || Number.isNaN(s) || Number.isNaN(a)) return "—";
  return `${(a / s).toFixed(2)}x`;
}

function showAdForm(entry = null) {
  const card = $("#adFormCard");
  if (!card) return;
  card.hidden = false;
  editingAdId = entry ? entry.id : null;
  $("#adFormTitle").textContent = entry ? "Edit Entry" : "Add Entry";
  $("#adId").value = entry ? entry.id : "";
  $("#adCampaign").value = entry ? entry.campaign || "" : "";
  $("#adPlatform").value = entry ? entry.platform : "amazon-ads";
  $("#adDate").value = entry ? entry.date || "" : "";
  $("#adSpend").value = entry ? entry.spend ?? "" : "";
  $("#adAttributed").value = entry ? entry.attributed ?? "" : "";
  $("#adNotes").value = entry ? entry.notes || "" : "";
  $("#adCampaign").focus();
}

function hideAdForm() {
  const card = $("#adFormCard");
  if (card) card.hidden = true;
  editingAdId = null;
  $("#adForm")?.reset();
}

function renderAds() {
  const list = loadAds();
  const filtered = adsFilter === "all" ? list : list.filter((a) => a.platform === adsFilter);
  const showRoi = getRoiToggle();

  const container = $("#adList");
  const empty = $("#adEmpty");
  if (!container) return;

  filtered.sort((a, b) => (b.date || b.updatedAt || "").localeCompare(a.date || a.updatedAt || ""));

  container.innerHTML = "";

  if (filtered.length === 0) {
    if (empty) empty.hidden = list.length > 0;
    if (list.length > 0) {
      container.innerHTML = `<p class="hint" style="padding:12px 0">No entries for this platform.</p>`;
    }
    return;
  }

  if (empty) empty.hidden = true;

  filtered.forEach((entry) => {
    const card = document.createElement("div");
    card.className = "asset-card";
    card.dataset.id = entry.id;

    const spendText = entry.spend != null && entry.spend !== "" ? `$${Number(entry.spend).toFixed(2)} spent` : "—";
    const attrText =
      entry.attributed != null && entry.attributed !== "" ? `$${Number(entry.attributed).toFixed(2)} attributed` : "";
    const roiTag = showRoi
      ? `<span class="asset-tag">${formatRoi(entry.spend, entry.attributed)} <span class="roi-tag">self-reported</span></span>`
      : "";
    const notesHtml = entry.notes ? `<div class="asset-notes">${escapeHtml(entry.notes)}</div>` : "";

    card.innerHTML = `
      <div class="asset-card-main">
        <div class="asset-name">${escapeHtml(entry.campaign || ADS_PLATFORM_LABELS[entry.platform] || entry.platform)}</div>
        <div class="asset-meta">
          <span class="asset-tag">${escapeHtml(ADS_PLATFORM_LABELS[entry.platform] || entry.platform)}</span>
          ${entry.date ? `<span class="asset-tag">${escapeHtml(entry.date)}</span>` : ""}
          <span class="asset-tag">${escapeHtml(spendText)}</span>
          ${attrText ? `<span class="asset-tag">${escapeHtml(attrText)}</span>` : ""}
          ${roiTag}
        </div>
        ${notesHtml}
      </div>
      <div class="asset-actions">
        <button type="button" class="btn btn-ghost btn-edit-ad">Edit</button>
        <button type="button" class="btn btn-danger btn-delete-ad">Delete</button>
      </div>
    `;

    card.querySelector(".btn-edit-ad").addEventListener("click", () => showAdForm(entry));
    card.querySelector(".btn-delete-ad").addEventListener("click", () => {
      if (!confirm("Delete this entry?")) return;
      const next = loadAds().filter((a) => a.id !== entry.id);
      saveAds(next);
      renderAds();
    });

    container.appendChild(card);
  });
}

function exportAds() {
  const data = loadAds();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ad-spend-export.json";
  a.click();
  URL.revokeObjectURL(url);
  setStatus("Ad spend exported", "saved");
}

function initAds() {
  renderAds();

  // ROI toggle
  const toggle = $("#adsRoiToggle");
  const explainer = $("#adsRoiExplainer");
  if (toggle) {
    toggle.checked = getRoiToggle();
    toggle.addEventListener("change", () => {
      setRoiToggle(toggle.checked);
      if (toggle.checked && !roiExplainerSeen() && explainer) {
        explainer.hidden = false;
      }
      renderAds();
    });
  }
  $("#btnDismissRoiExplainer")?.addEventListener("click", () => {
    markRoiExplainerSeen();
    if (explainer) explainer.hidden = true;
  });

  // Quick add
  const qaPlatform = $("#qaAdPlatform");
  if (qaPlatform) {
    const lastPlatform = localStorage.getItem(sk(ADS_LAST_PLATFORM_KEY));
    if (lastPlatform) qaPlatform.value = lastPlatform;
  }

  $("#btnQuickAddAd")?.addEventListener("click", () => {
    const platform = $("#qaAdPlatform").value;
    const spend = $("#qaAdSpend").value;
    const attributed = $("#qaAdAttributed").value;
    if (spend === "" && attributed === "") return; // nothing to log

    localStorage.setItem(sk(ADS_LAST_PLATFORM_KEY), platform);

    const list = loadAds();
    const now = new Date().toISOString();
    list.push({
      id: uid(),
      campaign: "",
      platform,
      date: now.slice(0, 10),
      spend: spend === "" ? null : Number(spend),
      attributed: attributed === "" ? null : Number(attributed),
      notes: "",
      createdAt: now,
      updatedAt: now,
    });
    saveAds(list);
    renderAds();

    $("#qaAdSpend").value = "";
    $("#qaAdAttributed").value = "";
    $("#qaAdSpend").focus();
  });

  // Enter key in quick-add fields also saves
  [$("#qaAdSpend"), $("#qaAdAttributed")].forEach((el) => {
    el?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        $("#btnQuickAddAd").click();
      }
    });
  });

  $("#btnCancelAd")?.addEventListener("click", hideAdForm);
  $("#btnExportAds")?.addEventListener("click", exportAds);
  $("#btnImportAds")?.addEventListener("click", () => {
    pickJsonFile((file) =>
      importListFromFile(file, {
        load: loadAds,
        save: saveAds,
        render: renderAds,
        label: "ad spend entries",
      })
    );
  });

  $$("#adsFilters .filter-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      $$("#adsFilters .filter-chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      adsFilter = chip.dataset.filter || "all";
      renderAds();
    });
  });

  $("#adForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const list = loadAds();
    const payload = {
      id: editingAdId || uid(),
      campaign: $("#adCampaign").value.trim(),
      platform: $("#adPlatform").value,
      date: $("#adDate").value,
      spend: $("#adSpend").value === "" ? null : Number($("#adSpend").value),
      attributed: $("#adAttributed").value === "" ? null : Number($("#adAttributed").value),
      notes: $("#adNotes").value.trim(),
      updatedAt: new Date().toISOString(),
    };

    if (editingAdId) {
      const idx = list.findIndex((a) => a.id === editingAdId);
      if (idx >= 0) list[idx] = { ...list[idx], ...payload };
      else list.push(payload);
    } else {
      payload.createdAt = payload.updatedAt;
      list.push(payload);
    }

    saveAds(list);
    hideAdForm();
    renderAds();
  });
}

// ============================================================
//  EDITING VENDOR TRACKER
// ============================================================
const EDITING_KEY = "author-os-editing";
let editingFilter = "all";
let editingEditId = null;

const EDIT_TYPE_LABELS = {
  developmental: "Developmental",
  line: "Line edit",
  copyedit: "Copyedit",
  proofread: "Proofread",
};

const EDIT_STATUS_LABELS = {
  "not-started": "Not Started",
  "in-progress": "In Progress",
  delivered: "Delivered",
};

function loadEditing() {
  try {
    const raw = localStorage.getItem(sk(EDITING_KEY));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEditing(list) {
  try {
    localStorage.setItem(sk(EDITING_KEY), JSON.stringify(list));
    setStatus("Editing vendors saved", "saved");
  } catch (e) {
    setStatus("Save failed", "saving");
    console.error(e);
  }
}

function showEditingForm(entry = null) {
  const card = $("#editingFormCard");
  if (!card) return;
  card.hidden = false;
  editingEditId = entry ? entry.id : null;
  $("#editingFormTitle").textContent = entry ? "Edit Vendor" : "Add Vendor";
  $("#editingId").value = entry ? entry.id : "";
  $("#editingVendor").value = entry ? entry.vendor : "";
  $("#editingType").value = entry ? entry.editType : "developmental";
  $("#editingStatus").value = entry ? entry.status : "not-started";
  $("#editingCost").value = entry ? entry.cost ?? "" : "";
  $("#editingDeadline").value = entry ? entry.deadline || "" : "";
  $("#editingFile").value = entry ? entry.file || "" : "";
  $("#editingNotes").value = entry ? entry.notes || "" : "";
  $("#editingVendor").focus();
}

function hideEditingForm() {
  const card = $("#editingFormCard");
  if (card) card.hidden = true;
  editingEditId = null;
  $("#editingForm")?.reset();
}

function renderEditing() {
  const list = loadEditing();
  const filtered = editingFilter === "all" ? list : list.filter((e) => e.status === editingFilter);

  const container = $("#editingList");
  const empty = $("#editingEmpty");
  if (!container) return;

  filtered.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  container.innerHTML = "";

  if (filtered.length === 0) {
    if (empty) empty.hidden = list.length > 0;
    if (list.length > 0) {
      container.innerHTML = `<p class="hint" style="padding:12px 0">No vendors with this status.</p>`;
    }
    return;
  }

  if (empty) empty.hidden = true;

  filtered.forEach((entry) => {
    const card = document.createElement("div");
    card.className = "asset-card";
    card.dataset.id = entry.id;

    const costText = entry.cost != null && entry.cost !== "" ? `$${Number(entry.cost).toFixed(2)}` : "";
    const notesHtml = entry.notes ? `<div class="asset-notes">${escapeHtml(entry.notes)}</div>` : "";
    const statusClass =
      entry.status === "delivered" ? "final" : entry.status === "not-started" ? "archived" : "in-progress";

    card.innerHTML = `
      <div class="asset-card-main">
        <div class="asset-name">${escapeHtml(entry.vendor)}</div>
        <div class="asset-meta">
          <span class="asset-tag">${escapeHtml(EDIT_TYPE_LABELS[entry.editType] || entry.editType)}</span>
          <span class="asset-tag status-${statusClass}">${escapeHtml(EDIT_STATUS_LABELS[entry.status] || entry.status)}</span>
          ${costText ? `<span class="asset-tag">${escapeHtml(costText)}</span>` : ""}
          ${entry.deadline ? `<span class="asset-tag">Due ${escapeHtml(entry.deadline)}</span>` : ""}
        </div>
        ${entry.file ? `<div class="asset-location">${escapeHtml(entry.file)}</div>` : ""}
        ${notesHtml}
      </div>
      <div class="asset-actions">
        <button type="button" class="btn btn-ghost btn-edit-editing">Edit</button>
        <button type="button" class="btn btn-danger btn-delete-editing">Delete</button>
      </div>
    `;

    card.querySelector(".btn-edit-editing").addEventListener("click", () => showEditingForm(entry));
    card.querySelector(".btn-delete-editing").addEventListener("click", () => {
      if (!confirm(`Remove ${entry.vendor}?`)) return;
      const next = loadEditing().filter((e) => e.id !== entry.id);
      saveEditing(next);
      renderEditing();
    });

    container.appendChild(card);
  });
}

function exportEditing() {
  const data = loadEditing();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "editing-vendors-export.json";
  a.click();
  URL.revokeObjectURL(url);
  setStatus("Editing vendors exported", "saved");
}

function initEditing() {
  renderEditing();

  $("#btnAddEditing")?.addEventListener("click", () => showEditingForm());
  $("#btnAddEditingEmpty")?.addEventListener("click", () => showEditingForm());
  $("#btnCancelEditing")?.addEventListener("click", hideEditingForm);
  $("#btnExportEditing")?.addEventListener("click", exportEditing);
  $("#btnImportEditing")?.addEventListener("click", () => {
    pickJsonFile((file) =>
      importListFromFile(file, {
        load: loadEditing,
        save: saveEditing,
        render: renderEditing,
        label: "editing vendors",
      })
    );
  });

  $$("#editingFilters .filter-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      $$("#editingFilters .filter-chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      editingFilter = chip.dataset.filter || "all";
      renderEditing();
    });
  });

  $("#editingForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const vendor = $("#editingVendor").value.trim();
    if (!vendor) return;

    const list = loadEditing();
    const payload = {
      id: editingEditId || uid(),
      vendor,
      editType: $("#editingType").value,
      status: $("#editingStatus").value,
      cost: $("#editingCost").value === "" ? null : Number($("#editingCost").value),
      deadline: $("#editingDeadline").value,
      file: $("#editingFile").value.trim(),
      notes: $("#editingNotes").value.trim(),
      updatedAt: new Date().toISOString(),
    };

    if (editingEditId) {
      const idx = list.findIndex((e) => e.id === editingEditId);
      if (idx >= 0) list[idx] = { ...list[idx], ...payload };
      else list.push(payload);
    } else {
      payload.createdAt = payload.updatedAt;
      list.push(payload);
    }

    saveEditing(list);
    hideEditingForm();
    renderEditing();
  });
}

// ============================================================
//  PROMO SUBMISSION TRACKER
// ============================================================
const PROMO_KEY = "author-os-promo";
let promoFilter = "all";
let editingPromoId = null;

const PROMO_SERVICE_LABELS = {
  bookbub: "BookBub Featured Deal",
  wwm: "Written Word Media",
  "bargain-booksy": "Bargain Booksy",
  freebooksy: "Freebooksy",
  other: "Other",
};

const PROMO_STATUS_LABELS = {
  applied: "Applied",
  accepted: "Accepted",
  rejected: "Rejected",
  ran: "Ran",
};

function loadPromo() {
  try {
    const raw = localStorage.getItem(sk(PROMO_KEY));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePromo(list) {
  try {
    localStorage.setItem(sk(PROMO_KEY), JSON.stringify(list));
    setStatus("Promo submissions saved", "saved");
  } catch (e) {
    setStatus("Save failed", "saving");
    console.error(e);
  }
}

function showPromoForm(entry = null) {
  const card = $("#promoFormCard");
  if (!card) return;
  card.hidden = false;
  editingPromoId = entry ? entry.id : null;
  $("#promoFormTitle").textContent = entry ? "Edit Submission" : "Add Submission";
  $("#promoId").value = entry ? entry.id : "";
  $("#promoService").value = entry ? entry.service : "bookbub";
  $("#promoStatus").value = entry ? entry.status : "applied";
  $("#promoDateApplied").value = entry ? entry.dateApplied || "" : "";
  $("#promoDateRan").value = entry ? entry.dateRan || "" : "";
  $("#promoCost").value = entry ? entry.cost ?? "" : "";
  $("#promoResults").value = entry ? entry.results || "" : "";
  $("#promoService").focus();
}

function hidePromoForm() {
  const card = $("#promoFormCard");
  if (card) card.hidden = true;
  editingPromoId = null;
  $("#promoForm")?.reset();
}

function renderPromo() {
  const list = loadPromo();
  const filtered = promoFilter === "all" ? list : list.filter((p) => p.status === promoFilter);

  const container = $("#promoList");
  const empty = $("#promoEmpty");
  if (!container) return;

  filtered.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  container.innerHTML = "";

  if (filtered.length === 0) {
    if (empty) empty.hidden = list.length > 0;
    if (list.length > 0) {
      container.innerHTML = `<p class="hint" style="padding:12px 0">No submissions with this status.</p>`;
    }
    return;
  }

  if (empty) empty.hidden = true;

  filtered.forEach((entry) => {
    const card = document.createElement("div");
    card.className = "asset-card";
    card.dataset.id = entry.id;

    const costText = entry.cost != null && entry.cost !== "" ? `$${Number(entry.cost).toFixed(2)}` : "";
    const resultsHtml = entry.results ? `<div class="asset-notes">${escapeHtml(entry.results)}</div>` : "";
    const statusClass =
      entry.status === "ran" ? "final" : entry.status === "rejected" ? "archived" : "in-progress";

    card.innerHTML = `
      <div class="asset-card-main">
        <div class="asset-name">${escapeHtml(PROMO_SERVICE_LABELS[entry.service] || entry.service)}</div>
        <div class="asset-meta">
          <span class="asset-tag status-${statusClass}">${escapeHtml(PROMO_STATUS_LABELS[entry.status] || entry.status)}</span>
          ${entry.dateApplied ? `<span class="asset-tag">Applied ${escapeHtml(entry.dateApplied)}</span>` : ""}
          ${entry.dateRan ? `<span class="asset-tag">Ran ${escapeHtml(entry.dateRan)}</span>` : ""}
          ${costText ? `<span class="asset-tag">${escapeHtml(costText)}</span>` : ""}
        </div>
        ${resultsHtml}
      </div>
      <div class="asset-actions">
        <button type="button" class="btn btn-ghost btn-edit-promo">Edit</button>
        <button type="button" class="btn btn-danger btn-delete-promo">Delete</button>
      </div>
    `;

    card.querySelector(".btn-edit-promo").addEventListener("click", () => showPromoForm(entry));
    card.querySelector(".btn-delete-promo").addEventListener("click", () => {
      if (!confirm(`Remove this ${PROMO_SERVICE_LABELS[entry.service] || entry.service} submission?`)) return;
      const next = loadPromo().filter((p) => p.id !== entry.id);
      savePromo(next);
      renderPromo();
    });

    container.appendChild(card);
  });
}

function exportPromo() {
  const data = loadPromo();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "promo-submissions-export.json";
  a.click();
  URL.revokeObjectURL(url);
  setStatus("Promo submissions exported", "saved");
}

function initPromo() {
  renderPromo();

  $("#btnAddPromo")?.addEventListener("click", () => showPromoForm());
  $("#btnAddPromoEmpty")?.addEventListener("click", () => showPromoForm());
  $("#btnCancelPromo")?.addEventListener("click", hidePromoForm);
  $("#btnExportPromo")?.addEventListener("click", exportPromo);
  $("#btnImportPromo")?.addEventListener("click", () => {
    pickJsonFile((file) =>
      importListFromFile(file, {
        load: loadPromo,
        save: savePromo,
        render: renderPromo,
        label: "promo submissions",
      })
    );
  });

  $$("#promoFilters .filter-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      $$("#promoFilters .filter-chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      promoFilter = chip.dataset.filter || "all";
      renderPromo();
    });
  });

  $("#promoForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const list = loadPromo();
    const payload = {
      id: editingPromoId || uid(),
      service: $("#promoService").value,
      status: $("#promoStatus").value,
      dateApplied: $("#promoDateApplied").value,
      dateRan: $("#promoDateRan").value,
      cost: $("#promoCost").value === "" ? null : Number($("#promoCost").value),
      results: $("#promoResults").value.trim(),
      updatedAt: new Date().toISOString(),
    };

    if (editingPromoId) {
      const idx = list.findIndex((p) => p.id === editingPromoId);
      if (idx >= 0) list[idx] = { ...list[idx], ...payload };
      else list.push(payload);
    } else {
      payload.createdAt = payload.updatedAt;
      list.push(payload);
    }

    savePromo(list);
    hidePromoForm();
    renderPromo();
  });
}

// ============================================================
//  ARC TRACKER
// ============================================================
const ARCS_KEY = "author-os-arcs";
let arcsFilter = "all";
let arcPhaseFilter = "all";
let editingArcId = null;

const ARC_STATUS_LABELS = {
  invited: "Invited",
  sent: "Sent",
  received: "Received",
  reviewed: "Reviewed",
  "no-review": "No Review",
  declined: "Declined",
};

const ARC_PHASE_LABELS = {
  beta: "Beta Reader",
  arc: "ARC Reader",
};

const ARC_PLATFORM_LABELS = {
  goodreads: "Goodreads",
  amazon: "Amazon",
  blog: "Blog",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  bookbub: "BookBub",
  netgalley: "NetGalley",
  other: "Other",
};

function loadArcs() {
  try {
    const raw = localStorage.getItem(sk(ARCS_KEY));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveArcs(list) {
  try {
    localStorage.setItem(sk(ARCS_KEY), JSON.stringify(list));
    setStatus("ARCs saved", "saved");
  } catch (e) {
    setStatus("Save failed", "saving");
    console.error(e);
  }
}

function showArcForm(arc = null) {
  const card = $("#arcFormCard");
  if (!card) return;
  card.hidden = false;
  editingArcId = arc ? arc.id : null;
  $("#arcFormTitle").textContent = arc ? "Edit ARC Reader" : "Add ARC Reader";
  $("#arcId").value = arc ? arc.id : "";
  $("#arcPhase").value = arc ? arc.phase || "arc" : "arc";
  $("#arcName").value = arc ? arc.name : "";
  $("#arcContact").value = arc ? arc.contact || "" : "";
  $("#arcPlatform").value = arc ? arc.platform : "goodreads";
  $("#arcStatus").value = arc ? arc.status : "invited";
  $("#arcFormat").value = arc ? arc.format : "ebook";
  $("#arcDateSent").value = arc ? arc.dateSent || "" : "";
  $("#arcDueDate").value = arc ? arc.dueDate || "" : "";
  $("#arcRating").value = arc ? arc.rating || "" : "";
  $("#arcReviewLink").value = arc ? arc.reviewLink || "" : "";
  $("#arcNotes").value = arc ? arc.notes || "" : "";
  $("#arcName").focus();
}

function hideArcForm() {
  const card = $("#arcFormCard");
  if (card) card.hidden = true;
  editingArcId = null;
  $("#arcForm")?.reset();
}

function updateArcStats(list) {
  const el = $("#arcStats");
  if (!el) return;
  const total = list.length;
  const reviewed = list.filter((a) => a.status === "reviewed").length;
  const sent = list.filter((a) => ["sent", "received", "reviewed"].includes(a.status)).length;
  const pending = list.filter((a) => ["invited", "sent", "received"].includes(a.status)).length;
  el.innerHTML = `
    <div class="arc-stat"><strong>${total}</strong> total</div>
    <div class="arc-stat"><strong>${sent}</strong> sent+</div>
    <div class="arc-stat highlight"><strong>${reviewed}</strong> reviews</div>
    <div class="arc-stat"><strong>${pending}</strong> pending</div>
  `;
}

function renderArcs() {
  const list = loadArcs();
  updateArcStats(list);

  const filtered = list.filter((a) => {
    const phaseOk = arcPhaseFilter === "all" || (a.phase || "arc") === arcPhaseFilter;
    const statusOk = arcsFilter === "all" || a.status === arcsFilter;
    return phaseOk && statusOk;
  });

  const container = $("#arcList");
  const empty = $("#arcEmpty");
  if (!container) return;

  filtered.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));

  container.innerHTML = "";

  if (filtered.length === 0) {
    if (list.length === 0) {
      if (empty) empty.hidden = false;
    } else {
      if (empty) empty.hidden = true;
      container.innerHTML = `<p class="hint" style="padding:12px 0">No readers with this status.</p>`;
    }
    return;
  }

  if (empty) empty.hidden = true;

  filtered.forEach((arc) => {
    const card = document.createElement("div");
    card.className = "asset-card";
    card.dataset.id = arc.id;

    const linkHtml = arc.reviewLink
      ? `<div class="asset-location"><a href="${escapeHtml(arc.reviewLink)}" target="_blank" rel="noopener">View review →</a></div>`
      : "";

    const notesHtml = arc.notes
      ? `<div class="asset-notes">${escapeHtml(arc.notes)}</div>`
      : "";

    const ratingHtml = arc.rating ? `${arc.rating}★` : "";
    const dates = [];
    if (arc.dateSent) dates.push(`Sent ${arc.dateSent}`);
    if (arc.dueDate) dates.push(`Due ${arc.dueDate}`);

    card.innerHTML = `
      <div class="asset-card-main">
        <div class="asset-name">${escapeHtml(arc.name)}</div>
        <div class="asset-meta">
          <span class="asset-tag phase-${arc.phase || "arc"}">${ARC_PHASE_LABELS[arc.phase || "arc"]}</span>
          <span class="asset-tag status-${arc.status === "reviewed" ? "final" : arc.status === "declined" || arc.status === "no-review" ? "archived" : "in-progress"}">${ARC_STATUS_LABELS[arc.status] || arc.status}</span>
          <span class="asset-tag">${ARC_PLATFORM_LABELS[arc.platform] || arc.platform}</span>
          <span class="asset-tag">${arc.format || "ebook"}</span>
          ${ratingHtml ? `<span class="asset-tag">${ratingHtml}</span>` : ""}
          ${dates.length ? `<span class="asset-tag">${dates.join(" · ")}</span>` : ""}
        </div>
        ${arc.contact ? `<div class="asset-location">${escapeHtml(arc.contact)}</div>` : ""}
        ${linkHtml}
        ${notesHtml}
      </div>
      <div class="asset-actions">
        <button type="button" class="btn btn-ghost btn-log-review" title="Log this to Review Log">Log Review</button>
        <button type="button" class="btn btn-ghost btn-edit-arc">Edit</button>
        <button type="button" class="btn btn-danger btn-delete-arc">Delete</button>
      </div>
    `;

    card.querySelector(".btn-log-review").addEventListener("click", () => logReviewFromArc(arc));
    card.querySelector(".btn-edit-arc").addEventListener("click", () => showArcForm(arc));
    card.querySelector(".btn-delete-arc").addEventListener("click", () => {
      if (!confirm(`Remove “${arc.name}” from ARC list?`)) return;
      const next = loadArcs().filter((a) => a.id !== arc.id);
      saveArcs(next);
      renderArcs();
    });

    container.appendChild(card);
  });
}

function exportArcs() {
  const data = loadArcs();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "arc-readers-export.json";
  a.click();
  URL.revokeObjectURL(url);
  setStatus("ARCs exported", "saved");
}

function initArcs() {
  renderArcs();

  $("#btnAddArc")?.addEventListener("click", () => showArcForm());
  $("#btnAddArcEmpty")?.addEventListener("click", () => showArcForm());
  $("#btnCancelArc")?.addEventListener("click", hideArcForm);
  $("#btnExportArcs")?.addEventListener("click", exportArcs);
  $("#btnImportArcs")?.addEventListener("click", () => {
    pickJsonFile((file) =>
      importListFromFile(file, {
        load: loadArcs,
        save: saveArcs,
        render: renderArcs,
        label: "ARC readers",
      })
    );
  });

  $$("#arcPhaseFilters .filter-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      $$("#arcPhaseFilters .filter-chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      arcPhaseFilter = chip.dataset.phase || "all";
      renderArcs();
    });
  });

  $$("#arcFilters .filter-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      $$("#arcFilters .filter-chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      arcsFilter = chip.dataset.filter || "all";
      renderArcs();
    });
  });

  $("#arcForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("#arcName").value.trim();
    if (!name) return;

    const list = loadArcs();
    const payload = {
      id: editingArcId || uid(),
      phase: $("#arcPhase").value,
      name,
      contact: $("#arcContact").value.trim(),
      platform: $("#arcPlatform").value,
      status: $("#arcStatus").value,
      format: $("#arcFormat").value,
      dateSent: $("#arcDateSent").value,
      dueDate: $("#arcDueDate").value,
      rating: $("#arcRating").value,
      reviewLink: $("#arcReviewLink").value.trim(),
      notes: $("#arcNotes").value.trim(),
      updatedAt: new Date().toISOString(),
    };

    if (editingArcId) {
      const idx = list.findIndex((a) => a.id === editingArcId);
      if (idx >= 0) list[idx] = { ...list[idx], ...payload };
      else list.push(payload);
    } else {
      payload.createdAt = payload.updatedAt;
      list.push(payload);
    }

    saveArcs(list);
    hideArcForm();
    renderArcs();
  });
}

// ============================================================
//  REVIEW LOG
// ============================================================
const REVIEWS_KEY = "author-os-reviews";
let reviewsFilter = "all";
let editingReviewId = null;

const REVIEW_PLATFORM_LABELS = {
  amazon: "Amazon",
  goodreads: "Goodreads",
  bookbub: "BookBub",
  blog: "Blog",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  netgalley: "NetGalley",
  other: "Other",
};

function loadReviews() {
  try {
    const raw = localStorage.getItem(sk(REVIEWS_KEY));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveReviews(list) {
  try {
    localStorage.setItem(sk(REVIEWS_KEY), JSON.stringify(list));
    setStatus("Reviews saved", "saved");
  } catch (e) {
    setStatus("Save failed", "saving");
    console.error(e);
  }
}

function showReviewForm(review = null) {
  const card = $("#reviewFormCard");
  if (!card) return;
  card.hidden = false;
  const isEdit = review && review.id;
  editingReviewId = isEdit ? review.id : null;
  $("#reviewFormTitle").textContent = isEdit ? "Edit Review" : "Log Review";
  $("#reviewId").value = isEdit ? review.id : "";
  $("#reviewPlatform").value = review ? review.platform || "amazon" : "amazon";
  $("#reviewRating").value = review ? review.rating || "" : "";
  $("#reviewDate").value = review ? review.date || "" : "";
  $("#reviewReviewer").value = review ? review.reviewer || "" : "";
  $("#reviewLink").value = review ? review.link || "" : "";
  $("#reviewExcerpt").value = review ? review.excerpt || "" : "";
  $("#reviewNotes").value = review ? review.notes || "" : "";
  $("#reviewPlatform").focus();
}

function hideReviewForm() {
  const card = $("#reviewFormCard");
  if (card) card.hidden = true;
  editingReviewId = null;
  $("#reviewForm")?.reset();
}

function updateReviewStats(list) {
  const el = $("#reviewStats");
  if (!el) return;
  const total = list.length;
  const withRating = list.filter((r) => r.rating);
  const avg =
    withRating.length > 0
      ? (withRating.reduce((s, r) => s + Number(r.rating), 0) / withRating.length).toFixed(1)
      : "—";
  const byPlatform = {};
  list.forEach((r) => {
    byPlatform[r.platform] = (byPlatform[r.platform] || 0) + 1;
  });
  const topPlatforms = Object.entries(byPlatform)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([p, n]) => `${REVIEW_PLATFORM_LABELS[p] || p}: ${n}`)
    .join(" · ");

  el.innerHTML = `
    <div class="arc-stat"><strong>${total}</strong> reviews</div>
    <div class="arc-stat highlight"><strong>${avg}</strong> avg ★</div>
    ${topPlatforms ? `<div class="arc-stat">${topPlatforms}</div>` : ""}
  `;
}

function renderReviews() {
  const list = loadReviews();
  updateReviewStats(list);

  const filtered =
    reviewsFilter === "all" ? list : list.filter((r) => r.platform === reviewsFilter);

  const container = $("#reviewList");
  const empty = $("#reviewEmpty");
  if (!container) return;

  filtered.sort((a, b) => (b.date || b.updatedAt || "").localeCompare(a.date || a.updatedAt || ""));

  container.innerHTML = "";

  if (filtered.length === 0) {
    if (list.length === 0) {
      if (empty) empty.hidden = false;
    } else {
      if (empty) empty.hidden = true;
      container.innerHTML = `<p class="hint" style="padding:12px 0">No reviews on this platform yet.</p>`;
    }
    return;
  }

  if (empty) empty.hidden = true;

  filtered.forEach((review) => {
    const card = document.createElement("div");
    card.className = "asset-card";
    card.dataset.id = review.id;

    const stars = review.rating ? "★".repeat(Number(review.rating)) + "☆".repeat(5 - Number(review.rating)) : "";
    const linkHtml = review.link
      ? `<div class="asset-location"><a href="${escapeHtml(review.link)}" target="_blank" rel="noopener">Open review →</a></div>`
      : "";
    const excerptHtml = review.excerpt
      ? `<div class="asset-notes" style="font-style:italic">“${escapeHtml(review.excerpt)}”</div>`
      : "";
    const notesHtml = review.notes
      ? `<div class="asset-notes">${escapeHtml(review.notes)}</div>`
      : "";

    card.innerHTML = `
      <div class="asset-card-main">
        <div class="asset-name">${REVIEW_PLATFORM_LABELS[review.platform] || review.platform}${review.reviewer ? ` · ${escapeHtml(review.reviewer)}` : ""}</div>
        <div class="asset-meta">
          ${stars ? `<span class="asset-tag status-final">${stars}</span>` : ""}
          ${review.date ? `<span class="asset-tag">${review.date}</span>` : ""}
          <span class="asset-tag">${REVIEW_PLATFORM_LABELS[review.platform] || review.platform}</span>
        </div>
        ${excerptHtml}
        ${linkHtml}
        ${notesHtml}
      </div>
      <div class="asset-actions">
        <button type="button" class="btn btn-ghost btn-edit-review">Edit</button>
        <button type="button" class="btn btn-danger btn-delete-review">Delete</button>
      </div>
    `;

    card.querySelector(".btn-edit-review").addEventListener("click", () => showReviewForm(review));
    card.querySelector(".btn-delete-review").addEventListener("click", () => {
      if (!confirm("Delete this review log entry?")) return;
      const next = loadReviews().filter((r) => r.id !== review.id);
      saveReviews(next);
      renderReviews();
    });

    container.appendChild(card);
  });
}

function exportReviews() {
  const data = loadReviews();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "review-log-export.json";
  a.click();
  URL.revokeObjectURL(url);
  setStatus("Reviews exported", "saved");
}

function initReviews() {
  renderReviews();

  $("#btnAddReview")?.addEventListener("click", () => showReviewForm());
  $("#btnAddReviewEmpty")?.addEventListener("click", () => showReviewForm());
  $("#btnCancelReview")?.addEventListener("click", hideReviewForm);
  $("#btnExportReviews")?.addEventListener("click", exportReviews);
  $("#btnImportReviews")?.addEventListener("click", () => {
    pickJsonFile((file) =>
      importListFromFile(file, {
        load: loadReviews,
        save: saveReviews,
        render: renderReviews,
        label: "reviews",
      })
    );
  });

  $$("#reviewFilters .filter-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      $$("#reviewFilters .filter-chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      reviewsFilter = chip.dataset.filter || "all";
      renderReviews();
    });
  });

  $("#reviewForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const platform = $("#reviewPlatform").value;
    if (!platform) return;

    const list = loadReviews();
    const payload = {
      id: editingReviewId || uid(),
      platform,
      rating: $("#reviewRating").value,
      date: $("#reviewDate").value,
      reviewer: $("#reviewReviewer").value.trim(),
      link: $("#reviewLink").value.trim(),
      excerpt: $("#reviewExcerpt").value.trim(),
      notes: $("#reviewNotes").value.trim(),
      updatedAt: new Date().toISOString(),
    };

    if (editingReviewId) {
      const idx = list.findIndex((r) => r.id === editingReviewId);
      if (idx >= 0) list[idx] = { ...list[idx], ...payload };
      else list.push(payload);
    } else {
      payload.createdAt = payload.updatedAt;
      list.push(payload);
    }

    saveReviews(list);
    hideReviewForm();
    renderReviews();
  });
}

// ============================================================
//  DASHBOARD
// ============================================================
function getChecklistProgress() {
  const state = loadChecklistState();
  let total = 0;
  let done = 0;
  CHECKLIST_DATA.forEach((sec) => {
    sec.items.forEach((item) => {
      total++;
      if (state[item.id]) done++;
    });
  });
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

function getNextStepItem() {
  const state = loadChecklistState();
  const stage = getOnboardingStage();
  const startSectionId = stage && STAGE_TO_SECTION[stage] ? STAGE_TO_SECTION[stage] : null;
  const startIndex = startSectionId
    ? Math.max(CHECKLIST_DATA.findIndex((s) => s.id === startSectionId), 0)
    : 0;

  // Prefer the stage the person told us they're at, searching forward from there —
  // keeps this consistent with what the onboarding picker just pointed at.
  for (let i = startIndex; i < CHECKLIST_DATA.length; i++) {
    const item = CHECKLIST_DATA[i].items.find((it) => !state[it.id]);
    if (item) return { section: CHECKLIST_DATA[i], item };
  }
  // Fall back to a full scan from the top, in case earlier sections were left unfinished.
  for (const section of CHECKLIST_DATA) {
    const item = section.items.find((it) => !state[it.id]);
    if (item) return { section, item };
  }
  return null;
}

function renderNextStepCard() {
  const el = $("#dashNextStep");
  if (!el) return;
  const next = getNextStepItem();

  if (!next) {
    el.innerHTML = `
      <div class="next-step-label">Checklist complete</div>
      <div class="next-step-title">Every step is checked off.</div>
      <p class="next-step-hint">Keep an eye on Distribution and Reviews as things come in.</p>
      <div class="next-step-actions">
        <button type="button" class="btn btn-secondary" data-goto="reviews">Go to Reviews</button>
      </div>
    `;
    el.querySelectorAll("[data-goto]").forEach((b) =>
      b.addEventListener("click", () => showPage(b.dataset.goto))
    );
    return;
  }

  const { section, item } = next;
  const plainHint = (item.hint || "").replace(/<[^>]+>/g, "").trim();
  const targetPage = item.page || "checklist";

  el.innerHTML = `
    <div class="next-step-label">Your next step</div>
    <div class="next-step-title">${escapeHtml(item.label)}</div>
    ${plainHint ? `<p class="next-step-hint">${escapeHtml(plainHint)}</p>` : ""}
    <div class="next-step-actions">
      <button type="button" class="btn btn-primary" id="btnNextStepGo">Go there →</button>
    </div>
  `;

  $("#btnNextStepGo")?.addEventListener("click", () => {
    if (targetPage === "checklist") {
      openChecklistSection(section.id, item.id);
    } else {
      showPage(targetPage);
    }
  });
}

function renderDashboard() {
  const project = getCurrentProject();
  const title = getProjectTitle();
  const author = getProjectAuthor();
  const meta = getProjectMeta();

  $("#dashProjectName").textContent = project ? project.name : "—";
  const metaEl = $("#dashBookMeta");
  if (title) {
    metaEl.textContent = author ? `${title} · ${author}` : title;
  } else if (meta && meta.workingTitle) {
    metaEl.textContent = meta.workingTitle + " (working title)";
  } else {
    metaEl.textContent = "Add title in Metadata Vault";
  }

  const progress = getChecklistProgress();
  renderNextStepCard();
  const assets = loadAssets();
  const arcs = loadArcs();
  const reviews = loadReviews();
  const arcsReviewed = arcs.filter((a) => a.status === "reviewed").length;
  const arcsPending = arcs.filter((a) => ["invited", "sent", "received"].includes(a.status)).length;
  const withRating = reviews.filter((r) => r.rating);
  const avg =
    withRating.length > 0
      ? (withRating.reduce((s, r) => s + Number(r.rating), 0) / withRating.length).toFixed(1)
      : "—";
  const dist = getDistributionProgress();
  const rev = getTrailingRevenue();

  const stats = $("#dashStats");
  if (stats) {
    stats.innerHTML = `
      <div class="dash-stat accent" data-goto="checklist">
        <div class="dash-stat-value">${progress.pct}%</div>
        <div class="dash-stat-label">Checklist · ${progress.done}/${progress.total}</div>
      </div>
      <div class="dash-stat" data-goto="assets">
        <div class="dash-stat-value">${assets.length}</div>
        <div class="dash-stat-label">Assets</div>
      </div>
      <div class="dash-stat" data-goto="arcs">
        <div class="dash-stat-value">${arcs.length}</div>
        <div class="dash-stat-label">ARCs · ${arcsPending} pending</div>
      </div>
      <div class="dash-stat success" data-goto="reviews">
        <div class="dash-stat-value">${reviews.length}</div>
        <div class="dash-stat-label">Reviews · ${avg} avg ★</div>
      </div>
      <div class="dash-stat" data-goto="arcs">
        <div class="dash-stat-value">${arcsReviewed}</div>
        <div class="dash-stat-label">ARC reviews in</div>
      </div>
      <div class="dash-stat" data-goto="distribution">
        <div class="dash-stat-value">${dist.total > 0 ? `${dist.live}/${dist.total}` : "—"}</div>
        <div class="dash-stat-label">Channels live</div>
      </div>
      <div class="dash-stat success" data-goto="sales">
        <div class="dash-stat-value">${rev.hasAny ? `$${rev.total.toFixed(0)}` : "—"}</div>
        <div class="dash-stat-label">Revenue · trailing 3mo</div>
      </div>
    `;
    stats.querySelectorAll("[data-goto]").forEach((el) => {
      el.addEventListener("click", () => showPage(el.dataset.goto));
    });
  }

  // Recent ARCs
  const recentArcs = arcs
    .slice()
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))
    .slice(0, 5);
  const arcsEl = $("#dashRecentArcs");
  if (arcsEl) {
    if (recentArcs.length === 0) {
      arcsEl.innerHTML = `<p class="dash-empty">No ARC readers yet. <a href="#arcs" class="dash-link" data-goto="arcs">Add one →</a></p>`;
    } else {
      arcsEl.innerHTML = recentArcs
        .map(
          (a) => `
        <div class="dash-row">
          <div class="dash-row-title">${escapeHtml(a.name)}</div>
          <div class="dash-row-meta">${ARC_STATUS_LABELS[a.status] || a.status} · ${ARC_PLATFORM_LABELS[a.platform] || a.platform}</div>
        </div>`
        )
        .join("");
    }
  }

  // Recent reviews
  const recentReviews = reviews
    .slice()
    .sort((a, b) => (b.date || b.updatedAt || "").localeCompare(a.date || a.updatedAt || ""))
    .slice(0, 5);
  const revEl = $("#dashRecentReviews");
  if (revEl) {
    if (recentReviews.length === 0) {
      revEl.innerHTML = `<p class="dash-empty">No reviews logged. <a href="#reviews" class="dash-link" data-goto="reviews">Log one →</a></p>`;
    } else {
      revEl.innerHTML = recentReviews
        .map((r) => {
          const stars = r.rating ? "★".repeat(Number(r.rating)) : "";
          return `
          <div class="dash-row">
            <div class="dash-row-title">${REVIEW_PLATFORM_LABELS[r.platform] || r.platform}${r.reviewer ? " · " + escapeHtml(r.reviewer) : ""}</div>
            <div class="dash-row-meta">${stars}${r.date ? " · " + r.date : ""}</div>
          </div>`;
        })
        .join("");
    }
  }

  // Wire goto links
  $$("[data-goto]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      if (el.dataset.goto) showPage(el.dataset.goto);
    });
  });
}

function initDashboard() {
  $$(".dash-quick-links [data-goto], .dash-link[data-goto]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      if (el.dataset.goto) showPage(el.dataset.goto);
    });
  });
}

// ============================================================
//  BOOT
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  ensureProjectsMigrated();
  renderProjectSwitcher();
  initMobileNav();
  initNavGroups();
  initRouter();
  renderChecklist();
  initMetadata();
  initQuestionnaire();
  initAssets();
  initArcs();
  initReviews();
  initDistribution();
  initSales();
  initAds();
  initEditing();
  initPromo();
  initCalendar();
  initDriveBackup();
  initDashboard();
  initOnboarding();
  initProModal();
  updateProjectTitles();
  $("#btnResetChecklist")?.addEventListener("click", resetChecklist);
});
