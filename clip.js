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
  var chunkDuration = 4
  var preloadTime = 0.2
  var loading = 0

  var obs = Struct({
    startOffset: Property(0),
    duration: Property(),
    src: Property()
  })

  obs.loading = Property(false)

  var masterOutput = context.audio.createGain() 
  masterOutput.connect(context.output)

  obs.duration.resolved = computed([fullDuration, obs.duration, obs.startOffset], function (fullDuration, duration, startOffset) {
    if (fullDuration) {
      return Math.min(fullDuration - startOffset, duration)
    } else {
      return 0
    }
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
    }
  })

  obs.start = function (at, timeOffset, duration) {
    var stopAt = null

    timeOffset = timeOffset || 0
    maxDuration = obs.duration.resolved() - timeOffset
    duration = Math.min(duration || maxDuration, maxDuration)
    var startTime = at - timeOffset
    var currentOffset = obs.startOffset()
    var nextTime = startTime
    var remaining = duration

    var output = context.audio.createGain()
    output.connect(masterOutput)

    // attack / release
    output.gain.setValueAtTime(0, context.audio.currentTime)
    output.gain.setTargetAtTime(1, at, 0.001)

    var done = context.scheduler(function (schedule) {

      if (stopAt != null && schedule[0] + schedule[1] >= stopAt) {
        stopped()
      }

      if (nextTime - preloadTime < schedule[0] + schedule[1]) {
        var playAt = nextTime
        var playDuration = Math.min(chunkDuration, remaining)

        nextTime += chunkDuration
        remaining -= playDuration

        if (remaining <= 0) {
          playDuration += 0.01
          stopped()
        }

        if (playAt + playDuration > at) {
          updateLoading(1)

          decodeRange(currentOffset, playDuration, function (err, audioBuffer) {
            if (audioBuffer) {
              var player = context.audio.createBufferSource()
              player.buffer = audioBuffer
              if (playAt < context.audio.currentTime) {
                // loaded too late, oh well
                console.log('play offset', context.audio.currentTime, context.audio.currentTime - playAt)
                player.start(context.audio.currentTime, context.audio.currentTime - playAt)
              } else {
                player.start(playAt)
              }
              player.connect(output)
            }
            updateLoading(-1)
          })
        }

        currentOffset += chunkDuration
      }
    })

    function stop (at) {
      if (stopAt == null || at < stopAt) {
        stopAt = at
        output.gain.setTargetAtTime(0, at, 0.001)
      }
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