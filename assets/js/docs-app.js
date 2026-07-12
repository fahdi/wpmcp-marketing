/**
 * Docs app: fetches Markdown files from ../docs/, parses frontmatter
 * (title/order), renders them client-side, and builds the sidebar nav.
 *
 * The docs/ folder is owned by another process. This file does not assume
 * an exact file list beyond a best-guess default; if docs/manifest.json
 * exists (a simple JSON array of filenames), it is used instead, so new
 * docs can be added without touching this app.
 */
(function () {
  "use strict";

  var DOCS_DIR = "docs/";
  var MANIFEST_URL = DOCS_DIR + "manifest.json";

  // Best-effort fallback list, used only if manifest.json is unavailable.
  // Matches the docs/ folder as of this build; harmless if a file 404s,
  // it is simply skipped.
  var FALLBACK_FILES = [
    "00-introduction.md",
    "10-getting-started.md",
    "20-connecting-clients.md",
    "30-safety-model.md",
    "40-tools-reference.md",
    "50-free-vs-pro.md",
    "90-contributing-and-tests.md"
  ];

  var els = {
    sidebarList: document.querySelector("[data-docs-nav]"),
    mobileSelect: document.querySelector("[data-docs-mobile-select]"),
    article: document.querySelector("[data-docs-article]"),
    toc: document.querySelector("[data-docs-toc]"),
    tocList: document.querySelector("[data-docs-toc-list]"),
    pager: document.querySelector("[data-docs-pager]")
  };

  function isFileProtocol() {
    return window.location.protocol === "file:";
  }

  function renderFileProtocolNotice() {
    els.article.innerHTML =
      '<div class="docs-error">' +
        "<h2>This page needs a local server</h2>" +
        "<p>You opened this file directly (<code>file://</code>), and browsers block script-driven file reads under that protocol as a security measure. The docs renderer fetches Markdown files from the sibling <code>docs/</code> folder, which requires serving the site over HTTP.</p>" +
        "<p>From the site root, run one of these, then open the printed URL:</p>" +
        "<pre><code>npx serve .\n# or\npython3 -m http.server 8080</code></pre>" +
        "<p>Everything else on this page (styles, layout, the landing page) works fine over <code>file://</code>. Only the live Markdown fetch needs a server.</p>" +
      "</div>";
    if (els.sidebarList) {
      els.sidebarList.innerHTML = '<li style="padding:10px 14px; color: var(--ink-500); font-size: 13px;">Docs list unavailable under file://</li>';
    }
  }

  function fetchText(url) {
    return fetch(url, { cache: "no-store" }).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status + " for " + url);
      return res.text();
    });
  }

  function getManifest() {
    return fetchText(MANIFEST_URL)
      .then(function (text) {
        var list = JSON.parse(text);
        if (!Array.isArray(list) || !list.length) throw new Error("empty manifest");
        return list;
      })
      .catch(function () {
        return FALLBACK_FILES;
      });
  }

  function loadDoc(filename) {
    return fetchText(DOCS_DIR + filename).then(function (raw) {
      var parsed = window.WPMCPMarkdown.parseFrontmatter(raw);
      return {
        file: filename,
        title: parsed.meta.title || filename.replace(/\.md$/, ""),
        order: parsed.meta.order !== undefined ? Number(parsed.meta.order) : 999,
        body: parsed.body
      };
    });
  }

  function slugFromFile(filename) {
    return filename.replace(/\.md$/, "").replace(/^\d+-/, "");
  }

  function buildSidebar(docs, activeFile) {
    if (!els.sidebarList) return;
    els.sidebarList.innerHTML = "";
    docs.forEach(function (doc) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = "#" + slugFromFile(doc.file);
      a.textContent = doc.title;
      if (doc.file === activeFile) {
        a.classList.add("is-active");
        a.setAttribute("aria-current", "page");
      }
      li.appendChild(a);
      els.sidebarList.appendChild(li);
    });

    if (els.mobileSelect) {
      els.mobileSelect.innerHTML = "";
      docs.forEach(function (doc) {
        var opt = document.createElement("option");
        opt.value = slugFromFile(doc.file);
        opt.textContent = doc.title;
        if (doc.file === activeFile) opt.selected = true;
        els.mobileSelect.appendChild(opt);
      });
    }
  }

  function buildToc(tocEntries) {
    if (!els.tocList) return;
    els.tocList.innerHTML = "";
    if (!tocEntries.length) {
      if (els.toc) els.toc.style.display = "none";
      return;
    }
    if (els.toc) els.toc.style.display = "";
    tocEntries.forEach(function (entry) {
      var li = document.createElement("li");
      if (entry.level === 3) li.className = "toc-h3";
      var a = document.createElement("a");
      a.href = "#" + entry.id;
      a.textContent = entry.text;
      li.appendChild(a);
      els.tocList.appendChild(li);
    });
  }

  function buildPager(docs, index) {
    if (!els.pager) return;
    els.pager.innerHTML = "";
    var prev = docs[index - 1];
    var next = docs[index + 1];

    if (prev) {
      var pa = document.createElement("a");
      pa.className = "pager-link is-prev";
      pa.href = "#" + slugFromFile(prev.file);
      pa.innerHTML = '<span class="pdir">Previous</span><span class="ptitle">' + prev.title + "</span>";
      els.pager.appendChild(pa);
    } else {
      els.pager.appendChild(document.createElement("span"));
    }

    if (next) {
      var na = document.createElement("a");
      na.className = "pager-link is-next";
      na.href = "#" + slugFromFile(next.file);
      na.innerHTML = '<span class="pdir">Next</span><span class="ptitle">' + next.title + "</span>";
      els.pager.appendChild(na);
    }
  }

  function renderDoc(docs, slug) {
    var index = docs.findIndex(function (d) { return slugFromFile(d.file) === slug; });
    if (index === -1) index = 0;
    var doc = docs[index];
    if (!doc) {
      els.article.innerHTML = '<div class="docs-error"><h2>No docs found</h2><p>The <code>docs/</code> folder has no readable Markdown files yet.</p></div>';
      return;
    }

    var rendered = window.WPMCPMarkdown.renderMarkdown(doc.body);
    els.article.innerHTML =
      '<div class="docs-article-head"><span class="eyebrow">Documentation</span></div>' +
      '<div class="docs-content">' + rendered.html + "</div>";

    buildSidebar(docs, doc.file);
    buildToc(rendered.toc);
    buildPager(docs, index);
    document.title = doc.title + ": Dukandar docs";

    // Jump to in-page anchor if the hash included one (#slug or plain #slug),
    // otherwise scroll the article into view from the top.
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function currentSlug(docs) {
    var hash = window.location.hash.replace(/^#/, "");
    if (!hash) return slugFromFile(docs[0].file);
    return hash;
  }

  function init() {
    if (isFileProtocol()) {
      renderFileProtocolNotice();
      return;
    }

    els.article.innerHTML = '<p class="docs-loading">Loading documentation...</p>';

    getManifest()
      .then(function (files) {
        var loads = files.map(function (f) {
          return loadDoc(f).catch(function () { return null; });
        });
        return Promise.all(loads);
      })
      .then(function (docs) {
        docs = docs.filter(Boolean).sort(function (a, b) { return a.order - b.order; });
        if (!docs.length) {
          els.article.innerHTML =
            '<div class="docs-error"><h2>Documentation not found</h2>' +
            "<p>No Markdown files could be loaded from <code>docs/</code>. If you are running this over a local server, confirm the <code>docs/</code> folder sits next to <code>docs.html</code> and contains at least one <code>.md</code> file with frontmatter.</p></div>";
          return;
        }

        renderDoc(docs, currentSlug(docs));

        window.addEventListener("hashchange", function () {
          renderDoc(docs, currentSlug(docs));
        });

        if (els.mobileSelect) {
          els.mobileSelect.addEventListener("change", function () {
            window.location.hash = els.mobileSelect.value;
          });
        }
      })
      .catch(function (err) {
        els.article.innerHTML =
          '<div class="docs-error"><h2>Could not load documentation</h2>' +
          "<p>" + (err && err.message ? err.message : "Unknown error") + "</p></div>";
      });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
