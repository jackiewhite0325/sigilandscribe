/* St. Jude gift meter + countdown. Shared by index.html and muffin-series.html.
   Figures come from data/muffin-donations.json, updated from KDP reports.
   Public display shows the gift amount only: no sales counts, no earnings. */
(function () {
  function money(n) { return "$" + Number(n).toFixed(2); }

  var amountEl = document.getElementById("gift-amount");
  if (amountEl) {
    fetch("data/muffin-donations.json")
      .then(function (r) { if (!r.ok) throw new Error("no data"); return r.json(); })
      .then(function (d) {
        var c = d.current || {};
        var gift = Number(c.gift || 0);
        var scale = Number(d.scale_max || 1);
        amountEl.textContent = money(gift);
        var fill = document.getElementById("gift-fill");
        if (fill) fill.style.width = Math.min(100, (gift / scale) * 100) + "%";
        var scaleMax = document.getElementById("gift-scale-max");
        if (scaleMax) scaleMax.textContent = money(scale).replace(".00", "");
        var barLabel = document.getElementById("gift-bar-label");
        if (barLabel) barLabel.setAttribute("aria-label",
          "St. Jude gift meter: " + money(gift) + " on a " + money(scale) + " scale");
        if (c.updated) {
          var upd = document.getElementById("gift-updated");
          if (upd) {
            var dt = new Date(c.updated + "T12:00:00");
            upd.textContent = "Updated " +
              dt.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
          }
        }
      })
      .catch(function () {
        amountEl.textContent = "$0.00";
      });
  }

  // Countdown to the next gift checkpoint: Mar 20, Jun 20, Sep 20, Dec 20.
  var clockEl = document.getElementById("countdown-clock");
  if (clockEl) {
    var dateEl = document.getElementById("countdown-date");
    var marks = [[2, 20], [5, 20], [8, 20], [11, 20]];
    function nextCheckpoint(now) {
      var y = now.getFullYear();
      for (var i = 0; i < marks.length; i++) {
        var t = new Date(y, marks[i][0], marks[i][1], 0, 0, 0);
        if (t > now) return t;
      }
      return new Date(y + 1, 2, 20, 0, 0, 0);
    }
    function tick() {
      var now = new Date();
      var target = nextCheckpoint(now);
      if (dateEl) dateEl.textContent = "Gift checkpoint: " +
        target.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
      var s = Math.floor((target - now) / 1000);
      var d = Math.floor(s / 86400); s -= d * 86400;
      var h = Math.floor(s / 3600); s -= h * 3600;
      var m = Math.floor(s / 60); s -= m * 60;
      clockEl.textContent = d + "d " + h + "h " + m + "m " + s + "s";
    }
    tick();
    setInterval(tick, 1000);
  }
})();
