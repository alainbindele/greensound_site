// Apply the stored theme before first paint so the page never flashes
// light before switching to dark.
//
// This lives in its own file, loaded as a plain blocking <script> from
// index.html, rather than inline: the production Content-Security-Policy is
// `script-src 'self'`, which blocks inline scripts.
(function () {
  try {
    var stored = localStorage.getItem("greensound-theme");
    var hour = new Date().getHours();
    var dark = stored
      ? stored === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches ||
        hour < 6 ||
        hour >= 18;
    if (dark) document.documentElement.classList.add("dark");
  } catch (e) {
    /* storage blocked — fall back to light */
  }
})();
