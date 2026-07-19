/**
 * VanzelionGame — theme.js
 * Logic toggle light/dark mode + persist ke localStorage.
 * Catatan: penerapan class "dark" paling awal (anti-flash) sudah
 * dilakukan lewat inline <script> kecil di <head> tiap halaman,
 * SEBELUM file ini dimuat. File ini cuma mengurus tombol toggle.
 */
(function () {
  "use strict";

  const STORAGE_KEY = "vg-theme";

  function getTheme() {
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  }

  function updateIcons(theme) {
    document.querySelectorAll("[data-theme-toggle] i").forEach((icon) => {
      icon.className = theme === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon";
    });
    document.querySelectorAll("[data-theme-label]").forEach((label) => {
      label.textContent = theme === "dark" ? "Mode Terang" : "Mode Gelap";
    });
  }

  function setTheme(theme, persist = true) {
    document.documentElement.classList.toggle("dark", theme === "dark");
    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) {}
    }
    updateIcons(theme);
  }

  function toggleTheme() {
    setTheme(getTheme() === "dark" ? "light" : "dark");
  }

  function init() {
    // Sinkronkan ikon dengan class yang sudah di-set oleh inline script anti-flash
    updateIcons(getTheme());

    document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
      btn.addEventListener("click", toggleTheme);
    });

    // Ikut sistem kalau user belum pernah pilih manual
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved && window.matchMedia) {
        window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
          if (!localStorage.getItem(STORAGE_KEY)) setTheme(e.matches ? "dark" : "light", false);
        });
      }
    } catch (e) {}
  }

  window.VGTheme = { setTheme, getTheme, toggleTheme };
  document.addEventListener("DOMContentLoaded", init);
})();
