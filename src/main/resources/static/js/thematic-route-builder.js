/**
 * Модуль построения тематических маршрутов
 */
class ThematicRouteBuilder {
    constructor() {
        this.init();
    }
    
    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.initHandlers();
        });
    }
    
    initHandlers() {
        // Обработчик для кнопки построения тематического маршрута
        const thematicRouteButton = document.getElementById('thematic-route-button');
        if (thematicRouteButton) {
            thematicRouteButton.addEventListener('click', () => {
                this.buildThematicRoute();
            });
        }
        
        // Обработчик для кнопки перемешивания точек
        const shufflePoiButton = document.getElementById('shuffle-poi-button');
        if (shufflePoiButton) {
            shufflePoiButton.addEventListener('click', () => {
                this.shufflePois();
            });
        }
    }
    
    // Построение тематического маршрута с учетом темпа и длительности
    async buildThematicRoute() {
        this.clearMap();
        
        // Проверяем, установлен ли начальный маркер
        if (!window.startPoint) {
            NeoDialog.alert('Внимание', 'Сначала установите начальную точку маршрута, кликнув на карту');
            return;
        }
        
        // Получаем количество точек из слайдера
        let poiCount = parseInt(window.poiCountSlider.value);
        
        // Отображаем индикатор загрузки
        const loadingDiv = this.createLoadingIndicator('Анализируем лучшие заведения с высоким рейтингом...');
        document.body.appendChild(loadingDiv);
        
        try {
            console.log(`Запрос точек интереса: тип - ${window.currentPoiType}, количество - ${poiCount}`);
            
            // Запрашиваем точки интереса
            const response = await fetch(`/api/pois?types=${window.currentPoiType}`);
            
            if (!response.ok) {
                throw new Error(`Ошибка получения точек интереса: ${response.status}`);
            }
            
            let allPois = await response.json();
            
            if (allPois.length === 0) {
                throw new Error('Нет доступных точек интереса в этом районе');
            }
            
            console.log(`Получено ${allPois.length} точек интереса`);
            
            // Обновляем сообщение о загрузке
            loadingDiv.innerHTML = `
                <div style="
                    border: 4px solid rgba(255, 255, 255, 0.3);
                    border-top: 4px solid white;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    margin: 0 auto 15px auto;
                    animation: spin 1s linear infinite;
                "></div>
                <div>Фильтруем заведения по рейтингу 4.0+...</div>
            `;
            
            // НОВАЯ ЛОГИКА ОПТИМИЗАЦИИ ПО РЕЙТИНГУ И БЛИЗОСТИ
            const selectedPois = this.selectOptimalPois(allPois, poiCount);
            
            console.log(`Выбрано ${selectedPois.length} оптимальных точек с высоким рейтингом`);
            
            if (selectedPois.length === 0) {
                throw new Error('Не удалось найти заведения с рейтингом 4.0+ рядом с вашей точкой');
            }
            
            // Сохраняем текущие точки
            window.currentPois = allPois; // Сохраняем все доступные точки для перемешивания
            
            // Обновляем сообщение о загрузке
            loadingDiv.innerHTML = `
                <div style="
                    border: 4px solid rgba(255, 255, 255, 0.3);
                    border-top: 4px solid white;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    margin: 0 auto 15px auto;
                    animation: spin 1s linear infinite;
                "></div>
                <div>Строим оптимальный маршрут от вашей точки...</div>
            `;
            
            // Формируем строку координат для маршрута, НАЧИНАЯ СО СТАРТОВОЙ ТОЧКИ ПОЛЬЗОВАТЕЛЯ
            const pointsStr = `${window.startPoint.lat},${window.startPoint.lng};` + 
                              selectedPois.map(poi => `${poi.latitude},${poi.longitude}`).join(';');
            
            console.log(`Строка координат маршрута (с пользовательской стартовой точкой): ${pointsStr}`);
            
            // Запрашиваем построение маршрута
            const routeResponse = await fetch(`/api/thematic-route?points=${pointsStr}&profile=${window.currentProfile}`);
            
            if (!routeResponse.ok) {
                throw new Error(`Ошибка построения маршрута: ${routeResponse.status}`);
            }
            
            const routeData = await routeResponse.json();
            
            // Скрываем индикатор загрузки
            document.body.removeChild(loadingDiv);
            
            // Устанавливаем информацию о типе маршрута
            const routeTypeElement = document.getElementById('route-type');
            if (routeTypeElement) {
                routeTypeElement.textContent = 'Оптимизированный (рейтинг 4.0+ + близость)';
                routeTypeElement.style.color = '#4CAF50';
                routeTypeElement.style.fontWeight = 'bold';
            }
            
            // Отображаем маршрут
            if (window.routeRenderer) {
                window.routeRenderer.displayRoute(routeData, selectedPois);
            }
            
        } catch (error) {
            // Удаляем индикатор загрузки при ошибке
            if (loadingDiv && loadingDiv.parentNode) {
                document.body.removeChild(loadingDiv);
            }
            
            console.error('Ошибка при построении тематического маршрута:', error);
            
            // Используем NeoDialog вместо alert
            if (typeof NeoDialog !== 'undefined') {
                NeoDialog.alert('Ошибка', error.message);
            } else {
                alert(`Ошибка: ${error.message}`);
            }
        }
    }
    
    // НОВАЯ ФУНКЦИЯ: Оптимизированный выбор точек по рейтингу и близости
    selectOptimalPois(allPois, count) {
        if (!allPois || allPois.length === 0) {
            return [];
        }
        
        console.log(`Начинаем оптимизацию ${allPois.length} точек интереса...`);
        
        // Шаг 1: Фильтрация по рейтингу 4.0+
        const highRatedPois = allPois.filter(poi => poi.rating && poi.rating >= 4.0);
        console.log(`После фильтрации по рейтингу 4.0+: ${highRatedPois.length} точек`);
        
        // Если недостаточно точек с высоким рейтингом, берем лучшие из доступных
        let candidatePois = highRatedPois;
        if (candidatePois.length < 3) {
            console.log('Недостаточно точек с рейтингом 4.0+, используем лучшие доступные');
            candidatePois = allPois.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        }
        
        // Шаг 2: Добавляем расстояние от стартовой точки
        candidatePois.forEach(poi => {
            poi.distanceToStart = this.calculateDistance(
                window.startPoint.lat, window.startPoint.lng,
                poi.latitude, poi.longitude
            ) / 1000; // в километрах
        });
        
        // Шаг 3: Вычисляем комбинированный score (60% рейтинг + 40% близость)
        const maxDistance = Math.max(...candidatePois.map(poi => poi.distanceToStart));
        candidatePois.forEach(poi => {
            const ratingScore = (poi.rating || 0) / 5; // нормализуем рейтинг 0-1
            const distanceScore = 1 - Math.min(poi.distanceToStart / Math.max(maxDistance, 3), 1); // ближе = лучше
            poi.optimizationScore = (ratingScore * 0.6) + (distanceScore * 0.4);
        });
        
        // Шаг 4: Сортируем по комбинированному score
        candidatePois.sort((a, b) => b.optimizationScore - a.optimizationScore);
        
        // Шаг 5: Применяем жадный алгоритм для выбора лучших точек
        const selectedPois = this.greedyPoiSelection(candidatePois, count);
        
        console.log(`Выбрано ${selectedPois.length} оптимальных точек:`);
        selectedPois.forEach((poi, index) => {
            console.log(`  ${index + 1}. ${poi.name} - рейтинг: ${poi.rating?.toFixed(1) || 'N/A'}, расстояние: ${poi.distanceToStart?.toFixed(2) || 'N/A'}км, score: ${poi.optimizationScore?.toFixed(3) || 'N/A'}`);
        });
        
        return selectedPois;
    }
    
    // Жадный алгоритм для выбора точек с учетом близости друг к другу
    greedyPoiSelection(candidatePois, count) {
        if (candidatePois.length <= count) {
            return candidatePois;
        }
        
        const selected = [];
        const remaining = [...candidatePois];
        
        // Выбираем первую точку с лучшим score
        selected.push(remaining.shift());
        
        // Выбираем остальные точки, балансируя между рейтингом и компактностью маршрута
        while (selected.length < count && remaining.length > 0) {
            let bestIndex = 0;
            let bestCombinedScore = -1;
            
            for (let i = 0; i < remaining.length; i++) {
                const poi = remaining[i];
                
                // Находим ближайшую уже выбранную точку
                let minDistanceToSelected = Infinity;
                for (const selectedPoi of selected) {
                    const distance = this.calculateDistance(
                        poi.latitude, poi.longitude,
                        selectedPoi.latitude, selectedPoi.longitude
                    ) / 1000; // в км
                    minDistanceToSelected = Math.min(minDistanceToSelected, distance);
                }
                
                // Комбинированный score: 70% оригинальный score + 30% близость к маршруту
                const proximityScore = 1 - Math.min(minDistanceToSelected / 2, 1); // ближе к маршруту = лучше
                const combinedScore = (poi.optimizationScore * 0.7) + (proximityScore * 0.3);
                
                if (combinedScore > bestCombinedScore) {
                    bestCombinedScore = combinedScore;
                    bestIndex = i;
                }
            }
            
            selected.push(remaining.splice(bestIndex, 1)[0]);
        }
        
        return selected;
    }
    
    // Функция перемешивания точек интереса
    shufflePois() {
        if (!window.currentPois || window.currentPois.length === 0) {
            NeoDialog.alert('Внимание', 'Сначала постройте тематический маршрут');
            return;
        }
        
        console.log('Перемешивание точек интереса с учетом рейтинга...');
        
        // Показываем индикатор загрузки
        const loadingDiv = this.createLoadingIndicator('Ищем другие заведения с высоким рейтингом...');
        document.body.appendChild(loadingDiv);
        
        // Получаем количество точек из слайдера
        const poiCount = parseInt(window.poiCountSlider.value);
        
        // Используем оптимизированную логику выбора вместо случайного
        const shuffledPois = this.selectOptimalPoisVariation(window.currentPois, poiCount);
        
        // Формируем новую строку координат, НАЧИНАЯ СО СТАРТОВОЙ ТОЧКИ ПОЛЬЗОВАТЕЛЯ
        const pointsStr = `${window.startPoint.lat},${window.startPoint.lng};` + 
                          shuffledPois.map(poi => `${poi.latitude},${poi.longitude}`).join(';');
        
        console.log('Новая строка координат после перемешивания:', pointsStr);
        
        // Запрашиваем новый маршрут с перемешанными точками
        fetch(`/api/thematic-route?points=${pointsStr}&profile=${window.currentProfile}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Ошибка перестроения маршрута: ${response.status}`);
                }
                return response.json();
            })
            .then(routeData => {
                // Удаляем индикатор загрузки
                document.body.removeChild(loadingDiv);
                
                // Устанавливаем информацию о типе маршрута
                const routeTypeElement = document.getElementById('route-type');
                if (routeTypeElement) {
                    routeTypeElement.textContent = 'Оптимизированный альтернативный (рейтинг 4.0+)';
                    routeTypeElement.style.color = '#FF9800';
                    routeTypeElement.style.fontWeight = 'bold';
                }
                
                // Отображаем новый маршрут
                if (window.routeRenderer) {
                    window.routeRenderer.displayRoute(routeData, shuffledPois);
                }
                
                console.log('Маршрут успешно перемешан с оптимизацией');
            })
            .catch(error => {
                // Удаляем индикатор загрузки при ошибке
                if (loadingDiv && loadingDiv.parentNode) {
                    document.body.removeChild(loadingDiv);
                }
                
                console.error('Ошибка при перемешивании маршрута:', error);
                NeoDialog.alert('Ошибка', `Не удалось перемешать маршрут: ${error.message}`);
            });
    }
    
    // Вариация оптимизированного выбора для перемешивания (больше разнообразия)
    selectOptimalPoisVariation(allPois, count) {
        // Фильтруем по рейтингу 4.0+
        const highRatedPois = allPois.filter(poi => poi.rating && poi.rating >= 4.0);
        
        let candidatePois = highRatedPois;
        if (candidatePois.length < 3) {
            candidatePois = allPois.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        }
        
        // Добавляем расстояние от стартовой точки
        candidatePois.forEach(poi => {
            poi.distanceToStart = this.calculateDistance(
                window.startPoint.lat, window.startPoint.lng,
                poi.latitude, poi.longitude
            ) / 1000;
        });
        
        // Вычисляем score, но добавляем случайность для разнообразия
        const maxDistance = Math.max(...candidatePois.map(poi => poi.distanceToStart));
        candidatePois.forEach(poi => {
            const ratingScore = (poi.rating || 0) / 5;
            const distanceScore = 1 - Math.min(poi.distanceToStart / Math.max(maxDistance, 3), 1);
            const randomFactor = Math.random() * 0.2; // добавляем 20% случайности
            poi.optimizationScore = (ratingScore * 0.5) + (distanceScore * 0.3) + randomFactor;
        });
        
        // Сортируем по новому score с учетом случайности
        candidatePois.sort((a, b) => b.optimizationScore - a.optimizationScore);
        
        // Берем топ-кандидатов, но с возможностью выбора разных точек
        const topCandidates = candidatePois.slice(0, Math.min(count * 2, candidatePois.length));
        return this.greedyPoiSelection(topCandidates, count);
    }
    
    // Вспомогательные функции
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000; // Радиус Земли в метрах
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    createLoadingIndicator(message) {
        const loadingDiv = document.createElement('div');
        loadingDiv.style.cssText = `
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
        `;
        
        loadingDiv.innerHTML = `
            <div style="
                border: 4px solid rgba(255, 255, 255, 0.3);
                border-top: 4px solid white;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                margin: 0 auto 15px auto;
                animation: spin 1s linear infinite;
            "></div>
            <div>${message}</div>
        `;
        
        // Добавляем стиль анимации, если его еще нет
        if (!document.getElementById('loading-animation-style')) {
            const style = document.createElement('style');
            style.id = 'loading-animation-style';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
        
        return loadingDiv;
    }
    
    clearMap() {
        if (window.mapCore) {
            window.mapCore.clearMap();
        }
    }
}

// Инициализируем строитель тематических маршрутов
const thematicRouteBuilder = new ThematicRouteBuilder();

// Экспортируем для использования в других модулях
window.thematicRouteBuilder = thematicRouteBuilder; 