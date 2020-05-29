// translation of https://gstreamer.freedesktop.org/documentation/tutorials/basic/dynamic-pipelines.html

const gi = require('node-gtk')
const Gst = gi.require('Gst', '1.0')
const GLib = gi.require('GLib', '2.0')
gi.startLoop()
Gst.init()

function main() {
  // Create pipeline
  const pipeline = new Gst.Pipeline()
  const src = Gst.ElementFactory.make('videotestsrc')
  const typefind = Gst.ElementFactory.make('typefind')
  if (!pipeline || !src || !typefind) {
    console.error('Not all elements could be created.')
    return
  }
  pipeline.add(src)
  pipeline.add(typefind)

  // Link elements
  if (!src.link(typefind)) {
    pipeline.unref()
    console.error('Elements could not be linked.')
    return
  }

  typefind.once('have-type', (probability, caps) => {
    console.log(`Got type with probability ${probability}:`)
    console.log(caps.toString())

    clearTimeout(timeout)
    pipeline.unref()
  })

  const ret = pipeline.setState(Gst.State.PLAYING)
  if (ret === Gst.State.CHANGE_FAILURE) {
    pipeline.unref()
    console.error('Unable to set the pipeline to the playing state.')
    return
  }

  // keep alive
  const timeout = setTimeout(() => {}, 5000)
}

main()
