var Struct = require('observ-struct')
var Property = require('observ-default')
var resolve = require('path').resolve
var computed = require('observ/computed')
var RangeDecoder = require('audio-buffer-range-decoder')

module.exports = AudioClip

function AudioClip (context) {

  var currentStops = []
  var fullDuration = Property(0)
  var decodeRange = null
  var chunkDuration = 5
  var preloadTime = 1
  var loading = 0

  var obs = Struct({
    startOffset: Property(0),
    duration: Property(),
    src: Property()
  })

  obs.cuePoints = Property([])
  obs.context = context
  obs.loading = Property(false)

  var masterOutput = context.audio.createGain() 
  masterOutput.connect(context.output)

  obs.startOffset.max = fullDuration
  obs.duration.max = computed([fullDuration, obs.startOffset], function (fullDuration, startOffset) {
    if (fullDuration) {
      return fullDuration - startOffset
    } else {
      return 0
    }
  })
  obs.duration.resolved = computed([obs.duration.max, obs.duration], function (max, duration) {
    return Math.min(max, duration || max)
  })

  obs.resolved = Struct({
    duration: obs.duration.resolved,
    startOffset: obs.startOffset,
    cuePoints: obs.cuePoints,
    src: obs.src
  })

  obs.position = Property(0)

  var lastPath = null
  obs.src(function (value) {
    // preload
    var path = resolve(context.cwd, value)
    if (path !== lastPath) {
      lastPath = path
      updateLoading(1)
      decodeRange = RangeDecoder(path, {
        fs: context.fs,
        audio: context.audio
      }, onLoad)

      // cue points
      var timePath = path + '.time'
      obs.cuePoints.set(null)
      context.fs.readFile(timePath, function (err, buffer) {
        if (!err) {
          obs.cuePoints.set(new Float32Array(new Uint8Array(buffer).buffer))
        }
      }) 
    }
  })

  obs.start = function (at, timeOffset, duration) {
    var stopAt = null

    var maxDuration = obs.duration.resolved()
    duration = Math.min(duration || maxDuration, maxDuration)

    var startTime = at - (timeOffset || 0)
    var currentOffset = obs.startOffset()
    var nextTime = startTime
    var remaining = duration
    var lastPlayer = null

    var output = context.audio.createGain()
    output.connect(masterOutput)

    // attack / release
    output.gain.setValueAtTime(0, context.audio.currentTime)
    output.gain.setTargetAtTime(1, at, 0.001)

    var done = context.scheduler(function (schedule) {

      if (remaining <= 0) {
        stopAt = nextTime
        return
      }

      if (stopAt != null && schedule[0] + schedule[1] >= stopAt) {
        stopped()
        return
      }

      while (nextTime - preloadTime < schedule[0] + schedule[1]) {

        var playAt = nextTime
        var playDuration = Math.min(chunkDuration, remaining)

        remaining -= playDuration

        if (remaining <= 0) {
          playDuration += 0.01
          stopAt = nextTime
        }

        if (playAt + playDuration > at) {
          playRange(currentOffset, playDuration, playAt)
        }

        nextTime += chunkDuration
        currentOffset += chunkDuration
      }

    })

    function stop (at) {
      if (stopAt == null || at < stopAt) {
        stopAt = at
        output.gain.setTargetAtTime(0, at, 0.001)
        if (lastPlayer) {
          lastPlayer.stop(at)
        }
      }
    }

    function playRange(offset, duration, at) {
      updateLoading(1)
      decodeRange(offset, duration, function (err, audioBuffer) {
        if (audioBuffer) {
          var player = context.audio.createBufferSource()
          var loadTime = context.audio.currentTime
          player.buffer = audioBuffer
          if (at < loadTime) {
            // loaded too late, oh well
            player.start(loadTime, loadTime - at)
          } else {
            player.start(at)
          }
          player.connect(output)
          lastPlayer = player
        }
        updateLoading(-1)
      })
    }

    function stopped () {
      var index = currentStops.indexOf(stop)
      if (~index) {
        done()
        currentStops.splice(index, 1)
      }
    } 

    done.output = output
    currentStops.push(stop)
  }

  obs.stop = function (at) {
    currentStops.forEach(function (stop) {
      stop(at)
    })
  }

  obs.destroy = function () {
    decodeRange && decodeRange.close()
  }

  return obs

  // scoped

  function onLoad (err, meta) {
    if (!err) {
      fullDuration.set(meta.duration)
    }
    updateLoading(-1)
  }

  function updateLoading(offset) {
    loading += offset
    if (loading && !obs.loading()) {
      obs.loading.set(true)
    } else if (!loading && obs.loading()) {
      obs.loading.set(false)
    }
  }
}