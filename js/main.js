// MR工作室官网交互
(function () {
  "use strict";

  // 滚动显现
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("visible");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("visible"); });
  }

  // 帮助与教程弹窗
  var helpOpen = document.getElementById("helpOpen");
  var helpClose = document.getElementById("helpClose");
  var helpMask = document.getElementById("helpMask");
  if (helpOpen) helpOpen.addEventListener("click", function (e) { e.preventDefault(); if (helpMask) helpMask.hidden = false; });
  if (helpClose) helpClose.addEventListener("click", function () { if (helpMask) helpMask.hidden = true; });
  if (helpMask) helpMask.addEventListener("click", function (e) { if (e.target === helpMask) helpMask.hidden = true; });
  // 为爱发电：右侧悬浮按钮 → 滑出收款码面板
  var donateOpen = document.getElementById("donateOpen");
  var donateClose = document.getElementById("donateClose");
  var donatePanel = document.getElementById("donatePanel");

  function openDonate() { if (donatePanel) donatePanel.hidden = false; }
  function closeDonate() { if (donatePanel) donatePanel.hidden = true; }

  if (donateOpen) donateOpen.addEventListener("click", openDonate);
  if (donateClose) donateClose.addEventListener("click", closeDonate);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeDonate(); });
})();
