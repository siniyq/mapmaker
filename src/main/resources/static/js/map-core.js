/**
 * Основной модуль для работы с картой, маршрутами и маркерами
 */

// Глобальные переменные карты
let routeLayer = null; // Слой для хранения текущего маршрута
let startMarker = null;
let endMarker = null;
let endPoint = null;   // {lat, lng}
let currentProfile = 'foot'; // Текущий выбранный профиль
let currentPoiType = 'restaurant'; // Тип точек интереса по умолчанию
let poiMarkers = []; // Массив маркеров POI для тематических маршрутов
let currentPois = [];
let selectedPoisIndexes = new Set();
let tileLayer; // Объявляем переменную для слоя карты

// Функция для установки стиля карты в зависимости от темы
function setMapStyle(isDark) {
    if (!window.map) return;
    
    if (tileLayer) {
        window.map.removeLayer(tileLayer);
    }
    
    const lightMapUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const darkMapUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    
    const mapUrl = isDark ? darkMapUrl : lightMapUrl;
    const attribution = isDark 
        ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
        
    tileLayer = L.tileLayer(mapUrl, {
        maxZoom: 19,
        attribution: attribution
    }).addTo(window.map);
}

// Очистка карты от маршрута и маркеров
function clearMap() {
    console.log('Вызвана функция clearMap()');
    
    // Удаляем слой маршрута, если он существует
    if (routeLayer) {
        console.log('Удаляю слой маршрута');
        window.map.removeLayer(routeLayer);
        routeLayer = null;
    }
    
    // Очищаем POI маркеры
    clearPoiMarkers();
    
    // Дополнительно очищаем культурный маршрут
    if (typeof clearCulturalRoute === 'function') {
        clearCulturalRoute();
    }
    
    // Очищаем все тепловые карты, если они есть
    if (window.heatmapLayer && typeof window.heatmapLayer.remove === 'function') {
        window.heatmapLayer.remove();
        window.heatmapLayer = null;
    }
    
    // Скрываем панели с информацией о маршруте
    const routeInfoPanel = document.getElementById('route-info-panel');
    if (routeInfoPanel) routeInfoPanel.style.display = 'none';
    
    const routeInfo = document.getElementById('route-info');
    if (routeInfo) routeInfo.style.display = 'none';
    
    console.log('Карта очищена от маршрута и маркеров');
}

// Очистка маркеров POI
function clearPoiMarkers() {
    poiMarkers.forEach(marker => window.map.removeLayer(marker));
    poiMarkers = [];
}

// Полный сброс маршрута и всех точек 
function fullResetPoints() {
    console.log('Вызвана функция fullResetPoints() для полного сброса');
    
    // Удаляем маркеры, если они существуют
    if (startMarker) {
        window.map.removeLayer(startMarker);
        startMarker = null;
    }
    
    if (endMarker) {
        window.map.removeLayer(endMarker);
        endMarker = null;
    }
    
    // Удаляем маршрут
    if (routeLayer) {
        window.map.removeLayer(routeLayer);
        routeLayer = null;
    }
    
    // Очищаем POI маркеры
    clearPoiMarkers();
    
    // Очищаем культурный маршрут
    if (typeof clearCulturalRoute === 'function') {
        clearCulturalRoute();
    } else if (window.culturalRouteLayer) {
        // Резервный вариант, если функция недоступна
        window.map.removeLayer(window.culturalRouteLayer);
        window.culturalRouteLayer = null;
        
        // Очищаем культурные маркеры, если они есть
        if (window.culturalMarkers && window.culturalMarkers.length > 0) {
            window.culturalMarkers.forEach(marker => window.map.removeLayer(marker));
            window.culturalMarkers = [];
        }
    }
    
    // Сбрасываем точки А и Б
    window.startPoint = null;
    endPoint = null;
    
    // Скрываем информацию о маршруте
    hideAllRouteInfo();
    
    console.log('Все точки и маршрут полностью сброшены');
}

// Функция для скрытия всех информационных панелей маршрутов
function hideAllRouteInfo() {
    const routeInfo = document.getElementById('route-info');
    if (routeInfo) routeInfo.style.display = 'none';
    
    const routeInfoPanel = document.getElementById('route-info-panel');
    if (routeInfoPanel) routeInfoPanel.style.display = 'none';
}

// Сброс только маршрута, но сохранение точек А и Б
function resetPoints() {
    clearMap();
    
    // Если точки А и Б существуют, восстанавливаем их маркеры
    if (window.startPoint) {
        if (!startMarker) {
            startMarker = L.marker([window.startPoint.lat, window.startPoint.lng], {
                icon: L.divIcon({className: 'route-marker-start', html: 'A', iconSize: [24, 24], iconAnchor: [12, 24]})
            }).addTo(window.map);
        }
    }
    
    if (endPoint) {
        if (!endMarker) {
            endMarker = L.marker([endPoint.lat, endPoint.lng], {
                icon: L.divIcon({className: 'route-marker-end', html: 'B', iconSize: [24, 24], iconAnchor: [12, 24]})
            }).addTo(window.map);
        }
    }
     
    console.log('Маршрут сброшен, точки сохранены.');
}

// Отображение маршрута
function displayRoute(routeData, poiData) {
    console.log('Вызвана функция displayRoute для отображения маршрута');
    
    // Удаляем предыдущий маршрут, если он существует
    if (routeLayer) {
        window.map.removeLayer(routeLayer);
        routeLayer = null;
    }
    
    // Очищаем POI маркеры
    clearPoiMarkers();

    if (routeData && routeData.paths && routeData.paths.length > 0) {
        const path = routeData.paths[0];
        const coordinates = path.points.coordinates;
        const latLngs = coordinates.map(coord => [coord[1], coord[0]]);

        // Создаем полилинию маршрута с цветом в зависимости от профиля
        routeLayer = L.polyline(latLngs, { 
            color: getRouteColor(currentProfile), 
            weight: 4,
            opacity: 0.8
        }).addTo(window.map);
        
        console.log(`Создан слой маршрута с ${latLngs.length} точками`);
        
        // Если есть данные о точках интереса, добавляем их как маркеры
        if (poiData && poiData.length > 0) {
            console.log(`Добавление ${poiData.length} точек интереса`);
            poiData.forEach((poi, index) => {
                const marker = L.marker([poi.latitude, poi.longitude], {
                    icon: L.divIcon({
                        className: 'route-marker-poi',
                        html: `<div style="
                            width: 24px;
                            height: 24px;
                            border-radius: 50%;
                            background-color: #2196F3;
                            color: white;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            font-weight: bold;
                            border: 2px solid white;
                            box-shadow: 0 0 4px rgba(0,0,0,0.5);">${index + 1}</div>`,
                        iconSize: [24, 24],
                        iconAnchor: [12, 12]
                    })
                }).addTo(window.map);
                
                // Добавляем всю доступную информацию в попап
                let popupContent = `<b>${poi.name}</b>`;
                if (poi.rating) popupContent += `<br>Рейтинг: ${poi.rating}`;
                if (poi.address) popupContent += `<br>Адрес: ${poi.address}`;
                if (poi.vicinity) popupContent += `<br>Район: ${poi.vicinity}`;
                
                // Добавляем фотографию, если она доступна
                if (poi.photoUrl) {
                    popupContent += `<br><img src="${poi.photoUrl}" alt="${poi.name}" style="max-width: 200px; max-height: 150px; margin-top: 5px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">`;
                }
                
                marker.bindPopup(popupContent);
                poiMarkers.push(marker);
            });

            // Добавляем описание маршрута
            let descriptionHtml = '<h4>Описание маршрута:</h4><ol>';
            poiData.forEach((poi, index) => {
                let poiDescription = `<li><b>${poi.name}</b> - ${poi.type}`;
                if (poi.rating) poiDescription += `, рейтинг: ${poi.rating}`;
                if (poi.vicinity) poiDescription += `, район: ${poi.vicinity}`;
                if (poi.address) poiDescription += `, адрес: ${poi.address}`;
                poiDescription += '</li>';
                descriptionHtml += poiDescription;
            });
            descriptionHtml += '</ol>';
            
            const routeDescription = document.getElementById('route-description');
            if (routeDescription) {
                routeDescription.innerHTML = descriptionHtml;
            }
        }
            
        // Создаем маркеры начала и конца маршрута только если они не существуют
        if (!startMarker) {
            startMarker = L.marker(latLngs[0], {
                icon: L.divIcon({className: 'route-marker-start', html: 'A', iconSize: [24, 24], iconAnchor: [12, 24]})
            }).addTo(window.map);
        }
        
        if (!endMarker) {
            endMarker = L.marker(latLngs[latLngs.length - 1], {
                icon: L.divIcon({className: 'route-marker-end', html: 'B', iconSize: [24, 24], iconAnchor: [12, 24]})
            }).addTo(window.map);
        }

        window.map.fitBounds(routeLayer.getBounds());

        const distanceKm = (path.distance / 1000).toFixed(2);
        const timeMin = Math.round(path.time / 1000 / 60);
        
        // Отображаем информацию о тематическом маршруте
        const infoDistance = document.getElementById('info-distance');
        const infoTime = document.getElementById('info-time');
        
        if (infoDistance) infoDistance.textContent = distanceKm;
        if (infoTime) infoTime.textContent = timeMin;

        // Показываем панель информации о тематическом маршруте
        showThematicRouteInfo();

        console.log(`Маршрут построен: ${distanceKm} км, ${timeMin} мин.`);
    } else {
        console.error("Ошибка: Не удалось получить данные маршрута или маршрут пуст.", routeData);
        if (typeof NeoDialog !== 'undefined') {
            NeoDialog.alert("Ошибка", "Не удалось построить маршрут. Ответ API не содержит пути.");
        }
    }
}

// Функция для отображения тематического маршрута и скрытия культурного
function showThematicRouteInfo() {
    // Сначала скрываем все
    hideAllRouteInfo();
    
    // Показываем только тематический маршрут
    const routeInfo = document.getElementById('route-info');
    if (routeInfo) routeInfo.style.display = 'block';
}

// Функция для отображения культурного маршрута и скрытия тематического
function showCulturalRouteInfo() {
    // Сначала скрываем все
    hideAllRouteInfo();
    
    // Показываем только культурный маршрут
    const routeInfoPanel = document.getElementById('route-info-panel');
    if (routeInfoPanel) routeInfoPanel.style.display = 'block';
}

// Запрос и отображение маршрута
function getAndDisplayRoute(startLat, startLon, endLat, endLon, profile) {
    console.log(`Запрос маршрута: A(${startLat},${startLon}) -> B(${endLat},${endLon}), Профиль: ${profile}`);
    
    // Показываем индикатор загрузки
    const loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'route-loading';
    loadingIndicator.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 15px;
        border-radius: 10px;
        z-index: 1000;
    `;
    loadingIndicator.innerHTML = 'Создание маршрута...';
    document.body.appendChild(loadingIndicator);
    
    fetch(`/api/route?startLat=${startLat}&startLon=${startLon}&endLat=${endLat}&endLon=${endLon}&profile=${profile}`)
        .then(response => {
            if (!response.ok) {
                // Попробуем прочитать тело ошибки, если оно есть
                return response.text().then(text => { 
                    throw new Error(`HTTP error! status: ${response.status}, message: ${text}`); 
                });
            }
            return response.json(); 
        })
        .then(data => {
            // Удаляем индикатор загрузки
            const loadingElem = document.getElementById('route-loading');
            if (loadingElem) document.body.removeChild(loadingElem);
            
            displayRoute(data);
        })
        .catch(error => {
            // Удаляем индикатор загрузки
            const loadingElem = document.getElementById('route-loading');
            if (loadingElem) document.body.removeChild(loadingElem);
            
            console.error('Ошибка при получении маршрута:', error);
            // Показываем более детальную ошибку пользователю
            if (typeof NeoDialog !== 'undefined') {
                NeoDialog.alert('Ошибка', `Произошла ошибка при построении маршрута: ${error.message}`);
            }
        });
}

// Экспортируем основные функции в глобальную область видимости
window.setMapStyle = setMapStyle;
window.clearMap = clearMap;
window.clearPoiMarkers = clearPoiMarkers;
window.fullResetPoints = fullResetPoints;
window.hideAllRouteInfo = hideAllRouteInfo;
window.resetPoints = resetPoints;
window.displayRoute = displayRoute;
window.showThematicRouteInfo = showThematicRouteInfo;
window.showCulturalRouteInfo = showCulturalRouteInfo;
window.getAndDisplayRoute = getAndDisplayRoute;

// Экспортируем переменные состояния
window.getMapState = () => ({
    routeLayer,
    startMarker,
    endMarker,
    endPoint,
    currentProfile,
    currentPoiType,
    poiMarkers,
    currentPois,
    selectedPoisIndexes
});

window.setMapState = (state) => {
    if (state.currentProfile) currentProfile = state.currentProfile;
    if (state.currentPoiType) currentPoiType = state.currentPoiType;
    if (state.endPoint) endPoint = state.endPoint;
}; 