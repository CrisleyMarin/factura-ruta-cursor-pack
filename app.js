const STORE = "factura-ruta-v1";

/** Plantilla fija — igual a la factura LUNA INVOICE (no editable). */
const INVOICE_TEMPLATE = {
  companyName: "LUNA INVOICE",
  tagline: "Traslados simples, en manos de expertos.",
  subtitle: "Servicios Profesionales de Acarreo y Logistica - Panama",
  defaultServiceType: "Acarreo Residencial / Comercial",
  itemFootnote: "Carga, traslado seguro y descarga en destino segun ruta especificada.",
  terms: [
    "Gracias por su preferencia. Pago contra entrega salvo acuerdo previo por escrito.",
    "Cualquier reclamo sobre el estado de la mercancia debe realizarse inmediatamente al momento de la descarga."
  ],
  colors: {
    primary: { r: 23, g: 41, b: 56 },
    accent: { r: 40, g: 184, b: 162 },
    dark: { r: 23, g: 41, b: 56 },
    gray: { r: 132, g: 142, b: 150 },
    red: { r: 214, g: 80, b: 74 },
    light: { r: 248, g: 250, b: 251 },
    line: { r: 232, g: 235, b: 238 }
  }
};

let invoices = readJson(STORE, []);
let editingId = null;
let deferredInstall = null;

const $ = (selector) => document.querySelector(selector);
const money = (value) =>
  new Intl.NumberFormat("es-PA", { style: "currency", currency: "USD" }).format(Number(value || 0));

const invoiceMoney = (value) => `USD ${Number(value || 0).toFixed(2)}`;

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function invoiceSeed() {
  const next = invoices.length + 710;
  return `FAC-${String(next).padStart(5, "0")}`;
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2600);
}

function initForm() {
  $("#invoiceNumber").value = invoiceSeed();
  $("#invoiceDate").value = todayISO();
  $("#taxRate").value = "0";
  $("#itemsList").innerHTML = "";
  addItem({
    description: "Servicio de acarreo",
    detail: INVOICE_TEMPLATE.itemFootnote,
    quantity: 1,
    price: 0
  });
  editingId = null;
  renderPreview();
}

function addItem(item = {}) {
  const row = document.createElement("div");
  row.className = "item-row";
  row.innerHTML = `
    <label><span>Concepto</span><input class="item-desc" value="${escapeAttr(item.description || "")}" placeholder="Flete"></label>
    <label class="item-detail-field"><span>Descripción del servicio</span><textarea class="item-detail" rows="2" placeholder="Carga, traslado seguro y descarga...">${escapeHtml(item.detail || INVOICE_TEMPLATE.itemFootnote)}</textarea></label>
    <label><span>Cant.</span><input class="item-qty" type="number" min="0" step="0.01" value="${item.quantity ?? 1}"></label>
    <label><span>Precio</span><input class="item-price" type="number" min="0" step="0.01" value="${item.price ?? 0}"></label>
    <button class="remove-item" type="button" title="Eliminar">×</button>
  `;
  row.querySelector(".remove-item").addEventListener("click", () => {
    if ($("#itemsList").children.length > 1) row.remove();
    renderPreview();
  });
  row.querySelectorAll("input, textarea").forEach((input) => input.addEventListener("input", renderPreview));
  $("#itemsList").append(row);
}

function escapeAttr(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getFormInvoice() {
  const items = [...document.querySelectorAll(".item-row")].map((row) => ({
    description: row.querySelector(".item-desc").value.trim() || "Servicio",
    detail: row.querySelector(".item-detail").value.trim() || INVOICE_TEMPLATE.itemFootnote,
    quantity: Number(row.querySelector(".item-qty").value || 0),
    price: Number(row.querySelector(".item-price").value || 0)
  }));
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const taxRate = Number($("#taxRate").value || 0);
  const tax = subtotal * (taxRate / 100);
  return {
    id: editingId || uid(),
    number: $("#invoiceNumber").value.trim(),
    date: $("#invoiceDate").value,
    clientName: $("#clientName").value.trim(),
    clientEmail: $("#clientEmail").value.trim(),
    clientPhone: $("#clientPhone").value.trim(),
    origin: $("#origin").value.trim(),
    destination: $("#destination").value.trim(),
    serviceNotes: $("#serviceNotes").value.trim(),
    items,
    taxRate,
    subtotal,
    tax,
    total: subtotal + tax,
    createdAt: new Date().toISOString()
  };
}

function fillForm(invoice) {
  editingId = invoice.id;
  $("#invoiceNumber").value = invoice.number;
  $("#invoiceDate").value = invoice.date;
  $("#clientName").value = invoice.clientName;
  $("#clientEmail").value = invoice.clientEmail || "";
  $("#clientPhone").value = invoice.clientPhone || "";
  $("#origin").value = invoice.origin || "";
  $("#destination").value = invoice.destination || "";
  $("#serviceNotes").value = invoice.serviceNotes || "";
  $("#taxRate").value = invoice.taxRate || 0;
  $("#itemsList").innerHTML = "";
  invoice.items.forEach(addItem);
  switchView("invoiceView");
  renderPreview();
}

function renderPreview() {
  const invoice = getFormInvoice();
  $("#subtotalValue").textContent = money(invoice.subtotal);
  $("#taxValue").textContent = money(invoice.tax);
  $("#totalValue").textContent = money(invoice.total);

  const route = [invoice.origin, invoice.destination].filter(Boolean).join(" → ") || "Origen → Destino";
  const serviceType = invoice.serviceNotes || INVOICE_TEMPLATE.defaultServiceType;

  $("#invoicePreview").innerHTML = `
    <div class="pdf-doc">
      <header class="pdf-doc-head">
        <div class="pdf-brand">
          <h2>${escapeHtml(INVOICE_TEMPLATE.companyName)}</h2>
          <p class="pdf-tagline">${escapeHtml(INVOICE_TEMPLATE.tagline)}</p>
          <p class="pdf-subtitle">${escapeHtml(INVOICE_TEMPLATE.subtitle)}</p>
        </div>
        <div class="pdf-invoice-meta">
          <strong class="pdf-factura">FACTURA</strong>
          <span class="pdf-number">N° ${escapeHtml(invoice.number || "Sin número")}</span>
        </div>
      </header>
      <div class="pdf-accent-line"></div>
      <section class="pdf-info-grid">
        <div class="pdf-info-col">
          <span class="pdf-label">CLIENTE</span>
          <hr />
          <strong>${escapeHtml(invoice.clientName || "Cliente")}</strong>
          <p>WhatsApp: ${escapeHtml(invoice.clientPhone || "-")}</p>
          <p>Email: ${escapeHtml(invoice.clientEmail || "-")}</p>
        </div>
        <div class="pdf-info-col">
          <span class="pdf-label">DETALLES DEL SERVICIO</span>
          <hr />
          <p><strong>Fecha de Emisión:</strong> ${escapeHtml(invoice.date || "")}</p>
          <p><strong>Ruta:</strong> ${escapeHtml(route)}</p>
          <p><strong>Tipo:</strong> ${escapeHtml(serviceType)}</p>
        </div>
      </section>
      <table class="pdf-table">
        <thead>
          <tr>
            <th>DESCRIPCIÓN DEL CONCEPTO / SERVICIO</th>
            <th>CANT.</th>
            <th>TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${invoice.items
            .map(
              (item) => `
            <tr>
              <td>
                <strong>${escapeHtml(item.description)}</strong>
                <small>${escapeHtml(item.detail || INVOICE_TEMPLATE.itemFootnote)}</small>
              </td>
              <td>${escapeHtml(item.quantity)}</td>
              <td>${invoiceMoney(item.quantity * item.price)}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
      <div class="pdf-totals">
        <p><span>Subtotal:</span><strong>${invoiceMoney(invoice.subtotal)}</strong></p>
        <p><span>Impuesto (${invoice.taxRate || 0}%):</span><strong>${invoiceMoney(invoice.tax)}</strong></p>
        <hr class="pdf-total-rule" />
        <p class="pdf-grand"><span>Total a Pagar:</span><strong>${invoiceMoney(invoice.total)}</strong></p>
      </div>
      <aside class="pdf-terms">
        <h4>TÉRMINOS Y CONDICIONES DE PAGO</h4>
        ${INVOICE_TEMPLATE.terms.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
      </aside>
      <footer class="pdf-page">Página 1 de 1</footer>
    </div>
  `;
}

function saveInvoice(event) {
  event.preventDefault();
  const invoice = getFormInvoice();
  if (!invoice.number || !invoice.date || !invoice.clientName) {
    showToast("Completa número, fecha y cliente.");
    return;
  }
  const index = invoices.findIndex((entry) => entry.id === invoice.id);
  if (index >= 0) invoices[index] = { ...invoices[index], ...invoice, updatedAt: new Date().toISOString() };
  else invoices.unshift(invoice);
  saveJson(STORE, invoices);
  editingId = invoice.id;
  renderAll();
  showToast("Factura guardada.");
}

function renderInvoices() {
  const query = $("#searchInvoices").value.toLowerCase().trim();
  const visible = invoices.filter((invoice) =>
    [invoice.number, invoice.clientName, invoice.origin, invoice.destination]
      .join(" ")
      .toLowerCase()
      .includes(query)
  );
  $("#invoiceList").innerHTML = visible.length
    ? visible.map(recordHtml).join("")
    : `<p class="empty">No hay facturas guardadas.</p>`;

  document.querySelectorAll("[data-edit]").forEach((button) =>
    button.addEventListener("click", () => fillForm(invoices.find((invoice) => invoice.id === button.dataset.edit)))
  );
  document.querySelectorAll("[data-pdf]").forEach((button) =>
    button.addEventListener("click", () => downloadInvoice(invoices.find((invoice) => invoice.id === button.dataset.pdf)))
  );
  document.querySelectorAll("[data-share]").forEach((button) =>
    button.addEventListener("click", () => shareInvoice(invoices.find((invoice) => invoice.id === button.dataset.share)))
  );
  document.querySelectorAll("[data-delete]").forEach((button) =>
    button.addEventListener("click", () => deleteInvoice(button.dataset.delete))
  );
}

function recordHtml(invoice) {
  return `
    <article class="record">
      <div class="record-main">
        <div><strong>${escapeHtml(invoice.number)} · ${escapeHtml(invoice.clientName)}</strong><span>${escapeHtml(invoice.date)} · ${escapeHtml(invoice.origin || "Origen")} → ${escapeHtml(invoice.destination || "Destino")}</span></div>
        <div class="record-total">${money(invoice.total)}</div>
      </div>
      <div class="record-actions">
        <button class="secondary-button" data-edit="${invoice.id}" type="button">Editar</button>
        <button class="secondary-button" data-pdf="${invoice.id}" type="button">PDF</button>
        <button class="secondary-button" data-share="${invoice.id}" type="button">Compartir</button>
        <button class="danger-button" data-delete="${invoice.id}" type="button">Borrar</button>
      </div>
    </article>
  `;
}

function deleteInvoice(id) {
  invoices = invoices.filter((invoice) => invoice.id !== id);
  saveJson(STORE, invoices);
  renderAll();
  showToast("Factura eliminada.");
}

function renderReports() {
  const now = new Date();
  const day = todayISO();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const monthKey = day.slice(0, 7);
  const yearKey = day.slice(0, 4);
  const totalWhere = (predicate) => invoices.filter(predicate).reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);
  const daily = totalWhere((invoice) => invoice.date === day);
  const weekly = totalWhere((invoice) => new Date(`${invoice.date}T00:00:00`) >= weekStart);
  const monthly = totalWhere((invoice) => invoice.date.startsWith(monthKey));
  const yearly = totalWhere((invoice) => invoice.date.startsWith(yearKey));

  $("#todayTotal").textContent = money(daily);
  $("#monthTotal").textContent = money(monthly);
  $("#invoiceCount").textContent = invoices.length;
  $("#dailyReport").textContent = money(daily);
  $("#weeklyReport").textContent = money(weekly);
  $("#monthlyReport").textContent = money(monthly);
  $("#yearlyReport").textContent = money(yearly);

  const months = [...Array(6)].map((_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const key = date.toISOString().slice(0, 7);
    return {
      label: date.toLocaleDateString("es-PA", { month: "short" }),
      total: totalWhere((invoice) => invoice.date.startsWith(key))
    };
  });
  const max = Math.max(...months.map((entry) => entry.total), 1);
  $("#monthBars").innerHTML = months
    .map(
      (entry) => `
        <div class="month-row">
          <span>${entry.label}</span>
          <div class="bar-track"><div class="bar-fill" style="width:${(entry.total / max) * 100}%"></div></div>
          <strong>${money(entry.total)}</strong>
        </div>
      `
    )
    .join("");
}

function switchView(id) {
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("is-active", view.id === id));
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("is-active", tab.dataset.view === id));
  if (id === "recordsView") renderInvoices();
  if (id === "reportsView") renderReports();
}

function renderAll() {
  renderPreview();
  renderInvoices();
  renderReports();
}

const PDF_LAYOUT = {
  marginX: 42,
  width: 528,
  right: 570,
  tableHeaderY: 552,
  rowHeight: 54
};

function pdfPalette() {
  return INVOICE_TEMPLATE.colors;
}

function pdfMoney(value) {
  return `USD ${Number(value || 0).toFixed(2)}`;
}

function pdfTextLines(x, startY, size, text, maxChars = 88, lineGap = 11, style = "") {
  const words = toPdfText(text).split(" ").filter(Boolean);
  const lines = [];
  let current = "";
  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  });
  if (current) lines.push(current);
  if (!lines.length) lines.push("");
  return lines.flatMap((line, index) => [["text", x, startY - index * lineGap, size, line, style]]);
}

function pdfTextRight(xRight, y, size, text, style = "") {
  const width = text.length * size * 0.52;
  return ["text", xRight - width, y, size, text, style];
}

function pdfTextCenter(xCenter, y, size, text, style = "") {
  const width = text.length * size * 0.52;
  return ["text", xCenter - width / 2, y, size, text, style];
}

function buildPdf(invoice) {
  const colors = pdfPalette();
  const { marginX, width, right } = PDF_LAYOUT;
  const route = `${invoice.origin || "-"} -> ${invoice.destination || "-"}`;
  const serviceType = invoice.serviceNotes || INVOICE_TEMPLATE.defaultServiceType;
  const companyName = INVOICE_TEMPLATE.companyName.toUpperCase();
  const tagline = `"${INVOICE_TEMPLATE.tagline}"`;
  const subtitle = INVOICE_TEMPLATE.subtitle;
  const lines = [
    ["fill", colors.dark.r, colors.dark.g, colors.dark.b],
    ["text", marginX, 778, 22, companyName, "bold"],
    ["fill", colors.accent.r, colors.accent.g, colors.accent.b],
    ["text", marginX, 754, 10, tagline, "italic"],
    ["fill", colors.gray.r, colors.gray.g, colors.gray.b],
    ["text", marginX, 739, 9, subtitle],
    ["fill", colors.dark.r, colors.dark.g, colors.dark.b],
    ["text", 448, 772, 24, "FACTURA", "bold"],
    ["fill", colors.red.r, colors.red.g, colors.red.b],
    ["text", 468, 744, 13, `N° ${invoice.number}`, "bold"],
    ["fill", colors.accent.r, colors.accent.g, colors.accent.b],
    ["rect", marginX, 712, width, 3],

    ["fill", colors.gray.r, colors.gray.g, colors.gray.b],
    ["text", marginX, 686, 11, "CLIENTE", "bold"],
    ["fill", colors.line.r, colors.line.g, colors.line.b],
    ["rect", marginX, 676, 250, 1],
    ["fill", colors.dark.r, colors.dark.g, colors.dark.b],
    ["text", marginX, 659, 12, invoice.clientName || "Cliente", "bold"],
    ["text", marginX, 639, 11, `WhatsApp: ${invoice.clientPhone || "-"}`, "bold"],
    ["text", marginX, 619, 11, `Email: ${invoice.clientEmail || "-"}`],

    ["fill", colors.gray.r, colors.gray.g, colors.gray.b],
    ["text", 350, 686, 11, "DETALLES DEL SERVICIO", "bold"],
    ["fill", colors.line.r, colors.line.g, colors.line.b],
    ["rect", 350, 676, 220, 1],
    ["fill", colors.dark.r, colors.dark.g, colors.dark.b],
    ["text", 350, 659, 11, `Fecha de Emision: ${invoice.date}`, "bold"],
    ["text", 350, 639, 11, `Ruta: ${route}`, "bold"],
    ["text", 350, 619, 11, `Tipo: ${serviceType}`, "bold"],
    ["fill", colors.line.r, colors.line.g, colors.line.b],
    ["rect", marginX, 598, width, 1],

    ["fill", colors.primary.r, colors.primary.g, colors.primary.b],
    ["rect", marginX, PDF_LAYOUT.tableHeaderY, width, 30],
    ["fill", 255, 255, 255],
    ["text", marginX + 10, 562, 10, "DESCRIPCION DEL CONCEPTO / SERVICIO", "bold"],
    ...[pdfTextCenter(430, 562, 10, "CANT.", "bold")],
    ...[pdfTextRight(right - 10, 562, 10, "TOTAL", "bold")]
  ];

  let y = 526;
  invoice.items.forEach((item) => {
    const lineTotal = pdfMoney(item.quantity * item.price);
    lines.push(
      ["fill", colors.dark.r, colors.dark.g, colors.dark.b],
      ["text", marginX + 10, y, 11, item.description || "Servicio", "bold"],
      ...[pdfTextCenter(430, y, 11, String(item.quantity))],
      ...[pdfTextRight(right - 10, y, 11, lineTotal, "bold")],
      ["fill", colors.gray.r, colors.gray.g, colors.gray.b],
      ...pdfTextLines(marginX + 10, y - 16, 9, item.detail || INVOICE_TEMPLATE.itemFootnote, 72, 11),
      ["fill", colors.line.r, colors.line.g, colors.line.b],
      ["rect", marginX, y - 34, width, 1]
    );
    y -= PDF_LAYOUT.rowHeight;
  });

  const totalsY = Math.max(y - 18, 360);
  lines.push(
    ["fill", colors.gray.r, colors.gray.g, colors.gray.b],
    ["text", 360, totalsY, 11, "Subtotal:"],
    ["fill", colors.dark.r, colors.dark.g, colors.dark.b],
    ...[pdfTextRight(right - 10, totalsY, 11, pdfMoney(invoice.subtotal), "bold")],
    ["fill", colors.gray.r, colors.gray.g, colors.gray.b],
    ["text", 330, totalsY - 24, 11, `Impuesto (${invoice.taxRate || 0}%):`],
    ["fill", colors.dark.r, colors.dark.g, colors.dark.b],
    ...[pdfTextRight(right - 10, totalsY - 24, 11, pdfMoney(invoice.tax), "bold")],
    ["fill", colors.dark.r, colors.dark.g, colors.dark.b],
    ["rect", 308, totalsY - 40, 262, 2],
    ["fill", colors.dark.r, colors.dark.g, colors.dark.b],
    ["text", 332, totalsY - 68, 13, "Total a Pagar:", "bold"],
    ...[pdfTextRight(right - 10, totalsY - 68, 18, pdfMoney(invoice.total), "bold")],

    ["fill", colors.light.r, colors.light.g, colors.light.b],
    ["rect", marginX, 168, width, 78],
    ["fill", colors.accent.r, colors.accent.g, colors.accent.b],
    ["rect", marginX, 168, 4, 78],
    ["fill", colors.dark.r, colors.dark.g, colors.dark.b],
    ["text", marginX + 18, 226, 10, "TERMINOS Y CONDICIONES DE PAGO", "bold"],
    ["fill", colors.gray.r, colors.gray.g, colors.gray.b],
    ...INVOICE_TEMPLATE.terms.flatMap((paragraph, index) =>
      pdfTextLines(marginX + 18, 208 - index * 14, 9, paragraph, 92, 11)
    ),
    ["fill", colors.gray.r, colors.gray.g, colors.gray.b],
    ...[pdfTextRight(right - 10, 34, 8, "Pagina 1 de 1")]
  );

  return makePdf(lines);
}

function makePdf(lines) {
  const stream = lines.map(pdfCommand).join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R >> >> /Contents 7 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

function pdfCommand(command) {
  if (command[0] === "fill") return `${command[1] / 255} ${command[2] / 255} ${command[3] / 255} rg`;
  if (command[0] === "rect") return `${command[1]} ${command[2]} ${command[3]} ${command[4]} re f`;
  if (command[0] === "stroke") return `${command[1] / 255} ${command[2] / 255} ${command[3] / 255} RG`;
  if (command[0] === "lineWidth") return `${command[1]} w`;
  if (command[0] === "line") return `${command[1]} ${command[2]} m ${command[3]} ${command[4]} l S`;
  const font = command[5] === "bold" ? "F2" : command[5] === "italic" ? "F3" : "F1";
  const text = toPdfText(command[4]).replace(/[\\()]/g, "\\$&").slice(0, 95);
  return `BT /${font} ${command[3]} Tf ${command[1]} ${command[2]} Td (${text}) Tj ET`;
}

function toPdfText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "");
}

function downloadInvoice(invoice = getFormInvoice()) {
  const blob = buildPdf(invoice);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${invoice.number || "factura"}.pdf`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("PDF descargado.");
}

async function shareInvoice(invoice = getFormInvoice()) {
  const blob = buildPdf(invoice);
  const file = new File([blob], `${invoice.number || "factura"}.pdf`, { type: "application/pdf" });
  const text = `Factura ${invoice.number} por ${money(invoice.total)} - ${INVOICE_TEMPLATE.companyName}`;
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ title: invoice.number, text, files: [file] });
    return;
  }
  if (invoice.clientPhone) {
    window.open(`https://wa.me/${invoice.clientPhone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`, "_blank");
    return;
  }
  if (invoice.clientEmail) {
    location.href = `mailto:${invoice.clientEmail}?subject=${encodeURIComponent(invoice.number)}&body=${encodeURIComponent(text)}`;
    return;
  }
  showToast("Tu navegador no permite compartir archivos. Descarga el PDF primero.");
}

function wireEvents() {
  $("#invoiceForm").addEventListener("submit", saveInvoice);
  $("#addItemBtn").addEventListener("click", () => addItem());
  $("#clearFormBtn").addEventListener("click", initForm);
  $("#downloadCurrentBtn").addEventListener("click", () => downloadInvoice());
  $("#shareCurrentBtn").addEventListener("click", () => shareInvoice());
  $("#searchInvoices").addEventListener("input", renderInvoices);
  document.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => switchView(tab.dataset.view)));
  document.querySelectorAll("#invoiceForm input, #invoiceForm textarea").forEach((field) => field.addEventListener("input", renderPreview));
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstall = event;
    $("#installBtn").hidden = false;
  });
  $("#installBtn").addEventListener("click", async () => {
    if (!deferredInstall) return;
    deferredInstall.prompt();
    await deferredInstall.userChoice;
    $("#installBtn").hidden = true;
  });
}

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js");
}

initForm();
wireEvents();
renderAll();
