// Переменные для тематического маршрута
let currentPois = []; // Текущие доступные точки интереса
let selectedPois = []; // Выбранные точки для маршрута
let routeLayer = null; // Слой с маршрутом
let poiMarkers = []; // Маркеры POI на карте
let routeOptimized = false; // Флаг оптимизации маршрута

// Функция для добавления обработчиков событий
function addThematicRouteHandlers() {
    console.log('Инициализация обработчиков тематических маршрутов');
}

// Вызываем функцию добавления обработчиков сразу после загрузки скрипта
setTimeout(addThematicRouteHandlers, 500);

// Отображение тематического маршрута на карте
function displayThematicRoute(routeData, poiData, profile) {
    clearMap(); // Очищаем карту перед отображением нового маршрута

    if (routeData && routeData.paths && routeData.paths.length > 0) {
        const path = routeData.paths[0];
        const coordinates = path.points.coordinates;
        const latLngs = coordinates.map(coord => [coord[1], coord[0]]);

        // Создаем слой с маршрутом
        routeLayer = L.polyline(latLngs, { 
            color: getRouteColor(profile),
            weight: 4,
            opacity: 0.8,
            // Добавляем индикацию оптимизированного маршрута через стиль линии
            dashArray: routeOptimized ? null : '5, 10'
        }).addTo(map);
        
        // Если есть данные о точках интереса, добавляем их как маркеры
        if (poiData && poiData.length > 0) {
            addPoiMarkers(poiData, profile);

            // Добавляем описание маршрута
            updateRouteDescription(poiData, path);
            
            // Центрируем карту на маршруте
            map.fitBounds(routeLayer.getBounds());
            
            // Обновляем информацию о маршруте
            updateRouteInfo(path);
            
            console.log(`Тематический маршрут построен: ${(path.distance / 1000).toFixed(2)} км, ${Math.round(path.time / 1000 / 60)} мин. Оптимизирован: ${routeOptimized}`);
        } else {
            console.error("Ошибка: Нет данных о точках интереса для тематического маршрута");
        }
    } else {
        console.error("Ошибка: Не удалось получить данные маршрута или маршрут пуст.", routeData);
        alert("Не удалось построить маршрут. Проверьте выбранные точки и попробуйте снова.");
    }
}

// Добавление маркеров POI на карту
function addPoiMarkers(poiData, profile) {
    poiMarkers = [];
    
    // Создаем маркеры для каждой точки маршрута
    poiData.forEach((poi, index) => {
        // Получаем цвет маркера в зависимости от рейтинга
        const markerColor = getMarkerColor(poi.rating);
        
        // Создаем HTML для пользовательского маркера
        const markerHtml = `
            <div style="
                width: 26px;
                height: 26px;
                border-radius: 50%;
                background-color: ${markerColor};
                display: flex;
                justify-content: center;
                align-items: center;
                color: white;
                font-weight: bold;
                font-size: 12px;
                border: 2px solid white;
                box-shadow: 0 0 4px rgba(0,0,0,0.5);
            ">
                ${index + 1}
            </div>
        `;
        
        // Создаем пользовательский значок
        const customIcon = L.divIcon({
            className: 'route-marker-poi',
            html: markerHtml,
            iconSize: [26, 26],
            iconAnchor: [13, 13]
        });
        
        // Создаем и добавляем маркер
        const marker = L.marker([poi.latitude, poi.longitude], {
            icon: customIcon
        }).addTo(map);
        
        // Добавляем попап с информацией и фотографией
        let popupContent = `<div style="text-align: center;"><b>${poi.name || `Точка ${index + 1}`}</b>`;
        
        // Добавляем фотографию, если она есть
        if (poi.photoUrl) {
            console.log(`Данные фото для точки ${poi.name}:`, poi.photoUrl);
            console.log(`Тип данных:`, typeof poi.photoUrl);
            
            let photoUrls = [];
            
            // Пробуем получить массив URL фотографий
            if (typeof poi.photoUrl === 'string') {
                try {
                    // Если это строка JSON, парсим ее
                    if (poi.photoUrl.startsWith('[') && poi.photoUrl.endsWith(']')) {
                        photoUrls = JSON.parse(poi.photoUrl);
                        console.log('Успешно распарсили JSON массив фотографий:', photoUrls);
                    } else {
                        // Если это просто строка URL
                        photoUrls = [poi.photoUrl];
                        console.log('Использую строку URL как единственную фотографию');
                    }
                } catch (e) {
                    console.error('Ошибка при парсинге JSON:', e);
                    photoUrls = [poi.photoUrl]; // Используем как одиночный URL
                }
            } else if (Array.isArray(poi.photoUrl)) {
                // Если это уже массив
                photoUrls = poi.photoUrl;
                console.log('Получен массив фотографий:', photoUrls);
            } else {
                console.log('Неизвестный формат данных, используем как строку:', poi.photoUrl);
                photoUrls = [poi.photoUrl.toString()];
            }
            
            // Если есть фотографии для отображения
            if (photoUrls.length > 0) {
                // Если только одна фотография - простое отображение
                if (photoUrls.length === 1) {
                    popupContent += `<br><img src="${photoUrls[0]}" alt="${poi.name}" 
                                    style="max-width: 200px; max-height: 150px; margin-top: 5px; 
                                    border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">`;
                    console.log('Добавлена одиночная фотография:', photoUrls[0]);
                } else {
                    // Добавляем карусель для нескольких фотографий
                    console.log(`Создаем карусель для ${photoUrls.length} фотографий`);
                    
                    popupContent += `
                    <div class="photo-carousel" style="position: relative; margin-top: 8px;">
                        <div class="photo-container" style="overflow: hidden; border-radius: 4px; position: relative;">`;
                    
                    // Добавляем каждую фотографию
                    for (let i = 0; i < photoUrls.length; i++) {
                        popupContent += `
                            <img src="${photoUrls[i]}" alt="${poi.name}" 
                                 class="carousel-photo" 
                                 data-index="${i}"
                                 style="max-width: 200px; max-height: 150px; border-radius: 4px; 
                                        box-shadow: 0 2px 4px rgba(0,0,0,0.2); 
                                        display: ${i === 0 ? 'block' : 'none'};">`;
                    }
                    
                    // Добавляем кнопки навигации
                    popupContent += `
                        <div class="carousel-nav" style="position: absolute; bottom: 5px; right: 5px; 
                                                         display: flex; gap: 5px; background: rgba(0,0,0,0.5); 
                                                         border-radius: 10px; padding: 3px 5px;">
                            <span class="carousel-counter" style="color: white; font-size: 12px;">1/${photoUrls.length}</span>
                        </div>
                        <button class="carousel-prev" style="position: absolute; left: 5px; top: 50%; transform: translateY(-50%);
                                                             background: rgba(0,0,0,0.5); border: none; color: white; 
                                                             border-radius: 50%; width: 24px; height: 24px; cursor: pointer;">
                            &#10094;
                        </button>
                        <button class="carousel-next" style="position: absolute; right: 5px; top: 50%; transform: translateY(-50%);
                                                              background: rgba(0,0,0,0.5); border: none; color: white; 
                                                              border-radius: 50%; width: 24px; height: 24px; cursor: pointer;">
                            &#10095;
                        </button>`;
                    
                    popupContent += `
                        </div>
                    </div>`;
                }
            } else {
                console.log('Не найдено фотографий для отображения');
            }
        } else {
            console.log(`Для точки ${poi.name} нет данных о фотографиях`);
        }
        
        if (poi.rating) popupContent += `<br>Рейтинг: <b>${poi.rating.toFixed(1)}</b>`;
        if (poi.type) popupContent += `<br>Тип: ${getPoiTypeName(poi.type)}`;
        if (poi.address) popupContent += `<br>Адрес: ${poi.address}`;
        if (poi.vicinity) popupContent += `<br>Район: ${poi.vicinity}`;
        popupContent += '</div>';
        
        marker.bindPopup(popupContent);
        poiMarkers.push(marker);
    });
}

// Обновление описания маршрута
function updateRouteDescription(poiData, pathData) {
    let descriptionHtml = '<h4>Описание маршрута:</h4><ol>';
    
    poiData.forEach((poi, index) => {
        // Получаем цвет маркера в зависимости от рейтинга
        const markerColor = getMarkerColor(poi.rating);
        
        let poiDescription = `<li style="margin-bottom: 8px;">
            <div style="display: flex; align-items: center;">
                <span style="
                    display: inline-block;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background-color: ${markerColor};
                    color: white;
                    text-align: center;
                    font-weight: bold;
                    font-size: 12px;
                    margin-right: 8px;
                    line-height: 20px;
                ">${index + 1}</span>
                <b>${poi.name || `Точка ${index + 1}`}</b>
            </div>`;
        
        if (poi.rating) poiDescription += `<div style="margin-left: 28px;">Рейтинг: <b>${poi.rating.toFixed(1)}</b></div>`;
        if (poi.type) poiDescription += `<div style="margin-left: 28px;">Тип: ${getPoiTypeName(poi.type)}</div>`;
        if (poi.address) poiDescription += `<div style="margin-left: 28px;">Адрес: ${poi.address}</div>`;
        
        poiDescription += '</li>';
        descriptionHtml += poiDescription;
    });
    
    descriptionHtml += '</ol>';
    
    // Добавляем информацию о маршруте
    const distanceKm = (pathData.distance / 1000).toFixed(2);
    const timeMin = Math.round(pathData.time / 1000 / 60);
    
    descriptionHtml += `<div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd;">
        <p><b>Общая длина маршрута:</b> ${distanceKm} км</p>
        <p><b>Примерное время:</b> ${timeMin} мин ${getCurrentProfile() === 'foot' ? 'пешком' : (getCurrentProfile() === 'bike' ? 'на велосипеде' : 'на автомобиле')}</p>
        <p><b>Тип маршрута:</b> ${routeOptimized ? 'Оптимизированный' : 'Стандартный'}</p>
    </div>`;
    
    // Обновляем элемент на странице
    const routeDescriptionElement = document.getElementById('route-description');
    if (routeDescriptionElement) {
        routeDescriptionElement.innerHTML = descriptionHtml;
    }
}

// Обновление информации о маршруте
function updateRouteInfo(pathData) {
    const distanceElement = document.getElementById('info-distance');
    const timeElement = document.getElementById('info-time');
    const routeTypeElement = document.getElementById('route-type');
    const infoPanel = document.getElementById('route-info');
    
    if (distanceElement && timeElement && infoPanel) {
        const distanceKm = (pathData.distance / 1000).toFixed(2);
        const timeMin = Math.round(pathData.time / 1000 / 60);
        
        distanceElement.textContent = distanceKm;
        timeElement.textContent = timeMin;
        
        // Обновляем информацию о типе маршрута
        if (routeTypeElement) {
            routeTypeElement.textContent = routeOptimized ? 'Оптимизированный' : 'Стандартный';
            
            // Добавляем визуальное выделение для оптимизированного маршрута
            if (routeOptimized) {
                routeTypeElement.style.color = '#4CAF50'; // Зеленый цвет для оптимизированного
                routeTypeElement.style.fontWeight = 'bold';
            } else {
                routeTypeElement.style.color = ''; // Сброс стиля
                routeTypeElement.style.fontWeight = '';
            }
        }
        
        infoPanel.style.display = 'block';
    }
}

// Получение текущего типа POI
function getCurrentPoiType() {
    const activeButton = document.querySelector('#poi-buttons button.active');
    if (activeButton) {
        return activeButton.id.replace('poi-', '');
    }
    // По умолчанию - рестораны
    return 'restaurant';
}

// Получение текущего профиля маршрута
function getCurrentProfile() {
    const activeButton = document.querySelector('#profile-buttons button.active');
    if (activeButton) {
        return activeButton.id.replace('profile-', '');
    }
    // По умолчанию - пешком
    return 'foot';
}

// Получение количества точек из слайдера
function getPoiCountValue() {
    const slider = document.getElementById('poi-count-slider');
    if (slider) {
        return parseInt(slider.value);
    }
    // По умолчанию - 5 точек
    return 5;
}

// Получение цвета маркера в зависимости от рейтинга
function getMarkerColor(rating) {
    if (!rating || rating < 1) return '#8B0000'; // Dark red
    if (rating < 2) return '#FF5252';            // Light red
    if (rating < 3) return '#FF9800';            // Orange
    if (rating < 4) return '#FFC107';            // Amber
    return '#4CAF50';                            // Green
}

// Получение цвета маршрута в зависимости от профиля
function getRouteColor(profile) {
    switch (profile) {
        case 'foot':
            return '#3949AB'; // Indigo
        case 'bike':
            return '#00897B'; // Teal
        case 'car':
            return '#E64A19'; // Deep Orange
        default:
            return '#3F51B5'; // Indigo
    }
}

// Получение человекочитаемого названия типа POI
function getPoiTypeName(type) {
    const typeNames = {
        'restaurant': 'Ресторан',
        'cafe': 'Кафе',
        'bar': 'Бар',
        'pharmacy': 'Аптека',
        'bank': 'Банк',
        'school': 'Школа',
        'gym': 'Спортзал'
    };
    
    return typeNames[type] || type;
}

// Показать индикатор загрузки
function showLoadingIndicator(message) {
    // Проверяем, существует ли контейнер для индикатора
    let loadingIndicator = document.getElementById('loading-indicator');
    
    if (!loadingIndicator) {
        // Создаем контейнер для индикатора
        loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'loading-indicator';
        loadingIndicator.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 20px;
            border-radius: 10px;
            z-index: 1000;
            text-align: center;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
        `;
        
        // Создаем спиннер
        const spinner = document.createElement('div');
        spinner.style.cssText = `
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-top: 4px solid white;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            margin: 0 auto 15px auto;
            animation: spin 1s linear infinite;
        `;
        
        // Создаем стиль для анимации
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
        
        // Создаем текстовый элемент
        const messageElement = document.createElement('div');
        messageElement.id = 'loading-message';
        messageElement.textContent = message || 'Загрузка...';
        
        // Добавляем элементы в контейнер
        loadingIndicator.appendChild(spinner);
        loadingIndicator.appendChild(messageElement);
        
        // Добавляем контейнер в документ
        document.body.appendChild(loadingIndicator);
    } else {
        // Обновляем сообщение, если индикатор уже существует
        const messageElement = document.getElementById('loading-message');
        if (messageElement) {
            messageElement.textContent = message || 'Загрузка...';
        }
        
        // Показываем индикатор
        loadingIndicator.style.display = 'block';
    }
}

// Скрыть индикатор загрузки
function hideLoadingIndicator() {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
}

// Функция для перемешивания точек текущего маршрута
function shuffleThematicRoute() {
    if (!currentPois || currentPois.length === 0) {
        alert("Сначала постройте тематический маршрут");
        return;
    }
    
    // Получаем количество точек из слайдера
    const poiCount = getPoiCountValue();
    
    // Получаем текущий профиль
    const profile = getCurrentProfile();
    
    // Показываем индикатор загрузки
    showLoadingIndicator("Перемешиваем точки маршрута...");
    
    // Выбираем случайные точки, отличные от текущих, если возможно
    let newSelectedPois = [];
    
    // Если у нас достаточно точек, выбираем новые случайные
    if (currentPois.length > poiCount * 1.5) {
        // Создаем множество индексов текущих выбранных точек
        const currentIndices = new Set();
        for (let i = 0; i < selectedPois.length; i++) {
            for (let j = 0; j < currentPois.length; j++) {
                if (selectedPois[i].latitude === currentPois[j].latitude && 
                    selectedPois[i].longitude === currentPois[j].longitude) {
                    currentIndices.add(j);
                    break;
                }
            }
        }
        
        // Выбираем новые случайные точки, исключая текущие
        let attempts = 0;
        while (newSelectedPois.length < poiCount && attempts < 100) {
            const randomIndex = Math.floor(Math.random() * currentPois.length);
            if (!currentIndices.has(randomIndex)) {
                newSelectedPois.push(currentPois[randomIndex]);
                currentIndices.add(randomIndex);
            }
            attempts++;
        }
        
        // Если не удалось найти достаточно новых точек, добавляем случайные из всех доступных
        while (newSelectedPois.length < poiCount) {
            const randomIndex = Math.floor(Math.random() * currentPois.length);
            newSelectedPois.push(currentPois[randomIndex]);
        }
    } else {
        // Если точек мало, просто перемешиваем все доступные и берем первые poiCount
        const shuffledPois = [...currentPois];
        for (let i = shuffledPois.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledPois[i], shuffledPois[j]] = [shuffledPois[j], shuffledPois[i]];
        }
        newSelectedPois = shuffledPois.slice(0, poiCount);
    }
    
    // Обновляем выбранные точки
    selectedPois = newSelectedPois;
    
    // Маршрут не оптимизирован (случайный порядок)
    routeOptimized = false;
    
    // Формируем строку координат для запроса
    const pointsStr = selectedPois.map(poi => `${poi.latitude},${poi.longitude}`).join(';');
    
    // Запрашиваем маршрут
    fetch(`/api/thematic-route?points=${pointsStr}&profile=${profile}`)
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => { 
                    try {
                        // Пытаемся распарсить JSON ошибки
                        const errorJson = JSON.parse(text);
                        throw new Error(`HTTP error! status: ${response.status}, message: ${JSON.stringify(errorJson)}`); 
                    } catch (e) {
                        // Если не получается распарсить JSON, используем текст как есть
                    throw new Error(`HTTP error! status: ${response.status}, message: ${text}`); 
                    }
                });
            }
            return response.json();
        })
        .then(data => {
            // Скрываем индикатор загрузки
            hideLoadingIndicator();
            
            // Отображаем маршрут
            displayThematicRoute(data, selectedPois, profile);
        })
        .catch(error => {
            hideLoadingIndicator();
            console.error('Ошибка при получении тематического маршрута:', error);
            alert(`Ошибка при построении тематического маршрута: ${error.message}`);
        });
}

// Добавляем обработчики событий при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Кнопка построения тематического маршрута
    const thematicRouteButton = document.getElementById('thematic-route-button');
    if (thematicRouteButton) {
        thematicRouteButton.addEventListener('click', function() {
            routeOptimized = false; // Обычный маршрут, не оптимизированный
            buildThematicRoute();
        });
    }
    
    // Кнопка перемешивания точек
    const shufflePoiButton = document.getElementById('shuffle-poi-button');
    if (shufflePoiButton) {
        shufflePoiButton.addEventListener('click', function() {
            routeOptimized = false; // Перемешанный маршрут не оптимизирован
            shuffleThematicRoute();
        });
    }
    
    console.log('Модуль тематических маршрутов успешно инициализирован');
});

// Добавляем обработчики событий для карусели фотографий при открытии попапа
map.on('popupopen', function(e) {
    console.log('Открыт попап, ищем элементы карусели');
    const popup = e.popup;
    const container = popup.getElement();
    
    if (!container) {
        console.log('Не найден контейнер попапа');
        return;
    }
    
    // Находим кнопки навигации в карусели
    const prevButton = container.querySelector('.carousel-prev');
    const nextButton = container.querySelector('.carousel-next');
    const counter = container.querySelector('.carousel-counter');
    const photos = container.querySelectorAll('.carousel-photo');
    
    console.log('Найдено элементов: кнопка назад - ' + (prevButton ? 'да' : 'нет') + 
               ', кнопка вперед - ' + (nextButton ? 'да' : 'нет') + 
               ', счетчик - ' + (counter ? 'да' : 'нет') + 
               ', фотографий - ' + photos.length);
    
    if (prevButton && nextButton && photos.length > 0) {
        // Текущий индекс фотографии
        let currentIndex = 0;
        
        // Обработчик для кнопки "Предыдущая"
        prevButton.addEventListener('click', function(event) {
            event.stopPropagation(); // Предотвращаем срабатывание клика по карте
            console.log('Нажата кнопка "Предыдущая"');
            
            // Скрываем текущую фотографию
            photos[currentIndex].style.display = 'none';
            
            // Уменьшаем индекс и проверяем границы
            currentIndex = (currentIndex - 1 + photos.length) % photos.length;
            
            // Показываем новую текущую фотографию
            photos[currentIndex].style.display = 'block';
            
            // Обновляем счетчик
            if (counter) {
                counter.textContent = `${currentIndex + 1}/${photos.length}`;
            }
        });
        
        // Обработчик для кнопки "Следующая"
        nextButton.addEventListener('click', function(event) {
            event.stopPropagation(); // Предотвращаем срабатывание клика по карте
            console.log('Нажата кнопка "Следующая"');
            
            // Скрываем текущую фотографию
            photos[currentIndex].style.display = 'none';
            
            // Увеличиваем индекс и проверяем границы
            currentIndex = (currentIndex + 1) % photos.length;
            
            // Показываем новую текущую фотографию
            photos[currentIndex].style.display = 'block';
            
            // Обновляем счетчик
            if (counter) {
                counter.textContent = `${currentIndex + 1}/${photos.length}`;
            }
        });
        
        console.log('Обработчики событий для карусели установлены');
    } else {
        console.log('Не найдены необходимые элементы для карусели');
    }
}); 