/* 星卡校园 · 学生端（静态站点，数据来自 data/state.json）
   进入网站必须先输入教师端生成的端口代码：前端用 WebCrypto 算 SHA-256(代码|盐) 与快照里的 code_hash 比对。
   前端不含任何 token / AI Key / 数据库凭据。 */
(function () {
  "use strict";

  var ICON = {
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.2-4.1 5.8-.8z" stroke-linejoin="round"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 6h12M8 12h12M8 18h12" stroke-linecap="round"/><circle cx="4.2" cy="6" r="1.4"/><circle cx="4.2" cy="12" r="1.4"/><circle cx="4.2" cy="18" r="1.4"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19.5V4.5M4 19.5h16" stroke-linecap="round"/><path d="M8 15.5l4-4 3 2.6 4.5-6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    paw: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><ellipse cx="12" cy="16" rx="4.6" ry="3.8"/><ellipse cx="6.2" cy="10.2" rx="2" ry="2.5"/><ellipse cx="10" cy="7.2" rx="1.9" ry="2.5"/><ellipse cx="14" cy="7.2" rx="1.9" ry="2.5"/><ellipse cx="17.8" cy="10.2" rx="2" ry="2.5"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="10.5" width="14" height="9.5" rx="2.4"/><path d="M8.2 10.5V8a3.8 3.8 0 1 1 7.6 0v2.5" stroke-linecap="round"/><circle cx="12" cy="15.2" r="1.3"/></svg>',
    key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="8" cy="8" r="3.6"/><path d="M10.6 10.6L19 19M15.4 15.4l2.2-2.2M17.8 17.8l2-2" stroke-linecap="round"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8.2" r="3.6"/><path d="M4.8 20c.9-3.8 3.6-5.6 7.2-5.6s6.3 1.8 7.2 5.6" stroke-linecap="round"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3.6" y="5" width="16.8" height="15.4" rx="2.4"/><path d="M3.6 9.8h16.8M8.2 3.4v3M15.8 3.4v3" stroke-linecap="round"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.5 12.6l4.6 4.6L19.5 6.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8.2"/><path d="M12 7.4V12l3.2 2" stroke-linecap="round"/></svg>',
    swap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 8.4h13.4M14.2 4.6l3.8 3.8-3.8 3.8M20 15.6H6.6M9.8 11.8L6 15.6l3.8 3.8" stroke-linecap="round"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14.4 5.6L8 12l6.4 6.4" stroke-linecap="round"/></svg>'
  };

  var DATA = null;
  var ME = null;
  var EX = null; // echarts 实例登记
  var KEY_OK = "xk_site_pass";
  var KEY_ME = "xk_site_me";

  /* ---------------- 工具 ---------------- */
  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function sha256Hex(text) {
    if (!(window.crypto && crypto.subtle && crypto.subtle.digest)) {
      return Promise.reject(new Error("当前浏览器不支持安全校验，请用手机自带浏览器或 Chrome 打开"));
    }
    var buf = new TextEncoder().encode(text);
    return crypto.subtle.digest("SHA-256", buf).then(function (h) {
      var arr = Array.from(new Uint8Array(h));
      return arr.map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
    });
  }

  /** 把用户输入整理成 XK-XXXX-XXXX */
  function normCode(input) {
    var s = String(input || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (s.length === 10 && s.slice(0, 2) === "XK") return "XK-" + s.slice(2, 6) + "-" + s.slice(6, 10);
    if (s.length === 8) return "XK-" + s.slice(0, 4) + "-" + s.slice(4, 8);
    return String(input || "").trim().toUpperCase();
  }

  function loadState() {
    var url = "data/state.json?t=" + Date.now();
    return fetch(url, { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("数据文件读取失败（HTTP " + r.status + "）");
        return r.json();
      })
      .then(function (j) {
        DATA = j;
        return j;
      });
  }

  /* ---------------- 计算 ---------------- */
  function byName(n) {
    if (!DATA) return null;
    for (var i = 0; i < DATA.students.length; i++) if (DATA.students[i].name === n) return DATA.students[i];
    return null;
  }

  function rankOf(stu) {
    if (!DATA) return 0;
    var arr = DATA.students.slice().sort(function (a, b) { return b.earned - a.earned; });
    for (var i = 0; i < arr.length; i++) if (arr[i].no === stu.no) return i + 1;
    return arr.length;
  }

  function myScore(exam) {
    if (!ME) return null;
    for (var i = 0; i < exam.scores.length; i++) if (exam.scores[i].no === ME.no) return exam.scores[i];
    return null;
  }

  function sortedExams() {
    return (DATA.exams || []).slice().sort(function (a, b) {
      return String(a.date).localeCompare(String(b.date)) || a.id - b.id;
    });
  }

  function fmtDate(d) {
    if (!d) return "";
    return String(d).replace(/-/g, "/");
  }

  /* ---------------- 视图：端口代码门 ---------------- */
  function viewGate(msg) {
    ME = null;
    sessionStorage.removeItem(KEY_ME);
    var html =
      '<div class="gate">' +
      '<div class="logo">' + ICON.star + "</div>" +
      "<h1>星卡校园</h1>" +
      '<p class="desc">' +
      (DATA && DATA.school ? esc(DATA.school.class_name || "") : "") +
      "<br/>请输入老师给的端口代码，才能查看本班成绩与积分</p>" +
      '<label>端口代码</label>' +
      '<input id="code" class="code-input" inputmode="text" autocomplete="off" autocapitalize="characters" ' +
      'placeholder="XK-XXXX-XXXX" maxlength="14" />' +
      '<div id="err" class="err">' + (msg ? esc(msg) : "") + "</div>" +
      '<button id="go" class="go">进入班级</button>' +
      '<div class="tip">端口代码在老师的「设置 → 学生端网站」里，形如 XK-7F3K-2M9Q。' +
      "输错三次也别急，找老师要一次就行。</div>" +
      '<div class="foot">' +
      (DATA ? "数据更新于 " + esc(DATA.built_at || "") : "正在读取数据…") +
      "<br/>星卡校园 · 学生端</div>" +
      "</div>";
    $("app").innerHTML = html;

    var inp = $("code");
    inp.value = sessionStorage.getItem("xk_site_code") || "";
    inp.focus();

    function submit() {
      var code = normCode(inp.value);
      if (!code) {
        $("err").textContent = "先输入端口代码";
        return;
      }
      if (!DATA) {
        $("err").textContent = "数据还没读到，刷新一次再试";
        return;
      }
      $("go").disabled = true;
      $("err").textContent = "正在校验…";
      sha256Hex(code + "|" + DATA.salt)
        .then(function (h) {
          if (h === DATA.code_hash) {
            sessionStorage.setItem(KEY_OK, "1");
            sessionStorage.setItem("xk_site_code", code);
            viewPick();
          } else {
            $("go").disabled = false;
            $("err").textContent = "端口代码不对，再核对一下（注意字母和数字）";
          }
        })
        .catch(function (e) {
          $("go").disabled = false;
          $("err").textContent = e.message || "校验失败";
        });
    }

    $("go").onclick = submit;
    inp.onkeydown = function (e) {
      if (e.key === "Enter") submit();
    };
    inp.oninput = function () {
      var raw = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
      if (raw.length > 2) {
        inp.value = "XK-" + raw.slice(2, 6) + (raw.length > 6 ? "-" + raw.slice(6, 10) : "");
      } else {
        inp.value = raw;
      }
    };
  }

  /* ---------------- 视图：选自己 ---------------- */
  function viewPick() {
    var cls = DATA.school || {};
    var html =
      '<div class="top"><div class="brand">' + ICON.star + "星卡校园</div>" +
      '<div class="cls">' + esc(cls.class_name || "") + (cls.grade ? " · " + esc(cls.grade) : "") + "</div></div>" +
      '<div class="wrap">' +
      '<div class="card">' +
      '<div class="h"><div class="t">' + ICON.user + "我是谁</div><div class=\"extra\">输入名字或找自己的座号</div></div>" +
      '<input id="nm" class="code-input" style="height:44px;font-size:15px;letter-spacing:0;text-align:left;font-family:inherit" placeholder="输入你的名字" autocomplete="off" />' +
      '<div id="list" class="pick-list"></div>' +
      "</div>" +
      '<div class="note">只显示本班数据；名单里没有你的话，让老师在软件里加上。</div>' +
      "</div>";
    $("app").innerHTML = html;

    var nm = $("nm");
    nm.focus();
    function render(filter) {
      var list = DATA.students.filter(function (s) {
        return !filter || s.name.indexOf(filter) >= 0;
      });
      $("list").innerHTML = list.length
        ? list
            .map(function (s) {
              return (
                '<div class="pick-item" data-no="' + esc(s.no) + '">' +
                '<span class="seat">' + s.seat + " 号</span>" +
                '<span class="nm">' + esc(s.name) + "</span>" +
                '<span class="pt">' + s.points + " 分</span></div>"
              );
            })
            .join("")
        : '<div class="empty">没有找到这个名字</div>';
      Array.prototype.forEach.call(document.querySelectorAll(".pick-item"), function (el) {
        el.onclick = function () {
          var no = el.getAttribute("data-no");
          var stu = null;
          for (var i = 0; i < DATA.students.length; i++) if (DATA.students[i].no === no) stu = DATA.students[i];
          if (!stu) return;
          ME = stu;
          sessionStorage.setItem(KEY_ME, no);
          viewHome();
        };
      });
    }
    render("");
    nm.oninput = function () { render(nm.value.trim()); };
    nm.onkeydown = function (e) {
      if (e.key !== "Enter") return;
      var hit = DATA.students.filter(function (s) { return s.name === nm.value.trim(); })[0];
      if (hit) {
        ME = hit;
        sessionStorage.setItem(KEY_ME, hit.no);
        viewHome();
      }
    };
  }

  /* ---------------- 视图：我的主页 ---------------- */
  function viewHome() {
    var cls = DATA.school || {};
    var rk = rankOf(ME);
    var exams = sortedExams();
    var myLogs = (DATA.logs || []).filter(function (l) { return l.name === ME.name; }).slice(0, 8);
    var lastExam = exams.length ? exams[exams.length - 1] : null;

    var petHtml = "";
    if (ME.pet) {
      petHtml =
        '<div class="card card-tight"><div class="h"><div class="t">' + ICON.paw + '我的宠物</div><div class="extra">Lv ' +
        ME.pet.level + "</div></div>" +
        '<div class="pet-line"><div class="pic"><img alt="" src="pets/' + esc(ME.pet.species) + '.png" /></div>' +
        '<div class="info"><div class="n">' + esc(ME.pet.name) + "</div>" +
        '<div class="s">' + (ME.pet.hatched ? "已经出生啦" : "还在蛋里") + "</div></div>" +
        '<div class="val" style="color:#20a87b">Lv ' + ME.pet.level + "</div></div></div>";
    }

    var examCards = exams
      .slice()
      .reverse()
      .map(function (e) {
        var s = myScore(e);
        var st = e.stats || {};
        var pct = s && s.score != null ? Math.min(100, Math.round((s.score / e.full) * 100)) : 0;
        return (
          '<div class="exam">' +
          '<div class="title"><div class="n">' + esc(e.name) + "</div>" +
          '<div class="d">' + (e.subject ? esc(e.subject) + " · " : "") + fmtDate(e.date) + "</div></div>" +
          '<div class="scoreline"><div class="big">' + (s && s.score != null ? s.score : "—") + "</div>" +
          '<div class="full">/ ' + e.full + " 分</div>" +
          '<div class="rank">' +
          (s && s.rank ? "班级第 <b>" + s.rank + "</b> 名<br/>" : s && s.score == null ? "缺考<br/>" : "") +
          "班均 " + st.avg + " · 及格率 " + st.passRate + "%</div></div>" +
          '<div class="bars">' +
          '<div class="bar-row"><span class="lab">我</span><span class="track"><span class="fill on" style="width:' + pct + '%"></span></span><span class="num">' + pct + "%</span></div>" +
          '<div class="bar-row"><span class="lab">班均</span><span class="track"><span class="fill" style="width:' + Math.round(((st.avg || 0) / e.full) * 100) + '%"></span></span><span class="num">' + Math.round(((st.avg || 0) / e.full) * 100) + "%</span></div>" +
          "</div></div>"
        );
      })
      .join("");

    var rankRows = DATA.students
      .slice()
      .sort(function (a, b) { return b.earned - a.earned; })
      .slice(0, 10)
      .map(function (s, i) {
        return (
          '<div class="rank-item ' + (s.no === ME.no ? "me" : "") + '">' +
          '<span class="no">' + (i + 1) + "</span>" +
          '<span class="nm">' + esc(s.name) + (s.no === ME.no ? "（我）" : "") + "</span>" +
          '<span class="sc">' + s.earned + "</span></div>"
        );
      })
      .join("");

    var logRows = myLogs.length
      ? myLogs
          .map(function (l) {
            return (
              '<div class="line"><div class="grow"><div>' + esc(l.reason || "加分") + "</div>" +
              '<div class="sub">' + esc(l.at) + "</div></div>" +
              '<div class="val" style="color:' + (l.delta > 0 ? "#20a87b" : "#ff6b6b") + '">' + (l.delta > 0 ? "+" : "") + l.delta + "</div></div>"
            );
          })
          .join("")
      : '<div class="empty">最近还没有加分记录</div>';

    var selOpts = exams
      .map(function (e) { return '<option value="' + e.id + '">' + esc(e.name) + "</option>"; })
      .join("");

    var html =
      '<div class="top">' +
      '<div class="row brand">' + ICON.star + "星卡校园</div>" +
      '<div class="cls">' + esc(cls.class_name || "") + (cls.grade ? " · " + esc(cls.grade) : "") +
      (cls.head_teacher ? " · 班主任 " + esc(cls.head_teacher) : "") + "</div>" +
      '<div class="who"><div><div class="name">' + esc(ME.name) + "</div>" +
      '<div class="meta">' + ME.seat + " 号 · 学号 " + esc(ME.no) + "</div></div>" +
      '<div class="badge">' + ICON.star + "班级第 " + rk + " 名</div></div></div>" +
      '<div class="wrap">' +
      '<div class="card"><div class="trio">' +
      '<div class="box"><div class="k">我的积分</div><div class="v brand">' + ME.points + "</div></div>" +
      '<div class="box"><div class="k">累计获得</div><div class="v mint">' + ME.earned + "</div></div>" +
      '<div class="box"><div class="k">考试次数</div><div class="v">' + exams.length + "</div></div>" +
      "</div></div>" +
      petHtml +
      '<div class="card"><div class="h"><div class="t">' + ICON.chart + "成绩走势</div><div class=\"extra\">我 vs 班均</div></div>" +
      '<div id="trend" class="chart"></div></div>' +
      '<div class="card"><div class="h"><div class="t">' + ICON.list + "我的考试成绩</div><div class=\"extra\">共 " + exams.length + " 场</div></div>" +
      (examCards || '<div class="empty">老师还没发布考试成绩</div>') +
      "</div>" +
      (lastExam
        ? '<div class="card"><div class="h"><div class="t">' + ICON.chart + "最近一场分数段</div><div class=\"extra\">" + esc(lastExam.name) + "</div></div>" +
          '<div id="dist" class="chart" style="height:190px"></div></div>'
        : "") +
      '<div class="card"><div class="h"><div class="t">' + ICON.swap + "两次考试对比</div></div>" +
      '<div style="display:flex;gap:8px;align-items:center">' +
      '<select id="cmpA" class="select" style="flex:1">' + selOpts + "</select>" +
      '<span style="color:#6b7280;font-size:11px">对比</span>' +
      '<select id="cmpB" class="select" style="flex:1">' + selOpts + "</select></div>" +
      '<div id="cmpBody"></div></div>' +
      '<div class="card"><div class="h"><div class="t">' + ICON.clock + "我的加分记录</div><div class=\"extra\">最近 " + myLogs.length + " 条</div></div>" + logRows + "</div>" +
      '<div class="card"><div class="h"><div class="t">' + ICON.star + "班级积分榜</div><div class=\"extra\">按累计获得</div></div>" + rankRows + "</div>" +
      '<div class="footer">数据更新于 ' + esc(DATA.built_at || "") + "<br/>本页只读取发布时的快照，不联网写入</div>" +
      "</div>";

    $("app").innerHTML = html;

    // 走势图
    var names = exams.map(function (e) { return e.name; });
    var mine = exams.map(function (e) {
      var s = myScore(e);
      return s && s.score != null ? s.score : null;
    });
    var avg = exams.map(function (e) { return (e.stats || {}).avg || 0; });
    if (exams.length >= 1) {
      var t = echarts.init($("trend"));
      t.setOption({
        grid: { left: 30, right: 12, top: 22, bottom: 22 },
        legend: { top: 0, right: 0, itemWidth: 9, itemHeight: 9, textStyle: { fontSize: 10.5, color: "#6b7280" } },
        tooltip: { trigger: "axis" },
        xAxis: {
          type: "category", data: names,
          axisLine: { lineStyle: { color: "#e5e7eb" } },
          axisTick: { show: false },
          axisLabel: { color: "#6b7280", fontSize: 9.5, interval: 0, width: 52, overflow: "truncate" }
        },
        yAxis: {
          type: "value", axisLine: { show: false }, splitLine: { lineStyle: { color: "#f1f2f5" } },
          axisLabel: { color: "#6b7280", fontSize: 10 }
        },
        series: [
          { name: "我", type: "line", smooth: true, connectNulls: true, symbolSize: 6,
            lineStyle: { width: 2.4, color: "#4f7cff" }, itemStyle: { color: "#4f7cff" }, data: mine },
          { name: "班均", type: "line", smooth: true, symbolSize: 0,
            lineStyle: { width: 1.6, color: "#c7d5ff", type: "dashed" }, data: avg }
        ]
      });
      EX.trend = t;
    }

    // 最近一场分数段
    if (lastExam && $("dist")) {
      var myS = myScore(lastExam);
      var d = echarts.init($("dist"));
      d.setOption({
        grid: { left: 8, right: 10, top: 14, bottom: 22 },
        xAxis: {
          type: "category", data: lastExam.dist.map(function (x) { return x.label; }),
          axisLine: { lineStyle: { color: "#e5e7eb" } }, axisTick: { show: false },
          axisLabel: { color: "#6b7280", fontSize: 9, interval: 0 }
        },
        yAxis: { type: "value", minInterval: 1, axisLine: { show: false },
          splitLine: { lineStyle: { color: "#f1f2f5" } }, axisLabel: { color: "#6b7280", fontSize: 10 } },
        tooltip: { trigger: "axis" },
        series: [{
          type: "bar", barWidth: 16, itemStyle: { borderRadius: [5, 5, 0, 0] },
          label: { show: true, position: "top", fontSize: 10, color: "#6b7280" },
          data: lastExam.dist.map(function (x) {
            var mineHere = false;
            if (myS && myS.score != null) {
              var ratio = Math.min(0.9999, myS.score / lastExam.full);
              var seg = Math.floor(ratio * 10);
              var idx = lastExam.dist.indexOf(x);
              mineHere = idx === seg;
            }
            return {
              value: x.value,
              itemStyle: { color: mineHere ? "#3ecfa0" : "#4f7cff" }
            };
          })
        }]
      });
      EX.dist = d;
    }

    // 对比
    var A = $("cmpA"), B = $("cmpB");
    if (exams.length) {
      A.value = exams[Math.max(0, exams.length - 2)].id;
      B.value = exams[exams.length - 1].id;
      A.onchange = renderCmp;
      B.onchange = renderCmp;
      renderCmp();
    }

    window.addEventListener("resize", function () {
      Object.keys(EX).forEach(function (k) { EX[k] && EX[k].resize && EX[k].resize(); });
    });
  }

  function renderCmp() {
    var aId = Number($("cmpA").value);
    var bId = Number($("cmpB").value);
    var box = $("cmpBody");
    if (!box) return;
    if (aId === bId) {
      box.innerHTML = '<div class="empty">选两场不同的考试</div>';
      return;
    }
    var A = null, B = null;
    DATA.exams.forEach(function (e) { if (e.id === aId) A = e; if (e.id === bId) B = e; });
    if (!A || !B) return;
    var sa = myScore(A), sb = myScore(B);
    var va = sa && sa.score != null ? sa.score : null;
    var vb = sb && sb.score != null ? sb.score : null;
    var diff = va != null && vb != null ? Math.round((vb - va) * 10) / 10 : null;
    var color = diff == null ? "#6b7280" : diff > 0 ? "#20a87b" : diff < 0 ? "#ff6b6b" : "#6b7280";

    box.innerHTML =
      '<div class="cmp-duo" style="margin-top:10px">' +
      '<div class="cmp-box"><div class="t">' + esc(A.name) + '</div><div class="v">' + (va == null ? "—" : va) + "</div>" +
      '<div class="s">班均 ' + A.stats.avg + (sa && sa.rank ? " · 第 " + sa.rank + " 名" : "") + "</div></div>" +
      '<div class="cmp-box"><div class="t">' + esc(B.name) + '</div><div class="v">' + (vb == null ? "—" : vb) + "</div>" +
      '<div class="s">班均 ' + B.stats.avg + (sb && sb.rank ? " · 第 " + sb.rank + " 名" : "") + "</div></div></div>" +
      '<div class="delta"><span class="k">我的变化</span><span class="v" style="color:' + color + '">' +
      (diff == null ? "有一场缺考" : (diff > 0 ? "+" : "") + diff + " 分") + "</span></div>" +
      '<div class="chart" id="cmpChart" style="height:190px;margin-top:8px"></div>';

    var c = echarts.init($("cmpChart"));
    c.setOption({
      grid: { left: 8, right: 10, top: 26, bottom: 22 },
      legend: { top: 0, right: 0, itemWidth: 9, itemHeight: 9, textStyle: { fontSize: 10.5, color: "#6b7280" } },
      xAxis: {
        type: "category", data: A.dist.map(function (x) { return x.label; }),
        axisLine: { lineStyle: { color: "#e5e7eb" } }, axisTick: { show: false },
        axisLabel: { color: "#6b7280", fontSize: 9, interval: 0 }
      },
      yAxis: { type: "value", minInterval: 1, axisLine: { show: false },
        splitLine: { lineStyle: { color: "#f1f2f5" } }, axisLabel: { color: "#6b7280", fontSize: 10 } },
      tooltip: { trigger: "axis" },
      series: [
        { name: A.name, type: "bar", barWidth: 12, barGap: "12%",
          itemStyle: { color: "#c7d5ff", borderRadius: [4, 4, 0, 0] },
          data: A.dist.map(function (x) { return x.value; }) },
        { name: B.name, type: "bar", barWidth: 12,
          itemStyle: { color: "#4f7cff", borderRadius: [4, 4, 0, 0] },
          data: B.dist.map(function (x) { return x.value; }) }
      ]
    });
    EX.cmp = c;
  }

  /* ---------------- 启动 ---------------- */
  function boot() {
    loadState()
      .then(function () {
        var passed = sessionStorage.getItem(KEY_OK);
        var no = sessionStorage.getItem(KEY_ME);
        if (passed && no) {
          for (var i = 0; i < DATA.students.length; i++) {
            if (DATA.students[i].no === no) ME = DATA.students[i];
          }
          if (ME) return viewHome();
        }
        viewGate("");
      })
      .catch(function (e) {
        $("app").innerHTML =
          '<div class="gate"><div class="logo">' + ICON.lock + "</div><h1>数据还没发布</h1>" +
          '<p class="desc">老师还没把班级数据发布到网站，或者网络把数据文件拦住了。</p>' +
          '<div class="err">' + esc(e.message || "") + "</div>" +
          '<button class="go" onclick="location.reload()">重新加载</button>' +
          '<div class="tip">如果反复这样：确认老师点过「发布到网站」，再等 1 分钟刷新。' +
          "国内访问 GitHub 慢时，可用镜像地址打开本页。</div></div>";
      });
  }

  boot();
})();
