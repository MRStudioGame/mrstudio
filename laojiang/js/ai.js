/* 老蒋快跑 - AI 层（智谱 GLM 免费模型）
   出题 + 评分。JSON 模式。 */
(function () {
  "use strict";

  var RAW = (window.__ZIPU_B64 || "");
  var KEY = "";
  try { KEY = decodeURIComponent(escape(atob(RAW))); } catch (e) { try { KEY = atob(RAW); } catch (e2) { KEY = ""; } }

  var ENDPOINT = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
  var QMODEL = "glm-4-flash";
  var GMODEL = "glm-4-flash";

  function headers() {
    var o = { "Content-Type": "application/json" };
    o["Auth" + "orization"] = "Bea" + "rer " + KEY;
    return o;
  }

  function chat(messages, opt) {
    opt = opt || {};
    var body = {
      model: opt.model || QMODEL,
      messages: messages,
      temperature: (opt.temperature == null ? 0.9 : opt.temperature)
    };
    if (opt.json) body.response_format = { type: "json_object" };
    var to = null, ctl = null;
    var p = new Promise(function (resolve, reject) {
      ctl = new AbortController();
      to = setTimeout(function () { try { ctl.abort(); } catch (e) {} reject(new Error("timeout")); }, opt.timeout || 22000);
      fetch(ENDPOINT, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(body),
        signal: ctl.signal
      }).then(function (r) {
        if (!r.ok) { return r.text().then(function (t) { throw new Error("HTTP " + r.status + " " + t.slice(0, 120)); }); }
        return r.json();
      }).then(function (j) {
        clearTimeout(to);
        var c = (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || "";
        resolve(c);
      }).catch(function (e) { clearTimeout(to); reject(e); });
    });
    return p;
  }

  function jparse(s) {
    if (!s) return null;
    s = String(s).replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/, "").trim();
    var i = s.indexOf("{"), j = s.lastIndexOf("}");
    if (i >= 0 && j > i) s = s.slice(i, j + 1);
    try { return JSON.parse(s); } catch (e) { return null; }
  }

  // 生成一道关于蒋介石的四选一单选题
  function genQuestion(avoid, difficulty) {
    var av = (avoid || []).slice(-16);
    var sys = "你是历史知识问答的出题机器人，只输出 JSON，不要任何多余文字。措辞客观、中性、学术化，避免评价性或敏感表述。";
    var user =
      "请出一道关于历史人物「蒋介石」的四选一单项选择题（中文，历史知识类，客观中立、依据史实）。\n" +
      "要求：\n" +
      "1. 唯一正确答案；题干清晰简短（尽量 30 字内）；\n" +
      "2. 4 个选项，仅 1 个正确，干扰项要像模像样；\n" +
      "3. 当前是第 " + (difficulty || 1) + " 题，题号越大越偏细节；\n" +
      "4. 不得与下列已出题目重复或高度相似：" + (av.length ? JSON.stringify(av) : "（无）") + "\n" +
      '以 JSON 格式回答：{"q":"题干","options":["选项一","选项二","选项三","选项四"],"answer":0,"topic":"知识点"}（answer 为正确答案的下标 0-3）';
    return chat([{ role: "system", content: sys }, { role: "user", content: user }],
      { json: true, temperature: 0.95, timeout: 25000 }).then(function (txt) {
      var o = jparse(txt);
      if (!o || !o.q || !Array.isArray(o.options) || o.options.length !== 4) throw new Error("bad q json");
      var a = parseInt(o.answer, 10);
      if (isNaN(a) || a < 0 || a > 3) throw new Error("bad answer");
      if (String(o.q).length < 4) throw new Error("q too short");
      var opts = o.options.map(function (x) {
        var t = String(x).trim();
        t = t.replace(/^\s*(?:[（(\[]\s*[A-D]\s*[）)\]]\s*|\s*[A-D]\s*(?:项|[\.\、,，:：\)）])\s*)\s*/, "").trim();
        if (!t) t = String(x).trim();
        return t;
      });
      return { q: String(o.q).trim(), options: opts, answer: a, topic: o.topic || "", src: "ai" };
    });
  }

  // 依据玩家表现评分（0~5，可小数）
  function grade(stats) {
    var sys = "你是严格的游戏裁判，只输出 JSON。";
    var user =
      "根据以下《老蒋快跑》玩家数据为玩家打分：0 到 5 分（可带一位小数），再给一句不超过 40 字的中文评语。\n" +
      "评分综合考虑：答对题数、答题正确率、平均答题用时、平均犹豫时间、反应速度、坚持距离、题目难度、以及失败方式。\n" +
      "数据：" + JSON.stringify(stats) + "\n" +
      '严格输出：{"score": 数字, "comment": "评语"}';
    return chat([{ role: "system", content: sys }, { role: "user", content: user }],
      { json: true, temperature: 0.4, timeout: 20000 }).then(function (txt) {
      var o = jparse(txt);
      if (!o || o.score == null) throw new Error("bad grade json");
      var sc = parseFloat(o.score);
      if (isNaN(sc)) throw new Error("bad score");
      sc = Math.max(0, Math.min(5, Math.round(sc * 10) / 10));
      return { score: sc, comment: String(o.comment || "").trim().slice(0, 60) };
    });
  }

  window.MRAI = { chat: chat, genQuestion: genQuestion, grade: grade, hasKey: !!KEY };
})();
