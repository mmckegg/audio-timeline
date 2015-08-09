// electron app example (has filesystem access):
// run with electron-spawn

var Timeline = require('../')
var audioContext = new window.AudioContext() // Web Audio

var context = {
  audio: audioContext,
  output: audioContext.destination,
  fs: require('fs'),
  cwd: __dirname,
  nodes: {
    clip: require('../streaming-clip')
  }
}

var timeline = Timeline(context)
var filePath = '/Users/matt/Projects/Destroy With Science/Live Sets/Art~Hack 9 July 2015.wav'

timeline.set({
  primary: [
    { node: 'clip',
      src: filePath,
      startOffset: 0,
      duration: 3
    },
    { node: 'clip',
      src: filePath,
      startOffset: 500,
      duration: 10
    },
    { node: 'clip',
      src: filePath,
      startOffset: 1000,
      duration: 5
    },
    { node: 'clip',
      src: filePath,
      startOffset: 1500,
      duration: 6
    },
    { node: 'clip',
      src: filePath,
      startOffset: 2000,
      duration: 10
    }
  ]
})

// playback
var loaded = false
timeline.loading(function(value) {
  console.log('loading', value)
  if (!loaded && !value) {
    loaded = true
    timeline.start(audioContext.currentTime + 0.1)
  }
})