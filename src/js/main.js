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
    })
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
    // const favCb = document.createElement('input');
    // favCb.type = 'checkbox';
    // favCb.name = 'My Favorite';
    // favCb.checked = false;
    const myFav = document.createElement('span');
    myFav.innerHTML = '<input type="checkbox" cheked="false">My Favorite?'
    // myFav.append(favCb);
    nameFavWrapper.append(myFav);
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