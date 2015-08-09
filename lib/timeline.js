var Struct = require('observ-struct')
var NodeArray = require('observ-node-array')
var map = require('observ-node-array/map')
var watchArray = require('observ-node-array/watch')
var Property = require('observ-default')

module.exports = AudioTimeline

function AudioTimeline (parentContext) {
  var context = Object.create(parentContext)  
  var output = context.output = context.audio.createGain()
  output.connect(parentContext.output || parentContext.audio.destination)

  var obs = Struct({
    primary: NodeArray(context)
  })

  obs.context = context
  obs.loading = Property(0)
  obs.primary.resolved = map(obs.primary, resolve)

  // track loading
  watchArray(obs.primary, function(node) {
    if (node.loading()) {
      obs.loading.set(obs.loading() + 1)
    }
    return node.loading(function (value) {
      if (value) {
        obs.loading.set(obs.loading() + 1)
      } else {
        obs.loading.set(obs.loading() - 1)
      }
    })
  })

  obs.resolved = Struct({
    primary: obs.primary.resolved
  })

  obs.start = function (at, offset, duration) {
    at = Math.max(at, context.audio.currentTime)
    offset = offset || 0

    var currentTime = at - offset
    obs.primary.forEach(function (clip, i) {
      var endTime = currentTime + clip.duration.resolved()      
      if (at < endTime) {
        if (at > currentTime) {
          clip.start(at, at - currentTime)
        } else {
          clip.start(currentTime)
        }
      }
      currentTime = endTime
    })

    if (duration) {
      obs.stop(at + duration)
    }

    return currentTime
  }

  obs.stop = function (at) {
    obs.primary.forEach(function (clip) {
      clip.stop(at)
    })
  }

  obs.destroy = function () {
    obs.primary.forEach(function (clip) {
      clip.destroy && clip.destroy()
    })
  }

  return obs
}

function resolve(node){
  return node && node.resolved || node
}