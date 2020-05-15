// translation of https://gstreamer.freedesktop.org/documentation/tutorials/basic/dynamic-pipelines.html

const gi = require('node-gtk')
const Gst = gi.require('Gst', '1.0')
gi.require('GstBase', '1.0')
gi.startLoop()
Gst.init()

const pipeline = new Gst.Pipeline()
const src = Gst.ElementFactory.make('uridecodebin')
const convert = Gst.ElementFactory.make('audioconvert')
const resample = Gst.ElementFactory.make('audioresample')
const sink = Gst.ElementFactory.make('autoaudiosink')
if (!pipeline || !src || !convert || !resample || !sink) {
  throw new Error('Not all elements could be created.')
}

// In the original example `gst_bin_add_many` is used...
pipeline.add(src)
pipeline.add(convert)
pipeline.add(resample)
pipeline.add(sink)

if (!convert.link(resample) || !resample.link(sink)) {
  pipeline.unref()
  throw new Error('Elements could not be linked.')
}

src.uri = 'https://www.freedesktop.org/software/gstreamer-sdk/data/media/sintel_trailer-480p.webm'
src.on('pad-added', pad => {
  console.log('pad-added', pad)
  // TODO: handle event
})

const ret = pipeline.setState(Gst.State.PLAYING)
if (ret === Gst.State.CHANGE_FAILURE) {
  pipeline.unref()
  throw new Error('Unable to set the pipelne to the playing state.')
}

const bus = pipeline.getBus()
let terminate = false
while (!terminate) {
  const msg =  bus.timedPopFiltered(Gst.CLOCK_TIME_NONE, Gst.MessageType.ERROR | Gst.MessageType.EOS | Gst.MessageType.STATE_CHANGED)
  if (msg) {
    switch (msg.type) {
      case Gst.MessageType.ERROR:
        console.log('Got error')
        // FIXME: read error
        terminate = true
        break
      case Gst.MessageType.EOS:
        console.log('End-Of-Stream reached.')
        terminate = true
        break
      case Gst.MessageType.STATE_CHANGED:
        console.log('State changed')
        break
      default:
        console.error('Unexpected message received.')
        break
    }
    // We should probably do this, but unref is not yet available:
    // msg.unref()
  }
}

bus.unref()
pipeline.setState(Gst.State.NULL)
pipeline.unref()
