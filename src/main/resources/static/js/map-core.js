/**
 * Основной модуль управления картой
 */
class MapCore {
    constructor() {
        this.init();
    }
    
    init() {
        this.initMapAndVariables();
        this.initUIElements();
        
        document.addEventListener('DOMContentLoaded', () => {
            this.initEventListeners();
        });
    }
    
    initMapAndVariables() {
        // Инициализация карты
        window.map = L.map('map-container').setView([55.19, 30.20], 13);
        
        // Глобальные переменные
        window.routeLayer = null; // Слой для хранения текущего маршрута
        window.startMarker = null;
        window.endMarker = null;
        window.startPoint = null; // {lat, lng} - делаем глобально доступной
        window.endPoint = null;   // {lat, lng}
        window.currentProfile = 'foot'; // Текущий выбранный профиль
        window.currentPoiType = 'restaurant'; // Тип точек интереса по умолчанию
        window.poiMarkers = []; // Массив маркеров POI для тематических маршрутов
        window.currentPois = [];
        window.selectedPoisIndexes = new Set();
        window.tileLayer = null; // Объявляем переменную для слоя карты
        
        // Инициализируем тайловый слой
        const savedTheme = localStorage.getItem('mapmaker-theme');
        this.initTileLayer(savedTheme === 'dark');
    }
    
    initTileLayer(isDark) {
        const lightMapUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        const darkMapUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
        
        const mapUrl = isDark ? darkMapUrl : lightMapUrl;
        const attribution = isDark 
            ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
            
        window.tileLayer = L.tileLayer(mapUrl, {
            maxZoom: 19,
            attribution: attribution
        }).addTo(window.map);
    }
    
    initUIElements() {
        // Получаем ссылки на элементы UI
        window.routeInfoPanel = document.getElementById('route-info-panel');
        window.routeSummary = document.querySelector('#route-info-panel .route-summary');
        window.routePointsList = document.querySelector('#route-info-panel .route-points-list');
        window.saveCulturalRouteButton = document.getElementById('save-cultural-route');
        window.routeInfo = document.getElementById('route-info');
        window.infoDistance = document.getElementById('info-distance');
        window.infoTime = document.getElementById('info-time');
        window.routeDescription = document.getElementById('route-description');
        
        // Элементы простого маршрута А-Б
        window.simpleInfoDistance = document.getElementById('simple-info-distance');
        window.simpleInfoTime = document.getElementById('simple-info-time');
        window.simpleRouteProfile = document.getElementById('simple-route-profile');
        window.profileButtons = document.getElementById('profile-buttons');
        window.resetButton = document.getElementById('reset-button');
        window.poiButtons = document.getElementById('poi-buttons');
        window.thematicRouteButton = document.getElementById('thematic-route-button');
        window.poiCountSlider = document.getElementById('poi-count-slider');
        window.poiCountValue = document.getElementById('poi-count-value');
        window.shufflePoiButton = document.getElementById('shuffle-poi-button');
        window.saveRouteButton = document.getElementById('save-route');
    }
    
    initEventListeners() {
        this.initMapClickHandler();
        this.initProfileButtons();
        this.initResetButton();
        this.initPoiCountSlider();
        this.initCategoryTabs();
        this.initUIEventHandlers();
    }
    
    initMapClickHandler() {
        // Клик по карте для выбора точек А и Б
        window.map.on('click', (e) => {
            const clickedLat = e.latlng.lat;
            const clickedLng = e.latlng.lng;

            // Полностью очищаем карту перед любыми действиями
            if (window.routeLayer) {
                window.map.removeLayer(window.routeLayer);
                window.routeLayer = null;
            }
            
            // Удаляем все существующие маркеры
            if (window.startMarker) {
                window.map.removeLayer(window.startMarker);
                window.startMarker = null;
            }
            
            if (window.endMarker) {
                window.map.removeLayer(window.endMarker);
                window.endMarker = null;
            }
            
            // Очищаем маркеры POI и скрываем информацию о маршруте
            this.clearPoiMarkers();
            const routeInfo = document.getElementById('route-info');
            if (routeInfo) routeInfo.style.display = 'none';

            if (!window.startPoint) {
                // Выбираем точку А (первый клик)
                console.log('Выбор точки А (первый клик)');
                window.startPoint = { lat: clickedLat, lng: clickedLng };
                window.startMarker = L.marker([clickedLat, clickedLng], {
                     icon: L.divIcon({className: 'route-marker-start', html: 'A', iconSize: [24, 24], iconAnchor: [12, 24]})
                }).addTo(window.map);
                console.log('Точка А выбрана:', window.startPoint);
            } else if (!window.endPoint) {
                // Выбираем точку Б и строим маршрут
                console.log('Выбор точки Б (второй клик)');
                window.endPoint = { lat: clickedLat, lng: clickedLng };
                
                // Восстанавливаем маркер точки А, который мы удалили выше
                window.startMarker = L.marker([window.startPoint.lat, window.startPoint.lng], {
                    icon: L.divIcon({className: 'route-marker-start', html: 'A', iconSize: [24, 24], iconAnchor: [12, 24]})
                }).addTo(window.map);
                
                console.log('Точка Б выбрана:', window.endPoint);
                this.getAndDisplayRoute(window.startPoint.lat, window.startPoint.lng, window.endPoint.lat, window.endPoint.lng, window.currentProfile);
            } else {
                // Сбрасываем предыдущие точки и начинаем заново с точки А
                console.log('Сброс точек и выбор новой точки А');
                window.startPoint = { lat: clickedLat, lng: clickedLng };
                window.endPoint = null;
                
                // Создаем только маркер точки А
                 window.startMarker = L.marker([clickedLat, clickedLng], {
                     icon: L.divIcon({className: 'route-marker-start', html: 'A', iconSize: [24, 24], iconAnchor: [12, 24]})
                }).addTo(window.map);
                
                console.log('Старые точки сброшены. Новая точка А выбрана:', window.startPoint);
            }
        });
    }
    
    initProfileButtons() {
        // Выбор профиля транспорта
        if (window.profileButtons) {
            window.profileButtons.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON') {
                    const selectedProfile = e.target.id.replace('profile-', '');
                    if (selectedProfile !== window.currentProfile) {
                        window.currentProfile = selectedProfile;
                        // Обновляем активную кнопку
                        window.profileButtons.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
                        e.target.classList.add('active');
                        console.log('Выбран профиль:', window.currentProfile);
                        // Если точки А и Б уже выбраны, перестраиваем маршрут
                        if (window.startPoint && window.endPoint) {
                            this.getAndDisplayRoute(window.startPoint.lat, window.startPoint.lng, window.endPoint.lat, window.endPoint.lng, window.currentProfile);
                        }
                    }
                }
            });
        }
    }
    
    initResetButton() {
        // Кнопка сброса
        if (window.resetButton) {
            window.resetButton.addEventListener('click', () => {
                console.log('Кнопка сброса нажата, вызываю полный сброс точек');
                this.fullResetPoints(); // Используем полный сброс
            });
        }
    }
    
    initPoiCountSlider() {
        // Обновление отображаемого значения слайдера
        if (window.poiCountSlider && window.poiCountValue) {
            window.poiCountSlider.addEventListener('input', function() {
                window.poiCountValue.textContent = this.value;
            });
        }
    }
    
    initCategoryTabs() {
        // Обработчики для кнопок категорий POI
        const categoryFood = document.getElementById('category-food');
        const categoryCultural = document.getElementById('category-cultural');
        
        if (categoryFood) {
            categoryFood.addEventListener('click', () => {
                // Активируем категорию "Еда"
                categoryFood.classList.add('active');
                if (categoryCultural) categoryCultural.classList.remove('active');
                const poiFoodButtons = document.getElementById('poi-food-buttons');
                const poiCulturalButtons = document.getElementById('poi-cultural-buttons');
                if (poiFoodButtons) poiFoodButtons.classList.add('active');
                if (poiCulturalButtons) poiCulturalButtons.classList.remove('active');
                
                // Устанавливаем тип POI по умолчанию для категории "Еда"
                window.currentPoiType = 'restaurant';
                this.updateActivePoi('poi-restaurant');
                
                // Показываем элементы тематического маршрута
                this.showThematicRouteElements();
            });
        }
        
        if (categoryCultural) {
            categoryCultural.addEventListener('click', () => {
                // Активируем категорию "Культура"
                categoryCultural.classList.add('active');
                if (categoryFood) categoryFood.classList.remove('active');
                const poiCulturalButtons = document.getElementById('poi-cultural-buttons');
                const poiFoodButtons = document.getElementById('poi-food-buttons');
                if (poiCulturalButtons) poiCulturalButtons.classList.add('active');
                if (poiFoodButtons) poiFoodButtons.classList.remove('active');
                
                // Устанавливаем тип POI по умолчанию для категории "Культура"
                window.currentPoiType = 'museum';
                this.updateActivePoi('poi-museum');
                
                // Скрываем элементы тематического маршрута
                this.hideThematicRouteElements();
            });
        }
        
        // Добавляем обработчики для кнопок категории "Еда"
        document.querySelectorAll('#poi-food-buttons button').forEach(button => {
            button.addEventListener('click', () => {
                const selectedPoi = button.id.replace('poi-', '');
                window.currentPoiType = selectedPoi;
                this.updateActivePoi(button.id);
                console.log('Выбран тип точек интереса:', window.currentPoiType);
            });
        });
        
        // Добавляем обработчики для кнопок категории "Культура"
        document.querySelectorAll('#poi-cultural-buttons button').forEach(button => {
            button.addEventListener('click', () => {
                const selectedPoi = button.id.replace('poi-', '');
                window.currentPoiType = selectedPoi;
                this.updateActivePoi(button.id);
                console.log('Выбран тип точек интереса:', window.currentPoiType);
            });
        });
    }
    
    initUIEventHandlers() {
        // Добавляем прослушиватели событий для остановки распространения кликов
        const heatmapButtons = document.querySelectorAll('#heatmap-panel button, #heatmap-panel select');
        heatmapButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.stopPropagation();
            });
        });
        
        // Добавляем прослушиватели для блока погоды
        const weatherPanel = document.getElementById('weather-panel');
        if (weatherPanel) {
            weatherPanel.addEventListener('click', function(e) {
                e.stopPropagation();
            });
            weatherPanel.addEventListener('dblclick', function(e) {
                e.stopPropagation();
            });
            weatherPanel.style.pointerEvents = 'auto';
        }
        
        // Добавляем прослушиватели для блоков информации о маршруте
        const routeInfoElements = document.querySelectorAll('#route-info, #route-info-panel, .neo-info-box, #route-description, #cultural-route-description');
        routeInfoElements.forEach(element => {
            if (element) {
                element.addEventListener('click', function(e) {
                    e.stopPropagation();
                });
                element.addEventListener('dblclick', function(e) {
                    e.stopPropagation();
                });
                element.style.pointerEvents = 'auto';
            }
        });
        
        // Проверяем активную категорию при загрузке страницы и скрываем/показываем элементы соответственно
        const categoryCultural = document.getElementById('category-cultural');
        if (categoryCultural && categoryCultural.classList.contains('active')) {
            // Если активна категория "Культура", скрываем элементы тематического маршрута
            this.hideThematicRouteElements();
        } else {
            // Иначе показываем элементы
            this.showThematicRouteElements();
        }
    }
    
    // Основные функции управления картой
    clearMap() {
        console.log('Вызвана функция clearMap()');
        
        // Удаляем слой маршрута, если он существует
        if (window.routeLayer) {
            console.log('Удаляю слой маршрута');
            window.map.removeLayer(window.routeLayer);
            window.routeLayer = null;
        }
        
        // Очищаем POI маркеры
        this.clearPoiMarkers();
        
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
    
    clearPoiMarkers() {
        if (window.poiMarkers) {
            window.poiMarkers.forEach(marker => window.map.removeLayer(marker));
            window.poiMarkers = [];
        }
    }
    
    fullResetPoints() {
        console.log('Вызвана функция fullResetPoints() для полного сброса');
        
        // Удаляем маркеры, если они существуют
        if (window.startMarker) {
            window.map.removeLayer(window.startMarker);
            window.startMarker = null;
        }
        
        if (window.endMarker) {
            window.map.removeLayer(window.endMarker);
            window.endMarker = null;
        }
        
        // Удаляем маршрут
        if (window.routeLayer) {
            window.map.removeLayer(window.routeLayer);
            window.routeLayer = null;
        }
        
        // Очищаем POI маркеры
        this.clearPoiMarkers();
        
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
        window.endPoint = null;
        
        // Скрываем информацию о маршруте
        this.hideAllRouteInfo();
        
        console.log('Все точки и маршрут полностью сброшены');
    }
    
    hideAllRouteInfo() {
        const routeInfo = document.getElementById('route-info');
        if (routeInfo) routeInfo.style.display = 'none';
        
        const routeInfoPanel = document.getElementById('route-info-panel');
        if (routeInfoPanel) routeInfoPanel.style.display = 'none';
        
        const simpleRouteInfo = document.getElementById('simple-route-info');
        if (simpleRouteInfo) simpleRouteInfo.style.display = 'none';
    }
    
    showThematicRouteInfo() {
        // Сначала скрываем все
        this.hideAllRouteInfo();
        
        // Показываем только тематический маршрут
        const routeInfo = document.getElementById('route-info');
        if (routeInfo) routeInfo.style.display = 'block';
    }
    
    showCulturalRouteInfo() {
        // Сначала скрываем все
        this.hideAllRouteInfo();
        
        // Показываем только культурный маршрут
        const routeInfoPanel = document.getElementById('route-info-panel');
        if (routeInfoPanel) routeInfoPanel.style.display = 'block';
    }
    
    showSimpleRouteInfo() {
        // Сначала скрываем все
        this.hideAllRouteInfo();
        
        // Показываем только простой маршрут
        const simpleRouteInfo = document.getElementById('simple-route-info');
        if (simpleRouteInfo) simpleRouteInfo.style.display = 'block';
    }
    
    hideThematicRouteElements() {
        const elements = [
            document.getElementById('thematic-route-button'),
            document.getElementById('shuffle-poi-button')
        ];
        
        // Скрываем кнопки
        elements.forEach(el => {
            if (el) {
                el.style.opacity = '0';
                setTimeout(() => {
                    el.style.display = 'none';
                    el.style.height = '0';
                    el.style.margin = '0';
                    el.style.padding = '0';
                }, 300);
            }
        });
        
        // Скрываем слайдер и описание
        const sliderContainer = document.querySelector('.neo-slider:not(.cultural-route-block .neo-slider)');
        if (sliderContainer) {
            sliderContainer.style.opacity = '0';
            setTimeout(() => {
                sliderContainer.style.display = 'none';
                sliderContainer.style.height = '0';
                sliderContainer.style.margin = '0';
            }, 300);
        }
    }
    
    showThematicRouteElements() {
        const elements = [
            document.getElementById('thematic-route-button'),
            document.getElementById('shuffle-poi-button')
        ];
        
        // Показываем кнопки
        elements.forEach(el => {
            if (el) {
                el.style.display = 'block';
                el.style.height = '';
                el.style.margin = '';
                el.style.padding = '';
                setTimeout(() => {
                    el.style.opacity = '1';
                }, 10);
            }
        });
        
        // Показываем слайдер и описание
        const sliderContainer = document.querySelector('.neo-slider:not(.cultural-route-block .neo-slider)');
        if (sliderContainer) {
            sliderContainer.style.display = 'block';
            sliderContainer.style.height = '';
            sliderContainer.style.margin = '';
            setTimeout(() => {
                sliderContainer.style.opacity = '1';
            }, 10);
        }
    }
    
    updateActivePoi(poiId) {
        // Сбрасываем активный класс у всех кнопок в обеих категориях
        document.querySelectorAll('#poi-food-buttons button, #poi-cultural-buttons button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Делаем выбранную кнопку активной
        const selectedButton = document.getElementById(poiId);
        if (selectedButton) {
            selectedButton.classList.add('active');
        }
    }
    
    // Запрос и отображение маршрута
    getAndDisplayRoute(startLat, startLon, endLat, endLon, profile) {
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
                
                if (window.routeRenderer) {
                    window.routeRenderer.displaySimpleRoute(data);
                }
            })
            .catch(error => {
                // Удаляем индикатор загрузки
                const loadingElem = document.getElementById('route-loading');
                if (loadingElem) document.body.removeChild(loadingElem);
                
                console.error('Ошибка при получении маршрута:', error);
                // Показываем более детальную ошибку пользователю
                NeoDialog.alert('Ошибка', `Произошла ошибка при построении маршрута: ${error.message}`);
            });
    }
}

// Инициализируем основной модуль карты
const mapCore = new MapCore();

// Экспортируем для использования в других модулях
window.mapCore = mapCore;
window.hideAllRouteInfo = () => mapCore.hideAllRouteInfo();
window.showThematicRouteInfo = () => mapCore.showThematicRouteInfo();
window.showCulturalRouteInfo = () => mapCore.showCulturalRouteInfo(); 
window.showSimpleRouteInfo = () => mapCore.showSimpleRouteInfo(); 