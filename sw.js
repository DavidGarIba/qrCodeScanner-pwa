const version = 1.2;
const cacheName = `MyCacheName ${version}`;
const libScripts = [
  'lib/grid.js',
  'lib/version.js',
  'lib/detector.js',
  'lib/formatinf.js',
  'lib/errorlevel.js',
  'lib/bitmat.js',
  'lib/datablock.js',
  'lib/bmparser.js',
  'lib/datamask.js',
  'lib/rsdecoder.js',
  'lib/gf256poly.js',
  'lib/gf256.js',
  'lib/decoder.js',
  'lib/qrcode.js',
  'lib/findpat.js',
  'lib/alignpat.js',
  'lib/databr.js'
];
const onsenUI = [
  'https://unpkg.com/onsenui@2.11.2/css/onsen-css-components.min.css',
  'https://unpkg.com/onsenui@2.11.2/css/onsenui-core.min.css',
  'https://unpkg.com/onsenui@2.11.2/css/onsenui.min.css',
  'https://unpkg.com/onsenui@2.11.2/js/onsenui.min.js',
  'https://unpkg.com/onsenui@2.11.2/css/material-design-iconic-font/css/material-design-iconic-font.min.css',
  'https://unpkg.com/onsenui@2.11.2/css/material-design-iconic-font/fonts/Material-Design-Iconic-Font.woff2'
];
const filesToCache = ["capture.js", ...libScripts, ...onsenUI];

/** 1 - USE SELF.IMPORTSCRIPTS TO IMPORT THE LIBRARY SCRIPTS **/
/** 1a - THIS WILL EXPOSE THE qrcode OBJECT IN YOUR SERVICE WORKER CODE **/
self.importScripts.apply(null, libScripts);
/** RESOURCE - https://developer.mozilla.org/en-US/docs/Web/API/WorkerGlobalScope/importScripts */

/** 2 - CREATE BROADCAST CHANNEL API INSTANCE **/
/** RESOURCE - https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API */
const channel = new BroadcastChannel('my_channel');

// channel.onmessage = (event) => {
//   console.log('Worker', event.data);
//   if (event.data && event.data.type === 'TEST') {
//       channel.postMessage({ type: 'TEST', value: 'Hi there!' });
//     }
// };

/** 3 - CREATE BROADCAST CHANNEL ONMESSAGE LISTENER TO PROCESS THE IMG USING THE LIBRARY **/
channel.onmessage = (event) => {
  /** 3a - YOUR ONMESSAGE LISTENER SHOULD RECEIVE THE IMAGE DATA, IMAGE WIDTH AND IMAGE HEIGHT **/
  // console.log('Process image event', event);
  // console.log('Process image event data', event.data);
   if (event.data && event.data.type && event.data.input) {
    const { type, input } = event.data;
    

  //   /** 3b - THEN SET THE qrcode.width, qrcode.height AND qrcode.imagedata PROPERTIES **/ 
     switch (type) {
       case 'PROCESS':
        qrcode.width = input.width;
        qrcode.height = input.height;
        qrcode.imagedata = input.imageData;
        // console.log(type, qrcode.width, qrcode.height, qrcode.imagedata);
        try {
          const result = qrcode.process();
          console.log(result);
          channel.postMessage({ 
            type: 'QR',
            input: result
          });
        } catch (e) {
          console.log('An error ocurred: ' + e);
        }
    }
  }
};


/** 3c - THEN CHECK FOR QRCODE DATA BY USING qrcode.process() **/
/** 3d - IF THIS DOES NOT THROW AN EXCEPTION: SEND THE RESULT BACK TO THE FRONT END TO TRIGGER THE COPY TO CLIPBOARD + TOAST NOTIFICATION **/
/** RESOURCE - https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API */
/** RESOURCE - https://github.com/LazarSoft/jsqrcode */


// const process = (input) => {
//   let result = false;
//   try {
//     qrcode.width = input.width;
//     qrcode.height = input.height;
//     qrcode.imagedata = input.imagedata;

//     result = qrcode.process();

//     channel.postMessage({ type: 'PROCESS', result });
//   } catch (e) {}
// }


self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(cacheName).then(async (cache) => {
    for (const file of filesToCache) {
      try {
        await cache.add(file);
      } catch(e) {
        console.error(file, e);
      }
    }
  }));
  console.log("Service Worker installed...");
});

self.addEventListener("fetch", (event) => {
  console.log(event.request.url, new Date());
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) return response;

      // Fallback to network and if it fails, return the offline page.
      return fetch(event.request).catch((error) => {
        console.log('Network error...', error);
        console.log('Attempting Offline fallback.');
        return caches.open(cacheName).then((cache) => {
          return cache.match("offline.html");
        });
      });
    })
  );
});

self.addEventListener("activate", (e) => {
  console.log("Service Worker: Activate");
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== cacheName) {
            console.log("Service Worker: Removing old cache", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});
