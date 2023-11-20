// translation of https://gstreamer.freedesktop.org/documentation/tutorials/basic/short-cutting-the-pipeline.html

const gi = require('node-gtk')
const Gst = gi.require('Gst', '1.0')
const GstAudio = gi.require('GstAudio', '1.0')
const GLib = gi.require('GLib', '2.0')
gi.startLoop()

// Initialize GStreamer
Gst.init()

// global constants
const CHUNK_SIZE = 1024
const SAMPLE_RATE = 44100

let sourceId = 0
let numSamples = 0
let data = {
  appsrc: undefined,
  a: 0,
  b: 1,
  c: 0,
  d: 1
}

function pushData () {
  const buf = Buffer.alloc(CHUNK_SIZE, 0)
  data.c += data.d
  data.d -= data.c / 1000
  const freq = 1100 + 1000 * data.d
  for (let i = 0; i < CHUNK_SIZE / 2; ++i) {
    data.a += data.b
    data.b -= data.a / freq
    buf.writeUInt16LE((500 * data.a) & 0xffff, i * 2)
  }
  // Create Gst.Buffer
  const buffer = Gst.Buffer.newWrapped(buf)
  buffer.dts = Gst.utilUint64Scale(numSamples, Gst.SECOND, SAMPLE_RATE)
  buffer.duration = Gst.utilUint64Scale(CHUNK_SIZE / 2, Gst.SECOND, SAMPLE_RATE)
  numSamples += CHUNK_SIZE / 2

  // Push the buffer into the appsrc
  const ret = data.appsrc.emit('push-buffer', buffer)

  if (ret !== Gst.FlowReturn.OK) {
    // We got some error, stop sending data
    return false
  }
  return true
}

function main () {
  // Create the elements
  const appsrc = (data.appsrc = Gst.ElementFactory.make('appsrc'))
  const tee = Gst.ElementFactory.make('tee')
  const aqueue = Gst.ElementFactory.make('queue', 'audio_queue')
  const aconvert1 = Gst.ElementFactory.make('audioconvert')
  const aresample = Gst.ElementFactory.make('audioresample')
  const asink = Gst.ElementFactory.make('autoaudiosink')
  const vqueue = Gst.ElementFactory.make('queue', 'video_queue')
  const aconvert2 = Gst.ElementFactory.make('audioconvert')
  const visual = Gst.ElementFactory.make('wavescope', 'visual')
  const vconvert = Gst.ElementFactory.make('videoconvert')
  const vsink = Gst.ElementFactory.make('autovideosink')
  const appqueue = Gst.ElementFactory.make('queue')
  const appsink = Gst.ElementFactory.make('appsink')

  // Create the empty pipeline
  const pipeline = new Gst.Pipeline()

  if (
    !appsrc ||
    !tee ||
    !aqueue ||
    !aconvert1 ||
    !aresample ||
    !asink ||
    !vqueue ||
    !aconvert2 ||
    !visual ||
    !vconvert ||
    !vsink ||
    !appqueue ||
    !appsink ||
    !pipeline
  ) {
    console.error('Not all elements could be created.')
    return
  }

  // Configure wavescope
  visual.shader = 0
  visual.style = 0

  // Configure appsrc
  const audioInfo = new GstAudio.AudioInfo()
  audioInfo.setFormat(GstAudio.AudioFormat.S16, SAMPLE_RATE, 1)
  const audioCaps = audioInfo.toCaps()
  console.log(audioCaps.toString())
  appsrc.caps = audioCaps
  appsrc.format = Gst.Format.TIME
  appsrc.on('need-data', size => {
    if (sourceId !== 0) return
    console.log('Start feeding.')
    sourceId = GLib.idleAdd(GLib.PRIORITY_DEFAULT_IDLE, pushData)
  })
  appsrc.on('enough-data', () => {
    if (sourceId === 0) return
    console.log('Stop feeding.')
    GLib.sourceRemove(sourceId)
    sourceId = 0
  })

  // Configure appsink
  appsink.emitSignals = true
  appsink.caps = audioCaps
  appsink.on('new-sample', () => {
    const sample = appsink.emit('pull-sample')
    if (sample) {
      process.stdout.write('*')
      return Gst.FlowReturn.OK
    }
    return Gst.FlowReturn.ERROR
  })

  pipeline.add(appsrc)
  pipeline.add(tee)
  pipeline.add(aqueue)
  pipeline.add(aconvert1)
  pipeline.add(aresample)
  pipeline.add(asink)
  pipeline.add(vqueue)
  pipeline.add(aconvert2)
  pipeline.add(visual)
  pipeline.add(vconvert)
  pipeline.add(vsink)
  pipeline.add(appqueue)
  pipeline.add(appsink)

  // Link all elements that can be automatically linked because they have "Always" pads
  const isLinked =
    appsrc.link(tee) &&
    aqueue.link(aconvert1) &&
    aconvert1.link(aresample) &&
    aresample.link(asink) &&
    vqueue.link(aconvert2) &&
    aconvert2.link(visual) &&
    visual.link(vconvert) &&
    vconvert.link(vsink) &&
    appqueue.link(appsink)
  if (!isLinked) {
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

  const teeAppPad = tee.getRequestPad('src_%u')
  console.log(`Obtained request pad ${teeAppPad.getName()} for app branch.`)
  const queueAppPad = appqueue.getStaticPad('sink')

  const padsLinked =
    teeAudioPad.link(queueAudioPad) === Gst.PadLinkReturn.OK &&
    teeVideoPad.link(queueVideoPad) === Gst.PadLinkReturn.OK &&
    teeAppPad.link(queueAppPad) === Gst.PadLinkReturn.OK
  if (!padsLinked) {
    console.error('Tee could not be linked.')
    return
  }

  // Instruct the bus to emit signals for each received message, and connect to the interesting signals
  const bus = pipeline.getBus()
  bus.addSignalWatch()
  bus.on('message::error', msg => {
    // const [err, debugInfo] = msg.parseError()
    console.error('Got error')
    loop.quit()
    clearInterval(interval)
  })

  // Start playing the pipeline
  pipeline.setState(Gst.State.PLAYING)

  // Create a GLib Main Loop and set it to run
  // FIXME: workaround to keep js code running
  const interval = setInterval(() => {}, 1000)
  const loop = new GLib.MainLoop(null, false)
  loop.run()

  // Release the request pads from the tee
  tee.releaseRequestPad(teeAudioPad)
  tee.releaseRequestPad(teeVideoPad)
  tee.releaseRequestPad(teeAppPad)

  // Free resources
  pipeline.setState(Gst.State.NULL)
}

main()
