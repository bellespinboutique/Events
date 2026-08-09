const config = window.BPB_SUPABASE;
const supabaseClient = window.supabase.createClient(config.url, config.anonKey);

const loginPanel = document.querySelector("[data-login-panel]");
const adminPanel = document.querySelector("[data-admin-panel]");
const loginForm = document.querySelector("[data-login-form]");
const loginStatus = document.querySelector("[data-login-status]");
const logoutButton = document.querySelector("[data-logout]");
const vendorForm = document.querySelector("[data-vendor-form]");
const formStatus = document.querySelector("[data-form-status]");
const adminList = document.querySelector("[data-admin-list]");
const adminOverlay = document.querySelector("[data-admin-overlay]");
const chart = document.querySelector("[data-editable-chart]");
const activeVendorText = document.querySelector("[data-active-vendor]");
const newButton = document.querySelector("[data-new-vendor]");
const deleteButton = document.querySelector("[data-delete-vendor]");

let vendors = [];
let activeVendorId = null;
let dragState = null;

function setStatus(element, message) {
  if (element) element.textContent = message || "";
}

function initials(name) {
  return String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function renderLogo(target, vendor) {
  target.replaceChildren();
  if (vendor.logo_url) {
    const img = document.createElement("img");
    img.src = vendor.logo_url;
    img.alt = "";
    target.append(img);
    return;
  }
  const fallback = document.createElement("span");
  fallback.textContent = initials(vendor.name);
  target.append(fallback);
}

function normalize(vendor) {
  return {
    ...vendor,
    x: Number(vendor.x || 50),
    y: Number(vendor.y || 50),
    width: Number(vendor.width || 10)
  };
}

function currentVendor() {
  return vendors.find((vendor) => vendor.id === activeVendorId) || null;
}

function fillForm(vendor) {
  vendorForm.elements.id.value = vendor?.id || "";
  vendorForm.elements.table_number.value = vendor?.table_number || "";
  vendorForm.elements.name.value = vendor?.name || "";
  vendorForm.elements.username.value = vendor?.username || "";
  vendorForm.elements.website_url.value = vendor?.website_url || "";
  vendorForm.elements.notes.value = vendor?.notes || "";
  vendorForm.elements.width.value = vendor?.width || 10;
  vendorForm.elements.is_visible.checked = vendor ? Boolean(vendor.is_visible) : true;
  vendorForm.elements.logo.value = "";
  deleteButton.disabled = !vendor?.id;
  activeVendorText.textContent = vendor ? `Editing ${vendor.name}` : "Choose a vendor to place it.";
}

function selectVendor(id) {
  activeVendorId = id;
  fillForm(currentVendor());
  renderAdmin();
}

function renderAdminList() {
  adminList.replaceChildren();
  vendors.forEach((vendor) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `admin-vendor-row${vendor.id === activeVendorId ? " active" : ""}`;
    const logo = document.createElement("span");
    logo.className = "admin-vendor-logo";
    renderLogo(logo, vendor);
    const body = document.createElement("span");
    const name = document.createElement("strong");
    name.textContent = `${vendor.table_number ? `${vendor.table_number} - ` : ""}${vendor.name}`;
    const username = document.createElement("small");
    username.textContent = vendor.username ? `@${vendor.username}` : "No username";
    body.append(name, username);
    button.append(logo, body);
    button.addEventListener("click", () => selectVendor(vendor.id));
    adminList.append(button);
  });
}

function renderAdminPins() {
  adminOverlay.replaceChildren();
  vendors.forEach((vendor) => {
    const pin = document.createElement("button");
    pin.type = "button";
    pin.className = `vendor-pin admin-pin${vendor.id === activeVendorId ? " active" : ""}`;
    pin.style.left = `${vendor.x}%`;
    pin.style.top = `${vendor.y}%`;
    pin.style.width = `${vendor.width}%`;
    pin.setAttribute("aria-label", `Move ${vendor.name}`);
    renderLogo(pin, vendor);
    if (vendor.table_number) {
      const badge = document.createElement("span");
      badge.className = "vendor-pin-number";
      badge.textContent = vendor.table_number;
      pin.append(badge);
    }
    pin.addEventListener("pointerdown", (event) => startDrag(event, vendor.id));
    pin.addEventListener("click", () => selectVendor(vendor.id));
    adminOverlay.append(pin);
  });
}

function renderAdmin() {
  renderAdminList();
  renderAdminPins();
}

async function loadVendors() {
  const { data, error } = await supabaseClient
    .from("vendors")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    setStatus(formStatus, error.message);
    return;
  }

  vendors = (data || []).map(normalize);
  renderAdmin();
}

async function uploadLogo(file) {
  if (!file) return null;
  const ext = file.name.split(".").pop() || "png";
  const path = `${crypto.randomUUID()}.${ext.toLowerCase()}`;
  const { error } = await supabaseClient.storage
    .from("vendor-logos")
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (error) throw error;
  const { data } = supabaseClient.storage.from("vendor-logos").getPublicUrl(path);
  return data.publicUrl;
}

async function saveVendor(event) {
  event.preventDefault();
  setStatus(formStatus, "Saving...");
  const form = new FormData(vendorForm);
  const id = form.get("id");
  const existing = id ? vendors.find((vendor) => vendor.id === id) : null;
  const logoFile = vendorForm.elements.logo.files[0];

  try {
    const logoUrl = logoFile ? await uploadLogo(logoFile) : existing?.logo_url || null;
    const payload = {
      table_number: String(form.get("table_number") || "").trim() || null,
      name: String(form.get("name") || "").trim(),
      username: String(form.get("username") || "").replace(/^@/, "").trim() || null,
      website_url: String(form.get("website_url") || "").trim() || null,
      notes: String(form.get("notes") || "").trim() || null,
      logo_url: logoUrl,
      width: Number(form.get("width") || 10),
      x: existing?.x || 50,
      y: existing?.y || 50,
      sort_order: existing?.sort_order || vendors.length + 1,
      is_visible: Boolean(form.get("is_visible"))
    };

    const query = id
      ? supabaseClient.from("vendors").update(payload).eq("id", id).select().single()
      : supabaseClient.from("vendors").insert(payload).select().single();

    const { data, error } = await query;
    if (error) throw error;

    const saved = normalize(data);
    vendors = id
      ? vendors.map((vendor) => (vendor.id === id ? saved : vendor))
      : [...vendors, saved];
    selectVendor(saved.id);
    setStatus(formStatus, "Saved.");
  } catch (error) {
    setStatus(formStatus, error.message);
  }
}

async function deleteVendor() {
  const vendor = currentVendor();
  if (!vendor) return;
  const ok = window.confirm(`Delete ${vendor.name}?`);
  if (!ok) return;

  const { error } = await supabaseClient.from("vendors").delete().eq("id", vendor.id);
  if (error) {
    setStatus(formStatus, error.message);
    return;
  }
  vendors = vendors.filter((item) => item.id !== vendor.id);
  activeVendorId = null;
  fillForm(null);
  renderAdmin();
  setStatus(formStatus, "Deleted.");
}

function pointToPercent(event) {
  const rect = chart.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;
  return {
    x: Math.min(100, Math.max(0, x)),
    y: Math.min(100, Math.max(0, y))
  };
}

function startDrag(event, id) {
  event.preventDefault();
  selectVendor(id);
  dragState = { id };
  event.currentTarget.setPointerCapture(event.pointerId);
}

async function finishDrag() {
  if (!dragState) return;
  const vendor = vendors.find((item) => item.id === dragState.id);
  dragState = null;
  if (!vendor) return;

  const { error } = await supabaseClient
    .from("vendors")
    .update({ x: vendor.x, y: vendor.y, width: vendor.width })
    .eq("id", vendor.id);
  setStatus(formStatus, error ? error.message : "Placement saved.");
}

function moveDrag(event) {
  if (!dragState) return;
  const point = pointToPercent(event);
  vendors = vendors.map((vendor) => (
    vendor.id === dragState.id ? { ...vendor, x: point.x, y: point.y } : vendor
  ));
  renderAdminPins();
}

async function checkSession() {
  const { data } = await supabaseClient.auth.getSession();
  const signedIn = Boolean(data.session);
  loginPanel.hidden = signedIn;
  adminPanel.hidden = !signedIn;
  logoutButton.hidden = !signedIn;
  if (signedIn) await loadVendors();
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus(loginStatus, "Signing in...");
  const form = new FormData(loginForm);
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: form.get("email"),
    password: form.get("password")
  });
  if (error) {
    setStatus(loginStatus, error.message);
    return;
  }
  setStatus(loginStatus, "");
  await checkSession();
});

logoutButton.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  await checkSession();
});

vendorForm.addEventListener("submit", saveVendor);
newButton.addEventListener("click", () => {
  activeVendorId = null;
  fillForm(null);
  renderAdmin();
});
deleteButton.addEventListener("click", deleteVendor);
vendorForm.elements.width.addEventListener("input", async (event) => {
  const vendor = currentVendor();
  if (!vendor) return;
  vendor.width = Number(event.target.value);
  renderAdminPins();
});
chart.addEventListener("pointermove", moveDrag);
chart.addEventListener("pointerup", finishDrag);
chart.addEventListener("pointercancel", finishDrag);

checkSession();
