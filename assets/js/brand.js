/**
 * BRAND CONFIG, single source of truth.
 *
 * Marketing brand is "Dukandar" (dukandar means shopkeeper). The plugin
 * itself still ships under the "wpmcp" slug/repo, that is a separate,
 * lower-level identity from the product name shown to shop owners.
 *
 * To rebrand again, edit this file only:
 *   - name / tagline / domain / pluginSlug below
 *   - the CSS custom properties in assets/css/brand.css (:root block, same values mirrored)
 *   - the inline SVG mark in the two spots marked "BRAND MARK" in index.html / docs.html
 *     (or better: replace those inline <svg> blocks with an <img src="assets/img/logo.svg">
 *     once you have a final asset)
 *
 * Nothing else in the codebase should hardcode the product name, domain, or colors,
 * templates read from window.DUKANDAR_BRAND or the data-brand-* slots below.
 */
window.DUKANDAR_BRAND = {
  name: "Dukandar",
  legalName: "Dukandar",
  pluginSlug: "wpmcp",
  tagline: "Let AI build and run your online shop, and never fear it breaking your store.",
  domain: "getdukandar.com",
  github: "https://github.com/fahdi/wpmcp",
  license: "GPL-2.0-or-later",
  colors: {
    primary: "#2563EB",
    accent: "#06B6D4",
    bg: "#0A0E14"
  }
};

// Back-compat alias, in case older markup or scripts still reference the
// previous global name during the rebrand.
window.WPMCP_BRAND = window.DUKANDAR_BRAND;

// Populate every element carrying a brand slot attribute. Keeps copy in index.html
// generic/rebrandable without a build step or template engine.
document.addEventListener("DOMContentLoaded", function () {
  var b = window.DUKANDAR_BRAND;
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
