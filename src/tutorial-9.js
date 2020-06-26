// translation of https://gstreamer.freedesktop.org/documentation/tutorials/basic/media-information-gathering.html

const gi = require('node-gtk')
const Gst = gi.require('Gst')
const GstPbutils = gi.require('GstPbutils')
const GLib = gi.require('GLib')
gi.startLoop()

// Initialize GStreamer
Gst.init()


function main() {
  // if a URI was provided, use it instead of the default one
  const uri = process.argv[2] || 'https://www.freedesktop.org/software/gstreamer-sdk/data/media/sintel_trailer-480p.webm'
  console.log(`Discovering '${uri}'`);

  // Instantiate the Discoverer
  const discoverer = new GstPbutils.Discoverer()

  // Connect to the interesting signals
  discoverer.on('discovered', () => {

  })
  discoverer.on('finished', () => {

  })

  // Start the discoverer process (nothing to do yet)
  discoverer.start()

  // Add a request to process asynchronously the URI passed through the command line
  
  if (discoverer.discoverUriAsync(uri)) {
    console.error(`Failed to start discovering URI '${uri}'\n`);
    return
  }

  // Create a GLib Main Loop and set it to run, so we can wait for the signals
  const loop = new GLib.MainLoop(null, false)
  loop.run()

  // Stop the discoverer process
  discoverer.stop()
}

main()
