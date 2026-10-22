/* Shared scroll math. One document scrollbar owns both reading and scene travel. */
(function (root) {
  'use strict';
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function layout(heights, available, travel, hold) {
    var cursor = 0;
    return heights.map(function (height, i) {
      var read = Math.max(0, height - available[i]);
      var segment = { start: cursor, read: read, hold: hold, transition: i === heights.length - 1 ? 0 : travel };
      segment.turn = cursor + read + hold;
      segment.end = segment.turn + segment.transition;
      cursor = segment.end;
      return segment;
    });
  }
  function locate(y, segments) {
    var i = segments.findIndex(function (s) { return y < s.end; });
    if (i < 0) i = segments.length - 1;
    var s = segments[i];
    var turn = s.transition ? clamp((y - s.turn) / s.transition, 0, 1) : 0;
    return { index: i, turn: turn, active: turn > .5 ? i + 1 : i, read: clamp(y - s.start - s.hold * .25, 0, s.read), phase: i + turn };
  }
  var api = { clamp: clamp, layout: layout, locate: locate };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CortexJourneyModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
