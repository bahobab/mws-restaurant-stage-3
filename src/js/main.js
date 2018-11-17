// register SW

if (navigator.serviceWorker) {
    navigator.serviceWorker.register('sw.js').catch(console.error)
}

let restaurants, neighborhoods, cuisines
var map
var markers = []
document.addEventListener('DOMContentLoaded', (event) => {
    fetchNeighborhoods();
    fetchCuisines()
});

fetchNeighborhoods = () => {
    DBHelper.fetchNeighborhoods((error, neighborhoods) => {
        if (error) {
        console.error(error)
        } else {
        self.neighborhoods = neighborhoods;
        fillNeighborhoodsHTML()
        }
    })
}

fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
    const select = document.getElementById('neighborhoods-select');
    select.role = "selection";
    neighborhoods.forEach(neighborhood => {
        const option = document.createElement('option');
        option.innerHTML = neighborhood;
        option.value = neighborhood;
        select.append(option)
    })
}

fetchCuisines = () => {
    DBHelper.fetchCuisines((error, cuisines) => {
        if (error) {
        console.error(error)
        } else {
        self.cuisines = cuisines;
        fillCuisinesHTML()
        }
    })
}

fillCuisinesHTML = (cuisines = self.cuisines) => {
    const select = document.getElementById('cuisines-select');
    select.role = "selection";
    cuisines.forEach(cuisine => {
        const option = document.createElement('option');
        option.innerHTML = cuisine;
        option.value = cuisine;
        select.append(option)
    })
}

window.initMap = () => {
    let loc = {
        lat: 40.722216,
        lng: -73.987501
    };
    self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 12,
        center: loc,
        scrollwheel: !1
    });
    updateRestaurants()
}

updateRestaurants = () => {
    const cSelect = document.getElementById('cuisines-select');
    const nSelect = document.getElementById('neighborhoods-select');
    const cIndex = cSelect.selectedIndex;
    const nIndex = nSelect.selectedIndex;
    const cuisine = cSelect[cIndex].value;
    const neighborhood = nSelect[nIndex].value;
    DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
        if (error) {
        console.error(error)
        } else {
        resetRestaurants(restaurants);
        fillRestaurantsHTML()
        }
    });
}

resetRestaurants = (restaurants) => {
    self.restaurants = [];
    const ul = document.getElementById('restaurants-list');
    ul.innerHTML = '';
    self.markers.forEach(m => m.setMap(null));
    self.markers = [];
    self.restaurants = restaurants
}

fillRestaurantsHTML = (restaurants = self.restaurants) => {
    const ul = document.getElementById('restaurants-list');
    ul.role = 'list';
    restaurants.forEach(restaurant => {
        ul.append(createRestaurantHTML(restaurant))
    });
    addMarkersToMap();

    // handle setting of favorite restaurant
    // if ('SyncManager' in window) {
    //     console.log('[SW Ready...]', navigator.serviceWorker);
    //     navigator.serviceWorker.ready
    //     .then(sw => {
            handleFavorite()
    //         .then(() => {
    //             return sw.sync.register('sync-favorite')

    //         })
    //         .then(() => console.log('[SYNC FAVORITE REG] success'))
    //         .catch(() => console.error('[SYNC FAVORITE REG] failed'));
    //     });
    // }
}

handleFavorite = () => {
    const restaurantList = document.getElementById('restaurants-list');
    restaurantList.addEventListener('click', (event) => {
        const favoriteCheckboxes = document.querySelectorAll(`#restaurants-list li input`);
        for (let checkbox of favoriteCheckboxes) {
            if (checkbox.id === event.target.id) {
                const restaurantId = Number(checkbox
                                            .attributes
                                            .restaurantid
                                            .value
                                        );
                return DBHelper.saveToSyncStore(
                    'favorite',
                    {
                        id: new Date().toISOString(),
                        restaurant_id: restaurantId,
                        favorite: checkbox.checked,
                    }
                );
            }
            
        }
    });
}

createRestaurantHTML = (restaurant) => {
    const li = document.createElement('li');
    li.role = "listitem";
    li.role = "tab";
    const image = document.createElement('img');
    image.alt = `${restaurant.name} image`;

    image.className = 'restaurant-img';
    image.src = DBHelper.imageUrlForRestaurant(restaurant);
    li.append(image);

    // name favorite wrapper
    const nameFavWrapper = document.createElement('div');
    nameFavWrapper.className = 'name-fav-wrapper';
    nameFavWrapper.id = 'name-Fav-Wrapper';

    const name = document.createElement('h3');
    name.innerHTML = restaurant.name;
    nameFavWrapper.append(name);

    const favCheckbox = document.createElement('input');
    favCheckbox.type = 'checkbox';
    favCheckbox.name = 'My Favorite';
    favCheckbox.checked = restaurant.is_favorite;
    favCheckbox.setAttribute('checked', restaurant.is_favorite);
    favCheckbox.setAttribute('restaurantId', restaurant.id);
    favCheckbox.id = restaurant.id;

    const myFavSpan = document.createElement('span');
    myFavSpan.innerHTML = `<em>My Favorite?</em>`
    myFavSpan.append(favCheckbox);
    nameFavWrapper.append(myFavSpan);
    li.append(nameFavWrapper);

    const neighborhood = document.createElement('p');
    neighborhood.innerHTML = restaurant.neighborhood;
    li.append(neighborhood);

    const address = document.createElement('p');
    address.innerHTML = restaurant.address;
    li.append(address);

    const more = document.createElement('a');
    more.innerHTML = 'View Details';
    more.href = DBHelper.urlForRestaurant(restaurant);
    more.role = "button";
    li.append(more)
    return li
}


addMarkersToMap = (restaurants = self.restaurants) => {
    restaurants.forEach(restaurant => {
        const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
        google.maps.event.addListener(marker, 'click', () => {
        window.location.href = marker.url
        });
        self.markers.push(marker)
    })
}