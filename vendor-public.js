const publicConfig = window.BPB_SUPABASE;
const publicClient = window.supabase.createClient(publicConfig.url, publicConfig.anonKey);

const overlay = document.querySelector("[data-vendor-overlay]");
const list = document.querySelector("[data-vendor-list]");
const empty = document.querySelector("[data-vendor-empty]");
const dialog = document.querySelector("[data-vendor-dialog]");
const dialogClose = document.querySelector("[data-dialog-close]");
const upcomingList = document.querySelector("[data-upcoming-list]");
const upcomingEmpty = document.querySelector("[data-upcoming-empty]");
const vendorSearch = document.querySelector("[data-vendor-search]");
const vendorSort = document.querySelector("[data-vendor-sort]");

let allVendors = [];

function normalizeVendor(vendor) {
  return {
    ...vendor,
    marker_type: vendor.marker_type || "vendor",
    click_behavior: vendor.click_behavior || "popup",
    marker_style: vendor.marker_style || "logo",
    show_badge: vendor.show_badge !== false,
    x: Number(vendor.x || 50),
    y: Number(vendor.y || 50),
    width: Number(vendor.width || 10)
  };
}

function vendorInitials(name) {
  return String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function isSafeUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
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
  fallback.textContent = vendorInitials(vendor.name);
  target.append(fallback);
}

function markerTypeLabel(type) {
  const labels = {
    registration: "Registration",
    entrance: "Entrance",
    giveaway: "Giveaway",
    banner: "Banner",
    host: "Host Table",
    info: "Event Info"
  };
  return labels[type] || "Event Info";
}

function openVendor(vendor) {
  if (!dialog) return;
  renderLogo(dialog.querySelector("[data-dialog-logo]"), vendor);
  dialog.querySelector("[data-dialog-name]").textContent = vendor.name;
  const typeLabel = vendor.marker_type && vendor.marker_type !== "vendor"
    ? markerTypeLabel(vendor.marker_type)
    : "";
  dialog.querySelector("[data-dialog-table]").textContent = [
    typeLabel,
    vendor.table_number ? `Table(s) ${vendor.table_number}` : ""
  ].filter(Boolean).join(" - ");
  dialog.querySelector("[data-dialog-username]").textContent = vendor.username ? `@${vendor.username}` : "";
  dialog.querySelector("[data-dialog-notes]").textContent = vendor.notes || "";
  const link = dialog.querySelector("[data-dialog-link]");
  if (isSafeUrl(vendor.website_url)) {
    link.hidden = false;
    link.style.removeProperty("display");
    link.href = vendor.website_url;
  } else {
    link.hidden = true;
    link.style.display = "none";
    link.removeAttribute("href");
  }
  dialog.showModal();
}

function renderPins(vendors) {
  if (!overlay) return;
  overlay.replaceChildren();
  vendors.forEach((vendor) => {
    const pin = document.createElement("button");
    pin.className = `vendor-pin${vendor.marker_style === "label" ? " label-pin" : ""}`;
    pin.type = "button";
    pin.style.left = `${vendor.x}%`;
    pin.style.top = `${vendor.y}%`;
    pin.style.width = `${vendor.width}%`;
    pin.setAttribute("aria-label", `View vendor ${vendor.name}`);
    pin.dataset.vendorId = vendor.id;
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
    } else if (vendor.show_badge && vendor.marker_type && vendor.marker_type !== "vendor") {
      const badge = document.createElement("span");
      badge.className = "vendor-pin-number";
      badge.textContent = markerTypeLabel(vendor.marker_type).slice(0, 4).toUpperCase();
      pin.append(badge);
    }
    pin.addEventListener("click", () => handleVendorClick(vendor));
    overlay.append(pin);
  });
}

function highlightVendor(id) {
  document.querySelectorAll(".vendor-card.highlighted").forEach((card) => {
    card.classList.remove("highlighted");
  });
  const card = document.querySelector(`[data-vendor-card-id="${id}"]`);
  if (!card) return;
  card.classList.add("highlighted");
  card.scrollIntoView({ behavior: "smooth", block: "center" });
}

function handleVendorClick(vendor) {
  highlightVendor(vendor.id);
  if (vendor.click_behavior === "highlight") return;
  openVendor(vendor);
}

function renderList(vendors) {
  if (!list) return;
  list.replaceChildren();
  if (empty) empty.hidden = vendors.length > 0;
  vendors.forEach((vendor) => {
    const item = document.createElement("article");
    item.className = "vendor-card";
    item.dataset.vendorCardId = vendor.id;
    const logo = document.createElement("div");
    logo.className = "vendor-card-logo";
    renderLogo(logo, vendor);
    const body = document.createElement("div");
    const title = document.createElement("h3");
    const prefix = vendor.marker_type && vendor.marker_type !== "vendor"
      ? `${markerTypeLabel(vendor.marker_type)}: `
      : "";
    title.textContent = `${prefix}${vendor.name}`;
    const table = document.createElement("p");
    table.textContent = vendor.table_number ? `Table(s): ${vendor.table_number}` : "";
    const username = document.createElement("p");
    username.textContent = vendor.username ? `@${vendor.username}` : "";
    body.append(title);
    if (table.textContent) body.append(table);
    if (username.textContent) body.append(username);
    if (vendor.notes) {
      const notes = document.createElement("p");
      notes.textContent = vendor.notes;
      body.append(notes);
    }
    item.append(logo, body);
    item.addEventListener("click", () => handleVendorClick(vendor));
    list.append(item);
  });
}

function tableSortValue(value) {
  const text = String(value || "");
  const number = text.match(/\d+/);
  if (number) return Number(number[0]);
  return Number.MAX_SAFE_INTEGER;
}

function applyVendorFilters() {
  const query = String(vendorSearch?.value || "").trim().toLowerCase();
  const sort = vendorSort?.value || "table";
  let filtered = allVendors.filter((vendor) => {
    const haystack = [
      vendor.name,
      vendor.username,
      vendor.table_number,
      vendor.notes,
      vendor.marker_type
    ].filter(Boolean).join(" ").toLowerCase();
    return !query || haystack.includes(query);
  });

  filtered = [...filtered].sort((a, b) => {
    if (sort === "name") return String(a.name).localeCompare(String(b.name));
    const tableDiff = tableSortValue(a.table_number) - tableSortValue(b.table_number);
    if (tableDiff !== 0) return tableDiff;
    return String(a.name).localeCompare(String(b.name));
  });

  renderPins(filtered);
  renderList(filtered);
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element && value) element.textContent = value;
}

function renderFeaturedEvent(eventData) {
  if (!eventData) return;
  setText("[data-brand-name]", eventData.brand_name);
  setText("[data-event-presented]", eventData.presented_by);
  setText("[data-event-title]", eventData.title);
  setText("[data-event-summary]", eventData.summary);
  setText("[data-event-date]", eventData.date_label);
  setText("[data-event-venue]", eventData.venue_name);
  setText("[data-event-address]", eventData.address);
  setText("[data-event-vendor-time]", eventData.vendor_time);
  setText("[data-event-public-time]", eventData.public_time);
  setText("[data-event-admission]", eventData.admission);
  setText("[data-event-parking]", eventData.parking);
  setText("[data-event-food-policy]", eventData.food_policy);

  const vendorNote = document.querySelector("[data-event-vendor-note]");
  if (vendorNote && eventData.vendor_tables_note) vendorNote.textContent = eventData.vendor_tables_note;

  const flyer = document.querySelector("[data-event-flyer]");
  if (flyer && eventData.flyer_url) flyer.src = eventData.flyer_url;

  const brandLogo = document.querySelector("[data-brand-logo]");
  if (brandLogo && eventData.brand_logo_url) brandLogo.src = eventData.brand_logo_url;

  const flyerLink = document.querySelector("[data-event-flyer-link]");
  if (flyerLink && isSafeUrl(eventData.flyer_link)) {
    flyerLink.href = eventData.flyer_link;
  }
}

function renderUpcomingEvents(events) {
  if (!upcomingList) return;
  upcomingList.replaceChildren();
  const visibleEvents = events.filter((eventData) => !eventData.is_featured);
  if (upcomingEmpty) upcomingEmpty.hidden = visibleEvents.length > 0;
  visibleEvents.forEach((eventData) => {
    const card = document.createElement("article");
    card.className = "upcoming-card";

    if (eventData.flyer_url) {
      const img = document.createElement("img");
      img.src = eventData.flyer_url;
      img.alt = `${eventData.title} flyer`;
      card.append(img);
    }

    const body = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = eventData.title;
    const meta = document.createElement("p");
    meta.textContent = [eventData.date_label, eventData.venue_name].filter(Boolean).join(" - ");
    body.append(title);
    if (meta.textContent) body.append(meta);
    if (eventData.summary) {
      const summary = document.createElement("p");
      summary.textContent = eventData.summary;
      body.append(summary);
    }
    if (isSafeUrl(eventData.flyer_link)) {
      const link = document.createElement("a");
      link.className = "button secondary";
      link.href = eventData.flyer_link;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = "View Event";
      body.append(link);
    }
    card.append(body);
    upcomingList.append(card);
  });
}

async function loadEvents() {
  if (!publicConfig?.url || !publicConfig?.anonKey) return;
  const { data, error } = await publicClient
    .from("events")
    .select("*")
    .eq("is_visible", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  const events = data || [];
  renderFeaturedEvent(events.find((eventData) => eventData.is_featured));
  renderUpcomingEvents(events);
}

async function loadVendors() {
  if (!publicConfig?.url || !publicConfig?.anonKey) return;
  const { data, error } = await publicClient
    .from("vendors")
    .select("*")
    .eq("is_visible", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error(error);
    if (empty) {
      empty.hidden = false;
      empty.textContent = "Vendor guide will appear here once setup is complete.";
    }
    return;
  }

  allVendors = (data || []).map(normalizeVendor);
  applyVendorFilters();
}

if (dialogClose) {
  dialogClose.addEventListener("click", () => dialog.close());
}

vendorSearch?.addEventListener("input", applyVendorFilters);
vendorSort?.addEventListener("change", applyVendorFilters);

loadEvents();
loadVendors();
