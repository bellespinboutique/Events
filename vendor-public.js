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

function openVendor(vendor) {
  if (!dialog) return;
  dialog.querySelector("[data-dialog-logo]").innerHTML = vendor.logo_url
    ? `<img src="${vendor.logo_url}" alt="">`
    : `<span>${vendorInitials(vendor.name)}</span>`;
  dialog.querySelector("[data-dialog-name]").textContent = vendor.name;
  dialog.querySelector("[data-dialog-table]").textContent = vendor.table_number ? `Table ${vendor.table_number}` : "";
  dialog.querySelector("[data-dialog-username]").textContent = vendor.username ? `@${vendor.username}` : "";
  dialog.querySelector("[data-dialog-notes]").textContent = vendor.notes || "";
  const link = dialog.querySelector("[data-dialog-link]");
  if (vendor.website_url) {
    link.hidden = false;
    link.href = vendor.website_url;
  } else {
    link.hidden = true;
    link.removeAttribute("href");
  }
  dialog.showModal();
}

function renderPins(vendors) {
  if (!overlay) return;
  overlay.innerHTML = "";
  vendors.forEach((vendor) => {
    const pin = document.createElement("button");
    pin.className = "vendor-pin";
    pin.type = "button";
    pin.style.left = `${vendor.x}%`;
    pin.style.top = `${vendor.y}%`;
    pin.style.width = `${vendor.width}%`;
    pin.setAttribute("aria-label", `View vendor ${vendor.name}`);
    pin.innerHTML = vendor.logo_url
      ? `<img src="${vendor.logo_url}" alt="">`
      : `<span>${vendorInitials(vendor.name)}</span>`;
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
  list.innerHTML = "";
  if (empty) empty.hidden = vendors.length > 0;
  vendors.forEach((vendor) => {
    const item = document.createElement("article");
    item.className = "vendor-card";
    item.innerHTML = `
      <div class="vendor-card-logo">
        ${vendor.logo_url ? `<img src="${vendor.logo_url}" alt="">` : `<span>${vendorInitials(vendor.name)}</span>`}
      </div>
      <div>
        <h3>${vendor.table_number ? `Table ${vendor.table_number}: ` : ""}${vendor.name}</h3>
        <p>${vendor.username ? `@${vendor.username}` : "Vendor details coming soon"}</p>
        ${vendor.notes ? `<p>${vendor.notes}</p>` : ""}
      </div>
    `;
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
