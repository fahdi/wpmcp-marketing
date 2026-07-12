(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------------------
     Mobile nav toggle
  --------------------------------------------------------------------- */
  var navToggle = document.querySelector(".nav-toggle");
  var navLinks = document.querySelector(".nav-links");
  if (navToggle && navLinks) {
    navToggle.addEventListener("click", function () {
      var isOpen = navLinks.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });
    navLinks.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        navLinks.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------------------------------------------------------------------
     Scroll reveal
  --------------------------------------------------------------------- */
  var revealEls = document.querySelectorAll(".reveal");
  if (revealEls.length) {
    if (reducedMotion || !("IntersectionObserver" in window)) {
      revealEls.forEach(function (el) { el.classList.add("is-visible"); });
    } else {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.16, rootMargin: "0px 0px -60px 0px" }
      );
      revealEls.forEach(function (el, i) {
        el.style.transitionDelay = reducedMotion ? "0ms" : Math.min(i % 6, 5) * 70 + "ms";
        io.observe(el);
      });
    }
  }

  /* ---------------------------------------------------------------------
     Hero console: rotating operation rows with a live "restore" action
  --------------------------------------------------------------------- */
  var undoBtn = document.querySelector(".op-undo[data-console-undo]");
  var opRow = document.querySelector(".op-row[data-console-row]");
  var diffAdd = document.querySelector(".console-diff .add");
  var diffDel = document.querySelector(".console-diff .del");
  if (undoBtn && opRow) {
    undoBtn.addEventListener("click", function () {
      var rolledBack = opRow.getAttribute("data-state") === "rolled-back";
      if (!rolledBack) {
        opRow.setAttribute("data-state", "rolled-back");
        undoBtn.textContent = "Restored";
        undoBtn.disabled = true;
        if (diffDel) diffDel.classList.add("is-hidden");
        if (diffAdd) diffAdd.classList.remove("is-hidden");
        window.setTimeout(function () {
          opRow.removeAttribute("data-state");
          undoBtn.textContent = "Restore";
          undoBtn.disabled = false;
          if (diffDel) diffDel.classList.remove("is-hidden");
          if (diffAdd) diffAdd.classList.add("is-hidden");
        }, 2600);
      }
    });
  }

  /* ---------------------------------------------------------------------
     "Watch it undo" demo: wreck -> restore loop
  --------------------------------------------------------------------- */
  var demoPage = document.querySelector("[data-demo-page]");
  var demoButton = document.querySelector("[data-demo-undo]");
  var demoLabel = document.querySelector("[data-demo-label]");
  if (demoPage && demoButton) {
    var wrecked = false;
    var setState = function (isWrecked) {
      wrecked = isWrecked;
      demoPage.classList.toggle("is-wrecked", wrecked);
      if (demoLabel) {
        demoLabel.textContent = wrecked
          ? "agent broke the layout just now"
          : "restored to the pre-agent snapshot";
      }
    };
    // Auto-wreck shortly after it scrolls into view, once, for effect.
    var autoWreck = function () {
      if (!wrecked) setState(true);
    };
    if (!reducedMotion && "IntersectionObserver" in window) {
      var demoIo = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            window.setTimeout(autoWreck, 900);
            demoIo.disconnect();
          }
        });
      }, { threshold: 0.5 });
      demoIo.observe(demoPage);
    }
    demoButton.addEventListener("click", function () {
      setState(!wrecked);
    });
  }

  /* ---------------------------------------------------------------------
     Current year in footer
  --------------------------------------------------------------------- */
  var yearEl = document.querySelector("[data-year]");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
