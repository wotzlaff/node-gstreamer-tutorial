# node-gstreamer-tutorial
In this repo we try to provide a version of the "Basic tutorial" for GStreamer under NodeJS using the great GObject Introspection bindings provided by [node-gtk](https://github.com/romgrk/node-gtk). At the moment not all functionalities of the GStreamer library are working. So stay tuned for a fully working version.

## Prerequisites
Below we assume that you'll be using Debian or Ubuntu.
Install the dependencies in order and build `node-gtk`:
* For installation of node refer to [nodesource/distributions](https://github.com/nodesource/distributions/blob/master/README.md#debinstall).
* Install the dependencies to build `node-gtk`:
```bash
apt install git build-essential gobject-introspection libgstreamer1.0-0 gstreamer1.0-plugins-base gstreamer1.0-plugins-good gir1.2-gstreamer-1.0 gir1.2-gtk-3.0 libcairo2-dev libgirepository1.0-dev
```
* Clone and build [node-gtk](https://github.com/romgrk/node-gtk):
```bash
git clone https://github.com/romgrk/node-gtk
cd node-gtk
npm install
npm run build:full
npm link
cd ..
```
* Clone and install this repository:
```bash
 git clone https://github.com/wotzlaff/node-gstreamer-tutorial
 cd node-gstreamer-tutorial
 npm install
 npm link ../node-gtk
```
Note: Maybe some depencies are missing in the list.

## Usage
Run `node src/tutorial-x.js` to start the example x.
