// translation of https://gstreamer.freedesktop.org/documentation/tutorials/basic/media-formats-and-pad-capabilities.html
const gi = require('node-gtk')
const Gst = gi.require('Gst', '1.0')
const GLib = gi.require('GLib', '2.0')
gi.startLoop()


let terminate = false

// Initialize GStreamer
Gst.init()

function main() {
  // Create the element factories
  const srcFactory = Gst.ElementFactory.find('audiotestsrc')
  const sinkFactory = Gst.ElementFactory.find('autoaudiosink')
  if (!srcFactory || !sinkFactory) {
    console.error('Not all element factories could be created.')
    return
  }

  // Print information about the pad templates of these factories
  printPadTemplateInformation(srcFactory)
  printPadTemplateInformation(sinkFactory)

  // Ask the factories to instantiate actual elements
  const src = srcFactory.create()
  const sink = sinkFactory.create()

  // Create the empty pipeline
  const pipeline = new Gst.Pipeline()

  if (!pipeline || !src || !sink) {
    console.error('Not all elements could be created.')
    return
  }

  // Build the pipeline
  pipeline.add(src)
  pipeline.add(sink)
  if (!src.link(sink)) {
    console.error('Elements could not be linked.')
    return
  }

  // Print initial negotiated caps (in NULL state)
  console.log('In NULL state:')
  printPadCapabilities(sink, 'sink')

  // Start playing
  if (pipeline.setState(Gst.State.PLAYING) === Gst.State.CHANGE_FAILURE) {
    console.error('Unable to set the pipeline to the playing state (check the bus for error messages).')
  }

  // Listen to the bus
  const bus = pipeline.getBus()
  while (!terminate) {
    const msg = bus.timedPopFiltered(Gst.CLOCK_TIME_NONE, Gst.MessageType.STATE_CHANGED | Gst.MessageType.ERROR | Gst.MessageType.EOS)
    if (!msg) continue

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
      case Gst.MessageType.STATE_CHANGED:
        if (msg.src === pipeline) {
          const [oldState, newState, pendingState] = msg.parseStateChanged()
          console.log(`Pipeline state changed from ${Gst.Element.stateGetName(oldState)} to ${Gst.Element.stateGetName(newState)}.`)
          printPadCapabilities(sink, 'sink')
        }
        break
      default:
        console.error('Unknown message type:', msg)
        break
    }
  }

  pipeline.setState(Gst.State.NULL)
}

function printPadTemplateInformation(factory) {
  console.log(`Pad Templates for ${factory.getName()}:`)
  if (factory.getNumPadTemplates() === 0) {
    console.log('  none')
    return
  }

  const templates = factory.getStaticPadTemplates()
  for (const template of templates) {
    switch (template.direction) {
      case Gst.PadDirection.SRC:
        console.log(`  SRC template: '${template.nameTemplate}'`)
        break
      case Gst.PadDirection.SINK:
        console.log(`  SINK template: '${template.nameTemplate}'`)
        break
      default:
        console.log(`  UNKNOWN!!! template: '${template.nameTemplate}'`)
        break
    }
    switch (template.presence) {
      case Gst.PadPresence.ALWAYS:
        console.log('    Availability: Always')
        break
      case Gst.PadPresence.SOMETIMES:
        console.log('    Availability: Sometimes')
        break
      case Gst.PadPresence.REQUEST:
        console.log('    Availability: On request')
        break
      default:
        console.log('    Availability: UNKNOWN!!!')
        break
    }
    // TODO: this is not yet working
    // const staticCaps = template.staticCaps
    // if (staticCaps.string) {
    //   console.log('    Capabilities:')
    //   const caps = stateCaps.get()
    //   printCaps(caps, '      ')
    // }

    // Instead we're doing this:
    const caps = template.getCaps()
    console.log('    Capabilities:')
    printCaps(caps, '      ')
    console.log('')
  }
}

function printCaps(caps, prefix) {
  if (!caps) return
  if (caps.isAny()) {
    console.log(prefix + 'ANY')
    return
  }
  if (caps.isEmpty()) {
    console.log(prefix + 'EMPTY')
    return
  }

  for (let i = 0; i < caps.getSize(); ++i) {
    const struct = caps.getStructure(i)
    console.log(prefix + struct.getName())
    struct.foreach((fieldId, val) => {
      const str = Gst.valueSerialize(val)
      console.log(prefix + ' ' + GLib.quarkToString(fieldId).padStart(15) + ' ' + str)
      // We should free the string here...
      return true
    })
  }
}

function printPadCapabilities(element, padName) {
  const pad = element.getStaticPad(padName)
  if (!pad) {
    console.error(`Could not retrieve pad '${padName}'`)
    return
  }

  // Retrieve negotiated caps (or acceptable caps if negotiation is not finished yet)
  let caps = pad.getCurrentCaps()
  if (!caps) {
    caps  = pad.queryCaps(null)
  }

  // Print and free
  console.log(`Caps for the ${padName} pad:`)
  printCaps(caps, '    ')
}

main()
