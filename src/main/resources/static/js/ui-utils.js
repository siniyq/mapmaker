/**
 * Модуль утилитарных функций для работы с пользовательским интерфейсом
 */

/**
 * Создает индикатор загрузки с анимацией
 * @param {string} message - сообщение для отображения
 * @returns {Object} объект с элементом и методом удаления
 */
function createLoadingIndicator(message = 'Загрузка...') {
    // Проверяем, существует ли уже индикатор загрузки
    let existingIndicator = document.getElementById('loading-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }
    
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loading-indicator';
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
    
    document.body.appendChild(loadingDiv);
    
    return {
        element: loadingDiv,
        remove: () => {
            if (loadingDiv.parentNode) {
                loadingDiv.parentNode.removeChild(loadingDiv);
            }
        }
    };
}

/**
 * Функция для предотвращения кликов по карте через UI элементы
 */
function preventMapClicksThrough() {
    // Список всех UI элементов, которые должны перехватывать клики
    const uiElements = [
        document.getElementById('weather-panel'),
        document.getElementById('heatmap-panel'),
        document.getElementById('route-info'),
        document.getElementById('route-info-panel'),
        ...document.querySelectorAll('.neo-info-box, #route-description, #cultural-route-description')
    ].filter(el => el !== null);
    
    // Функция для остановки распространения событий
    function stopPropagation(e) {
        e.stopPropagation();
    }
    
    // Добавляем обработчики для всех найденных элементов
    uiElements.forEach(element => {
        // Удаляем старые обработчики, если они есть
        element.removeEventListener('click', stopPropagation);
        element.removeEventListener('dblclick', stopPropagation);
        element.removeEventListener('mousedown', stopPropagation);
        
        // Добавляем новые обработчики
        element.addEventListener('click', stopPropagation);
        element.addEventListener('dblclick', stopPropagation);
        element.addEventListener('mousedown', stopPropagation);
        
        // Убеждаемся, что CSS pointer-events установлен
        element.style.pointerEvents = 'auto';
    });
    
    console.log('Обработчики предотвращения кликов через UI обновлены для', uiElements.length, 'элементов');
}

/**
 * Обновляет активный POI в интерфейсе
 */
function updateActivePoi(poiId) {
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

/**
 * Функция для скрытия элементов тематического маршрута
 */
function hideThematicRouteElements() {
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

/**
 * Функция для отображения элементов тематического маршрута
 */
function showThematicRouteElements() {
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

// Экспортируем функции в глобальную область видимости
window.createLoadingIndicator = createLoadingIndicator;
window.preventMapClicksThrough = preventMapClicksThrough;
window.updateActivePoi = updateActivePoi;
window.hideThematicRouteElements = hideThematicRouteElements;
window.showThematicRouteElements = showThematicRouteElements; 