const gi = require('node-gtk')
const Gst = gi.require('Gst', '1.0')
gi.startLoop()
Gst.init()

const pipeline = Gst.parseLaunch('playbin uri=https://www.freedesktop.org/software/gstreamer-sdk/data/media/sintel_trailer-480p.webm')

pipeline.setState(Gst.State.PLAYING)

const bus = pipeline.getBus()

let done = false
while (!done) {
  const msg = bus.timedPopFiltered(Gst.CLOCK_TIME_NONE, Gst.MessageType.ERROR | Gst.MessageType.EOS | Gst.MessageType.STATE_CHANGED)
  if (msg) {
    switch (msg.type) {
      case Gst.MessageType.ERROR:
        console.log('Got error')
        // Something like this should work to obtain details:
        // const [err, debug] = msg.parseError()
        // console.error(`Error received from element ${msg.src}: ${msg.message}`)
        // err.clear()
        done = true
        break
      case Gst.MessageType.EOS:
        console.log('End-Of-Stream reached.')
        done = true
      case Gst.MessageType.STATE_CHANGED:
        const msgSrc = msg.src.getName()
        const [oldState, newState, pendingState] = msg.parseStateChanged()
        console.log(`State of ${msgSrc} changed: ${Gst.Element.stateGetName(oldState)} -> ${Gst.Element.stateGetName(newState)}.`)
        break
      default:
        console.error('Unexpected message received.')
        break
    }
  } else {
    console.log('Timeout?')
  }
}


pipeline.setState(Gst.State.NULL)
