var map = L.map('map').setView([55.1904, 30.2049], 13);
var markersLayer = L.layerGroup();
var selectedPointsLayer = L.layerGroup().addTo(map);
var infoPanel;

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Константы для настройки хитмапа
const GRID_STEP_SIZE = 500; // размер ячейки для группировки в метрах
const MIN_POINTS_IN_CELL = 1; // минимальное количество точек в ячейке
const IDW_RADIUS = 3000; // радиус для IDW интерполяции в метрах
const IDW_POWER = 2; // степень в формуле IDW
const SEARCH_NEARBY_POINTS = 100; // количество ближайших точек для интерполяции
const TILE_SIZE = 256; // размер тайла в пикселях

// Добавляем панель информации
function createInfoPanel() {
    if (infoPanel) {
        return;
    }
    
    infoPanel = L.control({position: 'bottomleft'});
    
    infoPanel.onAdd = function() {
        const div = L.DomUtil.create('div', 'info-panel');
        div.style.backgroundColor = 'white';
        div.style.padding = '15px';
        div.style.borderRadius = '5px';
        div.style.maxWidth = '350px';
        div.style.maxHeight = '400px';
        div.style.overflowY = 'auto';
        div.style.display = 'none';
        div.style.boxShadow = '0 0 10px rgba(0,0,0,0.3)';
        div.innerHTML = '<h4>Информация о заведениях</h4><div id="info-content"></div>';
        return div;
    };
    
    infoPanel.addTo(map);
    return infoPanel;
}

// Добавляем легенду на карту
function addLegend() {
    const legend = L.control({position: 'bottomright'});
    
    legend.onAdd = function() {
        const div = L.DomUtil.create('div', 'info legend');
        div.style.backgroundColor = 'white';
        div.style.padding = '10px';
        div.style.borderRadius = '5px';
        div.style.boxShadow = '0 0 10px rgba(0,0,0,0.3)';
        div.innerHTML = `
            <h4>Рейтинг заведений</h4>
            <div style="display: flex; align-items: center; margin-bottom: 5px;">
                <div style="background: #FF0000; width: 20px; height: 20px;"></div>
                <span style="margin-left: 5px;">Отлично (4.75+)</span>
            </div>
            <div style="display: flex; align-items: center; margin-bottom: 5px;">
                <div style="background: #FF5500; width: 20px; height: 20px;"></div>
                <span style="margin-left: 5px;">Очень хорошо (4.5-4.75)</span>
            </div>
            <div style="display: flex; align-items: center; margin-bottom: 5px;">
                <div style="background: #FFA500; width: 20px; height: 20px;"></div>
                <span style="margin-left: 5px;">Хорошо+ (4.25-4.5)</span>
            </div>
            <div style="display: flex; align-items: center; margin-bottom: 5px;">
                <div style="background: #FFCC00; width: 20px; height: 20px;"></div>
                <span style="margin-left: 5px;">Хорошо (4.0-4.25)</span>
            </div>
            <div style="display: flex; align-items: center; margin-bottom: 5px;">
                <div style="background: #FFFF00; width: 20px; height: 20px;"></div>
                <span style="margin-left: 5px;">Выше среднего (3.75-4.0)</span>
            </div>
            <div style="display: flex; align-items: center; margin-bottom: 5px;">
                <div style="background: #CCFF00; width: 20px; height: 20px;"></div>
                <span style="margin-left: 5px;">Средне (3.5-3.75)</span>
            </div>
            <div style="display: flex; align-items: center; margin-bottom: 5px;">
                <div style="background: #88FF00; width: 20px; height: 20px;"></div>
                <span style="margin-left: 5px;">Нормально (3.25-3.5)</span>
            </div>
            <div style="display: flex; align-items: center; margin-bottom: 5px;">
                <div style="background: #00FF00; width: 20px; height: 20px;"></div>
                <span style="margin-left: 5px;">Удовлетворительно (3.0-3.25)</span>
            </div>
            <div style="display: flex; align-items: center; margin-bottom: 5px;">
                <div style="background: #00FFAA; width: 20px; height: 20px;"></div>
                <span style="margin-left: 5px;">Ниже среднего (2.5-3.0)</span>
            </div>
            <div style="display: flex; align-items: center; margin-bottom: 5px;">
                <div style="background: #00FFFF; width: 20px; height: 20px;"></div>
                <span style="margin-left: 5px;">Плохо (2.0-2.5)</span>
            </div>
            <div style="display: flex; align-items: center; margin-bottom: 5px;">
                <div style="background: #00AAFF; width: 20px; height: 20px;"></div>
                <span style="margin-left: 5px;">Очень плохо (1.5-2.0)</span>
            </div>
            <div style="display: flex; align-items: center;">
                <div style="background: #0000FF; width: 20px; height: 20px;"></div>
                <span style="margin-left: 5px;">Ужасно (<1.5)</span>
            </div>
        `;
        return div;
    };
    
    legend.addTo(map);
}

// Вспомогательная функция для вычисления расстояния между двумя точками (в метрах)
function distanceInMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000; // радиус Земли в метрах
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Группировка точек по квадратной сетке и расчет среднего рейтинга
function groupPointsByGrid(points) {
    if (!points || points.length === 0) {
        console.warn("Нет точек для группировки");
        return [];
    }
    
    const grid = {};
    
    // Рассчитываем шаг сетки в градусах
    // приблизительно, зависит от широты
    const lat = points[0].lat; // берем широту первой точки
    const lonStep = GRID_STEP_SIZE / (111320 * Math.cos(lat * Math.PI / 180)); 
    const latStep = GRID_STEP_SIZE / 110574;
    
    // Группируем точки по ячейкам сетки
    points.forEach(point => {
        const latCell = Math.floor(point.lat / latStep);
        const lonCell = Math.floor(point.lng / lonStep);
        const cellKey = `${latCell}:${lonCell}`;
        
        if (!grid[cellKey]) {
            grid[cellKey] = {
                points: [],
                centerLat: (latCell + 0.5) * latStep,
                centerLon: (lonCell + 0.5) * lonStep,
                totalRating: 0,
                count: 0
            };
        }
        
        grid[cellKey].points.push(point);
        if (point.rating !== undefined) {
            grid[cellKey].totalRating += point.rating;
            grid[cellKey].count++;
        }
    });
    
    // Фильтруем ячейки с минимальным количеством точек и вычисляем средний рейтинг
    const gridPoints = [];
    Object.values(grid).forEach(cell => {
        if (cell.points.length >= MIN_POINTS_IN_CELL) {
            const avgRating = cell.count > 0 ? cell.totalRating / cell.count : 3.0;
            gridPoints.push({
                lat: cell.centerLat,
                lng: cell.centerLon,
                value: avgRating, // средний рейтинг в ячейке
                points: cell.points // сохраняем исходные точки для показа при клике
            });
        }
    });
    
    return gridPoints;
}

// Получаем N ближайших точек к заданной точке
function getNearestPoints(lat, lng, points, n) {
    // Сортируем точки по расстоянию до заданной точки
    const sortedPoints = points.slice().sort((a, b) => {
        const distA = distanceInMeters(lat, lng, a.lat, a.lng);
        const distB = distanceInMeters(lat, lng, b.lat, b.lng);
        return distA - distB;
    });
    
    // Возвращаем N ближайших точек
    return sortedPoints.slice(0, n);
}

// Функция интерполяции IDW (Inverse Distance Weighting)
function interpolateIDW(lat, lng, points) {
    // Найдем n ближайших точек
    const nearestPoints = getNearestPoints(lat, lng, points, SEARCH_NEARBY_POINTS);
    
    if (nearestPoints.length === 0) {
        return null; // Нет точек для интерполяции
    }
    
    let weightSum = 0;
    let valueSum = 0;
    
    for (const point of nearestPoints) {
        const distance = distanceInMeters(lat, lng, point.lat, point.lng);
        
        // Если точка совпадает с интерполируемой, возвращаем её значение
        if (distance < 1) {
            return point.value;
        }
        
        if (distance <= IDW_RADIUS) {
            // Вес обратно пропорционален расстоянию в степени IDW_POWER
            const weight = 1 / Math.pow(distance, IDW_POWER);
            weightSum += weight;
            valueSum += point.value * weight;
        }
    }
    
    if (weightSum === 0) {
        return null; // Нет точек в радиусе
    }
    
    return valueSum / weightSum;
}

// Получить цвет по значению рейтинга
function getColorForRating(rating) {
    // Используем фиксированные уровни цветов как в Example 2 javascript-temperatureMap
    if (rating >= 4.75) {
        return '#FF0000'; // Ярко-красный - очень высокий рейтинг
    } else if (rating >= 4.5) {
        return '#FF5500'; // Оранжево-красный
    } else if (rating >= 4.25) {
        return '#FFA500'; // Оранжевый
    } else if (rating >= 4.0) {
        return '#FFCC00'; // Оранжево-желтый
    } else if (rating >= 3.75) {
        return '#FFFF00'; // Желтый
    } else if (rating >= 3.5) {
        return '#CCFF00'; // Желто-зеленый
    } else if (rating >= 3.25) {
        return '#88FF00'; // Светло-зеленый
    } else if (rating >= 3.0) {
        return '#00FF00'; // Зеленый
    } else if (rating >= 2.5) {
        return '#00FFAA'; // Бирюзовый
    } else if (rating >= 2.0) {
        return '#00FFFF'; // Голубой
    } else if (rating >= 1.5) {
        return '#00AAFF'; // Светло-синий
    } else {
        return '#0000FF'; // Синий - низкий рейтинг
    }
}

// Вычисляем координаты тайла из lat/lng
function getTileCoordinates(lat, lng, zoom) {
    const x = Math.floor((lng + 180) / 360 * Math.pow(2, zoom));
    const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
    return { x, y };
}

// Рисуем один тайл тепловой карты
function drawHeatmapTile(canvas, tilePoint, zoom, gridPoints) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, TILE_SIZE, TILE_SIZE);
    
    // Преобразуем координаты тайла в координаты мира
    const tileSize = 360 / Math.pow(2, zoom);
    const startLng = tilePoint.x * tileSize - 180;
    const tileSizeLat = tileSize * (Math.cos((tilePoint.y * tileSize - 90) * Math.PI / 180));
    const startLat = Math.atan(Math.sinh(Math.PI * (1 - 2 * tilePoint.y / Math.pow(2, zoom)))) * 180 / Math.PI;
    
    // Рисуем интерполированные значения в каждом пикселе тайла
    const pixelSize = tileSize / TILE_SIZE;
    
    for (let x = 0; x < TILE_SIZE; x++) {
        for (let y = 0; y < TILE_SIZE; y++) {
            const lng = startLng + x * pixelSize;
            const lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * (tilePoint.y + y / TILE_SIZE) / Math.pow(2, zoom)))) * 180 / Math.PI;
            
            // Интерполируем значение в этой точке
            const value = interpolateIDW(lat, lng, gridPoints);
            
            if (value !== null) {
                // Устанавливаем цвет пикселя на основе рейтинга
                const color = getColorForRating(value);
                ctx.fillStyle = color;
                ctx.globalAlpha = 0.7; // Полупрозрачность
                ctx.fillRect(x, y, 1, 1);
            }
        }
    }
    
    return canvas;
}

// Создаем кастомный тайловый слой для тепловой карты
function createHeatmapTileLayer(gridPoints) {
    return L.tileLayer.canvas({
        async: true,
        minZoom: 10,
        maxZoom: 18
    }).drawTile(function(canvas, tilePoint, zoom, done) {
        drawHeatmapTile(canvas, tilePoint, zoom, gridPoints);
        done();
    });
}

// Показываем информацию о заведениях в точке клика
function showPointInfo(e) {
    if (!window.currentGridPoints) {
        return;
    }
    
    const clickLat = e.latlng.lat;
    const clickLng = e.latlng.lng;
    
    // Находим ближайшую точку из сетки
    const nearestPoint = getNearestPoints(clickLat, clickLng, window.currentGridPoints, 1)[0];
    
    if (!nearestPoint || !nearestPoint.points) {
        return;
    }
    
    // Очищаем слой с выбранными точками
    selectedPointsLayer.clearLayers();
    
    // Создаем маркеры для всех заведений в выбранной ячейке
    nearestPoint.points.forEach(point => {
        const marker = L.circleMarker([point.lat, point.lng], {
            radius: 6,
            color: '#ff0000',
            fillColor: '#ff0000',
            fillOpacity: 1,
            weight: 2
        });
        selectedPointsLayer.addLayer(marker);
    });
    
    // Создаем информационную панель, если ее еще нет
    if (!infoPanel) {
        createInfoPanel();
    }
    
    // Заполняем информационную панель
    const infoContent = document.getElementById('info-content');
    const panelDiv = document.querySelector('.info-panel');
    
    if (infoContent && panelDiv) {
        // Вычисляем средний рейтинг
        let totalRating = 0;
        let pointsWithRating = 0;
        
        nearestPoint.points.forEach(point => {
            if (point.rating !== undefined) {
                totalRating += point.rating;
                pointsWithRating++;
            }
        });
        
        const avgRating = pointsWithRating > 0 
            ? (totalRating / pointsWithRating).toFixed(1) 
            : 'Нет данных';
        
        // Формируем HTML для списка заведений
        let html = `<p>Средний рейтинг: <strong>${avgRating}</strong></p>`;
        html += `<p>Заведения в этой области (${nearestPoint.points.length}):</p>`;
        html += '<ul style="padding-left: 20px;">';
        
        nearestPoint.points.forEach((point, index) => {
            const name = point.name || `Заведение ${index + 1}`;
            const rating = point.rating !== undefined ? point.rating.toFixed(1) : 'Нет оценки';
            html += `<li>${name} - ${rating} ⭐</li>`;
        });
        
        html += '</ul>';
        infoContent.innerHTML = html;
        panelDiv.style.display = 'block';
    }
}

// Создаем тепловую карту на основе IDW интерполяции
function createIDWHeatmap(gridPoints) {
    if (!gridPoints || gridPoints.length === 0) {
        console.warn("Нет точек для построения тепловой карты");
        return L.layerGroup([]);
    }
    
    console.log("Построение тепловой карты из", gridPoints.length, "точек");
    
    // Сохраняем точки для использования при клике
    window.currentGridPoints = gridPoints;
    
    // Определяем границы для расчета
    let minLat = Number.MAX_VALUE;
    let maxLat = Number.MIN_VALUE;
    let minLng = Number.MAX_VALUE;
    let maxLng = Number.MIN_VALUE;
    
    gridPoints.forEach(point => {
        minLat = Math.min(minLat, point.lat);
        maxLat = Math.max(maxLat, point.lat);
        minLng = Math.min(minLng, point.lng);
        maxLng = Math.max(maxLng, point.lng);
    });
    
    // Расширяем границы на радиус интерполяции
    const latExpand = IDW_RADIUS / 110574;
    const lngExpand = IDW_RADIUS / (111320 * Math.cos(minLat * Math.PI / 180));
    minLat -= latExpand;
    maxLat += latExpand;
    minLng -= lngExpand;
    maxLng += lngExpand;
    
    // Размер шага для сетки интерполяции (в градусах)
    const step = 0.003; // примерно 300 метров
    
    // Создаем полигоны для визуализации интерполированных значений
    const polygons = [];
    
    for (let lat = minLat; lat <= maxLat; lat += step) {
        for (let lng = minLng; lng <= maxLng; lng += step) {
            // Интерполируем значение рейтинга
            const rating = interpolateIDW(lat, lng, gridPoints);
            
            if (rating !== null) {
                // Получаем цвет для рейтинга
                const color = getColorForRating(rating);
                
                // Координаты углов полигона
                const coords = [
                    [lat, lng],
                    [lat + step, lng],
                    [lat + step, lng + step],
                    [lat, lng + step]
                ];
                
                // Создаем полигон
                const polygon = L.polygon(coords, {
                    color: '#333333', // Цвет границы полигона
                    fillColor: color,
                    fillOpacity: 0.7,
                    weight: 0.5,      // Толщина границы полигона
                    opacity: 0.8      // Прозрачность границы
                });
                
                polygons.push(polygon);
            }
        }
    }
    
    // Добавляем обработчик клика на карту
    map.on('click', showPointInfo);
    
    // Создаем слой из всех полигонов
    return L.layerGroup(polygons);
}

// После загрузки страницы показываем тепловую карту всех заведений
window.onload = function() {
    // Добавляем легенду
    addLegend();
    // Создаем информационную панель
    createInfoPanel();
    // Загружаем данные
    showHeatmap('all');
};

// Глобальная переменная для хранения текущего типа заведений
window.currentPlaceType = 'all';

// Основная функция для отображения хитмапа
function showHeatmap(type) {
    console.log(`Отображение хитмапа для типа: ${type}`);
    
    // Проверяем, что это не тот же самый тип, что и текущий
    if (window.currentPlaceType === type) {
        console.log(`Тип ${type} уже отображается, пропускаем загрузку`);
        return;
    }
    
    // Полная очистка карты перед отображением новых данных
    // Удаляем все слои, кроме базового слоя OpenStreetMap
    map.eachLayer(function(layer) {
        // Проверяем, что это не базовый слой с тайлами OpenStreetMap
        if (!layer._url || !layer._url.includes('openstreetmap.org')) {
            map.removeLayer(layer);
        }
    });
    
    // Очищаем предыдущие слои из массива
    if (window.currentLayers && window.currentLayers.length > 0) {
        window.currentLayers.forEach(layer => {
            if (layer) {
                try {
                    map.removeLayer(layer);
                } catch (e) {
                    console.warn("Не удалось удалить слой:", e);
                }
            }
        });
    }
    
    // Сбрасываем массив слоев
    window.currentLayers = [];

    // Очищаем маркеры и выбранные точки
    markersLayer.clearLayers();
    selectedPointsLayer.clearLayers();
    
    // Сбрасываем текущие точки сетки
    window.currentGridPoints = null;
    
    // Скрываем информационную панель
    const panelDiv = document.querySelector('.info-panel');
    if (panelDiv) {
        panelDiv.style.display = 'none';
    }
    
    // Удаляем все обработчики событий клика на карте
    map.off('click');
    
    // Повторно добавляем базовый слой, если он отсутствует
    let hasBaseTileLayer = false;
    map.eachLayer(function(layer) {
        if (layer._url && layer._url.includes('openstreetmap.org')) {
            hasBaseTileLayer = true;
        }
    });
    
    if (!hasBaseTileLayer) {
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
    }

    // Запоминаем текущий тип мест
    window.currentPlaceType = type;
    
    // Добавляем индикатор загрузки
    document.body.classList.add('loading');

    fetch(`/heatmap/${type}`)
        .then(response => {
            console.log(`Ответ для типа ${type}:`, response.status, response.statusText);
            if (!response.ok) {
                throw new Error(`HTTP ошибка! Статус: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log(`Полученные данные для типа ${type}:`, data);
            console.log(`Количество объектов: ${data && data.features ? data.features.length : 0}`);
            document.body.classList.remove('loading');
            
            if (!data || !data.features || data.features.length === 0) {
                console.warn(`Нет данных для отображения тепловой карты типа ${type}`);
                return;
            }
            
            // Преобразуем GeoJSON в массив точек
            const points = data.features.map(feature => ({
                lat: feature.geometry.coordinates[1],
                lng: feature.geometry.coordinates[0],
                rating: feature.properties.rating || 3.0,
                name: feature.properties.name || 'Заведение',
                type: feature.properties.type
            }));
            
            if (points.length === 0) {
                console.warn(`Нет точек для отображения тепловой карты типа ${type}`);
                return;
            }
            
            console.log(`Получено ${points.length} точек для типа ${type}`);
            
            // Группируем точки по сетке с расчетом среднего рейтинга
            console.log(`Начинаем группировку точек для типа ${type}`);
            const gridPoints = groupPointsByGrid(points);
            console.log(`Сгруппированные точки для типа ${type}:`, gridPoints.length);
            
            if (gridPoints.length === 0) {
                console.warn(`Нет сгруппированных точек для создания тепловой карты типа ${type}`);
                return;
            }
            
            // Строим тепловую карту на основе IDW интерполяции
            console.log(`Создаем тепловую карту для типа ${type}`);
            const heatmapLayer = createIDWHeatmap(gridPoints);
            
            // Добавляем слой на карту
            heatmapLayer.addTo(map);
            
            // Сохраняем ссылку на текущий слой
            window.currentLayers = [heatmapLayer];
            console.log(`Тепловая карта для типа ${type} добавлена на карту`);
        })
        .catch(error => {
            document.body.classList.remove('loading');
            console.error(`Ошибка при загрузке данных для типа ${type}:`, error);
            alert(`Не удалось загрузить данные: ${error.message}`);
        });
}

// Добавим стили для индикатора загрузки
(function() {
    const style = document.createElement('style');
    style.textContent = `
        body.loading:after {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        }
        body.loading:before {
            content: 'Загрузка...';
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border-radius: 5px;
            z-index: 10000;
            box-shadow: 0 0 10px rgba(0,0,0,0.2);
        }
    `;
    document.head.appendChild(style);
})();
