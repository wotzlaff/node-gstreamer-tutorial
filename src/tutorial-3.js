// translation of https://gstreamer.freedesktop.org/documentation/tutorials/basic/dynamic-pipelines.html

const gi = require('node-gtk')
const Gst = gi.require('Gst', '1.0')
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

pipeline.add(src)
pipeline.add(convert)
pipeline.add(resample)
pipeline.add(sink)

if (!convert.link(resample) || !resample.link(sink)) {
  throw new Error('Elements could not be linked.')
}

src.uri = 'https://www.freedesktop.org/software/gstreamer-sdk/data/media/sintel_trailer-480p.webm'

src.on('pad-added', pad => {
  console.log(`Received new pad '${pad.getName()}' from '${src.getName()}':`)

  const sinkPad = convert.getStaticPad('sink')

  if (sinkPad.isLinked()) {
    console.log('We are already linked. Ignoring.')
    return
  }
  const caps = pad.getCurrentCaps()
  const struct = caps.getStructure(0)
  const type = struct.getName()
  if (!type.startsWith('audio/x-raw')) {
    console.log(`It has type '${type}' which is not raw audio. Ignoring.`)
    return
  }

  if (pad.link(sinkPad) < Gst.Pad.LINK_OK) {
    console.log(`Type is '${type}' but link failed.`)
  } else {
    console.log(`Link succeeded (type '${type}').`)
  }
})

const ret = pipeline.setState(Gst.State.PLAYING)
if (ret === Gst.State.CHANGE_FAILURE) {
  throw new Error('Unable to set the pipelne to the playing state.')
}

let terminate = false
const bus = pipeline.getBus()
while (!terminate) {
  const msg = bus.timedPopFiltered(Gst.CLOCK_TIME_NONE, Gst.MessageType.ERROR | Gst.MessageType.EOS)
  switch (msg.type) {
    case Gst.MessageType.ERROR:
      console.log('Got error.')
      // TODO: parse error
      terminate = true
      break
    case Gst.MessageType.EOS:
      console.log('End-Of-Stream reached.')
      terminate = true
      break
  }
}

pipeline.setState(Gst.State.NULL)

