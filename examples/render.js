// electron app example (has filesystem access):
// run with electron-spawn

var Timeline = require('../')
var audioContext = new window.AudioContext() // Web Audio
var RenderStream = require('../render-stream')
var WaveFileWriter = require('wav/lib/file-writer')

var context = {
  audio: audioContext,
  output: audioContext.destination,
  fs: require('fs'),
  cwd: __dirname,
  nodes: {
    clip: require('../clip')
  }
}

var timeline = Timeline(context)
var filePath = '/Users/matt/Projects/Destroy With Science/Live Sets/Art~Hack 9 July 2015.wav'

timeline.set({
  primary: [
    { node: 'clip',
      src: filePath,
      startOffset: 0,
      duration: 10
    },
    { node: 'clip',
      src: filePath,
      startOffset: 500,
      duration: 10
    },
    { node: 'clip',
      src: filePath,
      startOffset: 1000,
      duration: 10
    },
    { node: 'clip',
      src: filePath,
      startOffset: 1500,
      duration: 10
    },
    { node: 'clip',
      src: filePath,
      startOffset: 2000,
      duration: 10
    }
  ]
})


// render to disk

var startOffset = 0
var duration = 50
var bitDepth = 16

var stream = RenderStream(timeline, startOffset, duration, bitDepth)
stream.pipe(WaveFileWriter('output.wav', {
  bitDepth: bitDepth,
  sampleRate: audioContext.sampleRate,
  channels: 2
})).on('finish', function() {
  console.log('done')
  require('remote').require('app').quit()
})

stream.progress(function(value) {
  console.log(Math.round(value*1000)/10)
})