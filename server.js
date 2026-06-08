const express = require("express");
const crypto = require("crypto");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;
const API_SECRET = process.env.API_SECRET || "makuro-secret-123";

const store = new Map();

// ====== HELPERS ======
function generateId() {
    return crypto.randomBytes(12).toString("hex");
}

// ====== WEB UI ======
app.get("/", (req, res) => {
    res.send(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Makuro Service</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #0d0d0d;
    color: #e0e0e0;
    font-family: 'Courier New', monospace;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px 20px;
  }
  .logo {
    font-size: 1.8rem;
    font-weight: bold;
    color: #00ff88;
    margin-bottom: 8px;
    letter-spacing: 3px;
  }
  .sub {
    color: #555;
    font-size: 0.8rem;
    margin-bottom: 32px;
    letter-spacing: 2px;
  }
  .box {
    background: #1a1a1a;
    border: 1px solid #2a2a2a;
    border-radius: 8px;
    padding: 24px;
    width: 100%;
    max-width: 700px;
  }
  label {
    display: block;
    color: #888;
    font-size: 0.8rem;
    margin-bottom: 8px;
    letter-spacing: 1px;
  }
  textarea {
    width: 100%;
    height: 280px;
    background: #111;
    border: 1px solid #333;
    border-radius: 6px;
    color: #00ff88;
    font-family: 'Courier New', monospace;
    font-size: 0.85rem;
    padding: 12px;
    resize: vertical;
    outline: none;
  }
  textarea:focus { border-color: #00ff88; }
  .row {
    display: flex;
    gap: 12px;
    margin-top: 16px;
    align-items: center;
  }
  input[type=text] {
    flex: 1;
    background: #111;
    border: 1px solid #333;
    border-radius: 6px;
    color: #e0e0e0;
    font-family: 'Courier New', monospace;
    font-size: 0.85rem;
    padding: 10px 12px;
    outline: none;
  }
  input[type=text]:focus { border-color: #00ff88; }
  button {
    background: #00ff88;
    color: #000;
    border: none;
    border-radius: 6px;
    padding: 10px 24px;
    font-weight: bold;
    font-family: 'Courier New', monospace;
    cursor: pointer;
    letter-spacing: 1px;
  }
  button:hover { background: #00cc6a; }
  .result {
    margin-top: 20px;
    background: #111;
    border: 1px solid #00ff8844;
    border-radius: 6px;
    padding: 14px;
    display: none;
  }
  .result-label { color: #555; font-size: 0.75rem; margin-bottom: 6px; }
  .result-url {
    color: #00ff88;
    font-size: 0.9rem;
    word-break: break-all;
    cursor: pointer;
  }
  .copy-btn {
    background: #222;
    color: #888;
    border: 1px solid #333;
    border-radius: 4px;
    padding: 4px 12px;
    font-size: 0.75rem;
    cursor: pointer;
    margin-top: 8px;
  }
  .copy-btn:hover { color: #00ff88; border-color: #00ff88; }
  .footer {
    margin-top: 40px;
    color: #333;
    font-size: 0.75rem;
    letter-spacing: 2px;
  }
</style>
</head>
<body>
<div class="logo">MAKURO</div>
<div class="sub">CYBER SECURITY SERVICE</div>
<div class="box">
  <label>// PASTE YOUR CODE</label>
  <textarea id="code" placeholder="-- วางโค้ดของคุณที่นี่..."></textarea>
  <div class="row">
    <input type="text" id="apikey" placeholder="API Key (ถ้ามี)" />
    <button onclick="submit()">UPLOAD</button>
  </div>
  <div class="result" id="result">
    <div class="result-label">// RAW URL</div>
    <div class="result-url" id="result-url"></div>
    <button class="copy-btn" onclick="copyUrl()">COPY URL</button>
  </div>
</div>
<div class="footer">CYBER SECURITY BY MAKURO SERVICE POWER</div>

<script>
async function submit() {
  const code = document.getElementById('code').value.trim();
  const key = document.getElementById('apikey').value.trim();
  if (!code) return alert('กรุณาใส่โค้ด');
  const res = await fetch('/api/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-secret': key || '${API_SECRET}'
    },
    body: JSON.stringify({ content: code })
  });
  const data = await res.json();
  if (data.ok) {
    document.getElementById('result').style.display = 'block';
    document.getElementById('result-url').innerText = data.url;
  } else {
    alert('Error: ' + (data.error || 'unknown'));
  }
}
function copyUrl() {
  const url = document.getElementById('result-url').innerText;
  navigator.clipboard.writeText(url);
  alert('Copied!');
}
</script>
</body>
</html>`);
});

// ====== API CREATE ======
app.post("/api/create", (req, res) => {
    if (req.headers["x-api-secret"] !== API_SECRET)
        return res.status(403).json({ ok: false, error: "forbidden" });

    const { content } = req.body;
    if (!content) return res.status(400).json({ ok: false, error: "no content" });

    const id = generateId();
    store.set(id, { content, createdAt: Date.now() });

    const host = req.headers["host"];
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const url = `${protocol}://${host}/raw/${id}`;

    res.json({ ok: true, url, id });
});

// ====== API DELETE ======
app.delete("/api/delete/:id", (req, res) => {
    if (req.headers["x-api-secret"] !== API_SECRET)
        return res.status(403).json({ ok: false, error: "forbidden" });
    if (!store.has(req.params.id))
        return res.status(404).json({ ok: false, error: "not found" });
    store.delete(req.params.id);
    res.json({ ok: true });
});

// ====== RAW ENDPOINT ======
app.get("/raw/:id", (req, res) => {
    const entry = store.get(req.params.id);
    if (!entry) return res.status(404).send("Not found");

    const ua = req.headers["user-agent"] || "";

    // block curl, wget, python, postman
    const blockedUA = ["curl", "wget", "python", "postman", "insomnia", "httpie"];
    for (const b of blockedUA) {
        if (ua.toLowerCase().includes(b)) {
            return res.status(403).send("Forbidden");
        }
    }

    // browser → หน้า fake
    const isBrowser = ua.includes("Mozilla");
    if (isBrowser) {
        return res.send(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Makuro Service</title>
<style>
  body {
    background: #0d0d0d;
    color: #00ff88;
    font-family: 'Courier New', monospace;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    margin: 0;
    flex-direction: column;
    gap: 12px;
    text-align: center;
    padding: 20px;
  }
  h1 { font-size: 1.3rem; letter-spacing: 2px; }
  p { color: #444; font-size: 0.8rem; letter-spacing: 1px; }
</style>
</head>
<body>
<h1>🔒 CYBER SECURITY</h1>
<h1>BY MAKURO SERVICE</h1>
<p>THIS RESOURCE IS PROTECTED AND ENCRYPTED</p>
<p>UNAUTHORIZED ACCESS IS PROHIBITED</p>
</body>
</html>`);
    }

    // HttpGet/request → ส่งโค้ดจริง
    res.setHeader("Content-Type", "text/plain");
    res.send(entry.content);
});

app.get("/ping", (req, res) => res.send("pong"));
app.listen(PORT, () => console.log(`✅ Makuro Service running on port ${PORT}`));
