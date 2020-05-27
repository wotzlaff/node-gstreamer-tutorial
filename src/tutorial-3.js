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
  pipeline.unref()
  throw new Error('Elements could not be linked.')
}

// src.uri = 'https://www.freedesktop.org/software/gstreamer-sdk/data/media/sintel_trailer-480p.webm'
gi._c.ObjectPropertySetter(src, 'uri', 'https://www.freedesktop.org/software/gstreamer-sdk/data/media/sintel_trailer-480p.webm')
src.on('pad-added', pad => {
  console.log(`Received new pad '${pad.getName()}' from '${src.getName()}':`)

  const sinkPad = convert.getStaticPad('sink')
  function cleanup() {
    if (sinkPad) sinkPad.unref()
  }

  if (sinkPad.isLinked()) {
    console.log('We are already linked. Ignoring.')
    cleanup()
    return
  }
  const caps = pad.getCurrentCaps()
  const struct = caps.getStructure(0)
  const type = struct.getName()
  if (!type.startsWith('audio/x-raw')) {
    console.log(`It has type '${type}' which is not raw audio. Ignoring.`)
    cleanup()
    return
  }

  if (pad.link(sinkPad) < Gst.Pad.LINK_OK) {
    console.log(`Type is '${type}' but link failed.`)
  } else {
    console.log(`Link succeeded (type '${type}').`)
  }
  cleanup()
})

const ret = pipeline.setState(Gst.State.PLAYING)
if (ret === Gst.State.CHANGE_FAILURE) {
  pipeline.unref()
  throw new Error('Unable to set the pipelne to the playing state.')
}

// TODO: do this finally
// bus.unref()
// pipeline.setState(Gst.State.NULL)
// pipeline.unref()

// kepp alive
setInterval(() => {}, 5000)
