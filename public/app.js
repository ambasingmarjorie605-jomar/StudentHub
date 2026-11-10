const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const initials = (n) => esc(n).split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const api = async (url, opt = {}) => {
  const r = await fetch(url, { headers: { "Content-Type": "application/json" }, ...opt });
  if (r.status === 401) return (location.href = "/login.html");
  const d = await r.json(); if (!r.ok) throw new Error(d.error); return d;
};
const toast = (msg, bad) => { const t = $("toast"); t.textContent = msg; t.className = "toast show" + (bad ? " bad" : ""); setTimeout(() => (t.className = "toast"), 2200); };
const fields = ["student_id", "name", "course", "year", "contact"];
let editId = null, me = null;

function show(view) {
  document.querySelectorAll(".nav").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === "v-" + view));
  if (view === "students") { loadStudents(); $("search").focus(); }
  if (view === "dashboard") loadStats();
}
document.querySelectorAll(".nav").forEach((b) => (b.onclick = () => show(b.dataset.view)));
$("seeAll").onclick = (e) => { e.preventDefault(); show("students"); };

//dashboard
const who = (s) => s.created_by === me.id ? 'You' : esc(s.added_by || "Admin / legacy");
const bars = (list, key, total) => list.map((x) => `<div class="bar"><div class="t"><span>${esc(x[key])}</span><b>${x.count}</b></div><div class="f"><i style="width:${(x.count / total) * 100}%"></i></div></div>`).join("") || '<p class="muted">No data yet</p>';
async function loadStats() {
  const s = await api("/api/stats");
  $("total").textContent = s.total; $("courses").textContent = s.courses;
  const admin = me.role === "Admin";
  $("l3").textContent = admin ? "Client accounts" : "Added by you"; $("third").textContent = admin ? s.clients : s.mine;
  $("byCourse").innerHTML = bars(s.byCourse, "course", s.total);
  $("byYear").innerHTML = bars(s.byYear, "year", s.total);
  $("recent").innerHTML = s.recent.map((x) => `<tr><td><div class="row"><div class="av">${initials(x.name)}</div><b>${esc(x.name)}</b></div></td><td>${esc(x.student_id)}</td><td><span class="tag c-${esc(x.course)}">${esc(x.course)}</span></td><td>${esc(x.year)}</td><td class=\"muted\">${who(x)}</td></tr>`).join("") || '<tr><td class="empty">No students yet</td></tr>';
}

//*student view with search
const hl = (text, q) => { const t = esc(text); if (!q) return t; const i = t.toLowerCase().indexOf(esc(q).toLowerCase()); return i < 0 ? t : t.slice(0, i) + "<mark>" + t.slice(i, i + esc(q).length) + "</mark>" + t.slice(i + esc(q).length); };
let timer;
async function loadStudents() {
  const q = $("search").value.trim();
  const params = new URLSearchParams({ q, course: $("fCourse").value, year: $("fYear").value, sort: $("sort").value });
  const list = await api("/api/students?" + params);
  $("count").textContent = `${list.length} student${list.length === 1 ? "" : "s"} found`;
  $("empty").style.display = list.length ? "none" : "block";
  $("rows").innerHTML = list.map((s) => `<tr class="${s.created_by === me.id ? "mine" : ""}">
    <td><div class="row"><div class="av">${initials(s.name)}</div><b>${hl(s.name, q)}</b>${s.created_by === me.id ? '<span class="you">Yours</span>' : ""}</div></td>
    <td>${hl(s.student_id, q)}</td><td><span class="tag c-${esc(s.course)}">${esc(s.course)}</span></td><td>${esc(s.year)}</td><td>${hl(s.contact, q) || "—"}</td><td class="muted">${who(s)}</td>
    <td>${s.can_modify ? `<div class="row"><button class="sm ghost" onclick="openEdit(${s.id})"><svg class="i"><use href="#edit"/></svg> Edit</button><button class="sm danger" onclick="del(${s.id},'${esc(s.name).replace(/'/g, "")}')"><svg class="i"><use href="#trash"/></svg> Delete</button></div>` : `<span class="lock" title="Added by ${who(s)}"><svg class="i"><use href="#lock"/></svg> View only</span>`}</td></tr>`).join("");
}
$("search").oninput = () => { clearTimeout(timer); timer = setTimeout(loadStudents, 250); };
["fCourse", "fYear", "sort"].forEach((id) => ($(id).onchange = loadStudents));
$("clear").onclick = () => { $("search").value = ""; $("fCourse").value = ""; $("fYear").value = ""; $("sort").value = "newest"; loadStudents(); };

//*create / update / delete
function openModal(title, data = {}) { $("mTitle").textContent = title; $("serr").textContent = ""; fields.forEach((f) => ($(f).value = data[f] || "")); $("modal").classList.add("open"); $("student_id").focus(); }
document.querySelectorAll(".addBtn").forEach((b) => (b.onclick = () => { editId = null; openModal("Add student"); }));
$("cancel").onclick = () => $("modal").classList.remove("open");
$("modal").onclick = (e) => { if (e.target.id === "modal") $("modal").classList.remove("open"); };
window.openEdit = async (id) => { try { const d = await api("/api/students/" + id); editId = id; openModal("Edit student", d); } catch (e) { toast(e.message, true); } };
window.del = async (id, name) => {
  if (!confirm(`Delete ${name}?`)) return;
  try { await api("/api/students/" + id, { method: "DELETE" }); toast("Student deleted"); } catch (e) { toast(e.message, true); } loadStudents(); loadStats();
};
$("sf").onsubmit = async (e) => {
  e.preventDefault();
  const body = Object.fromEntries(fields.map((f) => [f, $(f).value.trim()]));
  try {
    await api(editId ? "/api/students/" + editId : "/api/students", { method: editId ? "PUT" : "POST", body: JSON.stringify(body) });
    $("modal").classList.remove("open"); toast(editId ? "Student updated" : "Student added");
    loadStats(); loadStudents();
  } catch (err) { $("serr").textContent = err.message; }
};

//profile
function renderMe() {
  const admin = me.role === "Admin";
  $("meName").textContent = me.full_name; $("meRole").textContent = me.role; $("meRole").className = "tag role " + me.role; $("meAv").textContent = initials(me.full_name);
  $("hello").textContent = `Welcome, ${me.full_name.split(" ")[0]} 👋`;
  $("pAv").textContent = initials(me.full_name); $("pEmail").textContent = me.email; $("pRole").textContent = me.role; $("pRole").className = "tag role " + me.role; $("pName").value = me.full_name;
}
$("pf").onsubmit = async (e) => { e.preventDefault(); try { me = await api("/api/me", { method: "PUT", body: JSON.stringify({ full_name: $("pName").value.trim() }) }); renderMe(); toast("Profile saved"); } catch (err) { toast(err.message, true); } };
$("logout").onclick = async () => { await api("/api/logout", { method: "POST" }); location.href = "/login.html"; };

api("/api/me").then((u) => { if (u) { me = u; renderMe(); loadStats(); } });
