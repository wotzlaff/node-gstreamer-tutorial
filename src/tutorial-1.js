const gi = require('node-gtk')
const Gst = gi.require('Gst', '1.0')
gi.startLoop()
Gst.init()

const pipeline = Gst.parseLaunch('playbin uri=https://www.freedesktop.org/software/gstreamer-sdk/data/media/sintel_trailer-480p.webm')

pipeline.setState(Gst.State.PLAYING)

const bus = pipeline.getBus()
const msg =  bus.timedPopFiltered(Gst.CLOCK_TIME_NONE, Gst.MessageType.ERROR | Gst.MessageType.EOS)

// We should probably do this, but unref is not yet available:
// if (msg !== undefined) {
//   msg.unref()
// }

bus.unref()
pipeline.setState(Gst.State.NULL)
pipeline.unref()
