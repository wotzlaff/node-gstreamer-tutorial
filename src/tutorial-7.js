// translation of https://gstreamer.freedesktop.org/documentation/tutorials/basic/multithreading-and-pad-availability.html

/// <reference path="@types/node-gtk/Gst-1.0.d.ts" />

const gi = require('node-gtk')
const Gst = gi.require('Gst', '1.0')
gi.startLoop()

// Initialize GStreamer
Gst.init()

function main() {
  // Create the elements
  const asrc = Gst.ElementFactory.make('audiotestsrc')
  const tee = Gst.ElementFactory.make('tee')
  const aqueue = Gst.ElementFactory.make('queue', 'audio_queue')
  const aconvert = Gst.ElementFactory.make('audioconvert')
  const aresample = Gst.ElementFactory.make('audioresample')
  const asink = Gst.ElementFactory.make('autoaudiosink')
  const vqueue = Gst.ElementFactory.make('queue', 'video_queue')
  const visual = Gst.ElementFactory.make('wavescope', 'visual')
  const vconvert = Gst.ElementFactory.make('videoconvert')
  const vsink = Gst.ElementFactory.make('autovideosink')

  // Create the empty pipeline
  const pipeline = new Gst.Pipeline()

  if (!asrc || !tee || !aqueue || !aconvert || !aresample || !asink || !vqueue || !visual || !vconvert || !vsink || !pipeline) {
    console.error('Not all elements could be created.')
    return
  }

  // Configure elements
  // TODO: use non-internal setters?
  gi._c.ObjectPropertySetter(asrc, 'freq', 215.0)
  gi._c.ObjectPropertySetter(visual, 'shader', 0)
  gi._c.ObjectPropertySetter(visual, 'style', 1)

  pipeline.add(asrc)
  pipeline.add(tee)
  pipeline.add(aqueue)
  pipeline.add(aconvert)
  pipeline.add(aresample)
  pipeline.add(asink)
  pipeline.add(vqueue)
  pipeline.add(visual)
  pipeline.add(vconvert)
  pipeline.add(vsink)

  // Link all elements that can be automatically linked because they have "Always" pads
  if (!asrc.link(tee) || !aqueue.link(aconvert) || !aconvert.link(aresample) || !aresample.link(asink) || !vqueue.link(visual) || !visual.link(vconvert) || !vconvert.link(vsink)) {
    console.error('Elements could not be linked.')
    return
  }

  // Manually link the Tee, which has "Request" pads
  const teeAudioPad = tee.getRequestPad('src_%u')
  console.log(`Obtained request pad ${teeAudioPad.getName()} for audio branch.`)
  const queueAudioPad = aqueue.getStaticPad('sink')
  const teeVideoPad = tee.getRequestPad('src_%u')
  console.log(`Obtained request pad ${teeVideoPad.getName()} for video branch.`)
  const queueVideoPad = vqueue.getStaticPad('sink')
  if (teeAudioPad.link(queueAudioPad) !== Gst.PadLinkReturn.OK || teeVideoPad.link(queueVideoPad) !== Gst.PadLinkReturn.OK) {
    console.error('Tee could not be linked.')
    return
  }

  // Start playing the pipeline
  pipeline.setState(Gst.State.PLAYING)

  // Wait until error or EOS
  const bus = pipeline.getBus()
  const msg = bus.timedPopFiltered(Gst.CLOCK_TIME_NONE, Gst.MessageType.ERROR | Gst.MessageType.EOS)

  // Release the request pads from the tee
  tee.releaseRequestPad(teeAudioPad)
  tee.releaseRequestPad(teeVideoPad)

  pipeline.setState(Gst.State.NULL)
}

main()
