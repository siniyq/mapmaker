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
    clearMap(); // Очищаем текущую карту
    clearHeatmap();
    
    // Удаляем все маркеры при отображении тепловой карты плотности
    if (metric === 'density' && markersLayer) {
        markersLayer.clearLayers();
    }
    
    // Получаем тип заведений
    const heatmapType = document.getElementById('heatmap-type').value;
    
    // Сначала загружаем границы города, затем строим тепловую карту
    fetch('/api/vitebsk-geojson')
        .then(response => response.json())
        .then(geojson => {
            // Получаем координаты первого полигона
            const coordinates = geojson.features[0].geometry.coordinates;
            // Для MultiPolygon берём первый полигон
            const vitebskPolygonCoords = coordinates[0][0].map(([lng, lat]) => ({lat, lng}));
            
            // Теперь запрашиваем данные для тепловой карты
            return fetch(`/api/heatmap-data?type=${heatmapType}&metric=${metric}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json().then(data => ({
                        data: data,
                        cityBoundary: vitebskPolygonCoords,
                        geojson: geojson,
                        metric: metric // Передаем метрику дальше
                    }));
                });
        })
        .then(result => {
            const data = result.data;
            const vitebskPolygonCoords = result.cityBoundary;
            const geojson = result.geojson;
            const metric = result.metric; // Получаем метрику
            
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
            
            // Находим границы полигона
            let minLat = Number.MAX_VALUE;
            let maxLat = Number.MIN_VALUE;
            let minLng = Number.MAX_VALUE;
            let maxLng = Number.MIN_VALUE;
            
            vitebskPolygonCoords.forEach(coord => {
                minLat = Math.min(minLat, coord.lat);
                maxLat = Math.max(maxLat, coord.lat);
                minLng = Math.min(minLng, coord.lng);
                maxLng = Math.max(maxLng, coord.lng);
            });
            
            // Добавим небольшой отступ для полного охвата
            const padding = 0.005;
            minLat -= padding;
            maxLat += padding;
            minLng -= padding;
            maxLng += padding;
            
            console.log(`Границы региона: [${minLat}, ${minLng}] - [${maxLat}, ${maxLng}]`);
            
            // Размеры канваса
            const canvasWidth = 2000;
            const canvasHeight = 2000;
            
            // 1. Создаем основной canvas
            const canvas = document.createElement('canvas');
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            const ctx = canvas.getContext('2d');
            
            // 2. Создаем canvas для маски полигона
            const maskCanvas = document.createElement('canvas');
            maskCanvas.width = canvasWidth;
            maskCanvas.height = canvasHeight;
            const maskCtx = maskCanvas.getContext('2d');
            
            // 3. Преобразуем координаты полигона в пиксели
            const vitebskPolygon = vitebskPolygonCoords.map(coord => {
                const x = Math.round(((coord.lng - minLng) / (maxLng - minLng)) * canvasWidth);
                const y = Math.round(((maxLat - coord.lat) / (maxLat - minLat)) * canvasHeight);
                return {x, y};
            });
            
            // 4. Рисуем полигон города на маске
            maskCtx.fillStyle = 'white';
            maskCtx.beginPath();
            vitebskPolygon.forEach((point, i) => {
                if (i === 0) maskCtx.moveTo(point.x, point.y);
                else maskCtx.lineTo(point.x, point.y);
            });
            maskCtx.closePath();
            maskCtx.fill();
            
            // 5. Если отображаем плотность, создаем карту плотности
            if (metric === 'density') {
                // Создаем сетку плотности на основе разделения на ячейки
                const cellSize = 0.0065; // Уменьшаем размер ячейки для более плотного покрытия (~120м)
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
                        
                        // Проверяем, находится ли центр ячейки внутри полигона города
                        if (isPointInPolygon({lat: centerLat, lng: centerLng}, vitebskPolygonCoords)) {
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
                    // Используем порог в 10 вместо 6 для более яркого отображения областей с высокой плотностью
                    const maxDisplayValue = Math.max(10, maxDensity); 
                    
                    // Для низких значений используем линейную шкалу, для высоких - логарифмическую
                    // Это сделает различия между областями более заметными
                    let normalizedValue;
                    
                    if (value <= 5) {
                        // Для значений до 5 используем линейную шкалу
                        normalizedValue = value / 5 * 0.8; // максимальное значение 0.8 (для value=5)
                    } else {
                        // Для значений выше 5 используем логарифмическую шкалу
                        normalizedValue = 0.8 + Math.log(value - 4) / Math.log(maxDisplayValue - 4) * 0.2;
                    }
                    
                    normalizedValue = Math.min(1.0, normalizedValue); // ограничиваем максимальным значением 1.0
                    
                    // Используем 5 равных диапазонов для плотности
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
                    const baseRadius = 50; // Увеличиваем базовый радиус
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
                    gradient.addColorStop(0.7, getDensityColor(cell.value).replace('0.95', '0.8'));
                    gradient.addColorStop(0.9, getDensityColor(cell.value).replace('0.95', '0.3'));
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
                    heatCtx.fillStyle = getDensityColor(cell.value).replace('0.95', '1.0');
                    heatCtx.arc(cell.x, cell.y, centerSize, 0, Math.PI * 2);
                    heatCtx.fill();
                });
                
                // Накладываем тепловую карту на основной canvas
                ctx.drawImage(heatCanvas, 0, 0);
                
            } else {
                // 5. Создаем сетку точек внутри полигона для карты рейтинга
                const gridSize = 0.0008; // ~80м, уменьшаем шаг сетки для более точного покрытия
                const gridPoints = [];
                
                // Анализируем распределение точек для определения адаптивного радиуса
                const analyzeNearbyPoints = (lat, lng) => {
                    let count = 0;
                    let nearestDistance = Number.MAX_VALUE;
                    
                    for (const p of points) {
                        const d = Math.sqrt(Math.pow(lat - p.lat, 2) + Math.pow(lng - p.lng, 2));
                        if (d < 0.01) { // ~1км
                            count++;
                            nearestDistance = Math.min(nearestDistance, d);
                        }
                    }
                    
                    return { count, nearestDistance };
                };
                
                for (let lat = minLat; lat <= maxLat; lat += gridSize) {
                    for (let lng = minLng; lng <= maxLng; lng += gridSize) {
                        // Проверяем, находится ли точка внутри полигона
                        if (isPointInPolygon({lat, lng}, vitebskPolygonCoords)) {
                            // Анализируем близлежащие точки
                            const pointAnalysis = analyzeNearbyPoints(lat, lng);
                            
                            // Пропускаем точки, которые слишком далеко от существующих
                            if (pointAnalysis.nearestDistance > 0.008) { // ~800м
                                continue;
                            }
                            
                            // Вычисляем значение с помощью метода IDW (Inverse Distance Weighting)
                            let numerator = 0, denominator = 0;
                            let hasNearbyPoints = false;
                            
                            // Определяем эффективный радиус в зависимости от плотности точек
                            // Если точек много, уменьшаем радиус влияния
                            const effectiveRadius = pointAnalysis.count > 3 ? 0.003 : 0.004;
                            
                            for (const p of points) {
                                const d = Math.sqrt(Math.pow(lat - p.lat, 2) + Math.pow(lng - p.lng, 2));
                                
                                if (d < effectiveRadius) {
                                    hasNearbyPoints = true;
                                    
                                    if (d < 0.0001) { // ~10м
                                        numerator = p.value;
                                        denominator = 1;
                                        break;
                                    }
                                    
                                    // Вес обратно пропорционален квадрату расстояния
                                    // Увеличиваем степень для более быстрого убывания влияния с расстоянием
                                    const w = 1 / Math.pow(d + 0.0001, 2.5);
                                    numerator += p.value * w;
                                    denominator += w;
                                }
                            }
                            
                            if (hasNearbyPoints && denominator > 0) {
                                const value = numerator / denominator;
                                // Преобразуем в пиксельные координаты
                                const x = Math.round(((lng - minLng) / (maxLng - minLng)) * canvasWidth);
                                const y = Math.round(((maxLat - lat) / (maxLat - minLat)) * canvasHeight);
                                
                                // Сохраняем данные о плотности точек
                                gridPoints.push({x, y, value, pointDensity: pointAnalysis.count});
                            }
                        }
                    }
                }
                
                console.log(`Создано ${gridPoints.length} точек для тепловой карты рейтинга`);
                
                if (gridPoints.length === 0) {
                    alert('Недостаточно данных для построения тепловой карты');
                    return;
                }
                
                // 6. Определяем функцию для получения цвета в зависимости от значения рейтинга
                const getRatingColor = (value) => {
                    // Нормализуем от 0 до 1
                    const normalizedValue = Math.min(Math.max(value / 5, 0), 1);
                    
                    if (normalizedValue < 0.4) {
                        // От ярко-красного до оранжевого
                        const r = 255;
                        const g = Math.round(100 + 155 * (normalizedValue / 0.4));
                        return `rgba(${r}, ${g}, 0, 0.95)`;
                    } else if (normalizedValue < 0.7) {
                        // От оранжевого до желтого
                        const r = 255;
                        const g = Math.round(200 + 55 * (normalizedValue - 0.4) / 0.3);
                        return `rgba(${r}, ${g}, 0, 0.95)`;
                    } else {
                        // От желтого до ярко-зеленого
                        const r = Math.round(255 * (1 - (normalizedValue - 0.7) / 0.3));
                        const g = 255;
                        return `rgba(${r}, ${g}, 0, 0.95)`;
                    }
                };
                
                // 7. Рисуем градиенты для каждой точки на отдельном канвасе
                const heatCanvas = document.createElement('canvas');
                heatCanvas.width = canvasWidth;
                heatCanvas.height = canvasHeight;
                const heatCtx = heatCanvas.getContext('2d');
                
                // Устанавливаем параметры размытия для более четких контуров
                heatCtx.filter = `blur(15px)`;
                
                // Рисуем каждую точку как градиент
                gridPoints.forEach(point => {
                    // Радиус влияния точки зависит от плотности точек в этой области
                    // Если точек много, уменьшаем радиус, если мало - делаем радиус меньше
                    const baseRadius = 30;
                    const pointRadius = point.pointDensity > 3 ? 
                        baseRadius * 0.9 : 
                        (point.pointDensity === 1 ? baseRadius * 0.7 : baseRadius);
                    
                    // Создаем радиальный градиент
                    const gradient = heatCtx.createRadialGradient(
                        point.x, point.y, 0,
                        point.x, point.y, pointRadius
                    );
                    
                    // Центр градиента - цвет в зависимости от значения
                    gradient.addColorStop(0, getRatingColor(point.value));
                    // Промежуточная точка для более плавного затухания
                    gradient.addColorStop(0.85, getRatingColor(point.value).replace('0.95', '0.5'));
                    // Края градиента - прозрачные
                    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                    
                    // Рисуем круг с градиентом
                    heatCtx.beginPath();
                    heatCtx.fillStyle = gradient;
                    heatCtx.arc(point.x, point.y, pointRadius, 0, Math.PI * 2);
                    heatCtx.fill();
                    
                    // Добавляем яркий центр для увеличения контраста
                    heatCtx.beginPath();
                    heatCtx.fillStyle = getRatingColor(point.value);
                    heatCtx.arc(point.x, point.y, pointRadius * 0.25, 0, Math.PI * 2);
                    heatCtx.fill();
                });
                
                // Накладываем маску на тепловую карту
                ctx.drawImage(heatCanvas, 0, 0);
            }
            
            // Применяем маску полигона - оставляем только то, что внутри
            ctx.globalCompositeOperation = 'destination-in';
            ctx.drawImage(maskCanvas, 0, 0);
            
            // Возвращаем нормальный режим композиции
            ctx.globalCompositeOperation = 'source-over';
            
            // 9. Добавляем созданную тепловую карту на Leaflet
            const bounds = L.latLngBounds(
                L.latLng(minLat, minLng), 
                L.latLng(maxLat, maxLng)
            );
            
            heatmapLayer = L.imageOverlay(canvas.toDataURL(), bounds, {
                opacity: 1.0,
                interactive: false
            }).addTo(map);
            
            // 10. Добавляем контур границ города
            L.geoJSON(geojson, {
                style: {
                    color: '#333',
                    weight: 1.5,
                    fillOpacity: 0,
                    opacity: 0.6
                }
            }).addTo(map);
            
            // 11. Добавляем легенду
            addHeatmapLegend(metric);
            
            // 12. Центрируем карту на границах города
            const latLngs = vitebskPolygonCoords.map(coord => [coord.lat, coord.lng]);
            const cityBounds = L.latLngBounds(latLngs);
            map.fitBounds(cityBounds, {padding: [20, 20]});
        })
        .catch(error => {
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
            <div style="text-align: center;">
                <div style="font-size: 18px; margin-bottom: 5px;">${typeSymbol}</div>
                <b>${type}</b><br>
                ${isRating ? `Рейтинг: <b>${point.value.toFixed(1)}</b>` : `Количество: <b>${point.count || 1}</b>`}
                ${point.name ? `<br>Название: <b>${point.name}</b>` : ''}
                ${point.address ? `<br>Адрес: ${point.address}` : ''}
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
