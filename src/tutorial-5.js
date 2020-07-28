// translation of https://gstreamer.freedesktop.org/documentation/tutorials/basic/toolkit-integration.html

const gi = require('node-gtk')
const GstVideo = gi.require('GstVideo', '1.0')
const Gst = gi.require('Gst', '1.0')
const GLib = gi.require('GLib', '2.0')
const GObject = gi.require('GObject', '2.0')
const Gtk = gi.require('Gtk', '3.0')
gi.startLoop()

// Initialize GTK
Gtk.init()
// Initialize GStreamer
Gst.init()

function createUI(data) {
  const mainWindow = new Gtk.Window(Gtk.WindowType.TOPLEVEL)
  mainWindow.connect('delete-event', () => {

  })
  const videoWindow = data.videoWindow = new Gtk.DrawingArea()
  videoWindow.setDoubleBuffered(false)
  videoWindow.connect('realize', () => {
    const window = videoWindow.getWindow()
    if (!window.ensureNative()) {
      console.error('Couldn\'t create native window needed for GstVideoOverlay!')
    }
    const overlay = Object.create(GstVideo.VideoOverlay.prototype, data.playbin)
    console.log(overlay)
    overlay.setWindowHandle(window)
  })
  videoWindow.connect('draw', () => {

  })
  
  const playButton = Gtk.Button.newFromIconName('media-playback-start', Gtk.IconSize.SMALL_TOOLBAR)
  playButton.connect('clicked', () => {
    data.playbin.setState(Gst.State.PLAYING)
  })
  const pauseButton = Gtk.Button.newFromIconName('media-playback-pause', Gtk.IconSize.SMALL_TOOLBAR)
  pauseButton.connect('clicked', () => {
    data.playbin.setState(Gst.State.PAUSED)
  })
  const stopButton = Gtk.Button.newFromIconName('media-playback-stop', Gtk.IconSize.SMALL_TOOLBAR)
  stopButton.connect('clicked', () => {
    data.playbin.setState(Gst.State.READY)
  })

  const slider = data.slider = Gtk.Scale.newWithRange(Gtk.Orientation.HORIZONTAL, 0, 100, 1)
  slider.setDrawValue(0)
  data.sliderUpdateSignalId = slider.connect('value-changed', () => {
    const value = slider.getValue()
    data.playbin.seekSimple(Gst.Format.TIME, Gst.SeekFlags.FLUSH | Gst.SeekFlags.KEY_UNIT, value * Gst.SECOND)
  })

  const streamList = new Gtk.TextView()
  streamList.setEditable(false)

  const controls = new Gtk.Box(Gtk.Orientation.HORIZONTAL, 0)
  controls.packStart(playButton, false, false, 2)
  controls.packStart(pauseButton, false, false, 2)
  controls.packStart(stopButton, false, false, 2)
  controls.packStart(slider, true, true, 2)

  const mainHBox = new Gtk.Box(Gtk.Orientation.HORIZONTAL, 0)
  mainHBox.packStart(videoWindow, true, true, 0)
  mainHBox.packStart(streamList, false, false, 2)

  const mainBox = new Gtk.Box(Gtk.Orientation.VERTICAL, 0)
  mainBox.packStart(mainHBox, true, true, 0)
  mainBox.packStart(controls, false, false, 0)
  mainWindow.add(mainBox)
  mainWindow.setDefaultSize(640, 480)
  mainWindow.showAll()
}

function refreshUI(data) {
  if (data.state === Gst.State.PAUSED) return
  if (data.duration === Gst.CLOCK_TIME_NONE) {
    const [res, duration] = data.playbin.queryDuration(Gst.Format.TIME)
    if(!res) {
      console.error('Could not query current duration.')
    } else {
      data.duration = duration
      data.slider.setRange(0, duration / Gst.SECOND)
    }
  }

  const [res, current] = data.playbin.queryPosition(Gst.Format.TIME)
  if (res && data.slider) {
    // data.slider.signalHandlerBlock(data.sliderUpdateSignalId)
    // data.slider.setValue(current / Gst.SECOND)
    // data.slider.signalHandlerUnblock(data.sliderUpdateSignalId)
  }
}

function main() {
  // Create the elements
  const playbin = Gst.ElementFactory.make('playbin')
  function tagsCb() {
    const nVideo = gi._c.ObjectPropertyGetter(playbin, 'n-video')
    const nAudio = gi._c.ObjectPropertyGetter(playbin, 'n-audio')
    const nText = gi._c.ObjectPropertyGetter(playbin, 'n-text')

    for (let i = 0; i < nVideo; ++i) {
      const tags = playbin.emit('get-video-tags', i)
      if (!tags) continue
      const codec = tags.getString(Gst.TAG_VIDEO_CODEC)
      console.log(`video stream ${i}: codec ${codec}`)
    }
  }

  if (!playbin) {
    console.error('Not all elements could be created.')
    return
  }

  // Set the URI to play
  // TODO: use non-internal setters?
  gi._c.ObjectPropertySetter(playbin, 'uri', 'file:///data/sintel_trailer-480p.webm')

  // Connect to interesting signals in playbin
  playbin.on('video-tags-changed', tagsCb)
  playbin.on('audio-tags-changed', tagsCb)
  playbin.on('text-tags-changed', tagsCb)

  // Create the GUI
  const data = {playbin}
  createUI(data)

  // Instruct the bus to emit signals for each received message, and connect to the interesting signals
  const bus = playbin.getBus()
  bus.addSignalWatch()
  bus.on('message::error', () => {
    console.log('message::error')
    Gtk.mainQuit()
    clearInterval(interval)
  })
  bus.on('message::eos', () => {
    console.log('message::eos')
    Gtk.mainQuit()
    clearInterval(interval)
  })
  bus.on('message::state-changed', () => {
    // console.log('message::state-changed')
  })
  bus.on('message::application', () => {
    console.log('message::application')
  })

  // Start playing
  if (playbin.setState(Gst.State.PLAYING) === Gst.StateChangeReturn.FAILURE) {
    console.error('Unable to set the pipeline to the playing state.')
    return
  }

  // Register a function that GLib will call every second
  GLib.timeoutAddSeconds(0, 1, () => {
    refreshUI(data)
    return true
  })

  const interval = setInterval(() => {}, 1000)
  // Start the GTK main loop. We will not regain control until gtk_main_quit is called.
  Gtk.main()

  // Free resources
  playbin.setState(Gst.State.NULL)
}

main()
