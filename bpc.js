/** 
 * Author: ZenWANG
 * Email: zenyes@gmail.com
 * Github: https://github.com/zenboss
 */
;
'use strict';

// eslint-disable-next-line no-unused-vars
var BPCStart = (function ModuleSpace() {
  /**
   * the _getUndefined() function is used to avoid
   * the programmer, I, make any mistake cause the
   * undefined variable to be overridden
   */
  function _getUndefined() { return void 0; }

  function BLANK_FUNCTION() { }

  function gxkSetInterval(cb) {
    cb.apply(this, Array.prototype.slice.call(arguments, 2));
    return setInterval.apply(this, arguments);
  }
  function toQuaternary(n, length) {
    var r = Number(n).toString(4);
    if (r.length < length) {
      for (var i = r.length; i < length; i += 1) {
        r = '0' + r;
      }
    }
    return r;
  }
  function toBinary(n, length) {
    var r = Number(n).toString(2);
    if (r.length < length) {
      for (var i = r.length; i < length; i += 1) {
        r = '0' + r;
      }
    }
    return r;
  }
  function getCheckCodeP3(frame) {
    var binary = '';
    binary += frame.P1;
    binary += frame.P2;
    binary += frame.hour;
    binary += frame.minute;
    binary += frame.dayOfWeek;
    return binary.split('').filter(function(item) {
      return '' + item === '1';
    }).length % 2;
  }
  function getCheckCodeP4(frame) {
    var binary = '';
    binary += frame.day;
    binary += frame.month;
    binary += frame.year;
    return binary.split('').filter(function(item) {
      return '' + item === '1';
    }).length % 2;
  }
  function generateDateInfo(time) {
    time = time || Date.now();
    var localTime = new Date(time);
    var localOffset = localTime.getTimezoneOffset() * 60000;
    var utc = time + localOffset;

    var dateObj = new Date(utc + ((3600 * 1e3) * 8));
    var h24 = dateObj.getHours();
    var isAM = h24 < 12;
    var h12 = h24 % 12;
    var dayOfWeek = dateObj.getDay();
    if (dayOfWeek === 0) dayOfWeek = 7;

    var frame1 = {
      P1: toBinary((parseInt(dateObj.getSeconds() / 20, 10)), 2),
      P2: '00',
      hour: toBinary(h12, 4),
      minute: toBinary(dateObj.getMinutes(), 6),
      dayOfWeek: toBinary(dayOfWeek, 4),

      day: toBinary(dateObj.getDate(), 6),
      month: toBinary(dateObj.getMonth() + 1, 4),
      year: toBinary((dateObj.getFullYear() + '').slice(2), 6),
    };
    frame1.P3 = (isAM ? '0' : '1') + '' + getCheckCodeP3(frame1);
    frame1.P4 = '0' + getCheckCodeP4(frame1);
    return frame1;
  }
  function dateInfoTo4String(frames) {
    return [
      toQuaternary(parseInt(frames.P1, 2), 1),
      toQuaternary(parseInt(frames.P2, 2), 1),
      toQuaternary(parseInt(frames.hour, 2), 2),
      toQuaternary(parseInt(frames.minute, 2), 3),
      toQuaternary(parseInt(frames.dayOfWeek, 2), 2),
      toQuaternary(parseInt(frames.P3, 2), 1),
      toQuaternary(parseInt(frames.day, 2), 3),
      toQuaternary(parseInt(frames.month, 2), 2),
      toQuaternary(parseInt(frames.year, 2), 3),
      toQuaternary(parseInt(frames.P4, 2), 1),
    ].join('');
  }
  function dateInfoStringToSoundCode(dateString) {
    return dateString.split('').map(function(one) {
      if (one === '0') return 0.1;
      if (one === '1') return 0.2;
      if (one === '2') return 0.3;
      if (one === '3') return 0.4;
      return 0;
    });
  }

  var oscillator = null;
  function reinitAudio() {
    var audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    oscillator = audioCtx.createOscillator();

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(13.7 * 1e3, audioCtx.currentTime);
    oscillator.connect(audioCtx.destination);
  }
  function startAudioIfNeeded() {
    if (oscillator) return;
    var audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    oscillator = audioCtx.createOscillator();

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(13.7 * 1e3, audioCtx.currentTime);
    oscillator.connect(audioCtx.destination);
    oscillator.start();
  }

  function BPCStart(utctime, cb) {
    if ('function' === typeof utctime) {
      cb = utctime;
      utctime = null;
    }
    utctime = utctime || Date.now();
    var timeDifference = utctime - Date.now();
    cb = cb || BLANK_FUNCTION;
    var frames = null;
    var framesSoundCode = [];
    var intervalHandle = 0;
    setTimeout(function() {
      intervalHandle = gxkSetInterval(function() {
        startAudioIfNeeded();
        var soundSecond = framesSoundCode.shift();
        if (soundSecond === _getUndefined()) {
          var second = (new Date()).getSeconds();
          var modeOfSecond = second % 20;
          if (modeOfSecond === 0) {
            frames = generateDateInfo(Date.now() + timeDifference);
            var framesString = dateInfoTo4String(frames);
            framesSoundCode = dateInfoStringToSoundCode(framesString);
            cb({
              frames: frames,
              countdown: 0,
            });
          } else {
            oscillator.stop(0.1);
            oscillator = null;
            cb({
              frames: frames,
              countdown: 20 - modeOfSecond,
            });
          }
        } else {
          oscillator.stop();
          reinitAudio();
          setTimeout(function() {
            oscillator.start();
          }, soundSecond * 1e3);
          cb({
            frames: frames,
            countdown: 0,
            soundSecond: soundSecond,
          });
        }
      }, 1 * 1e3);
    }, 1e3 - Date.now() % 1e3);
    return function () {
      clearInterval(intervalHandle);
      setTimeout(function() {
        try {
          oscillator.stop();
        } catch (error) {
          // console.error(error);
        }
      }, 1 * 1e3);
    };
  }
  if ('object' === typeof module) module.exports = BPCStart;
  if ('object' === typeof window) window.BPCStart = BPCStart;
  if ('object' === typeof self) self.BPCStart = BPCStart;
  if ('object' === typeof this) this.BPCStart = BPCStart;
  return BPCStart;
})();
