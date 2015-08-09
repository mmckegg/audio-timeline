var Scheduler = require('./lib/scheduler')
var Timeline = require('./lib/timeline')

module.exports = function (parentContext) {
  var context = Object.create(parentContext)
  context.scheduler = Scheduler(context.audio)
  return Timeline(context)
}