const gi = require('node-gtk')
const Gst = gi.require('Gst', '1.0')
gi.startLoop()
Gst.init()

const pipeline = new Gst.Pipeline()
const src = Gst.ElementFactory.make('videotestsrc')
const sink = Gst.ElementFactory.make('autovideosink')
if (!pipeline || !src || !sink) {
  throw new Error('Not all elements could be created.')
}

// In the original example `gst_bin_add_many` is used...
pipeline.add(src)
pipeline.add(sink)
if (!src.link(sink)) {
  throw new Error('Elements could not be linked.')
}

src.pattern = 21 // = pinwheel
src.kt = 50

const ret = pipeline.setState(Gst.State.PLAYING)
if (ret === Gst.State.CHANGE_FAILURE) {
  throw new Error('Unable to set the pipelne to the playing state.')
}

const bus = pipeline.getBus()
const msg = bus.timedPopFiltered(Gst.CLOCK_TIME_NONE, Gst.MessageType.ERROR | Gst.MessageType.EOS)
if (msg) {
  if (msg.type === Gst.MessageType.ERROR) {
    console.log('Got error')
    const [err, debug] = msg.parseError()
    console.error(`Error received from element ${msg.src}: ${err.message}`)
  } else if (msg.type === Gst.MessageType.EOS) {
    console.log('End-Of-Stream reached.')
  } else {
    console.error('Unexpected message received.')
  }
}

pipeline.setState(Gst.State.NULL)

