/**
 * BRAND CONFIG, single source of truth.
 *
 * Marketing brand is "WP MCP", the literal, keyword-matched name for the
 * MCP server that runs inside WordPress. The plugin ships under the "wpmcp"
 * slug/repo; same identity, the spaced form is just the human-facing wordmark.
 *
 * To rebrand again, edit this file only:
 *   - name / tagline / domain / pluginSlug below
 *   - the CSS custom properties in assets/css/brand.css (:root block, same values mirrored)
 *   - the inline SVG mark in the spots marked "BRAND MARK" in index.html / docs.html
 *     (or better: replace those inline <svg> blocks with an <img src="assets/img/logo.svg">
 *     once you have a final asset)
 *
 * Nothing else in the codebase should hardcode the product name, domain, or colors,
 * templates read from window.WPMCP_BRAND or the data-brand-* slots below.
 */
window.WPMCP_BRAND = {
  name: "WP MCP",
  legalName: "WP MCP",
  pluginSlug: "wpmcp",
  tagline: "The AI agent that builds your WordPress site, and physically can't wreck it.",
  domain: "wpmcp-pro.com",
  github: "https://github.com/wpmcp/wpmcp",
  license: "GPL-2.0-or-later",
  colors: {
    primary: "#2563EB",
    accent: "#06B6D4",
    bg: "#0A0E14"
  }
};


// Populate every element carrying a brand slot attribute. Keeps copy in index.html
// generic/rebrandable without a build step or template engine.
document.addEventListener("DOMContentLoaded", function () {
  var b = window.WPMCP_BRAND;
  document.querySelectorAll("[data-brand-name]").forEach(function (el) {
    el.textContent = b.name;
  });
  document.querySelectorAll("[data-brand-domain]").forEach(function (el) {
    el.textContent = b.domain;
  });
  document.querySelectorAll("[data-brand-github]").forEach(function (el) {
    if (el.tagName === "A") el.href = b.github;
  });
  document.querySelectorAll("[data-brand-plugin-slug]").forEach(function (el) {
    el.textContent = b.pluginSlug;
  });
});
