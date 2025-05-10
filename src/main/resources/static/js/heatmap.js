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
const IDW_RADIUS = 1500; // радиус для IDW интерполяции в метрах
const IDW_POWER = 2; // степень в формуле IDW
const SEARCH_NEARBY_POINTS = 50; // количество ближайших точек для интерполяции (уменьшен со 100)
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

// Получить цвет по значению рейтинга с плавным переходом между уровнями
function getColorForRating(rating) {
    // Определяем уровни цветов
    const levels = [
        { value: 1.5, color: '#0000FF' }, // Синий - очень низкий рейтинг
        { value: 2.0, color: '#00AAFF' }, // Светло-синий
        { value: 2.5, color: '#00FFFF' }, // Голубой
        { value: 3.0, color: '#00FFAA' }, // Бирюзовый
        { value: 3.25, color: '#00FF00' }, // Зеленый
        { value: 3.5, color: '#88FF00' }, // Светло-зеленый
        { value: 3.75, color: '#CCFF00' }, // Желто-зеленый
        { value: 4.0, color: '#FFFF00' }, // Желтый
        { value: 4.25, color: '#FFCC00' }, // Оранжево-желтый
        { value: 4.5, color: '#FFA500' }, // Оранжевый
        { value: 4.75, color: '#FF5500' }, // Оранжево-красный
        { value: 5.0, color: '#FF0000' } // Ярко-красный - очень высокий рейтинг
    ];
    
    // Если рейтинг ниже минимального уровня, возвращаем цвет первого уровня
    if (rating < levels[0].value) {
        return levels[0].color;
    }
    
    // Если рейтинг выше максимального уровня, возвращаем цвет последнего уровня
    if (rating >= levels[levels.length - 1].value) {
        return levels[levels.length - 1].color;
    }
    
    // Находим между какими уровнями находится рейтинг
    for (let i = 0; i < levels.length - 1; i++) {
        if (rating >= levels[i].value && rating < levels[i + 1].value) {
            // Интерполируем цвет между двумя уровнями
            const lowerLevel = levels[i];
            const upperLevel = levels[i + 1];
            
            // Вычисляем коэффициент для линейной интерполяции
            const ratio = (rating - lowerLevel.value) / (upperLevel.value - lowerLevel.value);
            
            // Преобразуем HEX в RGB для интерполяции
            const lowerRGB = hexToRgb(lowerLevel.color);
            const upperRGB = hexToRgb(upperLevel.color);
            
            // Линейная интерполяция между цветами
            const r = Math.round(lowerRGB.r + ratio * (upperRGB.r - lowerRGB.r));
            const g = Math.round(lowerRGB.g + ratio * (upperRGB.g - lowerRGB.g));
            const b = Math.round(lowerRGB.b + ratio * (upperRGB.b - lowerRGB.b));
            
            // Преобразуем RGB обратно в HEX
            return rgbToHex(r, g, b);
        }
    }
    
    // На случай, если что-то пошло не так, возвращаем безопасный цвет
    return '#FFFF00';
}

// Вспомогательная функция для преобразования HEX в RGB
function hexToRgb(hex) {
    // Убираем символ # если он есть
    hex = hex.replace(/^#/, '');
    
    // Преобразуем HEX в RGB
    const bigint = parseInt(hex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    
    return { r, g, b };
}

// Вспомогательная функция для преобразования RGB в HEX
function rgbToHex(r, g, b) {
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
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
    
    // Создаем кастомный канвас-слой
    const HeatmapLayer = L.GridLayer.extend({
        // Кэш для тайлов для оптимизации производительности
        _tileCache: {},
        _valueCache: {},
        
        createTile: function(coords) {
            // Создаем элемент canvas для тайла
            const tile = L.DomUtil.create('canvas', 'leaflet-tile');
            const size = this.getTileSize();
            tile.width = size.x;
            tile.height = size.y;
            const ctx = tile.getContext('2d');
            
            // Проверяем есть ли тайл в кэше (по координатам)
            const cacheKey = `${coords.z}_${coords.x}_${coords.y}`;
            
            // Если тайл уже был отрисован и есть в кэше, используем его
            if (this._tileCache[cacheKey]) {
                const cachedImageData = this._tileCache[cacheKey];
                ctx.putImageData(cachedImageData, 0, 0);
                return tile;
            }
            
            // Получаем географические координаты углов тайла
            const nwPoint = coords.scaleBy(size);
            const sePoint = nwPoint.add(size);
            const nw = this._map.unproject(nwPoint, coords.z);
            const se = this._map.unproject(sePoint, coords.z);
            
            // Отрисовка тепловой карты на канвасе
            this._drawTile(ctx, tile, size, nw, se, gridPoints, cacheKey, coords.z);
            
            return tile;
        },
        
        _drawTile: function(ctx, tile, size, nw, se, points, cacheKey, zoom) {
            // Адаптируем разрешение в зависимости от зума для повышения производительности
            const resolution = zoom >= 16 ? 2 : 
                              zoom >= 14 ? 4 : 
                              zoom >= 12 ? 6 : 8;
            
            // Очищаем тайл
            ctx.clearRect(0, 0, size.x, size.y);
            
            // Создаем временный canvas для расчета интерполяции
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = Math.ceil(size.x / resolution);
            tempCanvas.height = Math.ceil(size.y / resolution);
            
            // Рассчитываем значения на сетке
            const gridValues = [];
            for (let y = 0; y < tempCanvas.height; y++) {
                gridValues[y] = [];
                for (let x = 0; x < tempCanvas.width; x++) {
                    const pixelX = x * resolution;
                    const pixelY = y * resolution;
                    
                    // Преобразуем координаты пикселя в географические
                    const latLng = this._getLatLngFromPixel(pixelX, pixelY, nw, se, size);
                    
                    // Используем кэш для ускорения вычислений
                    const valueCacheKey = `${latLng.lat.toFixed(5)}_${latLng.lng.toFixed(5)}`;
                    let value;
                    
                    if (this._valueCache[valueCacheKey]) {
                        value = this._valueCache[valueCacheKey];
                    } else {
                        // Интерполируем значение в этой точке
                        value = interpolateIDW(latLng.lat, latLng.lng, points);
                        if (value !== null) {
                            this._valueCache[valueCacheKey] = value;
                        }
                    }
                    
                    gridValues[y][x] = value;
                }
            }
            
            // Рисуем плавные переходы с изолиниями, как в javascript-temperatureMap
            this._drawContours(ctx, gridValues, resolution, size.x, size.y);
            
            // Сохраняем нарисованный тайл в кэш
            if (cacheKey) {
                this._tileCache[cacheKey] = ctx.getImageData(0, 0, size.x, size.y);
            }
        },
        
        // Рисуем контурные линии для плавных переходов - как в javascript-temperatureMap
        _drawContours: function(ctx, gridValues, resolution, width, height) {
            if (!gridValues || gridValues.length === 0) return;
            
            // Определяем интервалы рейтинга для изолиний
            const levels = [1.5, 2.0, 2.5, 3.0, 3.25, 3.5, 3.75, 4.0, 4.25, 4.5, 4.75, 5.0];
            
            // Создаем временный canvas для прозрачных градиентов
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = width;
            tempCanvas.height = height;
            const tempCtx = tempCanvas.getContext('2d');
            
            // Определяем высоту и ширину сетки
            const gridHeight = gridValues.length;
            const gridWidth = gridValues[0].length;
            
            // Рисуем каждую ячейку сетки с плавными переходами
            for (let y = 0; y < gridHeight; y++) {
                for (let x = 0; x < gridWidth; x++) {
                    const value = gridValues[y][x];
                    
                    if (value === null) continue;
                    
                    // Координаты ячейки на канвасе
                    const pixelX = x * resolution;
                    const pixelY = y * resolution;
                    
                    // Получаем цвет для этого значения
                    const color = getColorForRating(value);
                    const rgb = hexToRgb(color);
                    
                    // Устанавливаем прозрачность в зависимости от уровня зума и расстояния до края
                    const alpha = 0.7;
                    
                    // Рисуем прямоугольник с этим цветом
                    tempCtx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
                    tempCtx.fillRect(pixelX, pixelY, resolution, resolution);
                }
            }
            
            // Создаем радиальный градиент для сглаживания краев ячеек
            for (let y = 0; y < gridHeight - 1; y++) {
                for (let x = 0; x < gridWidth - 1; x++) {
                    const value1 = gridValues[y][x];
                    const value2 = gridValues[y][x+1];
                    const value3 = gridValues[y+1][x];
                    const value4 = gridValues[y+1][x+1];
                    
                    // Пропускаем, если какие-то значения null
                    if (value1 === null || value2 === null || value3 === null || value4 === null) continue;
                    
                    // Координаты ячейки
                    const pixelX = x * resolution;
                    const pixelY = y * resolution;
                    
                    // Находим контуры и рисуем градиенты между соседними ячейками
                    // Градиент по горизонтали
                    if (Math.abs(value1 - value2) > 0.1) {
                        const gradient = tempCtx.createLinearGradient(pixelX, pixelY, pixelX + resolution, pixelY);
                        
                        const color1 = getColorForRating(value1);
                        const color2 = getColorForRating(value2);
                        const rgb1 = hexToRgb(color1);
                        const rgb2 = hexToRgb(color2);
                        
                        gradient.addColorStop(0, `rgba(${rgb1.r}, ${rgb1.g}, ${rgb1.b}, 0.7)`);
                        gradient.addColorStop(1, `rgba(${rgb2.r}, ${rgb2.g}, ${rgb2.b}, 0.7)`);
                        
                        tempCtx.fillStyle = gradient;
                        tempCtx.fillRect(pixelX, pixelY, resolution, resolution / 2);
                    }
                    
                    // Градиент по вертикали
                    if (Math.abs(value1 - value3) > 0.1) {
                        const gradient = tempCtx.createLinearGradient(pixelX, pixelY, pixelX, pixelY + resolution);
                        
                        const color1 = getColorForRating(value1);
                        const color3 = getColorForRating(value3);
                        const rgb1 = hexToRgb(color1);
                        const rgb3 = hexToRgb(color3);
                        
                        gradient.addColorStop(0, `rgba(${rgb1.r}, ${rgb1.g}, ${rgb1.b}, 0.7)`);
                        gradient.addColorStop(1, `rgba(${rgb3.r}, ${rgb3.g}, ${rgb3.b}, 0.7)`);
                        
                        tempCtx.fillStyle = gradient;
                        tempCtx.fillRect(pixelX, pixelY, resolution / 2, resolution);
                    }
                    
                    // Радиальный градиент для углов
                    if (Math.abs(value1 - value4) > 0.1) {
                        const gradient = tempCtx.createRadialGradient(
                            pixelX + resolution / 2, pixelY + resolution / 2, 0,
                            pixelX + resolution / 2, pixelY + resolution / 2, resolution * 0.7
                        );
                        
                        const color1 = getColorForRating(value1);
                        const color4 = getColorForRating(value4);
                        const rgb1 = hexToRgb(color1);
                        const rgb4 = hexToRgb(color4);
                        
                        gradient.addColorStop(0, `rgba(${rgb1.r}, ${rgb1.g}, ${rgb1.b}, 0.5)`);
                        gradient.addColorStop(1, `rgba(${rgb4.r}, ${rgb4.g}, ${rgb4.b}, 0.5)`);
                        
                        tempCtx.fillStyle = gradient;
                        tempCtx.fillRect(pixelX, pixelY, resolution, resolution);
                    }
                }
            }
            
            // Рисуем изолинии (контуры) для определенных значений рейтинга
            for (let i = 0; i < levels.length - 1; i++) {
                const level = (levels[i] + levels[i+1]) / 2;
                tempCtx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
                tempCtx.lineWidth = 0.5;
                
                // Проходим по сетке и ищем ячейки, пересекающие уровень
                for (let y = 0; y < gridHeight - 1; y++) {
                    for (let x = 0; x < gridWidth - 1; x++) {
                        const value1 = gridValues[y][x];
                        const value2 = gridValues[y][x+1];
                        const value3 = gridValues[y+1][x];
                        const value4 = gridValues[y+1][x+1];
                        
                        // Пропускаем, если какие-то значения null
                        if (value1 === null || value2 === null || value3 === null || value4 === null) continue;
                        
                        // Проверяем, пересекает ли уровень эту ячейку
                        const corner1 = value1 > level;
                        const corner2 = value2 > level;
                        const corner3 = value3 > level;
                        const corner4 = value4 > level;
                        
                        // Если уровень не пересекает ячейку, пропускаем
                        if ((corner1 && corner2 && corner3 && corner4) || 
                            (!corner1 && !corner2 && !corner3 && !corner4)) {
                            continue;
                        }
                        
                        // Координаты ячейки
                        const pixelX = x * resolution;
                        const pixelY = y * resolution;
                        
                        // Рисуем изолинию через ячейку
                        tempCtx.beginPath();
                        
                        // Нахождение точек пересечения на краях ячейки
                        // и рисование линии между ними
                        // Это создаст эффект изолинии
                        
                        // Верхний край
                        if ((corner1 && !corner2) || (!corner1 && corner2)) {
                            const ratio = Math.abs((level - value1) / (value2 - value1));
                            const intersectX = pixelX + ratio * resolution;
                            tempCtx.moveTo(intersectX, pixelY);
                        }
                        
                        // Правый край
                        if ((corner2 && !corner4) || (!corner2 && corner4)) {
                            const ratio = Math.abs((level - value2) / (value4 - value2));
                            const intersectY = pixelY + ratio * resolution;
                            
                            if (tempCtx._path && tempCtx._path.length > 0) {
                                tempCtx.lineTo(pixelX + resolution, intersectY);
                            } else {
                                tempCtx.moveTo(pixelX + resolution, intersectY);
                            }
                        }
                        
                        // Нижний край
                        if ((corner3 && !corner4) || (!corner3 && corner4)) {
                            const ratio = Math.abs((level - value3) / (value4 - value3));
                            const intersectX = pixelX + ratio * resolution;
                            
                            if (tempCtx._path && tempCtx._path.length > 0) {
                                tempCtx.lineTo(intersectX, pixelY + resolution);
                            } else {
                                tempCtx.moveTo(intersectX, pixelY + resolution);
                            }
                        }
                        
                        // Левый край
                        if ((corner1 && !corner3) || (!corner1 && corner3)) {
                            const ratio = Math.abs((level - value1) / (value3 - value1));
                            const intersectY = pixelY + ratio * resolution;
                            
                            if (tempCtx._path && tempCtx._path.length > 0) {
                                tempCtx.lineTo(pixelX, intersectY);
                            } else {
                                tempCtx.moveTo(pixelX, intersectY);
                            }
                        }
                        
                        tempCtx.stroke();
                    }
                }
            }
            
            // Копируем результат на основной канвас
            ctx.drawImage(tempCanvas, 0, 0);
        },
        
        // Очистка кэша при удалении слоя
        onRemove: function(map) {
            this._tileCache = {};
            this._valueCache = {};
            L.GridLayer.prototype.onRemove.call(this, map);
        },
        
        // Преобразование координат пикселя тайла в географические координаты
        _getLatLngFromPixel: function(x, y, nw, se, tileSize) {
            const latDiff = nw.lat - se.lat;
            const lngDiff = se.lng - nw.lng;
            
            const lat = nw.lat - (y / tileSize.y) * latDiff;
            const lng = nw.lng + (x / tileSize.x) * lngDiff;
            
            return L.latLng(lat, lng);
        }
    });
    
    // Создаем экземпляр слоя
    const layer = new HeatmapLayer({
        tileSize: 256,
        minZoom: 10,
        maxZoom: 18,
        updateWhenIdle: true,
        updateWhenZooming: false,
        keepBuffer: 1 // Уменьшаем буфер для экономии памяти
    });
    
    // Добавляем обработчик клика на карту
    map.on('click', showPointInfo);
    
    return layer;
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
// Глобальная переменная для хранения текущего слоя тепловой карты
window.currentHeatmapLayer = null;

// Основная функция для отображения хитмапа
function showHeatmap(type) {
    console.log(`Отображение хитмапа для типа: ${type}`);
    
    // Проверяем, что это не тот же самый тип, что и текущий
    if (window.currentPlaceType === type) {
        console.log(`Тип ${type} уже отображается, пропускаем загрузку`);
        return;
    }
    
    // Полная очистка карты перед отображением новых данных
    // Сначала удаляем существующий слой тепловой карты, если он есть
    if (window.currentHeatmapLayer) {
        try {
            map.removeLayer(window.currentHeatmapLayer);
        } catch (e) {
            console.warn("Не удалось удалить текущий слой:", e);
        }
        window.currentHeatmapLayer = null;
    }
    
    // Очищаем все остальные слои (кроме базового)
    map.eachLayer(function(layer) {
        // Проверяем, что это не базовый слой с тайлами OpenStreetMap
        if (!layer._url || !layer._url.includes('openstreetmap.org')) {
            try {
                map.removeLayer(layer);
            } catch (e) {
                console.warn("Не удалось удалить слой:", e);
            }
        }
    });
    
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
            window.currentHeatmapLayer = heatmapLayer;
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
