audio-timeline
===

[Observ](https://github.com/raynos/observ-struct) object for arranging, trimming and adjusting multiple audio clips on a timeline using [Web Audio](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API).

[![NPM](https://nodei.co/npm/audio-timeline.png)](https://nodei.co/npm/audio-timeline/)

## Example

```js
var Timeline = require('audio-timeline')
var audioContext = new window.AudioContext() // Web Audio

var context = {
  audio: audioContext,
  output: audioContext.destination,
  fs: require('fs'),
  cwd: __dirname,
  nodes: {
    clip: require('audio-timeline/clip')
  }
}

var timeline = Timeline(context)
timeline.set({
  primary: [
    { node: 'clip',
      src: 'audio/raw.wav',
      startOffset: 0,
      duration: 25
    },
    { node: 'clip',
      src: 'audio/raw.wav',
      startOffset: 500,
      duration: 30
    },
    { node: 'clip',
      src: 'audio/raw.wav',
      startOffset: 1000,
      duration: 16
    }
  ]
})
```
### Playback

```js
var startAt = audioContext.currentTime + 0.1
var startOffset = 0
var duration = 71

timeline.start(startAt, startOffset, duration)
```

### Render to disk

```js
var RenderStream = require('audio-timeline/render-stream')

var startOffset = 0
var duration = 71
var bitDepth = 16

var stream = RenderStream(timeline, startOffset, duration, bitDepth)

stream.pipe(WaveFileWriter('output.wav', {
  bitDepth: bitDepth,
  sampleRate: audioContext.sampleRate,
  channels: 2
})).on('finish', function() {
  console.log('done')
})

stream.progress(function(value) {
  console.log(Math.round(value*100))
})
```