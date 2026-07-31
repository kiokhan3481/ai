const { checkAdminToken } = require("../lib/adminAuth");

function unauthorizedPage() {
  return `<!doctype html>
<html lang="fa" dir="rtl"><head><meta charset="utf-8">
<title>دسترسی غیرمجاز</title>
<style>
  body{background:#0F1115;color:#E8EAED;font-family:system-ui,sans-serif;
    display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
  .box{text-align:center;padding:2rem;border:1px solid #262B35;border-radius:12px;background:#171A21}
  .box strong{color:#F2B705}
</style></head>
<body><div class="box">
  <p style="font-size:2rem;margin:0 0 .5rem">🔒</p>
  <p><strong>دسترسی غیرمجاز.</strong></p>
  <p style="color:#8B93A3;font-size:.9rem">توکن ادمین درست نیست یا تنظیم نشده (ADMIN_PANEL_TOKEN).</p>
</div></body></html>`;
}

function panelPage(token) {
  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>پنل مدیریت ربات</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root{
    --bg:#0F1115; --surface:#171A21; --surface-alt:#1B1F27; --border:#262B35;
    --text:#E8EAED; --muted:#8B93A3; --accent:#F2B705; --accent-dim:rgba(242,183,5,.14);
    --danger:#E5484D; --ok:#3ECF8E;
  }
  *{box-sizing:border-box}
  body{background:var(--bg);color:var(--text);margin:0;font-family:'Vazirmatn',system-ui,sans-serif;
    -webkit-font-smoothing:antialiased}
  .mono{font-family:'JetBrains Mono',monospace}
  .wrap{max-width:920px;margin:0 auto;padding:28px 20px 80px}

  .topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:28px}
  .brand{display:flex;align-items:center;gap:10px}
  .dot{width:9px;height:9px;border-radius:50%;background:var(--accent);
    box-shadow:0 0 0 0 rgba(242,183,5,.6);animation:pulse 2s infinite}
  @keyframes pulse{
    0%{box-shadow:0 0 0 0 rgba(242,183,5,.5)}
    70%{box-shadow:0 0 0 8px rgba(242,183,5,0)}
    100%{box-shadow:0 0 0 0 rgba(242,183,5,0)}
  }
  .brand h1{font-size:1.05rem;font-weight:700;margin:0;letter-spacing:.2px}
  .brand span{color:var(--muted);font-size:.75rem}
  .live{font-family:'JetBrains Mono',monospace;font-size:.7rem;color:var(--accent);
    border:1px solid var(--border);padding:4px 10px;border-radius:100px;letter-spacing:1px}

  .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px}
  .stat{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px}
  .stat b{display:block;font-size:1.6rem;font-family:'JetBrains Mono',monospace}
  .stat span{color:var(--muted);font-size:.75rem}

  .card{background:var(--surface);border:1px solid var(--border);border-radius:14px;
    padding:20px;margin-bottom:20px}
  .card h2{font-size:.95rem;margin:0 0 14px;display:flex;align-items:center;gap:8px}
  .card h2 .idx{color:var(--accent);font-family:'JetBrains Mono',monospace;font-size:.8rem}

  textarea{width:100%;min-height:90px;background:var(--surface-alt);border:1px solid var(--border);
    border-radius:10px;color:var(--text);padding:12px;font-family:inherit;font-size:.9rem;resize:vertical}
  textarea:focus, input:focus{outline:2px solid var(--accent);outline-offset:1px}

  .row{display:flex;gap:10px;align-items:center;margin-top:12px;flex-wrap:wrap}
  button{background:var(--accent);color:#141414;border:none;border-radius:8px;
    padding:10px 16px;font-weight:600;font-size:.85rem;cursor:pointer;font-family:inherit}
  button.secondary{background:transparent;color:var(--text);border:1px solid var(--border)}
  button:disabled{opacity:.5;cursor:not-allowed}
  .status-msg{font-size:.8rem;color:var(--muted);font-family:'JetBrains Mono',monospace}

  .log{border-top:1px solid var(--border)}
  .log-row{display:flex;align-items:center;gap:12px;padding:12px 4px;border-bottom:1px solid var(--border)}
  .log-row .idx{font-family:'JetBrains Mono',monospace;color:var(--muted);font-size:.75rem;width:34px}
  .log-row .info{flex:1;min-width:0}
  .log-row .name{font-weight:600;font-size:.9rem}
  .log-row .meta{color:var(--muted);font-size:.75rem;font-family:'JetBrains Mono',monospace;margin-top:2px}
  .badge{font-size:.65rem;background:var(--accent-dim);color:var(--accent);padding:2px 8px;
    border-radius:100px;margin-inline-start:6px}
  .msg-btn{background:transparent;border:1px solid var(--border);color:var(--text);font-size:.75rem;padding:6px 10px}
  .inline-form{display:none;gap:8px;margin-top:8px;width:100%}
  .inline-form.open{display:flex}
  .inline-form input{flex:1;background:var(--surface-alt);border:1px solid var(--border);
    border-radius:8px;color:var(--text);padding:8px 10px;font-size:.85rem}
  .empty{padding:30px 0;text-align:center;color:var(--muted);font-size:.85rem}
</style>
</head>
<body>
<div class="wrap">
  <div class="topbar">
    <div class="brand">
      <span class="dot"></span>
      <div>
        <h1>پنل مدیریت ربات</h1>
        <span>اعضا و پیام‌رسانی</span>
      </div>
    </div>
    <div class="live mono">LIVE</div>
  </div>

  <div class="stats">
    <div class="stat"><b id="statUsers" class="mono">—</b><span>تعداد اعضا</span></div>
    <div class="stat"><b id="statKV" class="mono">—</b><span>وضعیت دیتابیس</span></div>
    <div class="stat"><b id="statTime" class="mono">—</b><span>آخرین بروزرسانی</span></div>
  </div>

  <div class="card">
    <h2><span class="idx">#01</span> ارسال پیام به همه اعضا</h2>
    <textarea id="broadcastText" placeholder="پیامت رو اینجا بنویس..."></textarea>
    <div class="row">
      <button id="broadcastBtn">ارسال به همه</button>
      <span class="status-msg" id="broadcastStatus"></span>
    </div>
  </div>

  <div class="card">
    <h2><span class="idx">#02</span> اعضا (بر اساس آخرین فعالیت)</h2>
    <div id="userLog" class="log"><div class="empty">در حال بارگذاری...</div></div>
  </div>
</div>

<script>
const TOKEN = ${JSON.stringify(token)};

function fmtTime(iso){
  if(!iso) return '-';
  try{
    const d = new Date(iso);
    return d.toLocaleString('fa-IR', { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit' });
  }catch{ return iso; }
}

async function loadUsers(){
  const res = await fetch('/api/admin/users?token=' + encodeURIComponent(TOKEN));
  const data = await res.json();
  document.getElementById('statUsers').textContent = data.users.length;
  document.getElementById('statKV').textContent = data.kvConfigured ? 'متصل' : 'غیرفعال';
  document.getElementById('statTime').textContent = new Date().toLocaleTimeString('fa-IR');

  const container = document.getElementById('userLog');
  if(!data.users.length){
    container.innerHTML = '<div class="empty">هنوز کسی به بات پیام نداده — یا دیتابیس KV وصل نشده.</div>';
    return;
  }

  container.innerHTML = data.users.map((u, i) => {
    const idx = String(i+1).padStart(2,'0');
    const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || 'بدون نام';
    const uname = u.username ? '@' + u.username : '—';
    return \`
      <div class="log-row">
        <div class="idx">#\${idx}</div>
        <div class="info">
          <div class="name">\${name} \${u.isAdmin ? '<span class="badge">ادمین</span>' : ''}</div>
          <div class="meta">\${uname} · شناسه: \${u.chatId} · آخرین فعالیت: \${fmtTime(u.lastSeen)}</div>
          <div class="inline-form" id="form-\${u.chatId}">
            <input type="text" id="input-\${u.chatId}" placeholder="متن پیام...">
            <button onclick="sendOne('\${u.chatId}')">ارسال</button>
          </div>
        </div>
        <button class="msg-btn" onclick="toggleForm('\${u.chatId}')">ارسال پیام</button>
      </div>\`;
  }).join('');
}

function toggleForm(chatId){
  document.getElementById('form-' + chatId).classList.toggle('open');
}

async function sendOne(chatId){
  const input = document.getElementById('input-' + chatId);
  const text = input.value.trim();
  if(!text) return;
  input.disabled = true;
  await fetch('/api/admin/broadcast', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ token: TOKEN, chatId, text })
  });
  input.value = '';
  input.disabled = false;
  input.placeholder = 'ارسال شد ✓';
}

document.getElementById('broadcastBtn').addEventListener('click', async () => {
  const textEl = document.getElementById('broadcastText');
  const statusEl = document.getElementById('broadcastStatus');
  const text = textEl.value.trim();
  if(!text) return;
  const btn = document.getElementById('broadcastBtn');
  btn.disabled = true;
  statusEl.textContent = 'در حال ارسال...';
  try{
    const res = await fetch('/api/admin/broadcast', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ token: TOKEN, text })
    });
    const data = await res.json();
    statusEl.textContent = \`ارسال شد: \${data.sent} موفق، \${data.failed} ناموفق (از \${data.total})\`;
    textEl.value = '';
  }catch(e){
    statusEl.textContent = 'خطا در ارسال';
  }
  btn.disabled = false;
});

loadUsers();
setInterval(loadUsers, 20000);
</script>
</body>
</html>`;
}

module.exports = (req, res) => {
  if (!checkAdminToken(req)) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(401).send(unauthorizedPage());
  }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(200).send(panelPage(req.query.token));
};
