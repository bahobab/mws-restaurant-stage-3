// set sw version
const CACHE_VER = 'VER_52';
const CACHE_STATIC = `RestoReviewsStatic_${CACHE_VER}`;
const CACHE_DYNAMIC = `RestoReviewsDynamic_${CACHE_VER}`;

// https://developer.mozilla.org/en-US/docs/Web/API/WorkerGlobalScope/importScripts
self.importScripts('./src/js/idb.min.js', './src/js/dbhelper.js');

// set static cache / app shell
const appAssets = [
    '/',
    '/index.html',
    '/restaurant.html',
    '/offline.html',
    '/src/css/styles.css',
    '/src/css/my-styles.css',
    '/src/css/css-reset.css',
    '/src/js/dbhelper.js',
    '/src/js/idb.min.js',
    '/src/js/main.min.js',
    '/src/js/restaurant_info.js',
    '/src/img/offline.jpg',
    '/src/img/dest/webp/1-md_1x.webp',
    '/src/img/dest/webp/2-md_1x.webp',
    '/src/img/dest/webp/3-md_1x.webp',
    '/src/img/dest/webp/4-md_1x.webp',
    '/src/img/dest/webp/5-md_1x.webp',
    '/src/img/dest/webp/6-md_1x.webp',
    '/src/img/dest/webp/7-md_1x.webp',
    '/src/img/dest/webp/8-md_1x.webp',
    '/src/img/dest/webp/9-md_1x.webp',
    '/src/img/dest/webp/10-md_1x.webp',
    '/src/img/dest/webp/not-a-restaurant.webp',
    'https://fonts.googleapis.com/css?family=Roboto:400,500',
    'https://fonts.gstatic.com/s/roboto/v18/KFOlCnqEu92Fr1MmEU9fBBc4AMP6lQ.woff2'
];
    
// install sw
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_STATIC)
            .then(cache => {
                console.log('[SW INSTALL] Precaching Static');
                return cache.addAll(appAssets);
            })
    );
});

// activate sw
self.addEventListener('activate', e => {
    // debugger;
    e.waitUntil(
        caches.keys()
            .then( keys => {
                return Promise.all(keys.map( key => {
                    // if ( (key !== CACHE_STATIC || key !== CACHE_DYNAMIC) && (key.match('RestoReviewsStatic_') || key.match('RestoReviewsDynamic_'))) {                    
                    if (key !== CACHE_STATIC && key !== CACHE_DYNAMIC) {
                        console.log('[DELETE CACHE KEY..] old keys');
                        return caches.delete(key);
                    }
                }))
            })
            .then(() => {
                console.log('[ServiceWorker] Claiming clients for version');
                return self.clients.claim();
            })
    );
    // e.waitUntil(cleaned);
    // return self.clients.claim();

    // from https://serviceworke.rs/immediate-claim_service-worker_doc.html

    // event.waitUntil(
    //     caches.keys().then(function(cacheNames) {
    //         return Promise.all(
    //           cacheNames.map(function(cacheName) {
    //             if (cacheName !== version) {
    //               console.log('[ServiceWorker] Deleting old cache:', cacheName);
    //               return caches.delete(cacheName);
    //             }
    //           })
    //         );
    //       }).then(function() {
    //         console.log('[ServiceWorker] Claiming clients for version', version);
    //         return self.clients.claim();
    //     })
    // );
});

self.addEventListener('fetch', evt => {
    const getCustomResponsePromise = async () => {
        try {
            // get form cache first
            const cachedResponse = await caches.match(evt.request);
            if (cachedResponse) {
                // respond with the value in the cache
                // cachedResponse.headers.set('Cache-control', 'max-age=3600');
                return cachedResponse;
            }
            // response not in cache, then respond with network
            const netResponse = await fetch(evt.request); // , {headers:{'Cache-control': 'max-age=3600'}}            

            // add fetched response to cache
            // const request = evt.request;
            // const url = new URL(request.url);
            
            if (evt.request.url.match(location.origin)) {
                let cache = await caches.open(CACHE_STATIC);
                cache.put(evt.request.url, netResponse.clone());
                return netResponse;
            } 
            else {
                let cache = await caches.open(CACHE_DYNAMIC);
                cache.put(evt.request.url, netResponse.clone());
            return netResponse;
            }

        } catch (error) {
            // return falback page
            console.log(`ERROR: ${error}`);
            const cache = await caches.open(CACHE_STATIC)
            return cache.match('/offline.html');
        }
    };

    evt.respondWith(getCustomResponsePromise());
});

self.addEventListener('sync', event => {
    if (event.tag === 'sync-reviews') {
        // https://www.kollegorna.se/en/2017/06/service-worker-gotchas/
        event.waitUntil(DBHelper.syncReviewToDatabaseServer()
            .then( () => {
                // self.registration.showNotification('Reviews Successfully Synched to Database Server');
                console.log('[SYNC BACKEND... Reviews Successfully Synched to Database Server]');
            })
            .catch(error => {
                console.log('Error Synching to Database Server', error);
            })
        );
    }
});