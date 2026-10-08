/* 老蒋快跑 · 无限跑酷 + AI 答题   MR工作室 */
(function () {
  "use strict";

  var $ = function (s) { return document.querySelector(s); };
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function ri(a, b) { return Math.floor(rnd(a, b + 1)); }
  function nowMs() { return (window.performance && performance.now) ? performance.now() : Date.now(); }
  function mean(a) { if (!a.length) return 0; var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return s / a.length; }
  function ell(g, x, y, rx, ry) {
    g.beginPath();
    if (g.ellipse) { g.ellipse(x, y, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2); }
    else { g.save(); g.translate(x, y); g.scale(Math.abs(rx), Math.abs(ry)); g.arc(0, 0, 1, 0, Math.PI * 2); g.restore(); }
    g.fill();
  }
  function star(g, cx, cy, r, n) {
    g.beginPath();
    for (var i = 0; i < n * 2; i++) {
      var rad = (i % 2 === 0) ? r : r * 0.42;
      var a = -Math.PI / 2 + i * Math.PI / n;
      var px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath(); g.fill();
  }
  function norm(s) { return String(s || "").replace(/[\s，。、？！；：,.\?!;:'"“”‘’（）()·—\-_【】\[\]]/g, ""); }
  function sim(a, b) {
    a = norm(a); b = norm(b);
    if (!a || !b) return 0;
    if (a === b) return 1;
    if (a.length > 8 && b.length > 8 && a.slice(0, 14) === b.slice(0, 14)) return 0.92;
    var A = {}, B = {}, i;
    for (i = 0; i < a.length - 1; i++) A[a.slice(i, i + 2)] = 1;
    for (i = 0; i < b.length - 1; i++) B[b.slice(i, i + 2)] = 1;
    var inter = 0; for (var k in A) if (B[k]) inter++;
    var uni = 0; for (var k2 in A) uni++; for (var k3 in B) uni++;
    uni -= inter;
    return uni > 0 ? inter / uni : 0;
  }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = ri(0, i); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  /* ================= 兜底题库（AI 不可用时保证可玩） ================= */
  var FB = [
    { q: "蒋介石的故乡在哪个省？", options: ["浙江", "江苏", "广东", "湖北"], answer: 0, topic: "籍贯" },
    { q: "蒋介石字“介石”，他的名是？", options: ["中正", "瑞元", "志清", "经国"], answer: 0, topic: "姓名" },
    { q: "蒋介石早年赴日本学习军事，曾就读于？", options: ["东京振武学校", "日本陆军士官学校", "早稻田大学", "京都帝国大学"], answer: 0, topic: "求学" },
    { q: "蒋介石曾出任校长的著名军事学校是？", options: ["黄埔军校", "保定军校", "云南讲武堂", "西点军校"], answer: 0, topic: "黄埔" },
    { q: "蒋介石是哪个政党的长期领导人？", options: ["中国国民党", "中国共产党", "中国民主同盟", "北洋政党"], answer: 0, topic: "政党" },
    { q: "西安事变发生于哪一年？", options: ["1936年", "1931年", "1937年", "1945年"], answer: 0, topic: "西安事变" },
    { q: "发动西安事变、扣押蒋介石的主要人物是？", options: ["张学良和杨虎城", "张作霖和杨虎城", "张学良和李宗仁", "阎锡山和冯玉祥"], answer: 0, topic: "西安事变" },
    { q: "西安事变后，蒋介石接受了什么主张？", options: ["停止内战、联共抗日", "继续围剿红军", "迁都重庆", "对日宣战"], answer: 0, topic: "西安事变" },
    { q: "抗日战争全面爆发后，国民政府迁都到哪里？", options: ["重庆", "南京", "广州", "西安"], answer: 0, topic: "抗战" },
    { q: "蒋介石的夫人是？", options: ["宋美龄", "宋庆龄", "宋霭龄", "何香凝"], answer: 0, topic: "家庭" },
    { q: "蒋介石与宋美龄结婚是在哪一年？", options: ["1927年", "1919年", "1931年", "1937年"], answer: 0, topic: "家庭" },
    { q: "蒋介石在台湾的著名官邸是？", options: ["士林官邸", "美龄宫", "中南海", "总统府"], answer: 0, topic: "晚年" },
    { q: "蒋介石去世于哪一年？", options: ["1975年", "1965年", "1976年", "1988年"], answer: 0, topic: "晚年" },
    { q: "蒋介石去世于何地？", options: ["台湾", "重庆", "南京", "奉化"], answer: 0, topic: "晚年" },
    { q: "北伐战争时期，蒋介石担任的最高军职是？", options: ["国民革命军总司令", "陆军部长", "参谋总长", "第一军军长"], answer: 0, topic: "北伐" },
    { q: "“四一二”政变发生在哪一年？", options: ["1927年", "1926年", "1928年", "1931年"], answer: 0, topic: "党史" },
    { q: "抗日战争时期，蒋介石担任的最高职务之一是？", options: ["国民政府军事委员会委员长", "国防部长", "总参谋长", "陆军总司令"], answer: 0, topic: "抗战" },
    { q: "西安事变中，中共派往西安斡旋的代表是？", options: ["周恩来", "毛泽东", "李宗仁", "宋子文"], answer: 0, topic: "西安事变" },
    { q: "蒋经国与蒋介石的关系是？", options: ["父子", "兄弟", "叔侄", "翁婿"], answer: 0, topic: "家庭" },
    { q: "蒋介石祖籍奉化，奉化属于哪个省？", options: ["浙江", "江苏", "福建", "安徽"], answer: 0, topic: "籍贯" },
    { q: "蒋介石在南京建立的政府通常被称为？", options: ["南京国民政府", "北洋政府", "武汉政府", "广州军政府"], answer: 0, topic: "政权" },
    { q: "蒋介石生日按公历是哪一天？", options: ["10月31日", "1月1日", "5月20日", "12月25日"], answer: 0, topic: "生平" }
  ];
  // 打乱每题选项顺序，避免永远选 A
  FB.forEach(function (f) {
    var order = shuffle([0, 1, 2, 3]);
    var opts = [], ans = 0;
    for (var i = 0; i < 4; i++) { opts.push(f.options[order[i]]); if (order[i] === f.answer) ans = i; }
    f.options = opts; f.answer = ans;
  });

  /* ================= AI 题库池 ================= */
  var AI = window.MRAI || null;
  var asked = [], pool = [], inflight = 0, waiters = [], aiFails = 0;
  var badgeEl = null, badgeBusy = 0;

  function setBadge() {
    if (!badgeEl) return;
    if (AI && AI.hasKey) {
      badgeEl.className = badgeBusy > 0 ? "busy" : "";
      badgeEl.textContent = "AI · 智谱";
    } else {
      badgeEl.className = "off"; badgeEl.textContent = "AI 未接入";
    }
  }
  function nextDiff() { return asked.length + pool.length + inflight + 1; }
  function isDup(q) {
    var i;
    for (i = 0; i < asked.length; i++) if (sim(asked[i], q) >= 0.7) return true;
    for (i = 0; i < pool.length; i++) if (sim(pool[i].q, q) >= 0.7) return true;
    return false;
  }
  function submit(q) { if (!isDup(q.q)) pool.push(q); flush(); ensure(); }
  function flush() { while (waiters.length && pool.length) waiters.shift()(pool.shift()); }
  function fallbackQ() {
    var unused = FB.filter(function (f) { return !isDup(f.q); });
    var src = unused.length ? unused : FB;
    var f = src[ri(0, src.length - 1)];
    return { q: f.q, options: f.options.slice(), answer: f.answer, topic: f.topic || "", src: "local" };
  }
  function genOnce() {
    if (!AI || !AI.hasKey) { pool.push(fallbackQ()); flush(); return; }
    inflight++; badgeBusy++; setBadge();
    var tries = 0;
    (function attempt() {
      AI.genQuestion(asked.concat(pool.map(function (p) { return p.q; })), nextDiff())
        .then(function (q) { inflight--; badgeBusy--; setBadge(); aiFails = 0; submit(q); })
        .catch(function () {
          tries++;
          if (tries < 3) { setTimeout(attempt, 350); }
          else { inflight--; badgeBusy--; setBadge(); aiFails++; pool.push(fallbackQ()); flush(); ensure(); }
        });
    })();
  }
  function ensure() { var guard = 0; while (pool.length + inflight < 2 && guard++ < 6) genOnce(); }
  function popQ() {
    ensure();
    if (pool.length) { var q = pool.shift(); ensure(); return Promise.resolve(q); }
    return new Promise(function (res) { waiters.push(res); });
  }

  /* ================= 画布 / 场景 ================= */
  var cv, g, W = 0, H = 0, DPR = 1, HORIZON = 0, PYA = 0, LANE = 0;
  var S = {
    state: "ready", lane: 1,
    jumpT: 0, jumpDur: 0.66, slideT: 0, slideDur: 0.62, inv: 0,
    dist: 0, elapsed: 0, speedZ: 0.36, phase: 0, roadPhase: 0,
    obs: [], spawnT: 1.2, right: 0, events: [], zhangLunge: 0, zhangLaneX: 0, reviveUsed: false
  };
  var qObj = null, lastTs = 0, overGradeTimer = null;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.floor(W * DPR); cv.height = Math.floor(H * DPR);
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    HORIZON = H * 0.40; PYA = H * 0.68; LANE = W * 0.245;
  }
  function proj(z) {
    z = clamp(z, 0, 1);
    var k = Math.pow(1 - z, 1.8);
    return { y: HORIZON + (PYA - HORIZON) * k, s: 0.14 + 0.86 * Math.pow(1 - z, 1.35), z: z };
  }
  function laneX(l, s) { return W / 2 + (l - 1) * LANE * s; }

  /* ---------- 人物 ---------- */
  function drawChiang(ctx, x, y, sc, o) {
    o = o || {};
    var H0 = 90 * (sc || 1), slide = o.slide || 0, air = o.air || 0, ph = o.phase || 0;
    var h = H0 * (1 - 0.42 * slide);
    var hipY = y - 0.46 * h, shY = y - 0.82 * h, headR = 0.12 * h, headY = y - 0.82 * h - 0.13 * h;
    ctx.save();
    ctx.globalAlpha = 0.30 * (1 - air * 0.75); ctx.fillStyle = "#000";
    ell(ctx, x, y + 2, 0.26 * h, 0.07 * h); ctx.restore();
    var sw = Math.sin(ph);
    ctx.lineCap = "round"; ctx.lineWidth = 0.075 * h; ctx.strokeStyle = "#20222e";
    ctx.beginPath(); ctx.moveTo(x - 0.06 * h, hipY); ctx.lineTo(x - 0.09 * h + 0.13 * h * sw, y - 0.02 * h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 0.06 * h, hipY); ctx.lineTo(x + 0.09 * h - 0.13 * h * sw, y - 0.02 * h); ctx.stroke();
    ctx.fillStyle = "#0d0d12";
    ell(ctx, x - 0.09 * h + 0.13 * h * sw, y + 0.01 * h, 0.09 * h, 0.035 * h);
    ell(ctx, x + 0.09 * h - 0.13 * h * sw, y + 0.01 * h, 0.09 * h, 0.035 * h);
    var gr = ctx.createLinearGradient(x - 0.25 * h, shY, x + 0.25 * h, hipY + 0.3 * h);
    gr.addColorStop(0, "#3a4152"); gr.addColorStop(1, "#232838");
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.moveTo(x - 0.20 * h, shY); ctx.lineTo(x + 0.20 * h, shY);
    ctx.lineTo(x + 0.24 * h, hipY + 0.16 * h); ctx.lineTo(x + 0.16 * h, y - 0.02 * h);
    ctx.lineTo(x - 0.16 * h, y - 0.02 * h); ctx.lineTo(x - 0.24 * h, hipY + 0.16 * h);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#5a6478"; ctx.lineWidth = 0.022 * h;
    ctx.beginPath(); ctx.moveTo(x - 0.09 * h, shY); ctx.lineTo(x, shY + 0.10 * h); ctx.lineTo(x + 0.09 * h, shY); ctx.stroke();
    ctx.fillStyle = "#c9b78a";
    for (var i = 0; i < 3; i++) ell(ctx, x, shY + 0.12 * h + i * 0.10 * h, 0.017 * h, 0.017 * h);
    ctx.strokeStyle = "#2e3446"; ctx.lineWidth = 0.062 * h;
    ctx.beginPath(); ctx.moveTo(x - 0.18 * h, shY + 0.03 * h); ctx.lineTo(x - 0.25 * h - 0.05 * h * sw, shY + 0.22 * h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 0.18 * h, shY + 0.03 * h); ctx.lineTo(x + 0.25 * h + 0.05 * h * sw, shY + 0.22 * h); ctx.stroke();
    ctx.fillStyle = "#e9c39c"; ctx.fillRect(x - 0.05 * h, headY + headR * 0.55, 0.10 * h, 0.07 * h);
    ctx.fillStyle = "#f0cba2"; ell(ctx, x, headY, headR, headR * 1.06);
    ctx.fillStyle = "rgba(0,0,0,0.10)"; ell(ctx, x + headR * 0.35, headY + headR * 0.12, headR * 0.5, headR * 0.62);
    ctx.fillStyle = "#e9c39c";
    ell(ctx, x - headR * 1.0, headY + headR * 0.12, headR * 0.16, headR * 0.2);
    ell(ctx, x + headR * 1.0, headY + headR * 0.12, headR * 0.16, headR * 0.2);
    ctx.fillStyle = "#241a12";
    ell(ctx, x - headR * 0.36, headY + headR * 0.05, headR * 0.10, headR * 0.13);
    ell(ctx, x + headR * 0.36, headY + headR * 0.05, headR * 0.10, headR * 0.13);
    ctx.strokeStyle = "#2a1a12"; ctx.lineWidth = 0.028 * h; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x - headR * 0.62, headY - headR * 0.20); ctx.lineTo(x - headR * 0.16, headY - headR * 0.34); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + headR * 0.62, headY - headR * 0.20); ctx.lineTo(x + headR * 0.16, headY - headR * 0.34); ctx.stroke();
    ctx.strokeStyle = "#1c1512"; ctx.lineWidth = 0.034 * h;
    ctx.beginPath(); ctx.moveTo(x - headR * 0.5, headY + headR * 0.42); ctx.lineTo(x, headY + headR * 0.32); ctx.lineTo(x + headR * 0.5, headY + headR * 0.42); ctx.stroke();
    ctx.strokeStyle = "#5a2b22"; ctx.lineWidth = 0.018 * h;
    ctx.beginPath(); ctx.moveTo(x - headR * 0.22, headY + headR * 0.64); ctx.lineTo(x + headR * 0.22, headY + headR * 0.64); ctx.stroke();
  }

  function drawZhang(ctx, x, y, sc, o) {
    o = o || {};
    var h = 90 * (sc || 1), ph = o.phase || 0;
    var hipY = y - 0.46 * h, shY = y - 0.82 * h, headR = 0.12 * h, headY = y - 0.82 * h - 0.14 * h;
    ctx.save(); ctx.globalAlpha = 0.30; ctx.fillStyle = "#000"; ell(ctx, x, y + 2, 0.28 * h, 0.07 * h); ctx.restore();
    var sw = Math.sin(ph + 1.3);
    ctx.lineCap = "round"; ctx.lineWidth = 0.08 * h; ctx.strokeStyle = "#5d6a3c";
    ctx.beginPath(); ctx.moveTo(x - 0.06 * h, hipY); ctx.lineTo(x - 0.10 * h + 0.15 * h * sw, y - 0.02 * h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 0.06 * h, hipY); ctx.lineTo(x + 0.10 * h - 0.15 * h * sw, y - 0.02 * h); ctx.stroke();
    ctx.fillStyle = "#20241a";
    ell(ctx, x - 0.10 * h + 0.15 * h * sw, y + 0.01 * h, 0.10 * h, 0.04 * h);
    ell(ctx, x + 0.10 * h - 0.15 * h * sw, y + 0.01 * h, 0.10 * h, 0.04 * h);
    var tun = ctx.createLinearGradient(x - 0.24 * h, shY, x + 0.24 * h, hipY + 0.2 * h);
    tun.addColorStop(0, "#7d8a52"); tun.addColorStop(1, "#5d6a3c");
    ctx.fillStyle = tun;
    ctx.beginPath();
    ctx.moveTo(x - 0.18 * h, shY); ctx.lineTo(x + 0.18 * h, shY);
    ctx.lineTo(x + 0.22 * h, hipY); ctx.lineTo(x - 0.22 * h, hipY); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#3a2f1c"; ctx.fillRect(x - 0.22 * h, hipY - 0.07 * h, 0.44 * h, 0.07 * h);
    ctx.strokeStyle = "#6a7748"; ctx.lineWidth = 0.065 * h;
    ctx.beginPath(); ctx.moveTo(x - 0.16 * h, shY + 0.03 * h); ctx.lineTo(x - 0.22 * h - 0.05 * h * sw, shY + 0.22 * h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 0.16 * h, shY + 0.03 * h); ctx.lineTo(x + 0.24 * h + 0.05 * h * sw, shY + 0.20 * h); ctx.stroke();
    ctx.fillStyle = "#eec49a"; ctx.fillRect(x - 0.04 * h, headY + headR * 0.5, 0.08 * h, 0.07 * h);
    ctx.fillStyle = "#f2cfa6"; ell(ctx, x, headY, headR, headR * 1.05);
    ctx.fillStyle = "#241a12";
    ell(ctx, x - headR * 0.34, headY + headR * 0.06, headR * 0.09, headR * 0.12);
    ell(ctx, x + headR * 0.34, headY + headR * 0.06, headR * 0.09, headR * 0.12);
    ctx.fillStyle = "#4c5830";
    ctx.beginPath(); ctx.arc(x, headY - headR * 0.30, headR * 1.06, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fill();
    ctx.fillRect(x - headR * 1.06, headY - headR * 0.36, headR * 2.12, headR * 0.36);
    ctx.fillStyle = "#3a4324"; ell(ctx, x, headY - headR * 0.04, headR * 1.16, headR * 0.28);
    ctx.fillStyle = "#e8c46a"; star(ctx, x, headY - headR * 0.78, headR * 0.26, 5);
  }

  /* ---------- 障碍 ---------- */
  function box(ctx, cx, yBase, w, hgt, top, front, side) {
    var d = w * 0.28;
    ctx.fillStyle = top;
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, yBase - hgt); ctx.lineTo(cx - w / 2 + d, yBase - hgt - d * 0.55);
    ctx.lineTo(cx + w / 2 + d, yBase - hgt - d * 0.55); ctx.lineTo(cx + w / 2, yBase - hgt); ctx.closePath(); ctx.fill();
    ctx.fillStyle = side;
    ctx.beginPath();
    ctx.moveTo(cx + w / 2, yBase - hgt); ctx.lineTo(cx + w / 2 + d, yBase - hgt - d * 0.55);
    ctx.lineTo(cx + w / 2 + d, yBase - d * 0.55); ctx.lineTo(cx + w / 2, yBase); ctx.closePath(); ctx.fill();
    ctx.fillStyle = front;
    ctx.fillRect(cx - w / 2, yBase - hgt, w, hgt);
  }
  function drawObstacle(o) {
    var p = proj(o.z), x = laneX(o.lane, p.s), s = p.s;
    if (o.type === "low") {
      var w = W * 0.20 * s, hgt = H * 0.075 * s;
      box(g, x, p.y, w, hgt, "#c98b3a", "#a86c22", "#8a5518");
      g.fillStyle = "#f3e2bd"; g.fillRect(x - w / 2, p.y - hgt * 0.72, w, hgt * 0.24 * (s > .5 ? 1 : 0.6));
      g.fillStyle = "#7a4a12"; g.fillRect(x - w / 2, p.y - hgt * 0.34, w, hgt * 0.18);
    } else if (o.type === "high") {
      var w2 = W * 0.20 * s, postH = H * 0.20 * s, gap = H * 0.075 * s;
      g.fillStyle = "#7a2020";
      g.fillRect(x - w2 / 2, p.y - postH, w2 * 0.12, postH);
      g.fillRect(x + w2 / 2 - w2 * 0.12, p.y - postH, w2 * 0.12, postH);
      var barTop = p.y - postH, barH = postH - gap;
      box(g, x, barTop, w2, barH * 0.9, "#d34d43", "#b8322c", "#8f2620");
      g.fillStyle = "#f5e6c0";
      for (var i2 = 0; i2 < 4; i2++) g.fillRect(x - w2 / 2 + w2 * (0.06 + i2 * 0.25), barTop - barH * 0.85, w2 * 0.10, barH * 0.8);
    } else {
      var w3 = W * 0.21 * s, hgt3 = H * 0.17 * s;
      box(g, x, p.y, w3, hgt3, "#556074", "#3c4557", "#2b3242");
      g.fillStyle = "rgba(232,196,106,.85)";
      g.fillRect(x - w3 * 0.32, p.y - hgt3 * 0.60, w3 * 0.64, hgt3 * 0.12);
      g.fillStyle = "rgba(0,0,0,.25)";
      g.fillRect(x - w3 * 0.32, p.y - hgt3 * 0.40, w3 * 0.64, hgt3 * 0.10);
    }
  }

  /* ---------- 背景 ---------- */
  function drawBG() {
    var sky = g.createLinearGradient(0, 0, 0, HORIZON);
    sky.addColorStop(0, "#141a2e"); sky.addColorStop(0.55, "#2a2b45"); sky.addColorStop(1, "#6b4a4a");
    g.fillStyle = sky; g.fillRect(0, 0, W, HORIZON + 2);
    var gl = g.createRadialGradient(W * 0.6, HORIZON * 0.92, 4, W * 0.6, HORIZON * 0.92, H * 0.42);
    gl.addColorStop(0, "rgba(240,200,140,.55)"); gl.addColorStop(1, "rgba(240,200,140,0)");
    g.fillStyle = gl; g.fillRect(0, 0, W, HORIZON + 2);
    var base = HORIZON + 2;
    for (var x = 0; x < W;) {
      var bw = rnd(14, 40), bh = rnd(10, H * 0.12);
      g.fillStyle = "#1b2036"; g.fillRect(x, base - bh, bw - 3, bh);
      x += bw;
    }
    var gr = g.createLinearGradient(0, HORIZON, 0, H);
    gr.addColorStop(0, "#141826"); gr.addColorStop(1, "#090a10");
    g.fillStyle = gr; g.fillRect(0, HORIZON, W, H - HORIZON);
    var nb = W * 0.62, fb = W * 0.20;
    g.fillStyle = "#1d2333";
    g.beginPath();
    g.moveTo(W / 2 - nb / 2, HORIZON); g.lineTo(W / 2 + nb / 2, HORIZON);
    g.lineTo(W / 2 + fb / 2, H); g.lineTo(W / 2 - fb / 2, H); g.closePath(); g.fill();
    g.strokeStyle = "rgba(232,196,106,.35)"; g.lineWidth = 2;
    for (var k = 0; k < 24; k++) {
      var z = ((k / 24) - (S.roadPhase)) % 1; if (z < 0) z += 1;
      var p = proj(z); if (p.s < 0.16) continue;
      g.globalAlpha = 0.25 + 0.4 * (1 - z);
      g.beginPath();
      g.moveTo(laneX(0, p.s) - LANE * p.s * 0.9, p.y);
      g.lineTo(laneX(2, p.s) + LANE * p.s * 0.9, p.y);
      g.stroke();
    }
    g.globalAlpha = 1;
    g.strokeStyle = "rgba(245,239,226,.25)"; g.lineWidth = 2;
    [-0.5, 0.5].forEach(function (off) {
      g.beginPath();
      g.moveTo(W / 2 + off * LANE * 0.20, HORIZON);
      g.lineTo(W / 2 + off * LANE * 1.9, H);
      g.stroke();
    });
  }

  /* ---------- 主绘制 ---------- */
  function draw(dt) {
    g.clearRect(0, 0, W, H);
    drawBG();
    var sorted = S.obs.slice().sort(function (a, b) { return b.z - a.z; });
    for (var i = 0; i < sorted.length; i++) if (sorted[i].z <= 1.02) drawObstacle(sorted[i]);
    var zy = PYA + (H - PYA) * 0.62 - S.zhangLunge * ((H - PYA) * 0.5);
    drawZhang(g, S.zhangLaneX, zy, 1.12 + S.zhangLunge * 0.2, { phase: S.phase * 0.9 });
    var lift = 0;
    if (S.jumpT > 0) { var pr = 1 - S.jumpT / S.jumpDur; lift = Math.sin(Math.PI * clamp(pr, 0, 1)) * (H * 0.17); }
    drawChiang(g, laneX(S.lane, 1.0), PYA - lift, 1.0, {
      slide: S.slideT > 0 ? clamp(S.slideT / S.slideDur, 0, 1) : 0,
      air: S.jumpT > 0 ? 1 : 0, phase: S.phase
    });
    if (S.inv > 0 && S.state === "running") {
      g.save(); g.globalAlpha = 0.5 * clamp(S.inv / 0.9, 0, 1);
      g.strokeStyle = "#8fe0a8"; g.lineWidth = 3;
      g.beginPath(); g.arc(laneX(S.lane, 1.0), PYA - 34, 40, 0, Math.PI * 2); g.stroke(); g.restore();
    }
  }
  function lerpTo(a, b, t) { return a + (b - a) * t; }

  /* ================= 世界更新 ================= */
  function spawn() {
    var lanes = shuffle([0, 1, 2]);
    var n = Math.random() < 0.42 ? 2 : 1;
    for (var i = 0; i < n; i++) {
      var r = Math.random();
      var type = r < 0.44 ? "low" : (r < 0.86 ? "high" : "full");
      S.obs.push({ lane: lanes[i], z: 1.0, prevZ: 1.0, type: type, hit: false });
    }
  }
  function updateWorld(dt) {
    S.elapsed += dt;
    S.speedZ = 0.36 + clamp(S.dist * 0.0005, 0, 0.34);
    S.dist += (S.speedZ / 0.36) * 11 * dt;
    S.phase += dt * (11 + (S.speedZ - 0.36) * 16);
    S.roadPhase = (S.roadPhase + S.speedZ * dt * 1.7) % 1;
    if (S.jumpT > 0) S.jumpT = Math.max(0, S.jumpT - dt);
    if (S.slideT > 0) S.slideT = Math.max(0, S.slideT - dt);
    if (S.inv > 0) S.inv = Math.max(0, S.inv - dt);
    S.zhangLaneX += (laneX(S.lane, 1.0) - S.zhangLaneX) * Math.min(1, dt * 6);
    for (var i = S.obs.length - 1; i >= 0; i--) {
      var o = S.obs[i];
      o.prevZ = o.z; o.z -= S.speedZ * dt;
      if (o.z < -0.08) { S.obs.splice(i, 1); continue; }
      checkCollide(o);
    }
    S.spawnT -= dt;
    if (S.spawnT <= 0) { spawn(); S.spawnT = clamp(rnd(0.95, 1.5) - S.dist * 0.00035, 0.60, 1.5); }
    hud();
  }
  var COLLIDE_Z = 0.045;
  function checkCollide(o) {
    if (o.hit || S.inv > 0) return;
    if (!(o.prevZ > COLLIDE_Z && o.z <= COLLIDE_Z)) return;
    if (S.lane !== o.lane) return;
    var safe = false;
    if (o.type === "low" && S.jumpT > 0) safe = true;
    else if (o.type === "high" && S.slideT > 0) safe = true;
    if (safe) return;
    o.hit = true;
    var idx = S.obs.indexOf(o); if (idx >= 0) S.obs.splice(idx, 1);
    startQuestion();
  }
  function hud() {
    var d = $("#hDist"), r = $("#hRight");
    if (d) d.textContent = Math.round(S.dist);
    if (r) r.textContent = S.right;
  }

  /* ================= 答题 ================= */
  function startQuestion() {
    S.state = "question";
    var qIdx = asked.length + 1;
    $("#qIndex").textContent = "第 " + qIdx + " 题";
    $("#qLv").textContent = "难度 " + qIdx;
    $("#qText").textContent = "";
    var opts = $("#qOpts"); opts.innerHTML = "";
    $("#qLoading").classList.add("on");
    $("#qFoot").style.visibility = "hidden";
    $("#qScreen").classList.add("on");
    qObj = { diff: qIdx, t0: null, tFirst: null, optChanges: 0, done: false, q: null, timeout: false };
    var myQ = qObj;
    var wd = setTimeout(function () {
      if (S.state === "question" && qObj === myQ && !qObj.q) {
        var fb = fallbackQ();
        qObj.q = fb; asked.push(fb.q); renderQuestion(fb);
      }
    }, 9000);
    popQ().then(function (q) {
      if (S.state !== "question" || qObj !== myQ || qObj.q || qObj.done) return;
      clearTimeout(wd);
      qObj.q = q; asked.push(q.q);
      renderQuestion(q);
    });
  }
  function renderQuestion(q) {
    $("#qLoading").classList.remove("on");
    $("#qText").textContent = q.q;
    var opts = $("#qOpts"); opts.innerHTML = "";
    var keys = ["A", "B", "C", "D"];
    q.options.forEach(function (t, i) {
      var b = document.createElement("button");
      b.className = "opt";
      b.innerHTML = '<span class="k">' + keys[i] + '</span><span>' + esc(t) + "</span>";
      b.setAttribute("data-i", i);
      b.addEventListener("mouseenter", function () { if (!qObj.done) qObj.optChanges++; });
      b.addEventListener("click", function (e) { e.preventDefault(); answer(i); });
      opts.appendChild(b);
    });
    qObj.t0 = nowMs();
    qObj.tFirst = null;
    $("#qScreen").classList.add("on");
    $("#qFoot").style.visibility = "visible";
    $("#qBar").style.width = "100%";
    $("#qSec").textContent = "10";
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function updateQuestion() {
    if (!qObj || qObj.t0 == null || qObj.done) return;
    var el = (nowMs() - qObj.t0) / 1000;
    var left = Math.max(0, 10 - el);
    $("#qBar").style.width = (left / 10 * 100) + "%";
    $("#qSec").textContent = Math.ceil(left);
    if (left <= 0) timeUp();
  }
  function markHesitation() {
    if (qObj && qObj.t0 != null && qObj.tFirst == null && !qObj.done) qObj.tFirst = nowMs();
  }
  function answer(idx) {
    if (!qObj || qObj.t0 == null || qObj.done) return;
    qObj.done = true;
    var tA = nowMs();
    var ansMs = tA - qObj.t0;
    var hes = ((qObj.tFirst != null ? qObj.tFirst : tA) - qObj.t0);
    var correct = idx === qObj.q.answer;
    recordEvent(correct, ansMs, hes, false);
    var nodes = document.querySelectorAll("#qOpts .opt");
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i], ni = parseInt(n.getAttribute("data-i"), 10);
      if (ni === qObj.q.answer) n.classList.add("right");
      else if (ni === idx) n.classList.add("wrong");
      else n.classList.add("dim");
    }
    setTimeout(function () { afterAnswer(correct); }, 720);
  }
  function timeUp() {
    if (!qObj || qObj.done) return;
    qObj.done = true; qObj.timeout = true;
    var tNow = nowMs();
    var hes = (qObj.tFirst != null ? qObj.tFirst : tNow) - qObj.t0;
    recordEvent(false, Math.round(tNow - qObj.t0), hes, true);
    var nodes = document.querySelectorAll("#qOpts .opt");
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (parseInt(n.getAttribute("data-i"), 10) === qObj.q.answer) n.classList.add("right"); else n.classList.add("dim");
    }
    setTimeout(function () { afterAnswer(false); }, 900);
  }
  function recordEvent(correct, ansMs, hesMs, timedOut) {
    S.events.push({
      no: qObj.diff, difficulty: qObj.diff, correct: correct, timedOut: !!timedOut,
      answerMs: ansMs, hesitationMs: Math.max(0, hesMs), optionChanges: qObj.optChanges,
      distanceAt: Math.round(S.dist), src: qObj.q.src || "ai", topic: qObj.q.topic || ""
    });
  }
  function afterAnswer(correct) {
    $("#qScreen").classList.remove("on");
    if (correct) {
      S.right++;
      hud();
      S.state = "running";
      S.inv = 0.9;
      S.jumpT = 0; S.slideT = 0;
      S.obs = S.obs.filter(function (o) { return o.z > 0.24; });
      S.spawnT = rnd(0.9, 1.3);
      qObj = null;
      ensure();
    } else {
      gameOver(qObj.timeout ? "timeout" : "wrong");
    }
  }

  /* ================= 结束 & 评分 ================= */
  function buildStats(reason) {
    var ev = S.events;
    var ans = ev.map(function (e) { return e.answerMs; });
    var hes = ev.map(function (e) { return e.hesitationMs; });
    return {
      distanceM: Math.round(S.dist),
      durationSec: Math.round(S.elapsed),
      questionsAnswered: ev.length,
      correctCount: ev.filter(function (e) { return e.correct; }).length,
      answeredWrong: ev.filter(function (e) { return !e.correct && !e.timedOut; }).length,
      timedOut: ev.filter(function (e) { return e.timedOut; }).length,
      failReason: reason === "timeout" ? "答题超时" : "答错题目",
      avgAnswerMs: Math.round(mean(ans)),
      avgHesitationMs: Math.round(mean(hes)),
      maxAnswerMs: ans.length ? Math.round(Math.max.apply(null, ans)) : 0,
      minAnswerMs: ans.length ? Math.round(Math.min.apply(null, ans)) : 0,
      events: ev.map(function (e, i) {
        return { no: i + 1, difficulty: e.difficulty, hesitationMs: Math.round(e.hesitationMs), answerMs: Math.round(e.answerMs), correct: e.correct, timedOut: e.timedOut, optionChanges: e.optionChanges };
      })
    };
  }
  function localGrade(st) {
    var s = 0;
    s += Math.min(st.correctCount, 10) * 0.26;
    s += clamp(st.distanceM / 260, 0, 1) * 1.0;
    s += clamp((6500 - (st.avgAnswerMs || 10000)) / 6500, 0, 1) * 1.0;
    s += clamp((3500 - (st.avgHesitationMs || 0)) / 3500, 0, 1) * 0.5;
    return Math.max(0, Math.min(5, Math.round(s * 10) / 10));
  }
  function gameOver(reason) {
    S.state = "over";
    var stats = buildStats(reason);
    $("#overTitle").textContent = reason === "timeout" ? "时 间 到" : "答 错 了";
    $("#overSub").textContent = reason === "timeout" ? "张学良 追上了你 · 超时" : "张学良 追上了你";
    $("#scoreVal").innerHTML = '--<small>/ 5</small>';
    $("#scoreComment").textContent = "";
    $("#gradeLive").textContent = "AI 评分中…";
    $("#overStats").innerHTML =
      "坚持距离 <span>" + stats.distanceM + " m</span> ｜ 用时 <span>" + stats.durationSec + " s</span><br>" +
      "答对 <span>" + stats.correctCount + "</span> 题 ｜ 平均答题 <span>" + (stats.avgAnswerMs / 1000).toFixed(1) + " s</span> ｜ 平均犹豫 <span>" + (stats.avgHesitationMs / 1000).toFixed(1) + " s</span>";
    drawOverArt();
    $("#overScreen").classList.add("on");
    var br = $("#btnAdRevive"); if (br) br.style.display = S.reviveUsed ? "none" : "";
    var saved = stats;
    function showScore(sc, comment, byAI) {
      if (S.state !== "over") return;
      var el = $("#scoreVal"), t0 = nowMs();
      (function tick() {
        var p = clamp((nowMs() - t0) / 700, 0, 1);
        el.innerHTML = (sc * p).toFixed(1) + "<small>/ 5</small>";
        if (p < 1) requestAnimationFrame(tick); else el.innerHTML = sc.toFixed(1) + "<small>/ 5</small>";
      })();
      $("#scoreComment").textContent = comment || "";
      $("#gradeLive").textContent = byAI ? "AI 评分 · 智谱" : "本地评分（AI 暂不可用）";
      window.__lastResult = { score: sc, comment: comment || "", stats: saved };
    }
    if (AI && AI.hasKey) {
      AI.grade(stats).then(function (r) { showScore(r.score, r.comment, true); })
        .catch(function () { showScore(localGrade(stats), "反应挺快，再练练历史细节吧。", false); });
    } else {
      showScore(localGrade(stats), "AI 未接入，这是本地评分。", false);
    }
  }

  function drawOverArt() {
    var c = $("#overArt"); if (!c) return;
    var ctx = c.getContext("2d"), w = c.width, h = c.height;
    var lg = ctx.createLinearGradient(0, 0, 0, h);
    lg.addColorStop(0, "#241a2a"); lg.addColorStop(1, "#0d0e14");
    ctx.fillStyle = lg; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(232,196,106,.5)"; ctx.lineWidth = 3; ctx.strokeRect(1.5, 1.5, w - 3, h - 3);
    ctx.save(); ctx.globalAlpha = 0.55;
    for (var i = 0; i < 5; i++) { ctx.fillStyle = "#33263a"; ctx.fillRect(i * 70 + 10, h - 40, 46, 14); }
    ctx.restore();
    drawZhang(ctx, w * 0.68, h * 0.86, 1.05, { phase: 2 });
    drawChiang(ctx, w * 0.34, h * 0.88, 0.98, { phase: 0.4 });
    ctx.strokeStyle = "#f2cfa6"; ctx.lineWidth = 8; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(w * 0.60, h * 0.60); ctx.lineTo(w * 0.44, h * 0.60); ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.font = "bold 30px sans-serif"; ctx.fillText("!", w * 0.55, h * 0.42);
  }

  /* ================= 输入 ================= */
  function jump() { if (S.state === "running" && S.jumpT <= 0) { S.jumpT = S.jumpDur; S.slideT = 0; } }
  function slide() { if (S.state === "running") { S.slideT = S.slideDur; S.jumpT = 0; } }
  function moveLane(d) { if (S.state === "running") S.lane = clamp(S.lane + d, 0, 2); }
  function bindInput() {
    window.addEventListener("keydown", function (e) {
      var k = e.key;
      if (k === "ArrowLeft" || k === "a" || k === "A") { moveLane(-1); e.preventDefault(); }
      else if (k === "ArrowRight" || k === "d" || k === "D") { moveLane(1); e.preventDefault(); }
      else if (k === "ArrowUp" || k === "w" || k === "W" || k === " ") { jump(); e.preventDefault(); }
      else if (k === "ArrowDown" || k === "s" || k === "S") { slide(); e.preventDefault(); }
    }, { passive: false });
    var sx = 0, sy = 0, st = 0, moved = false;
    var wrap = $("#wrap");
    wrap.addEventListener("touchstart", function (e) {
      var t = e.changedTouches[0]; sx = t.clientX; sy = t.clientY; st = nowMs(); moved = false;
    }, { passive: true });
    wrap.addEventListener("touchmove", function (e) {
      if (e.target.closest && e.target.closest(".ov")) return;
      var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
      moved = true;
      if (Math.abs(dx) > Math.abs(dy)) { moveLane(dx > 0 ? 1 : -1); }
      else { if (dy < 0) jump(); else slide(); }
      sx = t.clientX; sy = t.clientY;
    }, { passive: true });
    var qs = $("#qScreen");
    ["pointermove", "touchmove", "keydown", "pointerdown"].forEach(function (ev) {
      qs.addEventListener(ev, function () { markHesitation(); }, { passive: true });
    });
  }

  /* ================= 生命周期 ================= */
  function reset(clearQ) {
    S.state = "ready"; S.lane = 1; S.jumpT = 0; S.slideT = 0; S.inv = 0;
    S.dist = 0; S.elapsed = 0; S.speedZ = 0.36; S.phase = 0; S.roadPhase = 0;
    S.obs = []; S.spawnT = 1.4; S.right = 0; S.events = []; S.zhangLunge = 0;
    S.zhangLaneX = laneX(1, 1.0); S.reviveUsed = false;
    qObj = null; lastTs = 0;
    if (clearQ) { asked = []; pool = []; waiters = []; }
    hud();
  }
  function startGame() {
    reset(true);
    if (AD.open) closeAd();
    $("#startScreen").classList.remove("on");
    $("#overScreen").classList.remove("on");
    S.state = "running";
    ensure();
    tryPlay();
    lastTs = 0;
  }
  function share() {
    var r = window.__lastResult || { score: 0, comment: "", stats: {} };
    var txt = "我在《老蒋快跑》跑了 " + (r.stats.distanceM || 0) + " 米，答对 " + (r.stats.correctCount || 0) +
      " 题，AI 评分 " + (r.score || 0).toFixed(1) + "/5！\n张学良：" + (r.comment || "") +
      "\nhttps://mrstudiogame.github.io/mrstudio/laojiang/";
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = txt; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(function () { flash("成绩已复制"); }, fallback);
    } else { fallback(); flash("成绩已复制"); }
  }
  function flash(msg) {
    var t = document.createElement("div");
    t.textContent = msg;
    t.style.cssText = "position:fixed;left:50%;top:16%;transform:translateX(-50%);background:rgba(20,22,30,.95);color:#e8c46a;border:1px solid rgba(232,196,106,.5);padding:8px 18px;border-radius:10px;font-size:14px;z-index:99";
    document.body.appendChild(t);
    setTimeout(function () { t.style.transition = "opacity .4s"; t.style.opacity = "0"; setTimeout(function () { t.remove(); }, 420); }, 1100);
  }

  /* ================= 背景音乐 ================= */
  var MUSIC = {
    list: [
      { id: "kushan", name: "东南苦山行", sub: "殷正洋 · 原唱", src: "bgm/kushan.mp3" },
      { id: "yilian", name: "我记得你眼里的依恋", sub: "万芳 · 原唱", src: "bgm/yilian.mp3" }
    ],
    cur: "kushan", muted: false, el: null, started: false, panelOpen: false
  };
  function mget(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function mset(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function trackById(id) { for (var i = 0; i < MUSIC.list.length; i++) if (MUSIC.list[i].id === id) return MUSIC.list[i]; return MUSIC.list[0]; }
  function initMusic() {
    var saved = mget("lj_bgm", "kushan");
    MUSIC.cur = (trackById(saved).id === saved) ? saved : "kushan";
    MUSIC.muted = mget("lj_mute", "0") === "1";
    MUSIC.el = new Audio();
    MUSIC.el.loop = true; MUSIC.el.volume = 0.5; MUSIC.el.preload = "auto";
    MUSIC.el.setAttribute("src", trackById(MUSIC.cur).src);
    renderMusicPanel();
    var kick = function () { tryPlay(); };
    window.addEventListener("pointerdown", kick);
    window.addEventListener("touchstart", kick, { passive: true });
    window.addEventListener("keydown", kick);
    var bs = $("#btnSettings");
    if (bs) bs.addEventListener("click", function () {
      MUSIC.panelOpen = !MUSIC.panelOpen;
      $("#setPanel").classList.toggle("on", MUSIC.panelOpen);
      tryPlay();
    });
    var mc = $("#muteChk");
    if (mc) { mc.checked = MUSIC.muted; mc.addEventListener("change", function () { setMute(mc.checked); }); }
  }
  function applyTrack() {
    var t = trackById(MUSIC.cur);
    if (MUSIC.el.getAttribute("src") !== t.src) { MUSIC.el.setAttribute("src", t.src); try { MUSIC.el.load(); } catch (e) {} }
  }
  function tryPlay() {
    if (!MUSIC.el || MUSIC.muted || AD.open) return;
    MUSIC.started = true;
    var p = MUSIC.el.play();
    if (p && p.catch) p.catch(function () {});
  }
  function setMute(m) {
    MUSIC.muted = !!m; mset("lj_mute", m ? "1" : "0");
    if (MUSIC.muted) { if (MUSIC.el) MUSIC.el.pause(); }
    else tryPlay();
    var mc = $("#muteChk"); if (mc) mc.checked = MUSIC.muted;
  }
  function pickTrack(id) { MUSIC.cur = id; mset("lj_bgm", id); applyTrack(); renderMusicPanel(); tryPlay(); }
  function renderMusicPanel() {
    var box = $("#musicList"); if (!box) return;
    box.innerHTML = "";
    MUSIC.list.forEach(function (t) {
      var b = document.createElement("div");
      b.className = "song" + (t.id === MUSIC.cur ? " sel" : "");
      b.innerHTML = '<span class="dot2"></span><span>' + t.name + '</span><span class="sub">' + t.sub + '</span>';
      b.addEventListener("click", function () { pickTrack(t.id); });
      box.appendChild(b);
    });
  }

  /* ================= 广告复活 ================= */
  var MRCLAW_URL = "https://mrstudiogame.github.io/mrstudio/mrclaw/";
  var ADSOURCES = [
    "https://gh-proxy.com/https://raw.githubusercontent.com/MRStudioGame/mrstudio/main/laojiang/ad/mrclaw.mp4",
    "https://ghfast.top/https://raw.githubusercontent.com/MRStudioGame/mrstudio/main/laojiang/ad/mrclaw.mp4",
    "https://mrstudiogame.github.io/mrstudio/laojiang/ad/mrclaw.mp4"
  ];
  var ADPOSTER = "https://gh-proxy.com/https://raw.githubusercontent.com/MRStudioGame/mrstudio/main/mrclaw/video/poster.jpg";
  var AD = { need: 15, watched: 0, ok: false, open: false, timer: null, videoErr: false, watchdog: null, srcTries: 0 };
  function initAd() {
    var v = $("#adVideo"), dl = $("#adDownload");
    if (dl) dl.setAttribute("href", MRCLAW_URL);
    if (!v) return;
    v.setAttribute("poster", ADPOSTER);
    v.addEventListener("playing", function () { var l = $("#adLoad"); if (l) l.classList.add("off"); var pb = $("#adPlay"); if (pb) pb.classList.remove("on"); });
    v.addEventListener("waiting", function () { var l = $("#adLoad"); if (l && !AD.ok) l.classList.remove("off"); });
    v.addEventListener("error", function () {
      if (AD.srcTries < ADSOURCES.length - 1) { AD.srcTries++; v.setAttribute("src", ADSOURCES[AD.srcTries]); try { v.load(); } catch (e) {} playAdVideo(false); return; }
      AD.videoErr = true; var l = $("#adLoad"); if (l) l.textContent = "广告加载失败，仍在计时";
    });
    var cls = $("#adClose"); if (cls) cls.addEventListener("click", closeAd);
    var cl = $("#adClaim"); if (cl) cl.addEventListener("click", function () { if (AD.ok) revive(); });
    var br = $("#btnAdRevive"); if (br) br.addEventListener("click", openAd);
    var pb = $("#adPlay"); if (pb) pb.addEventListener("click", function () { playAdVideo(true); });
  }
  function openAd() {
    AD.open = true; AD.watched = 0; AD.ok = false; AD.videoErr = false; AD.srcTries = 0;
    var v = $("#adVideo");
    if (v) { v.setAttribute("src", ADSOURCES[0]); try { v.load(); } catch (e) {} v.setAttribute("poster", ADPOSTER); }
    var head = document.querySelector(".adHead");
    if (head) head.innerHTML = '观看广告复活 · 还需 <span id="adTimer">15</span> 秒';
    var l = $("#adLoad"); if (l) { l.textContent = "广告加载中…"; l.classList.remove("off"); }
    var pb0 = $("#adPlay"); if (pb0) pb0.classList.remove("on");
    var cl = $("#adClaim"); if (cl) { cl.disabled = true; cl.textContent = "领取复活"; }
    $("#adScreen").classList.add("on");
    if (MUSIC.el && !MUSIC.muted) MUSIC.el.pause();
    playAdVideo(false);
    if (AD.watchdog) clearTimeout(AD.watchdog);
    AD.watchdog = setTimeout(function () {
      if (AD.open && v && v.paused && !AD.ok) { var pb2 = $("#adPlay"); if (pb2) pb2.classList.add("on"); var l2 = $("#adLoad"); if (l2) l2.textContent = "点此播放广告"; }
    }, 1600);
    if (AD.timer) clearInterval(AD.timer);
    AD.timer = setInterval(function () {
      if (!AD.open) return;
      var playing = v && !v.paused && !v.ended;
      if (playing || AD.videoErr) AD.watched += 0.25;
      updateAdUI();
    }, 250);
    updateAdUI();
  }
  function updateAdUI() {
    var left = Math.max(0, AD.need - AD.watched);
    var t = $("#adTimer"); if (t) t.textContent = Math.ceil(left);
    if (AD.watched >= AD.need && !AD.ok) {
      AD.ok = true;
      var cl = $("#adClaim"); if (cl) { cl.disabled = false; cl.textContent = "领取复活"; }
      var h = document.querySelector(".adHead"); if (h) h.textContent = "观看完成 · 点击领取复活";
    }
  }
  function closeAd() {
    AD.open = false;
    if (AD.timer) { clearInterval(AD.timer); AD.timer = null; }
    if (AD.watchdog) { clearTimeout(AD.watchdog); AD.watchdog = null; }
    var pb = $("#adPlay"); if (pb) pb.classList.remove("on");
    var v = $("#adVideo"); if (v) { try { v.pause(); } catch (e) {} }
    var s = $("#adScreen"); if (s) s.classList.remove("on");
    tryPlay();
  }
  function playAdVideo(fromGesture) {
    var v = $("#adVideo"); if (!v) return;
    if (fromGesture) v.muted = false;
    var p = v.play();
    if (p && p.catch) p.catch(function () { v.muted = true; var q = v.play(); if (q && q.catch) q.catch(function () {}); });
  }
  function revive() {
    if (!AD.ok) return;
    closeAd();
    $("#overScreen").classList.remove("on");
    S.reviveUsed = true;
    S.state = "running";
    S.inv = 1.5; S.jumpT = 0; S.slideT = 0; S.zhangLunge = 0;
    S.obs = S.obs.filter(function (o) { return o.z > 0.3; });
    S.spawnT = rnd(1.0, 1.4);
    qObj = null; lastTs = 0;
    ensure();
    tryPlay();
  }

  function frame(ts) {
    if (!lastTs) lastTs = ts;
    var dt = Math.min(0.05, (ts - lastTs) / 1000); lastTs = ts;
    if (S.state === "running") updateWorld(dt);
    else if (S.state === "question") updateQuestion();
    if (S.state === "over") S.zhangLunge = Math.min(1, S.zhangLunge + dt * 1.6);
    draw(dt);
    requestAnimationFrame(frame);
  }

  function init() {
    cv = $("#c"); g = cv.getContext("2d");
    badgeEl = $("#aiBadge"); setBadge();
    resize(); window.addEventListener("resize", resize);
    reset(true); bindInput();
    $("#btnStart").addEventListener("click", startGame);
    $("#btnRetry").addEventListener("click", startGame);
    $("#btnShare").addEventListener("click", share);
    initMusic();
    initAd();
    requestAnimationFrame(frame);
    if (AI && AI.hasKey) { ensure(); }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
