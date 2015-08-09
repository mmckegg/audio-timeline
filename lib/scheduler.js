module.exports = AudioTimelineScheduler

function AudioTimelineScheduler (audioContext) {
  var listeners = []
  var timer = null
  var lastTime = audioContext.currentTime

  var obs = function (listener) {
    if (!listeners.length) {
      timer = setInterval(schedule, 50)
    }
    listeners.push(listener)
    return function remove () {
      var index = listeners.indexOf(listener)
      if (~index) listeners.splice(index, 1)
      if (!listeners.length) {
        clearInterval(timer)
      }
    }
  }

  return obs

  // scoped

  function schedule () {
    var to = audioContext.currentTime + 0.1
    var data = [lastTime, to - lastTime]
    lastTime = to
    for (var i = 0;i < listeners.length;i++) {
      listeners[i](data)
    }
  }
}