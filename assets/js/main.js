(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------------------
     Theme switcher. The pre-paint <head> script already stamped
     data-theme from localStorage; this button flips and persists it.
  --------------------------------------------------------------------- */
  var themeToggle = document.querySelector(".theme-toggle");
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  var syncThemeUi = function (theme) {
    if (themeToggle) {
      themeToggle.setAttribute(
        "aria-label",
        theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
      );
    }
    if (themeMeta) {
      themeMeta.setAttribute("content", theme === "dark" ? "#0c0f16" : "#fbfbfd");
    }
  };
  syncThemeUi(document.documentElement.getAttribute("data-theme") || "light");
  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var next =
        document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("wpmcp-theme", next); } catch (e) {}
      syncThemeUi(next);
    });
  }

  /* ---------------------------------------------------------------------
     Mobile nav toggle
  --------------------------------------------------------------------- */
  var navToggle = document.querySelector(".nav-toggle");
  var navLinks = document.querySelector(".nav-links");
  var siteHeader = document.querySelector(".site-header");
  if (navToggle && navLinks) {
    // The header's backdrop-filter creates a containing block for any
    // fixed-position descendant (the mobile panel), which would otherwise
    // collapse to the header's own box instead of the full viewport. The
    // CSS :has() rule handles this in modern browsers; this class toggle
    // is the fallback for browsers without :has() support.
    var syncHeaderState = function (isOpen) {
      if (siteHeader) siteHeader.classList.toggle("nav-is-open", isOpen);
    };
    navToggle.addEventListener("click", function () {
      var isOpen = navLinks.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
      syncHeaderState(isOpen);
    });
    navLinks.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        navLinks.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
        syncHeaderState(false);
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

  /* ---------------------------------------------------------------------
     Scrollable <pre> hint: only show the trailing fade when a code block
     genuinely has more content than fits, so it never appears on wide
     viewports where the command already fits in full.
  --------------------------------------------------------------------- */
  var codeBlocks = document.querySelectorAll("pre");
  var syncScrollHints = function () {
    codeBlocks.forEach(function (el) {
      el.classList.toggle("is-scrollable-hint", el.scrollWidth > el.clientWidth + 2);
    });
  };
  if (codeBlocks.length) {
    syncScrollHints();
    window.addEventListener("resize", syncScrollHints);
    codeBlocks.forEach(function (el) {
      el.addEventListener("scroll", function () {
        var atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
        el.classList.toggle("is-scrollable-hint", el.scrollWidth > el.clientWidth + 2 && !atEnd);
      });
    });
  }
})();
