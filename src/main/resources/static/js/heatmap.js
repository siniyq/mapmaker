// Добавляем библиотеку JavaScript Temperature Map
let script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/gh/optimisme/javascript-temperatureMap@master/temperatureMap.js';
document.head.appendChild(script);

// Переменные для тепловой карты
let heatmapLayer = null;
let heatmapLegend = null;
let markersLayer = null;

// Функция проверки, находится ли точка внутри полигона
function isPointInPolygon(point, polygon) {
    // Алгоритм "точка внутри полигона" (Ray casting algorithm)
    let isInside = false;
    const x = point.lng;
    const y = point.lat;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].lng;
        const yi = polygon[i].lat;
        const xj = polygon[j].lng;
        const yj = polygon[j].lat;
        
        const intersect = ((yi > y) !== (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            
        if (intersect) isInside = !isInside;
    }
    
    return isInside;
}

// В начале файла, после добавления скрипта
script.onload = function() {
    console.log('TemperatureMap библиотека успешно загружена');
    // Инициализируем обработчики только после загрузки библиотеки
    document.getElementById('heatmap-rating-button').addEventListener('click', function() {
        createHeatmap('rating');
    });

    document.getElementById('heatmap-density-button').addEventListener('click', function() {
        createHeatmap('density');
    });

    document.getElementById('heatmap-clear-button').addEventListener('click', clearHeatmap);
};

script.onerror = function() {
    console.error('Ошибка загрузки библиотеки TemperatureMap');
};

// Функция создания тепловой карты
function createHeatmap(metric) {
    console.log('Создание тепловой карты с метрикой:', metric);
    
    // Очищаем карту от предыдущих данных
    clearHeatmap();
    
    // Создаем индикатор загрузки
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'heatmap-loading';
    loadingDiv.innerHTML = '<div style="text-align:center; padding:20px; background:white; border-radius:5px; box-shadow:0 2px 10px rgba(0,0,0,0.1);"><i class="fas fa-spinner fa-spin"></i> Загрузка данных...</div>';
    loadingDiv.style.position = 'absolute';
    loadingDiv.style.top = '50%';
    loadingDiv.style.left = '50%';
    loadingDiv.style.transform = 'translate(-50%, -50%)';
    loadingDiv.style.zIndex = '10000';
    document.body.appendChild(loadingDiv);

    // Удаляем индикатор загрузки через 5 секунд (защита от зависания)
    setTimeout(() => {
        const loading = document.getElementById('heatmap-loading');
        if (loading) {
            loading.remove();
    }
    }, 5000);
    
    // Получаем тип заведений
    const heatmapType = document.getElementById('heatmap-type').value;
    
    // Запрашиваем данные для тепловой карты напрямую (без границ города)
    fetch(`/api/heatmap-data?type=${heatmapType}&metric=${metric}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
            return response.json();
        })
        .then(data => {
            // Удаляем индикатор загрузки
            const loading = document.getElementById('heatmap-loading');
            if (loading) {
                loading.remove();
            }
            
            if (!data || !data.points || data.points.length === 0) {
                console.log('Получены данные:', data);
                alert('Недостаточно данных для построения тепловой карты');
                return;
            }
            
            console.log('Получено точек для тепловой карты:', data.points.length);
            let points = data.points;
            
            // Добавляем маркеры точек с указанием текущей метрики
            if (metric === 'rating') {
                addPointMarkers(points, heatmapType, metric);
            }
            
            // Находим границы области данных
            let minLat = Number.MAX_VALUE;
            let maxLat = Number.MIN_VALUE;
            let minLng = Number.MAX_VALUE;
            let maxLng = Number.MIN_VALUE;
            
            points.forEach(point => {
                minLat = Math.min(minLat, point.lat);
                maxLat = Math.max(maxLat, point.lat);
                minLng = Math.min(minLng, point.lng);
                maxLng = Math.max(maxLng, point.lng);
            });
            
            // Добавим небольшой отступ для полного охвата
            const padding = 0.005;
            minLat -= padding;
            maxLat += padding;
            minLng -= padding;
            maxLng += padding;
            
            console.log(`Границы области данных: [${minLat}, ${minLng}] - [${maxLat}, ${maxLng}]`);
            
            // Размеры канваса
            const canvasWidth = 2000;
            const canvasHeight = 2000;
            
            // Создаем основной canvas
            const canvas = document.createElement('canvas');
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            const ctx = canvas.getContext('2d');
            
            // Если отображаем плотность, создаем карту плотности
            if (metric === 'density') {
                // Создаем сетку плотности на основе разделения на ячейки
                const cellSize = 0.0065; // Размер ячейки (~120м)
                const densityGrid = {};
                
                // Заполняем сетку плотности
                for (const p of points) {
                    const cellX = Math.floor(p.lng / cellSize);
                    const cellY = Math.floor(p.lat / cellSize);
                    const cellKey = `${cellX},${cellY}`;
                    
                    if (!densityGrid[cellKey]) {
                        densityGrid[cellKey] = {
                            count: 0,
                            lat: 0,
                            lng: 0,
                            points: []
                        };
                    }
                    
                    densityGrid[cellKey].count++;
                    densityGrid[cellKey].lat += p.lat;
                    densityGrid[cellKey].lng += p.lng;
                    densityGrid[cellKey].points.push(p);
                }
                
                // Вычисляем центр каждой ячейки и плотность
                const densityCells = [];
                let maxDensity = 0;
                
                for (const key in densityGrid) {
                    const cell = densityGrid[key];
                    if (cell.count > 0) {
                        const centerLat = cell.lat / cell.count;
                        const centerLng = cell.lng / cell.count;
                        
                            // Вычисляем плотность как количество точек в ячейке
                            const density = cell.count;
                            maxDensity = Math.max(maxDensity, density);
                            
                            // Преобразуем в пиксельные координаты
                            const x = Math.round(((centerLng - minLng) / (maxLng - minLng)) * canvasWidth);
                            const y = Math.round(((maxLat - centerLat) / (maxLat - minLat)) * canvasHeight);
                            
                            densityCells.push({
                                x, y, 
                                value: density,
                                count: cell.count,
                                points: cell.points
                            });
                            
                            // Обновляем точки для маркеров с информацией о плотности
                            cell.points.forEach(p => {
                                p.count = density;
                            });
                    }
                }
                
                // Заменяем стандартные точки на точки с информацией о плотности для маркеров
                if (densityGrid) {
                    const densityPoints = [];
                    for (const key in densityGrid) {
                        if (densityGrid[key].count > 0) {
                            densityGrid[key].points.forEach(p => {
                                densityPoints.push(p);
                            });
                        }
                    }
                    points = densityPoints;
                }
                
                console.log(`Создано ${densityCells.length} ячеек плотности, максимальная плотность: ${maxDensity}`);
                
                // Определяем функцию для получения цвета в зависимости от плотности
                const getDensityColor = (value) => {
                    const maxDisplayValue = Math.max(10, maxDensity); 
                    
                    let normalizedValue;
                    
                    if (value <= 5) {
                        normalizedValue = value / 5 * 0.8;
                    } else {
                        normalizedValue = 0.8 + Math.log(value - 4) / Math.log(maxDisplayValue - 4) * 0.2;
                    }
                    
                    normalizedValue = Math.min(1.0, normalizedValue);
                    
                    // Цветовая схема для плотности
                    if (normalizedValue <= 0.2) {
                        // Синий (1 точка)
                        return 'rgba(70, 130, 190, 0.95)';
                    } else if (normalizedValue <= 0.4) {
                        // Голубой (2 точки)
                        return 'rgba(30, 255, 255, 0.95)';
                    } else if (normalizedValue <= 0.6) {
                        // Зеленый (3 точки)
                        return 'rgba(110, 255, 90, 0.95)';
                    } else if (normalizedValue <= 0.8) {
                        // Желтый (4-5 точек)
                        return 'rgba(255, 255, 0, 0.95)';
                    } else {
                        // Красный (6+ точек)
                        return 'rgba(255, 75, 0, 0.95)';
                    }
                };
                
                // Рисуем тепловую карту плотности
                const heatCanvas = document.createElement('canvas');
                heatCanvas.width = canvasWidth;
                heatCanvas.height = canvasHeight;
                const heatCtx = heatCanvas.getContext('2d');
                
                // Устанавливаем параметры размытия для более плавных переходов
                heatCtx.filter = `blur(12px)`;
                
                // Рисуем градиенты для каждой ячейки плотности
                densityCells.forEach(cell => {
                    // Адаптивный радиус: с небольшим увеличением в зависимости от количества точек
                    // Это создаст более естественное распределение тепловой карты
                    const baseRadius = 70; // Увеличиваем базовый радиус с 50 до 70
                    const scaling = Math.min(2.0, Math.sqrt(cell.count) / 1.5); // Более значительное масштабирование
                    const pointRadius = baseRadius * scaling;
                    
                    // Создаем радиальный градиент
                    const gradient = heatCtx.createRadialGradient(
                        cell.x, cell.y, 0,
                        cell.x, cell.y, pointRadius
                    );
                    
                    // Центр градиента - цвет в зависимости от плотности
                    gradient.addColorStop(0, getDensityColor(cell.value));
                    // Промежуточная точка - более плавный переход к прозрачности
                    gradient.addColorStop(0.7, getDensityColor(cell.value).replace('0.95', '0.7'));
                    gradient.addColorStop(0.9, getDensityColor(cell.value).replace('0.95', '0.25'));
                    // Края градиента - прозрачные
                    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                    
                    // Рисуем круг с градиентом
                    heatCtx.beginPath();
                    heatCtx.fillStyle = gradient;
                    heatCtx.arc(cell.x, cell.y, pointRadius, 0, Math.PI * 2);
                    heatCtx.fill();
                    
                    // Добавляем яркий центр для выделения центров высокой плотности
                    const centerSize = pointRadius * 0.25; // Увеличиваем размер центра
                    heatCtx.beginPath();
                    heatCtx.fillStyle = getDensityColor(cell.value).replace('0.95', '0.9');
                    heatCtx.arc(cell.x, cell.y, centerSize, 0, Math.PI * 2);
                    heatCtx.fill();
                });
                
                // Накладываем тепловую карту на основной canvas
                ctx.drawImage(heatCanvas, 0, 0);
                
            } else {
                // Создаем упрощенную сетку точек для карты рейтинга
                const gridSize = 0.003; // Увеличиваем размер сетки для более крупных областей
                const gridPoints = [];
                
                // Создаем сетку и группируем точки по ячейкам (аналогично карте плотности)
                const ratingGrid = {};
                    
                    for (const p of points) {
                    const cellX = Math.floor(p.lat / gridSize);
                    const cellY = Math.floor(p.lng / gridSize);
                    const cellKey = `${cellX},${cellY}`;
                    
                    if (!ratingGrid[cellKey]) {
                        ratingGrid[cellKey] = {
                            ratings: [],
                            lat: 0,
                            lng: 0,
                            count: 0
                        };
                    }
                    
                    ratingGrid[cellKey].ratings.push(p.value);
                    ratingGrid[cellKey].lat += p.lat;
                    ratingGrid[cellKey].lng += p.lng;
                    ratingGrid[cellKey].count++;
                }
                
                // Преобразуем сетку в точки для тепловой карты
                for (const key in ratingGrid) {
                    const cell = ratingGrid[key];
                    if (cell.count > 0) {
                        const centerLat = cell.lat / cell.count;
                        const centerLng = cell.lng / cell.count;
                        
                        // Вычисляем средний рейтинг для ячейки
                        const avgRating = cell.ratings.reduce((sum, r) => sum + r, 0) / cell.ratings.length;
                        
                                // Преобразуем в пиксельные координаты
                        const x = Math.round(((centerLng - minLng) / (maxLng - minLng)) * canvasWidth);
                        const y = Math.round(((maxLat - centerLat) / (maxLat - minLat)) * canvasHeight);
                                
                        gridPoints.push({
                            x, y, 
                            value: avgRating,
                            count: cell.count
                        });
                    }
                }
                
                console.log(`Создано ${gridPoints.length} точек для тепловой карты рейтинга`);
                
                if (gridPoints.length === 0) {
                    alert('Недостаточно данных для построения тепловой карты');
                    return;
                }
                
                // Определяем функцию для получения цвета в зависимости от значения рейтинга
                const getRatingColor = (value) => {
                    // Нормализуем от 0 до 1
                    const normalizedValue = Math.min(Math.max(value / 5, 0), 1);
                    
                    if (normalizedValue < 0.4) {
                        // От ярко-красного до оранжевого (плохой рейтинг)
                        const r = 255;
                        const g = Math.round(100 + 155 * (normalizedValue / 0.4));
                        return `rgba(${r}, ${g}, 0, 0.95)`;
                    } else if (normalizedValue < 0.7) {
                        // От оранжевого до желтого (средний рейтинг)
                        const r = 255;
                        const g = Math.round(200 + 55 * (normalizedValue - 0.4) / 0.3);
                        return `rgba(${r}, ${g}, 0, 0.95)`;
                    } else {
                        // От желтого до ярко-зеленого (хороший рейтинг)
                        const r = Math.round(255 * (1 - (normalizedValue - 0.7) / 0.3));
                        const g = 255;
                        return `rgba(${r}, ${g}, 0, 0.95)`;
                    }
                };
                
                // Рисуем градиенты для каждой точки рейтинга
                const heatCanvas = document.createElement('canvas');
                heatCanvas.width = canvasWidth;
                heatCanvas.height = canvasHeight;
                const heatCtx = heatCanvas.getContext('2d');
                
                // Используем такое же размытие как у карты плотности
                heatCtx.filter = `blur(12px)`;
                
                // Рисуем каждую точку как градиент
                gridPoints.forEach(point => {
                    // Используем большой радиус как у карты плотности
                    const baseRadius = 75; // Увеличиваем с 60 до 75 для лучшей видимости
                    const scaling = Math.min(2.0, Math.sqrt(point.count) / 1.5);
                    const pointRadius = baseRadius * scaling;
                    
                    // Создаем радиальный градиент
                    const gradient = heatCtx.createRadialGradient(
                        point.x, point.y, 0,
                        point.x, point.y, pointRadius
                    );
                    
                    // Центр градиента - цвет в зависимости от рейтинга
                    gradient.addColorStop(0, getRatingColor(point.value));
                    // Промежуточная точка для более плавного затухания
                    gradient.addColorStop(0.7, getRatingColor(point.value).replace('0.95', '0.7'));
                    gradient.addColorStop(0.9, getRatingColor(point.value).replace('0.95', '0.25'));
                    // Края градиента - прозрачные
                    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                    
                    // Рисуем круг с градиентом
                    heatCtx.beginPath();
                    heatCtx.fillStyle = gradient;
                    heatCtx.arc(point.x, point.y, pointRadius, 0, Math.PI * 2);
                    heatCtx.fill();
                    
                    // Добавляем яркий центр для выделения
                    const centerSize = pointRadius * 0.25;
                    heatCtx.beginPath();
                    heatCtx.fillStyle = getRatingColor(point.value).replace('0.95', '0.8');
                    heatCtx.arc(point.x, point.y, centerSize, 0, Math.PI * 2);
                    heatCtx.fill();
                });
                
                // Накладываем тепловую карту на основной canvas
                ctx.drawImage(heatCanvas, 0, 0);
            }
            
            // Добавляем созданную тепловую карту на Leaflet
            const bounds = L.latLngBounds(
                L.latLng(minLat, minLng), 
                L.latLng(maxLat, maxLng)
            );
            
            heatmapLayer = L.imageOverlay(canvas.toDataURL(), bounds, {
                opacity: 1.0,
                interactive: false
            }).addTo(map);
            
            // Добавляем легенду
            addHeatmapLegend(metric);
            
            // Центрируем карту на области данных
            const dataBounds = L.latLngBounds(
                L.latLng(minLat, minLng),
                L.latLng(maxLat, maxLng)
            );
            map.fitBounds(dataBounds, {padding: [20, 20]});
        })
        .catch(error => {
            // Удаляем индикатор загрузки в случае ошибки
            const loading = document.getElementById('heatmap-loading');
            if (loading) {
                loading.remove();
            }
            console.error('Ошибка при получении данных для тепловой карты:', error.message, error);
            alert(`Ошибка при построении тепловой карты: ${error.message}`);
        });
}

// Функция добавления маркеров для каждой точки с данными
function addPointMarkers(points, type, metric) {
    // Создаем новый слой для маркеров, если еще не создан
    if (!markersLayer) {
        markersLayer = L.layerGroup().addTo(map);
    } else {
        markersLayer.clearLayers();
    }
    
    // Функция для получения цвета маркера в зависимости от рейтинга
    function getMarkerColor(rating) {
        if (rating < 1) return '#FF5252';        // Светло-красный
        else if (rating < 2) return '#FF7B29';   // Светло-оранжевый
        else if (rating < 3) return '#FFA726';   // Янтарный
        else if (rating < 4) return '#FFEB3B';   // Желтый
        else return '#76FF03';                   // Светло-зеленый
    }
    
    // Функция для получения цвета маркера в зависимости от плотности
    function getDensityMarkerColor(density) {
        if (density <= 1) return '#4682BE';      // Синий (1 точка)
        else if (density <= 2) return '#1EFFFF';  // Голубой (2 точки)
        else if (density <= 3) return '#6EFF5A';  // Зеленый (3 точки)
        else if (density <= 5) return '#FFFF00';  // Желтый (4-5 точек)
        else return '#FF4B00';                   // Красный (6+ точек)
    }
    
    // Функция для получения базового цвета типа объекта
    function getTypeColor(type) {
        switch (type) {
            case 'restaurant': return '#E57373'; // Красный
            case 'cafe': return '#FFB74D';      // Оранжевый
            case 'bar': return '#9575CD';       // Фиолетовый
            case 'gym': return '#4FC3F7';       // Голубой
            case 'pharmacy': return '#4DB6AC';  // Бирюзовый
            case 'bank': return '#66BB6A';      // Зеленый
            case 'school': return '#FFF176';    // Желтый
            default: return '#90A4AE';          // Серый
        }
    }
    
    // Функция для получения символа типа объекта
    function getTypeSymbol(type) {
        switch (type) {
            case 'restaurant': return '🍽️';
            case 'cafe': return '☕';
            case 'bar': return '🍸';
            case 'gym': return '💪';
            case 'pharmacy': return '💊';
            case 'bank': return '🏦';
            case 'school': return '🏫';
            default: return '📍';
        }
    }
    
    // Функция для отображения звездочек рейтинга
    function getRatingStars(rating) {
        const fullStars = Math.floor(rating);
        const halfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
        
        let stars = '';
        // Полные звезды
        for (let i = 0; i < fullStars; i++) {
            stars += '★';
        }
        // Половина звезды
        if (halfStar) {
            stars += '✭';
        }
        // Пустые звезды
        for (let i = 0; i < emptyStars; i++) {
            stars += '☆';
        }
        
        return `<span style="color: gold;">${stars}</span>`;
    }
    
    // Получаем базовый цвет для типа объекта
    const typeColor = getTypeColor(type);
    const typeSymbol = getTypeSymbol(type);
    
    // Добавляем каждую точку как маркер на карту
    points.forEach(point => {
        const isRating = metric === 'rating';
        const markerColor = isRating ? getMarkerColor(point.value) : getDensityMarkerColor(point.count || 1);
        const displayValue = isRating ? point.value.toFixed(1) : (point.count || 1);
        const textColor = isRating ? (point.value < 3 ? 'white' : 'black') : (point.count > 3 ? 'white' : 'black');
        
        // Создаем HTML для пользовательского маркера
        const markerHtml = `
            <div style="
                width: 22px;
                height: 22px;
                border-radius: 50%;
                background-color: ${markerColor};
                display: flex;
                justify-content: center;
                align-items: center;
                color: ${textColor};
                font-weight: bold;
                font-size: 11px;
                border: 2px solid white;
                box-shadow: 0 0 3px rgba(0,0,0,0.5);
            ">
                ${displayValue}
            </div>
        `;
        
        // Создаем пользовательский значок
        const customIcon = L.divIcon({
            html: markerHtml,
            className: 'custom-div-icon',
            iconSize: [22, 22],
            iconAnchor: [11, 11]
        });
        
        // Создаем и добавляем маркер
        const marker = L.marker([point.lat, point.lng], {
            icon: customIcon
        });
        
        // Добавляем попап с информацией
        marker.bindPopup(`
            <div style="text-align: left; min-width: 220px; padding: 8px;">
                <div style="display: flex; align-items: center; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 8px;">
                    <div style="font-size: 24px; margin-right: 10px;">${typeSymbol}</div>
                    <div style="flex: 1;">
                        ${point.name 
                            ? `<h3 style="margin: 0 0 5px 0; color: #333; font-size: 16px; font-weight: bold;">${point.name}</h3>` 
                            : `<h3 style="margin: 0 0 5px 0; color: #333; font-size: 16px;">${type.charAt(0).toUpperCase() + type.slice(1)}</h3>`}
                        ${isRating 
                            ? `<div style="font-weight: bold; color: ${markerColor}; font-size: 14px;">
                                <span style="display: inline-block; margin-right: 5px;">Рейтинг:</span> 
                                ${point.value.toFixed(1)} ${getRatingStars(point.value)}
                              </div>` 
                            : `<div style="font-size: 14px;">Количество: <b>${point.count || 1}</b></div>`}
                    </div>
                </div>
                ${point.address 
                    ? `<div style="margin: 5px 0; font-size: 13px; background-color: #f5f5f5; padding: 5px; border-radius: 4px;">
                        <strong>Адрес:</strong> ${point.address}
                      </div>` 
                    : ''}
                ${point.phone 
                    ? `<div style="margin: 5px 0; font-size: 13px;">
                        <strong>Телефон:</strong> ${point.phone}
                      </div>` 
                    : ''}
                ${point.hours 
                    ? `<div style="margin: 5px 0; font-size: 13px;">
                        <strong>Часы работы:</strong> ${point.hours}
                      </div>` 
                    : ''}
            </div>
        `);
        
        // Добавляем маркер на слой
        marker.addTo(markersLayer);
    });
}

// Очистка тепловой карты
function clearHeatmap() {
    if (heatmapLayer) {
        map.removeLayer(heatmapLayer);
        heatmapLayer = null;
    }
    if (markersLayer) {
        markersLayer.clearLayers();
        map.removeLayer(markersLayer);
        markersLayer = null;
    }
    removeLegend();
}

// Добавление легенды для тепловой карты
function addHeatmapLegend(metric) {
    // Удаляем предыдущую легенду, если она существует
    removeLegend();
    
    // Создаем контейнер для легенды
    const legend = document.createElement('div');
    legend.id = 'heatmap-legend';
    legend.style.cssText = `
        position: absolute;
        bottom: 35px;
        left: 10px;
        background: rgba(255, 255, 255, 0.9);
        border-radius: 5px;
        padding: 10px;
        width: 240px;
        z-index: 1000;
        box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
        font-family: Arial, sans-serif;
        font-size: 12px;
    `;
    
    // Заголовок легенды
    const title = document.createElement('div');
    title.style.cssText = 'font-weight: bold; margin-bottom: 8px; font-size: 14px;';
    title.textContent = metric === 'rating' ? 'Рейтинг заведений' : 'Плотность заведений';
    legend.appendChild(title);
    
    // Создаем градиентную шкалу
    const gradientBar = document.createElement('div');
    gradientBar.style.cssText = `
        height: 20px;
        width: 100%;
        margin: 5px 0;
        border-radius: 3px;
        background: ${
            metric === 'rating' 
            ? 'linear-gradient(to right, #d73027, #fc8d59, #fee08b, #d9ef8b, #91cf60)'
            : 'linear-gradient(to right, #4682BE, #1EFFFF, #6EFF5A, #FFFF00, #FF4B00)'
        };
    `;
    legend.appendChild(gradientBar);
    
    // Добавляем метки
    const labelsContainer = document.createElement('div');
    labelsContainer.style.cssText = 'display: flex; justify-content: space-between; margin-top: 5px;';
    
        if (metric === 'rating') {
        labelsContainer.innerHTML = `
            <span>1.0</span>
            <span>2.0</span>
            <span>3.0</span>
            <span>4.0</span>
            <span>5.0</span>
        `;
        } else {
        labelsContainer.innerHTML = `
            <span>1</span>
            <span>2</span>
            <span>3</span>
            <span>4-5</span>
            <span>6+</span>
        `;
    }
    
    legend.appendChild(labelsContainer);
    
    // Описание
    const description = document.createElement('div');
    description.style.cssText = 'margin-top: 8px; font-size: 11px; color: #666;';
    description.textContent = metric === 'rating' 
        ? 'Средний рейтинг заведений в данной области' 
        : 'Количество заведений в данной области';
    legend.appendChild(description);
    
    // Добавляем легенду на карту
    document.getElementById('map').appendChild(legend);
    heatmapLegend = legend;
}

// Удаление легенды
function removeLegend() {
    if (heatmapLegend) {
        document.getElementById('map').removeChild(heatmapLegend);
        heatmapLegend = null;
    }
}

// Функция для кластеризации точек
function clusterPoints(points, radius) {
    const clusters = [];
    const processed = new Set();
    
    for (let i = 0; i < points.length; i++) {
        if (processed.has(i)) continue;
        
        const cluster = {
            lat: points[i][0],
            lng: points[i][1],
            value: points[i][2],
            count: 1
        };
        
        processed.add(i);
        
        // Ищем соседние точки
        for (let j = 0; j < points.length; j++) {
            if (i === j || processed.has(j)) continue;
            
            // Расстояние между точками (в градусах)
            const distance = Math.sqrt(
                Math.pow(points[i][0] - points[j][0], 2) + 
                Math.pow(points[i][1] - points[j][1], 2)
            );
            
            // Если точка находится в радиусе кластера, добавляем её
            if (distance < radius) {
                cluster.lat = (cluster.lat * cluster.count + points[j][0]) / (cluster.count + 1);
                cluster.lng = (cluster.lng * cluster.count + points[j][1]) / (cluster.count + 1);
                cluster.value += points[j][2];
                cluster.count++;
                processed.add(j);
            }
        }
        
        // Вычисляем среднее значение для кластера
        cluster.value /= cluster.count;
        clusters.push([cluster.lat, cluster.lng, cluster.value]);
    }
    
    return clusters;
}

// Функция интерполяции данных методом IDW (Inverse Distance Weighting)
function interpolateIDW(points, x, y, power = 2) {
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < points.length; i++) {
        const distance = Math.sqrt(
            Math.pow(x - points[i][0], 2) + 
            Math.pow(y - points[i][1], 2)
        );
        
        // Избегаем деления на ноль
        if (distance === 0) {
            return points[i][2];
        }
        
        const weight = 1 / Math.pow(distance, power);
        numerator += points[i][2] * weight;
        denominator += weight;
    }
    
    return numerator / denominator;
}