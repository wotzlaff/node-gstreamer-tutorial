// translation of https://gstreamer.freedesktop.org/documentation/tutorials/basic/toolkit-integration.html

/// <reference path="@types/node-gtk/Gst-1.0.d.ts" />
/// <reference path="@types/node-gtk/GLib-2.0.d.ts" />
/// <reference path="@types/node-gtk/Gtk-3.0.d.ts" />

const gi = require('node-gtk')
// const Gst = gi.require('Gst', '1.0')
// const GLib = gi.require('GLib', '2.0')
// const Gtk = gi.require('Gtk', '3.0')
gi.startLoop()

// Initialize GTK
Gtk.init()
// Initialize GStreamer
Gst.init()


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
  playbin.on('video-tags-changed', () => {})
  playbin.on('audio-tags-changed', () => {})
  playbin.on('text-tags-changed', () => {})

  // Instruct the bus to emit signals for each received message, and connect to the interesting signals
  const bus = playbin.getBus()
  bus.on('message::error', () => {})
  bus.on('message::eos', () => {})
  bus.on('message::state-changed', () => {})
  bus.on('message::application', () => {})
  bus.unref()

  // Start playing
  if (playbin.setState(Gst.State.PLAYING) === Gst.StateChangeReturn.FAILURE) {
    console.error('Unable to set the pipeline to the playing state.')
    playbin.unref()
    return
  }

  // Register a function that GLib will call every second
  GLib.timeoutAddSeconds(GLib.PRIORITY_DEFAULT, 1, () => {
    console.log('tick')
    return true
  })

  // Start the GTK main loop. We will not regain control until gtk_main_quit is called.
  Gtk.main()

  // Free resources
  playbin.setState(Gst.State.NULL)
  playbin.unref()
}

main()
