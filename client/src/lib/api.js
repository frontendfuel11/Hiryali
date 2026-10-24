const MOCK = import.meta.env.VITE_USE_MOCK !== "false";
const BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

let mockUser = null;
let conversations = [];
let variant = 0;

const wait = (n = 250) => new Promise((r) => setTimeout(r, n));

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      body.message || body.error || `Request failed (${res.status})`
    );
  }

  return body;
}

export async function signup(d) {
  if (MOCK) {
    await wait();
    mockUser = { name: d.name, email: d.email, language: d.language };
    return { user: mockUser };
  }
  return request("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(d),
  });
}

export async function login(d) {
  if (MOCK) {
    await wait();
    if (!d.email || !d.password) {
      throw new Error("Enter your email and password.");
    }
    mockUser = { name: d.email.split("@")[0], email: d.email, language: "en" };
    return { user: mockUser };
  }
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(d),
  });
}

export async function logout() {
  if (MOCK) {
    mockUser = null;
    await wait(80);
    return { ok: true };
  }
  return request("/api/auth/logout", { method: "POST" });
}

export async function getMe() {
  return MOCK ? { user: mockUser } : request("/api/auth/me");
}

// Live alerts from n8n. Defaults to the local mock receiver; set
// VITE_ALERTS_URL=http://localhost:5000/api/alerts to use the real backend.
const ALERTS_URL =
  import.meta.env.VITE_ALERTS_URL ||
  (BASE ? `${BASE}/api/alerts` : "http://localhost:5057/api/alerts");

export async function getAlerts() {
  const res = await fetch(ALERTS_URL, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Alerts request failed (${res.status})`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function getConversations() {
  if (MOCK) {
    await wait(80);
    return [...conversations].sort(
      (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
    );
  }
  return request("/api/conversations");
}

export async function getConversation(id) {
  if (MOCK) {
    await wait(80);
    const c = conversations.find((x) => x.id === id);
    if (!c) throw new Error("Conversation not found.");
    return c;
  }
  return request(`/api/conversations/${encodeURIComponent(id)}`);
}

function reportFor(kind, crop) {
  const unusable = kind === "unusable";
  const poor = kind === "poor";

  return {
    conversationId: "",
    photo_ok: !unusable,
    photo_issue: unusable
      ? "The photo is too blurry or too dark to assess reliably."
      : "",
    crop: crop || "Crop not specified",
    overall: {
      label: poor ? "poor" : unusable ? "poor" : "good",
      rating: poor ? 2 : unusable ? 1 : 4,
      confidence: unusable ? "low" : "medium",
    },
    summary: {
      en: unusable
        ? "This photo cannot support a reliable assessment. Take a clearer photo in daylight."
        : poor
        ? "Assessment: visible leaf damage needs closer inspection. The photo alone cannot confirm a specific pest or disease."
        : "Assessment: visible leaves appear mostly healthy. A single photo cannot confirm whole-field crop health.",
      ur: unusable
        ? "اس تصویر سے قابلِ اعتماد جائزہ ممکن نہیں۔ دن کی روشنی میں واضح تصویر لیں۔"
        : poor
        ? "نمونہ جائزہ: پتوں پر نظر آنے والے نقصان کا مزید معائنہ ضروری ہے۔ صرف تصویر سے بیماری کی تصدیق نہیں ہو سکتی۔"
        : "نمونہ جائزہ: تصویر میں پتے زیادہ تر صحت مند دکھائی دیتے ہیں۔ ایک تصویر سے پورے کھیت کی تصدیق نہیں ہو سکتی۔",
    },
    crop_findings: unusable
      ? []
      : [
          {
            label: "Leaf appearance",
            observation: poor
              ? "Some marks or discolouration need a closer look."
              : "No obvious severe damage is visible in this image.",
            status: poor ? "watch" : "ok",
            confidence: "medium",
          },
          {
            label: "Pest or disease",
            observation:
              "The image is not enough to identify a specific cause with certainty.",
            status: "watch",
            confidence: "low",
          },
          {
            label: "Growth stage",
            observation:
              "Confirm crop age and variety for a more useful assessment.",
            status: "watch",
            confidence: "low",
          },
        ],
    field_findings: unusable
      ? []
      : [
          {
            label: "Plant spacing",
            observation: "A wider field view is needed to assess spacing.",
            status: "watch",
          },
          {
            label: "Weed pressure",
            observation: "Weeds cannot be assessed reliably from this close-up.",
            status: "watch",
          },
          {
            label: "Water stress",
            observation: "Check multiple plants and soil moisture.",
            status: "watch",
          },
          {
            label: "Soil surface",
            observation: "The soil surface is not sufficiently visible.",
            status: "watch",
          },
          {
            label: "Visible pest damage",
            observation: poor
              ? "Inspect nearby plants for similar damage."
              : "No widespread pest damage is established by this photo.",
            status: poor ? "watch" : "ok",
          },
        ],
    actions: unusable
      ? []
      : [
          "Photograph affected and healthy leaves in daylight.",
          "Check symptoms on multiple plants and note when they began.",
          "Ask a local agriculture officer to confirm the cause before treatment.",
        ],
    avoid: [
      "Do not apply pesticides based only on this image.",
      "Do not mix chemicals without verified label guidance.",
    ],
    call_expert_if: [
      "Damage spreads quickly across the field.",
      "Plants wilt rapidly or the crop is at immediate risk.",
      "You are considering a pesticide or uncertain about safe use.",
    ],
  };
}

async function visionRequest(formData) {
  const res = await fetch(`${BASE}/api/disease/detect`, {
    method: "POST",
    body: formData,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.message || body.error || `Disease request failed (${res.status})`);
  }
  return body;
}

function rememberLocalReport(report, { message = "", crop = "" } = {}) {
  const id = report.conversationId || `vision-${Date.now()}`;
  report.conversationId = id;
  const now = new Date().toISOString();
  let c = conversations.find((x) => x.id === id);
  if (!c) {
    c = {
      id,
      title: crop || report.crop || "Crop check",
      crop: crop || report.crop || "Crop check",
      createdAt: now,
      updatedAt: now,
      messages: [],
    };
    conversations.unshift(c);
  }
  c.updatedAt = now;
  c.messages.push(
    { id: `u-${Date.now()}`, role: "user", text: message, crop, images: [], createdAt: now },
    { id: `a-${Date.now()}`, role: "assistant", report, createdAt: now }
  );
}

export async function analyzeCrop({
  images = [],
  message = "",
  crop = "",
  language = "en",
  conversationId = "",
}) {
  // Real local vision model first (public endpoint, no DB required).
  if (images.length > 0 && import.meta.env.VITE_USE_VISION !== "false") {
    const fd = new FormData();
    images.forEach((file) => fd.append("images", file));
    fd.append("crop", crop || "");
    fd.append("lang", language);
    fd.append("message", message || "");
    const report = await visionRequest(fd);
    if (MOCK) rememberLocalReport(report, { message, crop });
    return report;
  }

  if (MOCK) {
    await wait(550);
    const kind = ["good", "poor", "unusable"][variant++ % 3];
    const report = reportFor(kind, crop);
    const id = conversationId || `demo-${Date.now()}`;
    report.conversationId = id;
    
    let c = conversations.find((x) => x.id === id);
    const now = new Date().toISOString();
    
    if (!c) {
      c = {
        id,
        title: crop || "Crop check",
        crop: crop || "Crop check",
        createdAt: now,
        updatedAt: now,
        messages: [],
      };
      conversations.unshift(c);
    }
    
    c.updatedAt = now;
    c.messages.push(
      {
        id: `u-${Date.now()}`,
        role: "user",
        text: message,
        crop,
        images: [],
        createdAt: now,
      },
      {
        id: `a-${Date.now()}`,
        role: "assistant",
        report,
        createdAt: now,
      }
    );
    
    return report;
  }

  const fd = new FormData();
  images.forEach((f) => fd.append("images", f));
  fd.append("message", message || "");
  fd.append("crop", crop || "");
  fd.append("lang", language);
  if (conversationId) fd.append("conversationId", conversationId);
  
  return request("/api/analyze", { method: "POST", body: fd });
}