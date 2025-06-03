// Переменные для тематического культурного маршрута
// Используем window для доступа из других модулей
window.culturalPoints = []; // Выбранные культурные точки для маршрута
window.culturalRouteLayer = null; // Слой с маршрутом
window.culturalMarkers = []; // Маркеры POI на карте

/**
 * Инициализация обработчиков для культурных маршрутов
 */
function initCulturalRouteHandlers() {
    // Находим кнопку построения культурного маршрута и добавляем обработчик
    const culturalRouteButton = document.getElementById('cultural-route-button');
    if (culturalRouteButton) {
        culturalRouteButton.addEventListener('click', function() {
            // Дополнительная проверка значения ползунка перед построением маршрута
            const slider = document.getElementById('cultural-poi-count');
            const displayValue = document.getElementById('cultural-poi-count-value');
            
            // Выводим отладочную информацию о состоянии элементов управления
            debugCulturalControls();
            
            if (slider) {
                console.log('Значение ползунка перед построением маршрута:', slider.value);
                console.log('Отображаемое значение:', displayValue ? displayValue.textContent : 'элемент не найден');
                
                // Обновляем отображаемое значение, чтобы оно точно соответствовало значению ползунка
                if (displayValue) {
                    displayValue.textContent = slider.value;
                }
            } else {
                console.error('Ползунок количества точек не найден!');
            }
            
            buildCulturalThematicRoute();
        });
        console.log('Обработчик для кнопки культурного маршрута добавлен');
    } else {
        console.error('Кнопка культурного маршрута не найдена в DOM');
    }
}

/**
 * Получение культурного тематического маршрута с сервера
 */
function buildCulturalThematicRoute() {
    clearMap(); // Очищаем карту перед построением нового маршрута
    
    // Проверяем, установлен ли начальный маркер
    if (!window.startPoint) {
        if (typeof NeoDialog !== 'undefined') {
            NeoDialog.alert('Внимание', 'Сначала установите начальную точку маршрута, кликнув на карту');
        } else {
            alert('Сначала установите начальную точку маршрута, кликнув на карту');
        }
        return;
    }
    
    // Показываем индикатор загрузки
    const loadingIndicator = createLoadingIndicator("Анализируем лучшие культурные места...");
    
    // Получаем параметры маршрута
    const count = getCulturalPoiCount();
    
    console.log('Построение оптимизированного культурного маршрута с количеством точек:', count);
    console.log('Стартовая точка пользователя:', window.startPoint);
    
    // Определяем типы для включения в маршрут
    const includeMuseum = document.getElementById('include-museum')?.checked ?? true;
    const includePark = document.getElementById('include-park')?.checked ?? true;
    
    // Получаем выбранные типы мест
    const selectedTypes = [];
    document.querySelectorAll('.cultural-type-checkbox:checked').forEach(checkbox => {
        selectedTypes.push(checkbox.value);
    });
    
    console.log(`Параметры оптимизации: музей=${includeMuseum}, парк=${includePark}, типы=[${selectedTypes.join(', ')}]`);
    
    // Сначала получаем все доступные культурные точки
    fetch('/api/cultural-pois')
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => { 
                    throw new Error(`Ошибка сервера: ${response.status}, сообщение: ${text}`); 
                });
            }
            return response.json();
        })
        .then(allPoints => {
            console.log(`Получено всего культурных точек: ${allPoints.length}`);
            
            if (!allPoints || allPoints.length === 0) {
                throw new Error('В данном районе нет культурных достопримечательностей');
            }
            
            // Обновляем сообщение загрузки
            loadingIndicator.element.innerHTML = `
                <div style="
                    border: 4px solid rgba(255, 255, 255, 0.3);
                    border-top: 4px solid white;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    margin: 0 auto 15px auto;
                    animation: spin 1s linear infinite;
                "></div>
                <div>Оптимизируем маршрут по близости точек...</div>
            `;
            
            // Оптимизируем выбор культурных точек
            const optimizedPoints = optimizeCulturalSelection(allPoints, count, includeMuseum, includePark, selectedTypes);
            
            if (optimizedPoints.length === 0) {
                throw new Error('Нет подходящих культурных мест в радиусе поиска');
            }
            
            // Сохраняем оптимизированные точки
            window.culturalPoints = optimizedPoints;
            
            // Выводим информацию о выбранных точках
            console.log(`Оптимизировано до ${window.culturalPoints.length} лучших точек:`);
            window.culturalPoints.forEach((point, index) => {
                console.log(`  ${index+1}. ${point.name} (${point.type}) - расстояние: ${point.distanceToStart?.toFixed(2)}км`);
            });
            
            // Обновляем сообщение о загрузке
            loadingIndicator.element.innerHTML = `
                <div style="
                    border: 4px solid rgba(255, 255, 255, 0.3);
                    border-top: 4px solid white;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    margin: 0 auto 15px auto;
                    animation: spin 1s linear infinite;
                "></div>
                <div>Строим оптимизированный маршрут от вашей точки...</div>
            `;
            
            // Определяем профиль маршрута
            const profile = getCurrentProfile();
            
            // Формируем строку координат для запроса маршрута, НАЧИНАЯ СО СТАРТОВОЙ ТОЧКИ ПОЛЬЗОВАТЕЛЯ
            const pointsStr = `${window.startPoint.lat},${window.startPoint.lng};` + 
                              window.culturalPoints
                                .map(point => `${point.latitude},${point.longitude}`)
                                .join(';');
            
            console.log(`Строка координат маршрута (с пользовательской стартовой точкой): ${pointsStr}`);
            
            // Запрашиваем построение маршрута
            return fetch(`/api/thematic-route?points=${pointsStr}&profile=${profile}`);
        })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => { 
                    throw new Error(`Ошибка при построении маршрута: ${response.status}, сообщение: ${text}`); 
                });
            }
            return response.json();
        })
        .then(routeData => {
            // Скрываем индикатор загрузки
            loadingIndicator.remove();
            
            // Получаем профиль для передачи в функцию отображения
            const profile = getCurrentProfile();
            
            // Отображаем маршрут
            displayCulturalRoute(routeData, window.culturalPoints, profile);
        })
        .catch(error => {
            loadingIndicator.remove();
            console.error('Ошибка при построении культурного маршрута:', error);
            
            // Используем NeoDialog вместо alert для консистентности
            if (typeof NeoDialog !== 'undefined') {
                NeoDialog.alert('Ошибка', error.message);
            } else {
                alert(`Ошибка: ${error.message}`);
            }
        });
}

/**
 * Оптимизирует выбор культурных точек только по близости к стартовой точке и близости друг к другу
 */
function optimizeCulturalSelection(allPoints, count, includeMuseum, includePark, selectedTypes) {
    console.log('Начинаем оптимизацию культурных точек по близости...');
    console.log(`Параметры: count=${count}, includeMuseum=${includeMuseum}, includePark=${includePark}`);
    
    // Вычисляем расстояние от каждой точки до стартовой точки пользователя
    allPoints.forEach(point => {
        const distance = calculateDistance(
            window.startPoint.lat, window.startPoint.lng,
            point.latitude, point.longitude
        );
        point.distanceToStart = distance;
    });
    
    // Сортируем все точки по близости к стартовой точке
    const pointsByDistance = [...allPoints].sort((a, b) => a.distanceToStart - b.distanceToStart);
    
    console.log('Топ-10 ближайших точек к стартовой позиции:');
    pointsByDistance.slice(0, 10).forEach((point, index) => {
        console.log(`  ${index+1}. ${point.name} (${point.type}) - расстояние: ${point.distanceToStart.toFixed(2)}км`);
    });
    
    // Применяем жадный алгоритм построения маршрута по близости
    let selectedPoints = [];
    let availablePoints = [...allPoints];
    
    // Обязательно включаем музей, если требуется (выбираем ближайший к стартовой точке)
    if (includeMuseum && selectedPoints.length < count) {
        const museums = availablePoints.filter(p => p.type === 'museum')
                                      .sort((a, b) => a.distanceToStart - b.distanceToStart);
        if (museums.length > 0) {
            selectedPoints.push(museums[0]);
            availablePoints = availablePoints.filter(p => p.id !== museums[0].id);
            console.log(`Добавлен ближайший музей: ${museums[0].name} (${museums[0].distanceToStart.toFixed(2)}км)`);
        }
    }
    
    // Обязательно включаем парк, если требуется (выбираем ближайший к стартовой точке)
    if (includePark && selectedPoints.length < count) {
        const parks = availablePoints.filter(p => p.type === 'park')
                                    .sort((a, b) => a.distanceToStart - b.distanceToStart);
        if (parks.length > 0) {
            selectedPoints.push(parks[0]);
            availablePoints = availablePoints.filter(p => p.id !== parks[0].id);
            console.log(`Добавлен ближайший парк: ${parks[0].name} (${parks[0].distanceToStart.toFixed(2)}км)`);
        }
    }
    
    // Добавляем точки выбранных типов (выбираем ближайшие к стартовой точке)
    for (const type of selectedTypes) {
        if (selectedPoints.length >= count) break;
        
        const typePoints = availablePoints.filter(p => p.type === type)
                                         .sort((a, b) => a.distanceToStart - b.distanceToStart);
        if (typePoints.length > 0) {
            selectedPoints.push(typePoints[0]);
            availablePoints = availablePoints.filter(p => p.id !== typePoints[0].id);
            console.log(`Добавлена ближайшая точка типа ${type}: ${typePoints[0].name} (${typePoints[0].distanceToStart.toFixed(2)}км)`);
        }
    }
    
    // Если уже выбрали точки, применяем жадный алгоритм для добавления остальных
    if (selectedPoints.length > 0) {
        // Дополняем до нужного количества, выбирая ближайшие к уже выбранным точкам
        while (selectedPoints.length < count && availablePoints.length > 0) {
            let bestPoint = null;
            let bestDistance = Infinity;
            
            // Для каждой доступной точки находим минимальное расстояние до любой уже выбранной точки
            for (const candidate of availablePoints) {
                let minDistanceToSelected = Infinity;
                
                for (const selected of selectedPoints) {
                    const distance = calculateDistance(
                        selected.latitude, selected.longitude,
                        candidate.latitude, candidate.longitude
                    );
                    minDistanceToSelected = Math.min(minDistanceToSelected, distance);
                }
                
                // Выбираем точку с минимальным расстоянием до уже выбранных
                if (minDistanceToSelected < bestDistance) {
                    bestDistance = minDistanceToSelected;
                    bestPoint = candidate;
                }
            }
            
            if (bestPoint) {
                selectedPoints.push(bestPoint);
                availablePoints = availablePoints.filter(p => p.id !== bestPoint.id);
                console.log(`Добавлена ближайшая к маршруту точка: ${bestPoint.name} (расстояние до ближайшей: ${bestDistance.toFixed(2)}км)`);
            } else {
                break;
            }
        }
    } else {
        // Если не выбрано ни одной точки по типам, начинаем с ближайшей к стартовой точке
        while (selectedPoints.length < count && availablePoints.length > 0) {
            if (selectedPoints.length === 0) {
                // Первая точка - ближайшая к стартовой
                const closestToStart = availablePoints.reduce((closest, current) => 
                    current.distanceToStart < closest.distanceToStart ? current : closest
                );
                selectedPoints.push(closestToStart);
                availablePoints = availablePoints.filter(p => p.id !== closestToStart.id);
                console.log(`Первая точка (ближайшая к старту): ${closestToStart.name} (${closestToStart.distanceToStart.toFixed(2)}км)`);
            } else {
                // Последующие точки - ближайшие к уже выбранным
                let bestPoint = null;
                let bestDistance = Infinity;
                
                for (const candidate of availablePoints) {
                    let minDistanceToSelected = Infinity;
                    
                    for (const selected of selectedPoints) {
                        const distance = calculateDistance(
                            selected.latitude, selected.longitude,
                            candidate.latitude, candidate.longitude
                        );
                        minDistanceToSelected = Math.min(minDistanceToSelected, distance);
                    }
                    
                    if (minDistanceToSelected < bestDistance) {
                        bestDistance = minDistanceToSelected;
                        bestPoint = candidate;
                    }
                }
                
                if (bestPoint) {
                    selectedPoints.push(bestPoint);
                    availablePoints = availablePoints.filter(p => p.id !== bestPoint.id);
                    console.log(`Добавлена точка: ${bestPoint.name} (расстояние до ближайшей: ${bestDistance.toFixed(2)}км)`);
                } else {
                    break;
                }
            }
        }
    }
    
    console.log(`Финальный выбор: ${selectedPoints.length} оптимизированных по близости точек`);
    
    return selectedPoints;
}

/**
 * Вычисляет расстояние между двумя точками в километрах (формула Haversine)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Радиус Земли в км
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

/**
 * Отображение культурного маршрута на карте
 */
function displayCulturalRoute(routeData, points, profile) {
    // Очищаем предыдущий маршрут и маркеры
    clearCulturalRoute();
    
    if (routeData && routeData.paths && routeData.paths.length > 0) {
        const path = routeData.paths[0];
        const coordinates = path.points.coordinates;
        const latLngs = coordinates.map(coord => [coord[1], coord[0]]);
        
        // Создаем линию маршрута
        window.culturalRouteLayer = L.polyline(latLngs, { 
            color: getCulturalRouteColor(profile),
            weight: 5,
            opacity: 0.7
        }).addTo(map);
        
        // Добавляем стартовый маркер пользователя, если он существует
        if (window.startPoint) {
            const startMarker = L.marker([window.startPoint.lat, window.startPoint.lng], {
                icon: L.divIcon({
                    className: 'route-marker-start',
                    html: 'START',
                    iconSize: [40, 24],
                    iconAnchor: [20, 24]
                })
            }).addTo(map);
            
            startMarker.bindPopup('Ваша стартовая точка');
            window.culturalMarkers.push(startMarker);
        }
        
        // Добавляем маркеры для точек маршрута
        points.forEach((point, index) => {
            const marker = L.marker([point.latitude, point.longitude], {
                icon: getCulturalMarkerIcon(point.type, index + 1)
            }).addTo(map);
            
            // Добавляем всплывающую подсказку
            marker.bindPopup(createCulturalPopupContent(point, index + 1));
            
            // Сохраняем маркер для возможности удаления
            window.culturalMarkers.push(marker);
        });
        
        // Центрируем карту на маршруте
        map.fitBounds(window.culturalRouteLayer.getBounds());
        
        // Обновляем информацию о маршруте
        updateCulturalRouteInfo(points, path, profile);
        
        console.log(`Культурный маршрут построен: ${(path.distance / 1000).toFixed(2)} км, ${Math.round(path.time / 1000 / 60)} мин.`);
        console.log(`Маршрут начинается от пользовательской точки: [${window.startPoint?.lat}, ${window.startPoint?.lng}]`);
    } else {
        console.error("Ошибка: Не удалось получить данные маршрута или маршрут пуст.");
        
        // Используем NeoDialog вместо alert для консистентности
        if (typeof NeoDialog !== 'undefined') {
            NeoDialog.alert('Ошибка', 'Не удалось построить маршрут. Проверьте выбранные точки и попробуйте снова.');
        } else {
            alert("Не удалось построить маршрут. Проверьте выбранные точки и попробуйте снова.");
        }
    }
}

/**
 * Обновляет панель с информацией о маршруте
 */
function updateCulturalRouteInfo(points, routePath, profile) {
    const routeInfoPanel = document.getElementById('route-info-panel');
    const routeDescription = document.getElementById('cultural-route-description');
    
    if (!routeInfoPanel || !routeDescription) {
        console.error('Не найдены элементы для отображения информации о маршруте');
        return;
    }
    
    // Получаем профиль, если он не передан
    if (!profile) {
        profile = getCurrentProfile();
    }
    
    // Форматирование в точности как в тематическом маршруте
    let descriptionHtml = '<h4>Описание маршрута:</h4>';
    
    // Добавляем информацию о стартовой точке, если она есть
    if (window.startPoint) {
        descriptionHtml += '<p><strong>Маршрут начинается от вашей точки</strong></p>';
    }
    
    descriptionHtml += '<ol>';
    
    points.forEach((point, index) => {
        let poiDescription = `<li><b>${point.name}</b> - ${getReadableType(point.type)}`;
        
        if (point.vicinity) {
            poiDescription += `, район: ${point.vicinity}`;
        }
        
        if (point.address) {
            poiDescription += `, адрес: ${point.address}`;
        }
        
        poiDescription += '</li>';
        descriptionHtml += poiDescription;
    });
    
    descriptionHtml += '</ol>';
    
    // Добавляем информацию о типе маршрута
    const distanceKm = (routePath.distance / 1000).toFixed(2);
    const timeMin = Math.round(routePath.time / 1000 / 60);
    
    // Обновляем информацию о расстоянии и времени в шапке панели
    const culturalDistanceElement = document.getElementById('cultural-info-distance');
    const culturalTimeElement = document.getElementById('cultural-info-time');
    
    if (culturalDistanceElement) culturalDistanceElement.textContent = distanceKm;
    if (culturalTimeElement) culturalTimeElement.textContent = timeMin;
    
    descriptionHtml += `<div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd;">
        <p><b>Общая длина маршрута:</b> ${distanceKm} км</p>
        <p><b>Примерное время:</b> ${timeMin} мин ${profile === 'foot' ? 'пешком' : (profile === 'bike' ? 'на велосипеде' : 'на автомобиле')}</p>
        <p><b>Тип маршрута:</b> Оптимизированный культурный (по близости точек)</p>
    </div>`;
    
    routeDescription.innerHTML = descriptionHtml;
                    
    // Показываем панель культурного маршрута и скрываем тематический маршрут
    if (typeof window.showCulturalRouteInfo === 'function') {
        window.showCulturalRouteInfo();
    } else {
        // Скрываем панель информации о тематическом маршруте
        const routeInfo = document.getElementById('route-info');
        if (routeInfo) routeInfo.style.display = 'none';
        
        // Показываем панель культурного маршрута
        routeInfoPanel.style.display = 'block';
    }
}

/**
 * Создает содержимое всплывающей подсказки для культурного места
 */
function createCulturalPopupContent(point, index) {
    let content = `
        <div class="popup-content">
            <h3>${index}. ${point.name}</h3>
            <p><strong>Тип:</strong> ${getReadableType(point.type)}</p>
    `;
    
    // Добавляем адрес или местоположение, если они есть
    if (point.address) {
        content += `<p><strong>Адрес:</strong> ${point.address}</p>`;
    } else if (point.vicinity) {
        content += `<p><strong>Местоположение:</strong> ${point.vicinity}</p>`;
    }
    
    // Добавляем фотографию, если она есть
    if (point.photoUrl) {
        console.log(`Данные фото для точки ${point.name}:`, point.photoUrl);
        
        let photoUrls = [];
        
        // Обработка различных форматов photoUrl
        if (typeof point.photoUrl === 'string') {
            try {
                // Если это строка JSON, парсим ее
                if (point.photoUrl.startsWith('[') && point.photoUrl.endsWith(']')) {
                    photoUrls = JSON.parse(point.photoUrl);
                    console.log('Успешно распарсили JSON массив фотографий:', photoUrls);
                } else {
                    // Если это просто строка URL
                    photoUrls = [point.photoUrl];
                    console.log('Использую строку URL как единственную фотографию');
                }
            } catch (e) {
                console.error('Ошибка при парсинге JSON:', e);
                photoUrls = [point.photoUrl]; // Используем как одиночный URL
            }
        } else if (Array.isArray(point.photoUrl)) {
            // Если это уже массив
            photoUrls = point.photoUrl;
            console.log('Получен массив фотографий:', photoUrls);
        } else if (point.photoUrl) {
            console.log('Неизвестный формат данных, используем как строку:', point.photoUrl);
            photoUrls = [point.photoUrl.toString()];
        }
        
        // Если есть фотографии для отображения
        if (photoUrls.length > 0) {
            content += `<div class="popup-image">
                <img src="${photoUrls[0]}" alt="${point.name}" 
                     style="max-width: 200px; max-height: 150px; margin-top: 5px; 
                     border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);" />
            </div>`;
        }
    }
    
    content += '</div>';
    return content;
}

/**
 * Возвращает человекочитаемое название типа места
 */
function getReadableType(type) {
    const typeMap = {
        'museum': 'Музей',
        'park': 'Парк',
        'church': 'Церковь/Собор',
        'theater': 'Театр',
        'art_gallery': 'Художественная галерея',
        'library': 'Библиотека',
        'tourist_attraction': 'Достопримечательность',
        'gym': 'Спортзал',
        'pharmacy': 'Аптека',
        'bank': 'Банк',
        'school': 'Школа'
    };
    
    return typeMap[type] || type;
}

/**
 * Очищает текущий культурный маршрут и маркеры
 */
function clearCulturalRoute() {
    // Удаляем линию маршрута
    if (window.culturalRouteLayer) {
        map.removeLayer(window.culturalRouteLayer);
        window.culturalRouteLayer = null;
    }
    
    // Удаляем маркеры
    window.culturalMarkers.forEach(marker => {
        map.removeLayer(marker);
    });
    window.culturalMarkers = [];
    
    // Скрываем панель информации о культурном маршруте
    if (typeof window.hideAllRouteInfo === 'function') {
        window.hideAllRouteInfo();
    } else {
        const routeInfoPanel = document.getElementById('route-info-panel');
        if (routeInfoPanel) routeInfoPanel.style.display = 'none';
    }
}

/**
 * Возвращает цвет маршрута в зависимости от профиля
 */
function getCulturalRouteColor(profile) {
    switch (profile) {
        case 'foot':
            return '#6200EA'; // Deep Purple
        case 'bike':
            return '#00BFA5'; // Teal Accent
        case 'car':
            return '#FF6D00'; // Orange
        default:
            return '#6200EA'; // Deep Purple по умолчанию
    }
}

/**
 * Возвращает иконку маркера в зависимости от типа места
 */
function getCulturalMarkerIcon(type, index) {
    // Определяем цвет маркера в зависимости от типа
    let iconUrl;
    switch (type) {
        case 'museum':
            iconUrl = '/img/markers/museum-marker.png';
            break;
        case 'park':
            iconUrl = '/img/markers/park-marker.png';
            break;
        case 'theater':
            iconUrl = '/img/markers/theater-marker.png';
            break;
        case 'church':
            iconUrl = '/img/markers/church-marker.png';
            break;
        case 'art_gallery':
            iconUrl = '/img/markers/gallery-marker.png';
            break;
        case 'library':
            iconUrl = '/img/markers/library-marker.png';
            break;
        case 'tourist_attraction':
            iconUrl = '/img/markers/attraction-marker.png';
            break;
        default:
            iconUrl = '/img/markers/default-marker.png';
    }
    
    // Проверка существования файла иконки
    const fileExists = false; // В текущей реализации мы всегда используем DIV иконки
    
    // Используем маркеры с номерами по умолчанию
    return L.divIcon({
        html: `<div class="number-marker" style="
            width: 26px;
            height: 26px;
            border-radius: 50%;
            background-color: ${getColorForType(type)};
            display: flex;
            justify-content: center;
            align-items: center;
            color: white;
            font-weight: bold;
            font-size: 12px;
            border: 2px solid white;
            box-shadow: 0 0 4px rgba(0,0,0,0.5);">${index}</div>`,
        className: 'custom-div-icon',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
    });
}

/**
 * Возвращает цвет в зависимости от типа места
 */
function getColorForType(type) {
    switch (type) {
        case 'museum':
            return '#673AB7'; // Deep Purple
        case 'park':
            return '#4CAF50'; // Green
        case 'theater':
            return '#E91E63'; // Pink
        case 'church':
            return '#FF9800'; // Orange
        case 'art_gallery':
            return '#9C27B0'; // Purple
        case 'library':
            return '#3F51B5'; // Indigo
        case 'tourist_attraction':
            return '#009688'; // Teal
        case 'gym':
            return '#4FC3F7'; // Light Blue
        case 'pharmacy':
            return '#4DB6AC'; // Teal
        case 'bank':
            return '#66BB6A'; // Green
        case 'school':
            return '#FFF176'; // Yellow
        default:
            return '#2196F3'; // Blue
    }
}

/**
 * Возвращает текущий выбранный профиль маршрута (пешком, велосипед, авто)
 */
function getCurrentProfile() {
    // Проверяем активную кнопку профиля
    const footButton = document.getElementById('profile-foot');
    const bikeButton = document.getElementById('profile-bike');
    const carButton = document.getElementById('profile-car');
    
    if (footButton && footButton.classList.contains('active')) {
        return 'foot';
    } else if (bikeButton && bikeButton.classList.contains('active')) {
        return 'bike';
    } else if (carButton && carButton.classList.contains('active')) {
        return 'car';
    }
    
    // По умолчанию возвращаем профиль "пешком"
    return 'foot';
}

/**
 * Очищает карту от всех маркеров и маршрутов
 */
function clearMap() {
    // Вызываем clearCulturalRoute для очистки культурных маршрутов
    clearCulturalRoute();
    
    // Предполагаем, что есть глобальная переменная map (Leaflet)
    // Добавляем другие функции очистки, если они существуют в глобальном контексте
    if (typeof window.clearAllRoutes === 'function') {
        window.clearAllRoutes();
    } else {
        // Если нет глобальной функции, очищаем стандартные элементы
        
        // Очищаем маркеры начала и конца маршрута
        if (window.startMarker) {
            map.removeLayer(window.startMarker);
            window.startMarker = null;
        }
        
        if (window.endMarker) {
            map.removeLayer(window.endMarker);
            window.endMarker = null;
        }
        
        // Очищаем маршрут
        if (window.routeLayer) {
            map.removeLayer(window.routeLayer);
            window.routeLayer = null;
        }
        
        // Очищаем маркеры POI
        if (window.poiMarkers) {
            window.poiMarkers.forEach(marker => {
                map.removeLayer(marker);
            });
            window.poiMarkers = [];
        }
    }
    
    // Скрываем все панели информации о маршрутах
    if (typeof window.hideAllRouteInfo === 'function') {
        window.hideAllRouteInfo();
    } else {
    // Скрываем панель информации о маршруте, если она существует
    const routeInfoPanel = document.getElementById('route-info-panel');
    if (routeInfoPanel) {
        routeInfoPanel.style.display = 'none';
        }
        
        const routeInfo = document.getElementById('route-info');
        if (routeInfo) {
            routeInfo.style.display = 'none';
        }
    }
}

// Инициализация обработчиков при загрузке документа
document.addEventListener('DOMContentLoaded', function() {
    initCulturalRouteHandlers();
    
    // Обработчик для ползунка количества точек культурного маршрута
    const culturalPoiCountSlider = document.getElementById('cultural-poi-count');
    const culturalPoiCountValue = document.getElementById('cultural-poi-count-value');
    
    if (culturalPoiCountSlider && culturalPoiCountValue) {
        // Устанавливаем начальное значение
        culturalPoiCountValue.textContent = culturalPoiCountSlider.value;
        
        // Обновляем значение при перемещении ползунка
        culturalPoiCountSlider.addEventListener('input', function() {
            culturalPoiCountValue.textContent = this.value;
            console.log('Установлено новое количество точек для культурного маршрута:', this.value);
        });
    }
});

// Функция для получения значения ползунка количества точек
function getCulturalPoiCount() {
    const slider = document.getElementById('cultural-poi-count');
    if (slider) {
        // Преобразуем значение в число и проверяем его валидность
        const value = parseInt(slider.value);
        
        // Проверяем, что значение находится в допустимом диапазоне
        if (!isNaN(value) && value >= parseInt(slider.min) && value <= parseInt(slider.max)) {
            console.log('Получено текущее значение ползунка количества точек:', value);
            
            // Обновляем отображаемое значение
            const displayValue = document.getElementById('cultural-poi-count-value');
            if (displayValue) {
                displayValue.textContent = value;
            }
            
            return value;
        } else {
            console.error('Недопустимое значение ползунка:', value);
            // Возвращаем значение по умолчанию в пределах допустимого диапазона
            return Math.max(parseInt(slider.min), Math.min(parseInt(slider.max), 4));
        }
    }
    
    // Значение по умолчанию, если не удалось получить значение из ползунка
    console.warn('Не удалось получить элемент ползунка, используем значение по умолчанию: 4');
    return 4;
}

// Функция для обновления состояния маркера "Включить музей"
function debugCulturalControls() {
    console.log('--- Отладка элементов управления культурным маршрутом ---');
    
    // Проверяем ползунок количества точек
    const slider = document.getElementById('cultural-poi-count');
    if (slider) {
        console.log(`Ползунок: id=${slider.id}, value=${slider.value}, min=${slider.min}, max=${slider.max}`);
    } else {
        console.error('Ползунок cultural-poi-count не найден!');
    }
    
    // Проверяем чекбоксы типов мест
    const museumCheckbox = document.getElementById('include-museum');
    const parkCheckbox = document.getElementById('include-park');
    
    if (museumCheckbox) {
        console.log(`Чекбокс музея: id=${museumCheckbox.id}, checked=${museumCheckbox.checked}`);
    } else {
        console.error('Чекбокс include-museum не найден!');
    }
    
    if (parkCheckbox) {
        console.log(`Чекбокс парка: id=${parkCheckbox.id}, checked=${parkCheckbox.checked}`);
    } else {
        console.error('Чекбокс include-park не найден!');
    }
    
    // Проверяем чекбоксы дополнительных типов мест
    const additionalTypes = ['theater', 'church', 'art_gallery', 'library', 'tourist_attraction'];
    additionalTypes.forEach(type => {
        const checkbox = document.querySelector(`.cultural-type-checkbox[value="${type}"]`);
        if (checkbox) {
            console.log(`Чекбокс ${type}: id=${checkbox.id}, checked=${checkbox.checked}`);
        } else {
            console.error(`Чекбокс для типа ${type} не найден!`);
        }
    });
    
    console.log('--- Конец отладки ---');
}

/**
 * Показывает индикатор загрузки с указанным сообщением
 * @deprecated Используйте createLoadingIndicator из route-utils.js
 */
function showLoadingIndicator(message) {
    console.warn('showLoadingIndicator deprecated, используйте createLoadingIndicator из route-utils.js');
    return createLoadingIndicator(message);
}

/**
 * Скрывает индикатор загрузки
 * @deprecated Используйте loadingIndicator.remove() из createLoadingIndicator
 */
function hideLoadingIndicator() {
    console.warn('hideLoadingIndicator deprecated, используйте loadingIndicator.remove()');
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        document.body.removeChild(loadingIndicator);
    }
} 