# node-gstreamer-tutorial
In this repo we try to provide a version of the "Basic tutorial" for GStreamer under NodeJS using the great GObject Introspection bindings provided by [node-gtk](https://github.com/romgrk/node-gtk). At the moment not all functionalities of the GStreamer library are working. So stay tuned for a fully working version.

## Prerequisites
Install the depencies.
For ubuntu this probably means something like
```bash
apt install gobject-introspection libgstreamer1.0-0 gstreamer1.0-plugins-base gir1.2-gstreamer-1.0
```
But maybe some depencies are missing in the list.

## Installation
```bash
npm install
```

## Usage
Run `node src/tutorial-x.js` to start the example x.
