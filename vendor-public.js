const publicConfig = window.BPB_SUPABASE;
const publicClient = window.supabase.createClient(publicConfig.url, publicConfig.anonKey);

const overlay = document.querySelector("[data-vendor-overlay]");
const list = document.querySelector("[data-vendor-list]");
const empty = document.querySelector("[data-vendor-empty]");
const dialog = document.querySelector("[data-vendor-dialog]");
const dialogClose = document.querySelector("[data-dialog-close]");

function normalizeVendor(vendor) {
  return {
    ...vendor,
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

function openVendor(vendor) {
  if (!dialog) return;
  renderLogo(dialog.querySelector("[data-dialog-logo]"), vendor);
  dialog.querySelector("[data-dialog-name]").textContent = vendor.name;
  dialog.querySelector("[data-dialog-table]").textContent = vendor.table_number ? `Table(s) ${vendor.table_number}` : "";
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
    pin.className = "vendor-pin";
    pin.type = "button";
    pin.style.left = `${vendor.x}%`;
    pin.style.top = `${vendor.y}%`;
    pin.style.width = `${vendor.width}%`;
    pin.setAttribute("aria-label", `View vendor ${vendor.name}`);
    renderLogo(pin, vendor);
    if (vendor.table_number) {
      const badge = document.createElement("span");
      badge.className = "vendor-pin-number";
      badge.textContent = vendor.table_number;
      pin.append(badge);
    }
    pin.addEventListener("click", () => openVendor(vendor));
    overlay.append(pin);
  });
}

function renderList(vendors) {
  if (!list) return;
  list.replaceChildren();
  if (empty) empty.hidden = vendors.length > 0;
  vendors.forEach((vendor) => {
    const item = document.createElement("article");
    item.className = "vendor-card";
    const logo = document.createElement("div");
    logo.className = "vendor-card-logo";
    renderLogo(logo, vendor);
    const body = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = `${vendor.table_number ? `Table(s) ${vendor.table_number}: ` : ""}${vendor.name}`;
    const username = document.createElement("p");
    username.textContent = vendor.username ? `@${vendor.username}` : "Vendor details coming soon";
    body.append(title, username);
    if (vendor.notes) {
      const notes = document.createElement("p");
      notes.textContent = vendor.notes;
      body.append(notes);
    }
    item.append(logo, body);
    item.addEventListener("click", () => openVendor(vendor));
    list.append(item);
  });
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

  const vendors = (data || []).map(normalizeVendor);
  renderPins(vendors);
  renderList(vendors);
}

if (dialogClose) {
  dialogClose.addEventListener("click", () => dialog.close());
}

loadVendors();
