/**
 * IndexedDB operations.
*/

const DB_NAME = 'restaurantReviews';
const DB_VER = 1;
const RESTAURANT_STORE = 'Restaurants';
const SYNC_REVIEW_STORE = 'SyncReviews';
const SYNC_FAV_STORE = 'SyncFavorite';

const POST_REVIEW_URL = 'http://localhost:1337/reviews/';

//  create IndexedDB

const OpenIDB = idb.open(DB_NAME, DB_VER, function(upgradeDb) {
  if(!upgradeDb.objectStoreNames.contains(RESTAURANT_STORE)) {
    upgradeDb.createObjectStore(RESTAURANT_STORE, {keyPath: 'id'});
  }
  if(!upgradeDb.objectStoreNames.contains(SYNC_REVIEW_STORE)) {
    upgradeDb.createObjectStore(SYNC_REVIEW_STORE, {keyPath: 'id'});
  }
  if(!upgradeDb.objectStoreNames.contains(SYNC_FAV_STORE)) {
    upgradeDb.createObjectStore(SYNC_FAV_STORE, {keyPath: 'id'});
  }
});

function saveToIndexedDB(storeName, data) {
  return OpenIDB.then(db => {
    const transaction = db.transaction(storeName, 'readwrite');
    store = transaction.objectStore(storeName);
    try {
      Array.isArray(data)
        ? data.forEach(restaurant => store.put(restaurant))
        : store.put(data)
    } catch (error) {
      console.log(`### Error saving to IndexedDB: ${error}`);
    }
    return transaction.complete;
  })
}

function readFromIndexedDB(storeName, mode = 'readonly') {
  return OpenIDB.then(db => db.transaction(storeName, mode)
                              .objectStore(storeName)
                              .getAll());
}

function deleteDataFromIndexedDB(storeName, item, mode = 'readwrite') {
  return OpenIDB.then(db => {
    const transaction = db.transaction(storeName, mode);
    store = transaction.objectStore(storeName);
    store.delete(item.id);
  })
}

function updateData(data) {
  const url = `${DBHelper.DATABASE_URL.update_favorite}
                ${data.restaurant_id}/?is_favorite=${data.favorite}`
  return fetch(url,
    {
      mode: 'cors',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(data),
    }
  )
  .then(response => {
    return response;
  }, err => console.error('[PUT FAVORITE: FETCH ERROR]', err))
}

function postData(data) {
  return fetch(DBHelper.DATABASE_URL.post_review,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'accept': 'application/json'
      },
      mode: 'cors',
      body: JSON.stringify(data)
    }
  )
  .then(response => {
    // console.log('[RESPONSE IN FETCH]', response);
    return response;
  }, err => console.log('[POST REVIEW: ERROR IN FETCH]', err));
}

/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    return {
      get_restaurants:`http://localhost:1337/restaurants`,
      get_reviews: `http://localhost:1337/reviews`,
      post_review: 'http://localhost:1337/reviews',
      update_favorite: 'http://localhost:1337/restaurants/',
    };
  }

  /**
   * save favorite to IndexedDB.
   */

  static saveToSyncStore(type, data) {
    // console.log('### Saving review to synchstore', review);
    // updateData(data);
    type === 'review'
      ? saveToIndexedDB(SYNC_REVIEW_STORE, data)
      : saveToIndexedDB(SYNC_FAV_STORE, data)
  }

  /**
   * save favorite to IndexedDB.
   */

  // static saveFavoriteToSyncStore(favorite) {
  //   return saveToIndexedDB(SYNC_REVIEW_STORE, favorite);    
  // }

  /**
   * Read reviews from IndexedDB then post them to database.
   */

  // static async getDataFromSyncStore(mode = 'readonly') {
  //   const syncReviews = await readFromIndexedDB(SYNC_REVIEW_STORE, mode)
  //   return syncReviews;
  // }

  /**
   * Post reviews used by older browsers: not tested!!!
   */
  static async postReview(review) {
    const response = await postData(review)
    const postResults = await response.json();
    if (postResults.ok) {
      console.log('[POST REVIEW] to back end successfull');
    } else {
      console.log('[POST REVIEW] to back end failed!');
    }
  }


  /**
   * Delete a review from the IndexedDB.
  */
  static async deleteReviewFromSyncStore(item) {
    const deleteResult = await deleteDataFromIndexedDB(SYNC_REVIEW_STORE, item, 'readwrite');
    return deleteResult;
  }

  /**
   * Sync favorite to the backend server. Called from SW sync event.
  */

 static async syncFavoriteToDatabaseServer() {
  const favorites = await readFromIndexedDB(SYNC_FAV_STORE, 'readonly');
  return Promise.all(favorites.map(async favorite => {
    const { id, ...rest} = favorite;
    const response = await updateData(rest);
    if (response.ok) {
      // delete from IndexedDb
      return DBHelper.deleteReviewFromSyncStore(favorites);
    } else {
      throw error('ERROR POSTING/SYNCING favorites')
    }
  }));
}

  /**
   * Sync review to the backend server. Called from SW sync event.
  */

  static async syncReviewToDatabaseServer() {
    const reviews = await readFromIndexedDB(SYNC_REVIEW_STORE, 'readonly');
    return Promise.all(reviews.map(async review => {
      const { id, ...rest} = review;
      const response = await postData(rest);
        if (response.ok) {
          // delete from IndexedDb
          return DBHelper.deleteReviewFromSyncStore(review);
        } else {
          throw error('ERROR POSTING/SYNCING Review')
        }
      // });
    }));
  }

  /**
   * Fetch all reviews for a restaurants.
   */

   static async fetchRestaurantReviews(restaurantId, callback) {
    const response = await fetch(`${DBHelper.DATABASE_URL.get_reviews}/?restaurant_id=${restaurantId}`);
    //  console.log('[REVIEWS RESPONSE]', response);
    const json = await response.json();
    const reviews = json.map(review => {
      return {...review, date: new Date(review.createdAt).toLocaleDateString()}
    });
    //  console.log('[REVIEWS MAP]', reviews);
    callback(reviews);
   }

  /**
   * Fetch all restaurants.
   */

  static async fetchRestaurants(callback) {
    try { // using if (!response.ok) does not work off line with Failed to fetch error
      // console.log('==== fetching...')
      const response = await fetch(DBHelper.DATABASE_URL.get_restaurants);
      const restaurants = await response.json();
      saveToIndexedDB(RESTAURANT_STORE, restaurants);
      callback(null, restaurants);
    } catch (err) {
      // console.log('>> Offline error:', err);
      const restaurants = await readFromIndexedDB(RESTAURANT_STORE, 'readonly');
      // console.log(`Data from local IBD: ${restaurants}`);
      callback(null, restaurants);
      const error = (`Request failed. Returned status of ${err}`);
      callback(error, null);
    }
  }

  /**
   * Fetch a restaurant by its ID.
   */

  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */

  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */

  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */

  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */

  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */

  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */

  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */

  static imageUrlForRestaurant(restaurant) {
    // const images = restaurant.photograph.map(resto => `/img/dest/${resto}`);
    // return (images);
    // console.log(images);
    // handle restaurant.photograph === undefined here
    if (restaurant.photograph){
      return `/src/img/dest/webp/${restaurant.photograph}-md_1x.webp`;
    }
    return `/src/img/dest/webp/not-a-restaurant.webp`;
  }

  /**
   * Map marker for a restaurant.
   */

  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  }
}