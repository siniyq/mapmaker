/**
 * Утилитарные функции для работы с маршрутами
 */

// Вспомогательная функция для расчета расстояния между двумя точками
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Радиус Земли в км
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Возвращает цвет для маршрута в зависимости от профиля
function getRouteColor(profile) {
    switch (profile) {
        case 'foot':
            return '#3949AB'; // Индиго для пешеходных маршрутов
        case 'bike':
            return '#00897B'; // Бирюзовый для велосипедных маршрутов
        case 'car':
            return '#E64A19'; // Оранжевый для автомобильных маршрутов
        default:
            return '#3F51B5'; // Индиго по умолчанию
    }
}

// Получение текущего выбранного профиля транспорта
function getCurrentProfile() {
    // Ищем активную кнопку профиля
    const activeProfileButton = document.querySelector('#profile-buttons button.active');
    if (activeProfileButton) {
        return activeProfileButton.id.replace('profile-', '');
    }
    
    // Возвращаем значение по умолчанию
    return 'foot';
}

// Форматирование времени маршрута
function formatRouteTime(timeInSeconds) {
    const minutes = Math.round(timeInSeconds / 60);
    if (minutes < 60) {
        return `${minutes} мин`;
    } else {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return remainingMinutes > 0 ? `${hours}ч ${remainingMinutes}мин` : `${hours}ч`;
    }
}

// Форматирование расстояния маршрута
function formatRouteDistance(distanceInMeters) {
    const km = distanceInMeters / 1000;
    if (km < 1) {
        return `${Math.round(distanceInMeters)} м`;
    } else if (km < 10) {
        return `${km.toFixed(1)} км`;
    } else {
        return `${Math.round(km)} км`;
    }
}

// Получение читаемого названия профиля транспорта
function getProfileDisplayName(profile) {
    switch (profile) {
        case 'foot':
            return 'пешком';
        case 'bike':
            return 'на велосипеде';
        case 'car':
            return 'на автомобиле';
        default:
            return 'неизвестно';
    }
}

// Получение читаемого типа POI
function getReadablePoiType(type) {
    const typeMap = {
        'restaurant': 'Ресторан',
        'cafe': 'Кафе',
        'bar': 'Бар',
        'museum': 'Музей',
        'theater': 'Театр',
        'church': 'Церковь',
        'art_gallery': 'Галерея',
        'library': 'Библиотека',
        'tourist_attraction': 'Достопримечательность',
        'gym': 'Спортзал',
        'pharmacy': 'Аптека',
        'bank': 'Банк',
        'school': 'Школа'
    };
    
    return typeMap[type] || type;
}

// Создание индикатора загрузки
function createLoadingIndicator(message = 'Загрузка...') {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'route-loading-indicator';
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
    
    // Добавляем стиль для анимации загрузки
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
    
    document.body.appendChild(loadingDiv);
    
    return {
        element: loadingDiv,
        remove: () => {
            if (loadingDiv && loadingDiv.parentNode) {
                loadingDiv.parentNode.removeChild(loadingDiv);
            }
        }
    };
}

// Экспорт функций в глобальную область видимости
if (typeof window !== 'undefined') {
    window.calculateDistance = calculateDistance;
    window.getRouteColor = getRouteColor;
    window.getCurrentProfile = getCurrentProfile;
    window.formatRouteTime = formatRouteTime;
    window.formatRouteDistance = formatRouteDistance;
    window.getProfileDisplayName = getProfileDisplayName;
    window.getReadablePoiType = getReadablePoiType;
    window.createLoadingIndicator = createLoadingIndicator;
}

console.log('Route utilities loaded successfully'); 