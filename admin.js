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
const eventForm = document.querySelector("[data-event-form]");
const eventStatus = document.querySelector("[data-event-status]");
const upcomingForm = document.querySelector("[data-upcoming-form]");
const upcomingStatus = document.querySelector("[data-upcoming-status]");
const upcomingAdminList = document.querySelector("[data-upcoming-admin-list]");
const newEventButton = document.querySelector("[data-new-event]");
const deleteEventButton = document.querySelector("[data-delete-event]");

let vendors = [];
let activeVendorId = null;
let dragState = null;
let featuredEvent = null;
let upcomingEvents = [];
let activeEventId = null;

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
  vendorForm.elements.marker_type.value = vendor?.marker_type || "vendor";
  vendorForm.elements.click_behavior.value = vendor?.click_behavior || "popup";
  vendorForm.elements.marker_style.value = vendor?.marker_style || "logo";
  vendorForm.elements.table_number.value = vendor?.table_number || "";
  vendorForm.elements.name.value = vendor?.name || "";
  vendorForm.elements.username.value = vendor?.username || "";
  vendorForm.elements.website_url.value = vendor?.website_url || "";
  vendorForm.elements.notes.value = vendor?.notes || "";
  vendorForm.elements.width.value = vendor?.width || 10;
  vendorForm.elements.is_visible.checked = vendor ? Boolean(vendor.is_visible) : true;
  vendorForm.elements.show_badge.checked = vendor ? Boolean(vendor.show_badge) : true;
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
    name.textContent = `${vendor.marker_type && vendor.marker_type !== "vendor" ? `${vendor.marker_type}: ` : ""}${vendor.table_number ? `${vendor.table_number} - ` : ""}${vendor.name}`;
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
    pin.className = `vendor-pin admin-pin${vendor.marker_style === "label" ? " label-pin" : ""}${vendor.id === activeVendorId ? " active" : ""}`;
    pin.style.left = `${vendor.x}%`;
    pin.style.top = `${vendor.y}%`;
    pin.style.width = `${vendor.width}%`;
    pin.setAttribute("aria-label", `Move ${vendor.name}`);
    if (vendor.marker_style === "label") {
      pin.textContent = vendor.name;
    } else {
      renderLogo(pin, vendor);
    }
    if (vendor.show_badge && vendor.table_number && vendor.marker_style !== "label") {
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

async function uploadEventFlyer(file) {
  if (!file) return null;
  const ext = file.name.split(".").pop() || "png";
  const path = `${crypto.randomUUID()}.${ext.toLowerCase()}`;
  const { error } = await supabaseClient.storage
    .from("event-flyers")
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (error) throw error;
  const { data } = supabaseClient.storage.from("event-flyers").getPublicUrl(path);
  return data.publicUrl;
}

function fillEventForm(eventData) {
  if (!eventForm) return;
  eventForm.elements.id.value = eventData?.id || "";
  eventForm.elements.brand_name.value = eventData?.brand_name || "Belles";
  eventForm.elements.presented_by.value = eventData?.presented_by || "";
  eventForm.elements.title.value = eventData?.title || "";
  eventForm.elements.summary.value = eventData?.summary || "";
  eventForm.elements.date_label.value = eventData?.date_label || "";
  eventForm.elements.venue_name.value = eventData?.venue_name || "";
  eventForm.elements.address.value = eventData?.address || "";
  eventForm.elements.vendor_time.value = eventData?.vendor_time || "";
  eventForm.elements.public_time.value = eventData?.public_time || "";
  eventForm.elements.admission.value = eventData?.admission || "";
  eventForm.elements.parking.value = eventData?.parking || "";
  eventForm.elements.food_policy.value = eventData?.food_policy || "";
  eventForm.elements.vendor_tables_note.value = eventData?.vendor_tables_note || "";
  eventForm.elements.flyer_link.value = eventData?.flyer_link || "";
  eventForm.elements.flyer.value = "";
  eventForm.elements.brand_logo.value = "";
}

function fillUpcomingForm(eventData) {
  upcomingForm.elements.id.value = eventData?.id || "";
  upcomingForm.elements.title.value = eventData?.title || "";
  upcomingForm.elements.date_label.value = eventData?.date_label || "";
  upcomingForm.elements.venue_name.value = eventData?.venue_name || "";
  upcomingForm.elements.summary.value = eventData?.summary || "";
  upcomingForm.elements.flyer_link.value = eventData?.flyer_link || "";
  upcomingForm.elements.is_visible.checked = eventData ? Boolean(eventData.is_visible) : true;
  upcomingForm.elements.flyer.value = "";
  deleteEventButton.disabled = !eventData?.id;
}

function selectUpcomingEvent(id) {
  activeEventId = id;
  fillUpcomingForm(upcomingEvents.find((eventData) => eventData.id === id));
  renderUpcomingAdminList();
}

function renderUpcomingAdminList() {
  upcomingAdminList.replaceChildren();
  upcomingEvents.forEach((eventData) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `admin-vendor-row${eventData.id === activeEventId ? " active" : ""}`;
    const logo = document.createElement("span");
    logo.className = "admin-vendor-logo";
    if (eventData.flyer_url) {
      const img = document.createElement("img");
      img.src = eventData.flyer_url;
      img.alt = "";
      logo.append(img);
    } else {
      logo.textContent = "EV";
    }
    const body = document.createElement("span");
    const title = document.createElement("strong");
    title.textContent = eventData.title;
    const meta = document.createElement("small");
    meta.textContent = [eventData.date_label, eventData.venue_name].filter(Boolean).join(" - ") || "No date set";
    body.append(title, meta);
    button.append(logo, body);
    button.addEventListener("click", () => selectUpcomingEvent(eventData.id));
    upcomingAdminList.append(button);
  });
}

async function loadEvents() {
  const { data, error } = await supabaseClient
    .from("events")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    setStatus(eventStatus, error.message);
    return;
  }

  featuredEvent = (data || []).find((eventData) => eventData.is_featured) || null;
  upcomingEvents = (data || []).filter((eventData) => !eventData.is_featured);
  fillEventForm(featuredEvent);
  fillUpcomingForm(null);
  renderUpcomingAdminList();
}

function readEventForm(form, existing, options) {
  const data = new FormData(form);
  return {
    title: String(data.get("title") || "").trim(),
    brand_name: String(data.get("brand_name") || "").trim() || "Belles",
    presented_by: String(data.get("presented_by") || "").trim() || null,
    summary: String(data.get("summary") || "").trim() || null,
    date_label: String(data.get("date_label") || "").trim() || null,
    venue_name: String(data.get("venue_name") || "").trim() || null,
    address: String(data.get("address") || "").trim() || existing?.address || null,
    vendor_time: String(data.get("vendor_time") || "").trim() || existing?.vendor_time || null,
    public_time: String(data.get("public_time") || "").trim() || existing?.public_time || null,
    admission: String(data.get("admission") || "").trim() || existing?.admission || null,
    parking: String(data.get("parking") || "").trim() || existing?.parking || null,
    food_policy: String(data.get("food_policy") || "").trim() || existing?.food_policy || null,
    vendor_tables_note: String(data.get("vendor_tables_note") || "").trim() || existing?.vendor_tables_note || null,
    flyer_link: String(data.get("flyer_link") || "").trim() || null,
    is_featured: Boolean(options.is_featured),
    is_upcoming: Boolean(options.is_upcoming),
    is_visible: options.is_visible,
    sort_order: existing?.sort_order || 0
  };
}

async function saveEventInfo(event) {
  event.preventDefault();
  setStatus(eventStatus, "Saving...");
  const id = eventForm.elements.id.value;
  const flyerFile = eventForm.elements.flyer.files[0];
  const brandLogoFile = eventForm.elements.brand_logo.files[0];
  try {
    const flyerUrl = flyerFile ? await uploadEventFlyer(flyerFile) : featuredEvent?.flyer_url || "assets/event-flyer.png";
    const brandLogoUrl = brandLogoFile ? await uploadEventFlyer(brandLogoFile) : featuredEvent?.brand_logo_url || "assets/belles-logo.jpg";
    const payload = {
      ...readEventForm(eventForm, featuredEvent, { is_featured: true, is_upcoming: true, is_visible: true }),
      flyer_url: flyerUrl,
      brand_logo_url: brandLogoUrl
    };
    const query = id
      ? supabaseClient.from("events").update(payload).eq("id", id).select().single()
      : supabaseClient.from("events").insert(payload).select().single();
    const { data, error } = await query;
    if (error) throw error;
    featuredEvent = data;
    fillEventForm(featuredEvent);
    setStatus(eventStatus, "Event info saved.");
  } catch (error) {
    setStatus(eventStatus, error.message);
  }
}

async function saveUpcomingEvent(event) {
  event.preventDefault();
  setStatus(upcomingStatus, "Saving...");
  const id = upcomingForm.elements.id.value;
  const existing = id ? upcomingEvents.find((eventData) => eventData.id === id) : null;
  const flyerFile = upcomingForm.elements.flyer.files[0];
  try {
    const flyerUrl = flyerFile ? await uploadEventFlyer(flyerFile) : existing?.flyer_url || null;
    const payload = {
      ...readEventForm(upcomingForm, existing, {
        is_featured: false,
        is_upcoming: true,
        is_visible: Boolean(new FormData(upcomingForm).get("is_visible"))
      }),
      flyer_url: flyerUrl,
      sort_order: existing?.sort_order || upcomingEvents.length + 1
    };
    const query = id
      ? supabaseClient.from("events").update(payload).eq("id", id).select().single()
      : supabaseClient.from("events").insert(payload).select().single();
    const { data, error } = await query;
    if (error) throw error;
    upcomingEvents = id
      ? upcomingEvents.map((eventData) => (eventData.id === id ? data : eventData))
      : [...upcomingEvents, data];
    selectUpcomingEvent(data.id);
    setStatus(upcomingStatus, "Upcoming event saved.");
  } catch (error) {
    setStatus(upcomingStatus, error.message);
  }
}

async function deleteUpcomingEvent() {
  const eventData = upcomingEvents.find((item) => item.id === activeEventId);
  if (!eventData) return;
  const ok = window.confirm(`Delete ${eventData.title}?`);
  if (!ok) return;
  const { error } = await supabaseClient.from("events").delete().eq("id", eventData.id);
  if (error) {
    setStatus(upcomingStatus, error.message);
    return;
  }
  upcomingEvents = upcomingEvents.filter((item) => item.id !== eventData.id);
  activeEventId = null;
  fillUpcomingForm(null);
  renderUpcomingAdminList();
  setStatus(upcomingStatus, "Upcoming event deleted.");
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
      marker_type: String(form.get("marker_type") || "vendor"),
      click_behavior: String(form.get("click_behavior") || "popup"),
      marker_style: String(form.get("marker_style") || "logo"),
      show_badge: Boolean(form.get("show_badge")),
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
  if (signedIn) {
    await loadEvents();
    await loadVendors();
  }
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
eventForm.addEventListener("submit", saveEventInfo);
upcomingForm.addEventListener("submit", saveUpcomingEvent);
newEventButton.addEventListener("click", () => {
  activeEventId = null;
  fillUpcomingForm(null);
  renderUpcomingAdminList();
});
deleteEventButton.addEventListener("click", deleteUpcomingEvent);
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
