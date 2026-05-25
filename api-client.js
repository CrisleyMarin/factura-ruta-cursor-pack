const FacturaRutaStore = (() => {
  const LOCAL_STORE = "factura-ruta-v1";
  const LOCAL_SETTINGS = "factura-ruta-settings-v1";

  function apiConfig() {
    return window.FACTURA_RUTA_API || { enabled: false };
  }

  function isApiEnabled() {
    const cfg = apiConfig();
    return Boolean(cfg.enabled && cfg.baseUrl && cfg.apiKey);
  }

  function apiUrl(path) {
    const base = apiConfig().baseUrl.replace(/\/$/, "");
    return `${base}/${path.replace(/^\//, "")}`;
  }

  async function apiRequest(path, options = {}) {
    const cfg = apiConfig();
    const response = await fetch(apiUrl(path), {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": cfg.apiKey,
        ...(options.headers || {})
      }
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = { ok: false, error: "Respuesta inválida del servidor." };
    }

    if (!response.ok || !payload?.ok) {
      const message = payload?.error || `Error HTTP ${response.status}`;
      throw new Error(message);
    }

    return payload.data;
  }

  function readLocal(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) || fallback;
    } catch {
      return fallback;
    }
  }

  function writeLocal(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  return {
    isApiEnabled,

    async loadInvoices() {
      if (!isApiEnabled()) return readLocal(LOCAL_STORE, []);
      return apiRequest("invoices.php", { method: "GET" });
    },

    async saveInvoice(invoice) {
      if (!isApiEnabled()) {
        const invoices = readLocal(LOCAL_STORE, []);
        const index = invoices.findIndex((entry) => entry.id === invoice.id);
        if (index >= 0) invoices[index] = invoice;
        else invoices.unshift(invoice);
        writeLocal(LOCAL_STORE, invoices);
        return invoice;
      }
      return apiRequest("invoices.php", {
        method: "POST",
        body: JSON.stringify(invoice)
      });
    },

    async deleteInvoice(id) {
      if (!isApiEnabled()) {
        const invoices = readLocal(LOCAL_STORE, []).filter((invoice) => invoice.id !== id);
        writeLocal(LOCAL_STORE, invoices);
        return;
      }
      await apiRequest(`invoices.php?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    },

    async loadSettings(defaults) {
      if (!isApiEnabled()) return { ...defaults, ...readLocal(LOCAL_SETTINGS, {}) };
      const remote = await apiRequest("settings.php", { method: "GET" });
      return { ...defaults, ...remote };
    },

    async saveSettings(settings) {
      if (!isApiEnabled()) {
        writeLocal(LOCAL_SETTINGS, settings);
        return settings;
      }
      return apiRequest("settings.php", {
        method: "PUT",
        body: JSON.stringify(settings)
      });
    },

    async importLocalToServer() {
      if (!isApiEnabled()) throw new Error("La API no está activada.");
      const invoices = readLocal(LOCAL_STORE, []);
      const settings = readLocal(LOCAL_SETTINGS, {});
      for (const invoice of invoices) {
        await apiRequest("invoices.php", {
          method: "POST",
          body: JSON.stringify(invoice)
        });
      }
      if (Object.keys(settings).length) {
        await apiRequest("settings.php", {
          method: "PUT",
          body: JSON.stringify(settings)
        });
      }
      return { invoices: invoices.length };
    }
  };
})();
