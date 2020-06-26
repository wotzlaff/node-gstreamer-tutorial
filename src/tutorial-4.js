// translation of https://gstreamer.freedesktop.org/documentation/tutorials/basic/time-management.html

const gi = require('node-gtk')
const Gst = gi.require('Gst', '1.0')
gi.startLoop()


let duration = Gst.CLOCK_TIME_NONE
let terminate = false
let playing = false

let seekEnabled = false
let seekDone = false

let playbin = null

// Initialize GStreamer
Gst.init()

function main() {
  // Create the elements
  playbin = Gst.ElementFactory.make('playbin')
  if (!playbin) {
    console.error('Could not create playbin')
    return
  }

  // Set the URI to play
  gi._c.ObjectPropertySetter(playbin, 'uri', 'https://www.freedesktop.org/software/gstreamer-sdk/data/media/sintel_trailer-480p.webm')

  // Start playing
  if (playbin.setState(Gst.State.PLAYING) === Gst.State.CHANGE_FAILURE) {
    console.error('Unable to set the pipeline to the playing state.')
    return
  }

  // Listen to the bus
  const bus = playbin.getBus()
  while (!terminate) {
    const msg = bus.timedPopFiltered(100 * Gst.MSECOND, Gst.MessageType.STATE_CHANGED | Gst.MessageType.ERROR | Gst.MessageType.EOS | Gst.MessageType.DURATION_CHANGED)
    if (msg) {
      handleMessage(msg)
    } else {
      // We got no message, this means the timeout expired
      if (!playing) continue

      // Query the current position of the stream
      const [ok, current] = playbin.queryPosition(Gst.Format.TIME)
      if (!ok) {
        console.error('Could not query current position.')
      }

      // If we didn't know it yet, query the stream duration
      if (duration !== Gst.CLOCK_TIME_NONE) {
        const [ok, durationValue] = playbin.queryDuration(Gst.Format.TIME)
        if (!ok) {
          console.error('Could not query current duration.')
        }
        duration = durationValue
      }

      // Print current position and total duration
      console.log(`Position ${current} / ${duration}`)

      // If seeking is enabled, we have not done it yet, and the time is right, seek
      if (seekEnabled && !seekDone && current > 10 * Gst.SECOND) {
        console.log('Reached 10s, performing seek...')
        playbin.seekSimple(Gst.Format.TIME, Gst.SeekFlags.FLUSH | Gst.SeekFlags.KEY_UNIT, 30 * Gst.SECOND)
        seekDone = true
      }
    }
  }

  playbin.setState(Gst.State.NULL)
}

function handleMessage(msg) {
  switch (msg.type) {
    case Gst.MessageType.ERROR:
      console.log('Got error.')
      // TOOD: parse error
      terminate = true
      break
    case Gst.MessageType.EOS:
      console.log('End-Of-Stream reached.')
      terminate = true
      break
    case Gst.MessageType.DURATION_CHANGED:
      duration = Gst.CLOCK_TIME_NONE
      console.log('Duration changed.')
      break
    case Gst.MessageType.STATE_CHANGED:
      if (msg.src === playbin) {
        const [oldState, newState, pendingState] = msg.parseStateChanged()
        console.log(`Pipeline state changed from ${Gst.Element.stateGetName(oldState)} to ${Gst.Element.stateGetName(newState)}.`)
        playing = newState === Gst.State.PLAYING
        if (playing) {
          const query = Gst.Query.newSeeking(Gst.Format.TIME)
          if (playbin.query(query)) {
            const [_format, seekEnabledValue, startTime, endTime] = query.parseSeeking(null)
            seekEnabled = seekEnabledValue
            if (seekEnabled) {
              console.log(`Seeking is ENABLED from ${startTime} to ${endTime}`)
            } else {
              console.log('Seeking is DISABLED for this stream.')
            }
          }
        }
      }
      break
    default:
      console.error('Unknown message type:', msg)
      break
  }
}

main()
