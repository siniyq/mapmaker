/**
 * Модуль отображения маршрутов на карте
 */
class RouteRenderer {
    constructor() {
        this.init();
    }
    
    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.initSaveHandlers();
            this.initRouteButtons();
        });
    }
    
    initSaveHandlers() {
        // Добавляем обработчик для кнопки сохранения маршрута
        const saveRouteButton = document.getElementById('save-route');
        if (saveRouteButton) {
            saveRouteButton.addEventListener('click', () => {
                this.saveCurrentRoute();
            });
        }
        
        // Добавляем обработчик для кнопки сохранения культурного маршрута
        const saveCulturalRouteButton = document.getElementById('save-cultural-route');
        if (saveCulturalRouteButton) {
            saveCulturalRouteButton.addEventListener('click', () => {
                this.saveCulturalRoute();
            });
        }
    }
    
    initRouteButtons() {
        // Добавляем обработчики к кнопкам построения маршрутов
        const culturalRouteButton = document.getElementById('cultural-route-button');
        if (culturalRouteButton) {
            culturalRouteButton.addEventListener('click', () => {
                // Сбрасываем тематический маршрут перед построением культурного
                window.hideAllRouteInfo();
                
                // Продолжаем с построением культурного маршрута
                if (typeof buildCulturalThematicRoute === 'function') {
                    buildCulturalThematicRoute();
                } else {
                    console.error('Функция buildCulturalThematicRoute не найдена');
                    NeoDialog.alert('Ошибка', 'Функция построения культурного маршрута недоступна');
                }
            });
        }

        // УДАЛЯЕМ ДУБЛИРУЮЩИЙСЯ ОБРАБОТЧИК ПЕРЕМЕШИВАНИЯ ТОЧЕК
        // Обработчик уже есть в thematic-route-builder.js
    }
    
    // Отображение маршрута
    displayRoute(routeData, poiData) {
        console.log('Вызвана функция displayRoute для отображения маршрута');
        
        // Удаляем предыдущий маршрут, если он существует
        if (window.routeLayer) {
            window.map.removeLayer(window.routeLayer);
            window.routeLayer = null;
        }
        
        // Очищаем POI маркеры
        this.clearPoiMarkers();

        if (routeData && routeData.paths && routeData.paths.length > 0) {
            const path = routeData.paths[0];
            const coordinates = path.points.coordinates;
            const latLngs = coordinates.map(coord => [coord[1], coord[0]]);

            // Создаем полилинию маршрута с цветом в зависимости от профиля
            window.routeLayer = L.polyline(latLngs, { 
                color: getRouteColor(window.currentProfile), 
                weight: 4,
                opacity: 0.8
            }).addTo(window.map);
            
            console.log(`Создан слой маршрута с ${latLngs.length} точками`);
            
            // Если есть данные о точках интереса, добавляем их как маркеры
            if (poiData && poiData.length > 0) {
                console.log(`Добавление ${poiData.length} точек интереса`);
                this.addPoiMarkers(poiData);
                this.addRouteDescription(poiData);
            }
                
            // Создаем маркеры начала и конца маршрута только если они не существуют
            if (!window.startMarker) {
                window.startMarker = L.marker(latLngs[0], {
                    icon: L.divIcon({className: 'route-marker-start', html: 'A', iconSize: [24, 24], iconAnchor: [12, 24]})
                }).addTo(window.map);
            }
            
            if (!window.endMarker) {
                window.endMarker = L.marker(latLngs[latLngs.length - 1], {
                    icon: L.divIcon({className: 'route-marker-end', html: 'B', iconSize: [24, 24], iconAnchor: [12, 24]})
                }).addTo(window.map);
            }

            window.map.fitBounds(window.routeLayer.getBounds());

            const distanceKm = (path.distance / 1000).toFixed(2);
            const timeMin = Math.round(path.time / 1000 / 60);
            
            // Отображаем информацию о тематическом маршруте
            if (window.infoDistance) window.infoDistance.textContent = distanceKm;
            if (window.infoTime) window.infoTime.textContent = timeMin;

            // Показываем панель информации о тематическом маршруте
            window.showThematicRouteInfo();

            console.log(`Маршрут построен: ${distanceKm} км, ${timeMin} мин.`);
        } else {
            console.error("Ошибка: Не удалось получить данные маршрута или маршрут пуст.", routeData);
            NeoDialog.alert("Ошибка", "Не удалось построить маршрут. Ответ API не содержит пути.");
        }
    }
    
    // Отображение простого маршрута А-Б (без POI)
    displaySimpleRoute(routeData) {
        console.log('Вызвана функция displaySimpleRoute для отображения простого маршрута А-Б');
        
        // Удаляем предыдущий маршрут, если он существует
        if (window.routeLayer) {
            window.map.removeLayer(window.routeLayer);
            window.routeLayer = null;
        }
        
        // Очищаем POI маркеры и скрываем информацию о тематических маршрутах
        this.clearPoiMarkers();
        window.hideAllRouteInfo();

        if (routeData && routeData.paths && routeData.paths.length > 0) {
            const path = routeData.paths[0];
            const coordinates = path.points.coordinates;
            const latLngs = coordinates.map(coord => [coord[1], coord[0]]);

            // Создаем полилинию маршрута с цветом в зависимости от профиля
            window.routeLayer = L.polyline(latLngs, { 
                color: getRouteColor(window.currentProfile), 
                weight: 4,
                opacity: 0.8
            }).addTo(window.map);
            
            console.log(`Создан слой простого маршрута с ${latLngs.length} точками`);
                
            // Создаем маркеры начала и конца маршрута только если они не существуют
            if (!window.startMarker) {
                window.startMarker = L.marker(latLngs[0], {
                    icon: L.divIcon({className: 'route-marker-start', html: 'A', iconSize: [24, 24], iconAnchor: [12, 24]})
                }).addTo(window.map);
            }
            
            if (!window.endMarker) {
                window.endMarker = L.marker(latLngs[latLngs.length - 1], {
                    icon: L.divIcon({className: 'route-marker-end', html: 'B', iconSize: [24, 24], iconAnchor: [12, 24]})
                }).addTo(window.map);
            }

            window.map.fitBounds(window.routeLayer.getBounds());

            const distanceKm = (path.distance / 1000).toFixed(2);
            const timeMin = Math.round(path.time / 1000 / 60);
            
            // Обновляем информацию в блоке простого маршрута
            if (window.simpleInfoDistance) window.simpleInfoDistance.textContent = distanceKm;
            if (window.simpleInfoTime) window.simpleInfoTime.textContent = timeMin;
            if (window.simpleRouteProfile) {
                const profileText = window.currentProfile === 'foot' ? 'Пешком' : 
                                   (window.currentProfile === 'bike' ? 'На велосипеде' : 'На автомобиле');
                window.simpleRouteProfile.textContent = profileText;
            }
            
            // Показываем блок информации о простом маршруте
            window.showSimpleRouteInfo();
            
            console.log(`Простой маршрут построен: ${distanceKm} км, ${timeMin} мин.`);

        } else {
            console.error("Ошибка: Не удалось получить данные маршрута или маршрут пуст.", routeData);
            NeoDialog.alert("Ошибка", "Не удалось построить маршрут. Ответ API не содержит пути.");
        }
    }
    
    addPoiMarkers(poiData) {
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
            window.poiMarkers.push(marker);
        });
    }
    
    addRouteDescription(poiData) {
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
        if (window.routeDescription) {
            window.routeDescription.innerHTML = descriptionHtml;
        }
    }
    
    clearPoiMarkers() {
        if (window.poiMarkers) {
            window.poiMarkers.forEach(marker => window.map.removeLayer(marker));
            window.poiMarkers = [];
        }
        
        // Очищаем описание тематического маршрута
        if (window.routeDescription) {
            window.routeDescription.innerHTML = '';
        }
    }
    
    saveCurrentRoute() {
        if (window.personalizationModule && window.routeLayer) {
            try {
                // Проверяем доступность данных маршрута
                const routeDistance = parseFloat(window.infoDistance?.textContent || '0');
                const routeTime = parseInt(window.infoTime?.textContent || '0');
                const routeProfile = window.currentProfile || 'foot';
                
                // Получаем точки маршрута
                const routePoints = window.routeLayer.getLatLngs();
                if (!routePoints || routePoints.length === 0) {
                    console.error('Ошибка: нет точек маршрута');
                    NeoDialog.alert('Ошибка', 'Маршрут не содержит точек');
                    return;
                }
                
                // Преобразуем точки в нужный формат
                const formattedPoints = routePoints.map(latlng => [latlng.lat, latlng.lng]);
                
                // Передаем данные маршрута и точек интереса
                const currentRouteData = {
                    distance: routeDistance,
                    time: routeTime,
                    profile: routeProfile,
                    points: formattedPoints
                };
                
                // Собираем данные о точках интереса
                const currentPoisData = this.collectPoiData();
                
                console.log('Данные маршрута для сохранения:', currentRouteData);
                console.log('Данные POI для сохранения:', currentPoisData);
            
                // Используем обновленный метод saveCurrentRoute, который возвращает Promise
                window.personalizationModule.saveCurrentRoute(currentRouteData, currentPoisData)
                    .catch(error => {
                        if (error) {
                            console.error('Ошибка при сохранении маршрута:', error);
                            NeoDialog.alert('Ошибка', `Ошибка при сохранении маршрута: ${error.message}`);
                        }
                    });
            } catch (error) {
                console.error('Ошибка при подготовке данных маршрута:', error);
                NeoDialog.alert('Ошибка', 'Ошибка при подготовке данных маршрута: ' + error.message);
            }
        } else {
            NeoDialog.alert('Внимание', 'Сначала постройте маршрут');
        }
    }
    
    saveCulturalRoute() {
        if (window.personalizationModule && window.culturalRouteLayer) {
            try {
                // Получаем данные о маршруте
                const distanceKm = document.getElementById('cultural-info-distance')?.textContent || '0';
                const timeMin = document.getElementById('cultural-info-time')?.textContent || '0';
                const routeProfile = getCurrentProfile();
                
                // Получаем точки маршрута
                const routePoints = window.culturalRouteLayer.getLatLngs();
                if (!routePoints || routePoints.length === 0) {
                    console.error('Ошибка: нет точек культурного маршрута');
                    NeoDialog.alert('Ошибка', 'Культурный маршрут не содержит точек');
                    return;
                }
                
                // Преобразуем точки в нужный формат
                const formattedPoints = routePoints.map(latlng => [latlng.lat, latlng.lng]);
                
                // Формируем данные маршрута
                const currentRouteData = {
                    distance: distanceKm,
                    time: timeMin,
                    profile: routeProfile,
                    points: formattedPoints
                };
                
                // Формируем данные точек интереса
                const currentPoisData = this.collectCulturalPoiData();
                
                console.log('Данные культурного маршрута для сохранения:', currentRouteData);
                console.log('Данные культурных POI для сохранения:', currentPoisData);
                
                // Вызываем функцию сохранения маршрута
                window.personalizationModule.saveCurrentRoute(currentRouteData, currentPoisData)
                    .then(() => {
                        NeoDialog.alert('Успех', 'Культурный маршрут успешно сохранен');
                    })
                    .catch(error => {
                        console.error('Ошибка при сохранении культурного маршрута:', error);
                        NeoDialog.alert('Ошибка', `Ошибка при сохранении культурного маршрута: ${error.message || 'Неизвестная ошибка'}`);
                    });
            } catch (error) {
                console.error('Ошибка при подготовке данных культурного маршрута:', error);
                NeoDialog.alert('Ошибка', 'Ошибка при подготовке данных культурного маршрута: ' + error.message);
            }
        } else {
            NeoDialog.alert('Внимание', 'Сначала постройте культурный маршрут');
        }
    }
    
    collectPoiData() {
        const currentPoisData = [];
        
        // Если есть маркеры POI, добавляем их
        if (window.poiMarkers && window.poiMarkers.length > 0) {
            window.poiMarkers.forEach((marker, index) => {
                const latLng = marker.getLatLng();
                let name = `Точка ${index + 1}`;
                let poiType = 'waypoint';
                let rating = null;
                
                // Пытаемся извлечь данные из попапа маркера
                if (marker._popup) {
                    const popupContent = marker._popup._content;
                    
                    // Извлекаем имя из тега <b>
                    const nameMatch = popupContent.match(/<b>(.*?)<\/b>/);
                    if (nameMatch && nameMatch[1]) {
                        name = nameMatch[1];
                    }
                    
                    // Пытаемся найти тип POI
                    const typeMatch = popupContent.match(/Тип: (.*?)(<br|$)/);
                    if (typeMatch && typeMatch[1]) {
                        poiType = typeMatch[1];
                    }
                    
                    // Пытаемся найти рейтинг
                    const ratingMatch = popupContent.match(/Рейтинг: (.*?)(<br|$)/);
                    if (ratingMatch && ratingMatch[1]) {
                        rating = parseFloat(ratingMatch[1]);
                    }
                }
                
                currentPoisData.push({
                    lat: latLng.lat,
                    lng: latLng.lng,
                    name: name,
                    type: poiType,
                    rating: rating
                });
            });
        } else {
            // Если нет маркеров POI, используем начальную и конечную точки маршрута
            if (window.routeLayer) {
                const routePoints = window.routeLayer.getLatLngs();
                if (routePoints.length > 0) {
                    const startPoint = routePoints[0];
                    currentPoisData.push({
                        lat: startPoint.lat,
                        lng: startPoint.lng,
                        name: 'Начало маршрута',
                        type: 'waypoint'
                    });
                    
                    const endPoint = routePoints[routePoints.length - 1];
                    if (endPoint && endPoint !== startPoint) {
                        currentPoisData.push({
                            lat: endPoint.lat,
                            lng: endPoint.lng,
                            name: 'Конец маршрута',
                            type: 'waypoint'
                        });
                    }
                }
            }
        }
        
        return currentPoisData;
    }
    
    collectCulturalPoiData() {
        const currentPoisData = [];
        
        // Если есть культурные маркеры, добавляем их
        if (window.culturalMarkers && window.culturalMarkers.length > 0) {
            window.culturalMarkers.forEach((marker, index) => {
                const latLng = marker.getLatLng();
                
                // Пытаемся получить данные из маркера
                let poiData = {
                    lat: latLng.lat,
                    lng: latLng.lng,
                    name: `Культурная точка ${index + 1}`,
                    type: 'cultural',
                    rating: null
                };
                
                // Если у маркера есть попап, извлекаем данные из него
                if (marker._popup) {
                    const popupContent = marker._popup._content;
                    
                    // Извлекаем название
                    const nameMatch = popupContent.match(/<h3>(.*?)<\/h3>/);
                    if (nameMatch && nameMatch[1]) {
                        // Удаляем номер из названия, если он есть
                        poiData.name = nameMatch[1].replace(/^\d+\.\s*/, '');
                    }
                    
                    // Извлекаем тип
                    const typeMatch = popupContent.match(/Тип:<\/strong>\s*(.*?)<\//);
                    if (typeMatch && typeMatch[1]) {
                        poiData.type = typeMatch[1];
                    }
                    
                    // Извлекаем рейтинг
                    const ratingMatch = popupContent.match(/Рейтинг:<\/strong>\s*(.*?)<\//);
                    if (ratingMatch && ratingMatch[1] && ratingMatch[1] !== 'Нет данных') {
                        poiData.rating = parseFloat(ratingMatch[1]);
                    }
                    
                    // Извлекаем фото URL, если есть
                    const photoMatch = popupContent.match(/<img src="(.*?)"/);
                    if (photoMatch && photoMatch[1]) {
                        poiData.photoUrl = photoMatch[1];
                    }
                }
                
                currentPoisData.push(poiData);
            });
        }
        
        return currentPoisData;
    }
}

// Инициализируем рендерер маршрутов
const routeRenderer = new RouteRenderer();

// Экспортируем для использования в других модулях
window.routeRenderer = routeRenderer; 