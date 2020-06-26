// translation of https://gstreamer.freedesktop.org/documentation/tutorials/basic/toolkit-integration.html

const gi = require('node-gtk')
const Gst = gi.require('Gst', '1.0')
const GLib = gi.require('GLib', '2.0')
const Gtk = gi.require('Gtk', '3.0')
gi.startLoop()

// Initialize GTK
Gtk.init()
// Initialize GStreamer
Gst.init()

function update() {
  
}


function main() {
  // Create the elements
  const playbin = Gst.ElementFactory.make('playbin')

  if (!playbin) {
    console.error('Not all elements could be created.')
    return
  }

  // Set the URI to play
  // TODO: use non-internal setters?
  gi._c.ObjectPropertySetter(playbin, 'uri', 'https://www.freedesktop.org/software/gstreamer-sdk/data/media/sintel_trailer-480p.webm')

  // Connect to interesting signals in playbin
  playbin.on('video-tags-changed', () => {
    console.log('video-tags-changed')
    update()
  })
  playbin.on('audio-tags-changed', () => {
    console.log('audio-tags-changed')
    update()
  })
  playbin.on('text-tags-changed', () => {
    console.log('text-tags-changed')
    update()
  })

  // Instruct the bus to emit signals for each received message, and connect to the interesting signals
  const bus = playbin.getBus()
  bus.on('message::error', () => {
    console.log('message::error')
  })
  bus.on('message::eos', () => {
    console.log('message::eos')
  })
  bus.on('message::state-changed', () => {
    console.log('message::state-changed')
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
    console.log('tick')
    return true
  })

  // Start the GTK main loop. We will not regain control until gtk_main_quit is called.
  Gtk.main()

  // Free resources
  playbin.setState(Gst.State.NULL)
}

main()
