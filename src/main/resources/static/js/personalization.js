/**
 * Модуль персонализации и интеллектуальных рекомендаций
 */
class PersonalizationModule {
    constructor() {
        this.userProfile = null;
        this.isAuthenticated = false;
        this.weatherData = null;
        this.daytime = this.getDaytime();
        
        // API ключ для OpenWeatherMap
        this.weatherApiKey = "5f472b7acba333cd8a035ea85a0d4d4c"; // Публичный ключ для тестирования
        this.cityCoordinates = { lat: 55.19, lon: 30.20 }; // Витебск
        
        this.init();
    }
    
    init() {
        // Инициализация UI компонентов
        this.setupEventListeners();
        this.loadWeatherData();
        
        // Проверяем статус авторизации и обновляем периодически
        this.checkAuthStatus();
        setInterval(() => this.checkAuthStatus(), 2000); // Проверяем каждые 2 секунды
        
        this.updateRecommendationsByDaytime();
    }
    
    setupEventListeners() {
        // Профиль пользователя
        // Убираем обработчик клика по кнопке логина, т.к. он будет обрабатываться через onclick атрибут
        
        if (document.getElementById('logout')) {
            document.getElementById('logout').addEventListener('click', () => this.logout());
        }
        
        if (document.getElementById('saved-routes')) {
            document.getElementById('saved-routes').addEventListener('click', () => this.showSavedRoutes());
        }
        
        if (document.getElementById('preferences')) {
            document.getElementById('preferences').addEventListener('click', () => this.showPreferences());
        }
        
        // Слушаем изменения в параметрах маршрута
        const durationSelect = document.getElementById('route-duration');
        const paceRadios = document.querySelectorAll('input[name="route-pace"]');
        
        if (durationSelect) {
            durationSelect.addEventListener('change', () => {
                this.updateRouteParameters();
                // Обновляем рекомендации с учетом новой длительности
                this.updateRecommendations();
            });
        }
        
        paceRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                this.updateRouteParameters();
                // Обновляем рекомендации с учетом нового темпа
                this.updateRecommendations();
            });
        });
        
        // Добавляем кнопку обновления погоды
        const weatherBox = document.getElementById('weather-box');
        if (weatherBox) {
            const refreshButton = document.createElement('button');
            refreshButton.textContent = '🔄 Обновить погоду';
            refreshButton.style.cssText = 'margin-top: 10px; font-size: 0.85em; padding: 5px; width: 100%; background-color: var(--background); border: none; border-radius: 5px; cursor: pointer; box-shadow: 3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light); transition: all 0.3s; color: var(--text-color);';
            
            refreshButton.addEventListener('mouseenter', function() {
                this.style.boxShadow = '2px 2px 4px var(--shadow-dark), -2px -2px 4px var(--shadow-light)';
            });
            
            refreshButton.addEventListener('mouseleave', function() {
                this.style.boxShadow = '3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light)';
            });
            
            refreshButton.addEventListener('click', () => {
                this.loadWeatherData();
                refreshButton.textContent = '🔄 Обновление...';
                refreshButton.disabled = true;
                setTimeout(() => {
                    refreshButton.textContent = '🔄 Обновить погоду';
                    refreshButton.disabled = false;
                }, 2000);
            });
            weatherBox.appendChild(refreshButton);
        }
    }
    
    // Определение времени суток
    getDaytime() {
        const hours = new Date().getHours();
        
        if (hours >= 5 && hours < 12) return 'morning';
        if (hours >= 12 && hours < 17) return 'day';
        if (hours >= 17 && hours < 22) return 'evening';
        return 'night';
    }
    
    // Загрузка погодных данных
    loadWeatherData() {
        const { lat, lon } = this.cityCoordinates;
        
        // Отображаем индикатор загрузки
        document.getElementById('weather-temp').textContent = 'Загрузка...';
        document.getElementById('weather-icon').textContent = '🔄';
        
        fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=ru&appid=${this.weatherApiKey}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Ошибка HTTP: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Погодные данные получены:', data);
                this.weatherData = data;
                this.updateWeatherUI();
                this.updateRecommendations();
            })
            .catch(error => {
                console.error('Ошибка при загрузке погоды:', error);
                document.getElementById('weather-temp').textContent = 'Не удалось загрузить погоду';
                document.getElementById('weather-icon').textContent = '⚠️';
                document.getElementById('weather-description').textContent = 'Проверьте подключение к интернету';
                
                // Используем заглушку для демонстрации
                this.useWeatherFallback();
            });
    }
    
    // Заглушка с погодными данными на случай ошибки
    useWeatherFallback() {
        this.weatherData = {
            main: { temp: 15 },
            weather: [{ id: 800, description: 'ясно', icon: '01d' }]
        };
        this.updateWeatherUI();
        this.updateRecommendations();
    }
    
    // Обновление UI с погодными данными
    updateWeatherUI() {
        if (!this.weatherData) return;
        
        const temp = Math.round(this.weatherData.main.temp);
        const description = this.weatherData.weather[0].description;
        const weatherIcon = this.getWeatherIcon(this.weatherData.weather[0].icon);
        
        document.getElementById('weather-icon').textContent = weatherIcon;
        document.getElementById('weather-temp').textContent = `${temp}°C`;
        document.getElementById('weather-description').textContent = description.charAt(0).toUpperCase() + description.slice(1);
    }
    
    // Выбор эмодзи по коду погоды с OpenWeatherMap
    getWeatherIcon(iconCode) {
        const iconMap = {
            '01d': '☀️',
            '01n': '🌙',
            '02d': '🌤️',
            '02n': '☁️',
            '03d': '☁️',
            '03n': '☁️',
            '04d': '☁️',
            '04n': '☁️',
            '09d': '🌧️',
            '09n': '🌧️',
            '10d': '🌦️',
            '10n': '🌧️',
            '11d': '⛈️',
            '11n': '⛈️',
            '13d': '❄️',
            '13n': '❄️',
            '50d': '🌫️',
            '50n': '🌫️'
        };
        
        return iconMap[iconCode] || '🌡️';
    }
    
    // Получение рекомендаций на основе времени суток и погоды
    updateRecommendations() {
        if (!this.weatherData) return;
        
        const temp = this.weatherData.main.temp;
        const weatherId = this.weatherData.weather[0].id;
        const isRainyOrSnowy = weatherId >= 200 && weatherId < 700;
        const isCold = temp < 5;
        const isHot = temp > 25;
        
        let recommendation = '';
        let typeRecommendation = '';
        
        // По погоде
        if (isRainyOrSnowy) {
            recommendation = 'Плохая погода! Рекомендуем места в помещениях и короткие маршруты.';
            typeRecommendation = 'cafe,restaurant,museum';
        } else if (isCold) {
            recommendation = 'Холодно! Рекомендуем теплые помещения и активные маршруты.';
            typeRecommendation = 'cafe,restaurant,museum,mall';
        } else if (isHot) {
            recommendation = 'Жарко! Рекомендуем парки, тенистые места и прохладительные напитки.';
            typeRecommendation = 'park,cafe,ice_cream';
        } else {
            recommendation = 'Отличная погода для прогулки!';
            typeRecommendation = '';
        }
        
        // Сочетаем с временем суток
        this.updateRecommendationsByDaytime(typeRecommendation);
        
        document.getElementById('weather-recommendation').textContent = recommendation;
    }
    
    updateRecommendationsByDaytime(additionalTypes = '') {
        let recommendedTypes = [];
        let message = '';
        
        switch (this.daytime) {
            case 'morning':
                recommendedTypes = ['cafe', 'bakery', 'restaurant'];
                message = 'Утро - отличное время для завтрака или кофе!';
                break;
            case 'day':
                recommendedTypes = ['restaurant', 'park', 'museum', 'mall'];
                message = 'День - идеально для активных прогулок и осмотра достопримечательностей.';
                break;
            case 'evening':
                recommendedTypes = ['restaurant', 'bar', 'viewpoint', 'night_club'];
                message = 'Вечер - время для ужина или развлечений!';
                break;
            case 'night':
                recommendedTypes = ['bar', 'night_club'];
                message = 'Ночь - можно посетить ночные заведения или отдохнуть.';
                break;
        }
        
        // Добавляем рекомендации по типам POI из погоды
        if (additionalTypes) {
            const additionalTypesArr = additionalTypes.split(',');
            recommendedTypes = [...new Set([...recommendedTypes, ...additionalTypesArr])];
        }
        
        // Здесь можно автоматически выбрать рекомендуемый тип в интерфейсе
        this.highlightRecommendedTypes(recommendedTypes);
    }
    
    // Подсветка рекомендованных типов заведений в UI
    highlightRecommendedTypes(types) {
        // Снимаем подсветку со всех кнопок
        document.querySelectorAll('#poi-buttons button').forEach(btn => {
            btn.style.border = '1px solid #777';
        });
        
        // Подсвечиваем рекомендованные типы
        types.forEach(type => {
            const button = document.getElementById(`poi-${type}`);
            if (button) {
                button.style.border = '2px solid #42a5f5';
                button.title = 'Рекомендовано для текущего времени суток и погоды';
            }
        });
    }
    
    // Настройки маршрута на основе темпа и длительности
    updateRouteParameters() {
        const duration = parseInt(document.getElementById('route-duration').value);
        const pace = document.querySelector('input[name="route-pace"]:checked').value;
        
        // Расчет оптимального количества точек интереса для маршрута
        let poiCount;
        let speed;
        let averageTimeAtPoi; // Среднее время пребывания в точке интереса в минутах
        
        if (pace === 'relaxed') {
            speed = 3; // км/ч для размеренного темпа
            averageTimeAtPoi = 20; // Более длительное пребывание в точках для размеренного темпа
        } else {
            speed = 5; // км/ч для активного темпа
            averageTimeAtPoi = 12; // Меньше времени на каждую точку для активного темпа
        }
        
        if (duration === 0) {
            // Без ограничений, используем значение по умолчанию
            poiCount = 5;
        } else {
            // Формула с учетом:
            // - общей длительности маршрута
            // - времени на дорогу между точками (примерно 1-2 км между точками, зависит от скорости)
            // - времени пребывания в каждой точке интереса (averageTimeAtPoi)
            // Допустим, средняя дистанция между точками 1.5 км
            const avgDistanceBetweenPois = 1.5; // км
            const timeForMovement = avgDistanceBetweenPois / speed * 60; // время в минутах на перемещение между точками
            
            // Время на одну точку = время на дорогу + время пребывания
            const timePerPoi = timeForMovement + averageTimeAtPoi;
            
            // Расчет количества точек
            poiCount = Math.max(3, Math.min(10, Math.floor(duration / timePerPoi)));
        }
        
        // Устанавливаем рассчитанное значение на слайдере
        const poiCountSlider = document.getElementById('poi-count');
        if (poiCountSlider) {
            poiCountSlider.value = poiCount;
            document.getElementById('poi-count-value').textContent = poiCount;
            
            // Дополнительно подсвечиваем слайдер для привлечения внимания
            poiCountSlider.style.transition = 'box-shadow 0.3s';
            poiCountSlider.style.boxShadow = '0 0 5px #4285f4';
            setTimeout(() => {
                poiCountSlider.style.boxShadow = 'none';
            }, 1000);
        }
        
        // Обновляем рекомендации для текущего времени суток с учетом выбранного темпа
        this.updateRecommendationsByDaytime();
        
        // Обновляем подсказку о параметрах маршрута
        const durationText = duration === 0 ? 'без ограничений' : `${duration} мин`;
        const routeTypeElement = document.getElementById('route-type');
        if (routeTypeElement) {
            routeTypeElement.textContent = `Стандартный (${pace === 'relaxed' ? 'размеренный' : 'активный'} темп)`;
            routeTypeElement.style.color = pace === 'relaxed' ? '#4CAF50' : '#FF9800';
        }
        
        console.log(`Обновлены параметры маршрута: темп=${pace}, длительность=${durationText}, точек интереса=${poiCount}`);
    }
    
    // Аутентификация и профиль
    showLoginModal() {
        // Вызываем модальное окно из модуля аутентификации, если он доступен
        if (window.authModule) {
            // Обновляем метод для использования неоморфизма
            if (typeof window.authModule.showNeoAuthModal === 'function') {
                window.authModule.showNeoAuthModal();
            } else {
                window.authModule.showAuthModal();
            }
        } else {
            alert('Модуль аутентификации недоступен');
        }
    }
    
    logout() {
        this.isAuthenticated = false;
        this.userProfile = null;
        document.getElementById('user-profile').style.display = 'none';
        document.getElementById('auth-container').style.display = 'block';
    }
    
    checkAuthStatus() {
        // Проверка из localStorage вместо заглушки
        const userDataStr = localStorage.getItem('userData');
        
        if (userDataStr) {
            try {
                const userData = JSON.parse(userDataStr);
                this.isAuthenticated = true;
                this.userProfile = userData;
                
                // Обновляем отображение профиля
                const userProfile = document.getElementById('user-profile');
                const authContainer = document.getElementById('auth-container');
                const userName = document.getElementById('user-name');
                
                if (userProfile) userProfile.style.display = 'block';
                if (authContainer) authContainer.style.display = 'none';
                if (userName) {
                    let displayName = userData.username || 'Пользователь';
                    if (userData.firstName && userData.firstName.trim() !== '') {
                        displayName = userData.firstName;
                        if (userData.lastName && userData.lastName.trim() !== '') {
                            displayName += ' ' + userData.lastName;
                        }
                    }
                    userName.textContent = displayName;
                }
                
                console.log('PersonalizationModule: пользователь авторизован:', userData.username);
                return true;
            } catch (e) {
                console.error('PersonalizationModule: ошибка при загрузке данных пользователя:', e);
                this.isAuthenticated = false;
                this.userProfile = null;
            }
        } else {
            this.isAuthenticated = false;
            this.userProfile = null;
            
            // Отображаем форму входа
            const userProfile = document.getElementById('user-profile');
            const authContainer = document.getElementById('auth-container');
            
            if (userProfile) userProfile.style.display = 'none';
            if (authContainer) authContainer.style.display = 'block';
        }
        
        return this.isAuthenticated;
    }
    
    loadUserProfile() {
        // Загрузка данных профиля с сервера (заглушка)
        this.userProfile = {
            name: 'Иван Петров',
            preferences: {
                liked: ['cafe', 'restaurant'],
                disliked: ['fast_food']
            },
            savedRoutes: []
        };
        
        document.getElementById('user-name').textContent = this.userProfile.name;
    }
    
    showSavedRoutes() {
        // Проверяем авторизацию
        if (!this.isAuthenticated) {
            NeoDialog.alert('Сохраненные маршруты', 'Для просмотра сохраненных маршрутов необходимо войти в систему');
            return;
        }
        
        // Проверяем, не открыто ли уже модальное окно
        if (document.getElementById('saved-routes-modal')) {
            console.log('Модальное окно уже открыто, закрываем его');
            document.body.removeChild(document.getElementById('saved-routes-modal'));
            return;
        }
        
        // Получаем ID пользователя
        const userId = this.userProfile.id;
        
        console.log(`Загружаем сохраненные маршруты для пользователя ID: ${userId}`);
        
        // Показываем индикатор загрузки
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'routes-loading-indicator';
        loadingDiv.className = 'neo-modal-container';
        loadingDiv.innerHTML = `
            <div style="
                background-color: var(--background);
                padding: 20px;
                border-radius: 15px;
                box-shadow: 10px 10px 20px var(--shadow-dark), -10px -10px 20px var(--shadow-light);
                text-align: center;
            ">
                <div style="
                    border: 4px solid var(--shadow-dark);
                    border-top: 4px solid var(--accent-color);
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    margin: 0 auto 15px auto;
                    animation: spin 1s linear infinite;
                "></div>
                <div>Загрузка сохраненных маршрутов...</div>
            </div>
        `;
        document.body.appendChild(loadingDiv);
        
        // Загружаем маршруты с сервера
        fetch(`/api/users/${userId}/routes`)
            .then(response => {
                console.log('Статус ответа сервера:', response.status);
                if (!response.ok) {
                    return response.json().then(data => {
                        throw new Error(data.error || 'Ошибка при загрузке маршрутов');
                    });
                }
                return response.json();
            })
            .then(routes => {
                console.log('Получены маршруты:', routes);
                
                // Удаляем индикатор загрузки
                if (document.getElementById('routes-loading-indicator')) {
                    document.body.removeChild(document.getElementById('routes-loading-indicator'));
                }
                
                // Если маршрутов нет
                if (!routes || routes.length === 0) {
                    NeoDialog.alert('Сохраненные маршруты', 'У вас еще нет сохраненных маршрутов');
                    return;
                }
                
                // Создаем модальное окно для отображения маршрутов
                const modalContainer = document.createElement('div');
                modalContainer.id = 'saved-routes-modal';
                modalContainer.className = 'neo-modal-container';
                
                // Создаем содержимое модального окна
                let routesHTML = '';
                routes.forEach(route => {
                    const date = new Date(route.createdAt).toLocaleDateString('ru-RU');
                    const time = new Date(route.createdAt).toLocaleTimeString('ru-RU');
                    const profileText = route.profile === 'foot' ? 'Пешком' : 
                                        route.profile === 'bike' ? 'Велосипед' : 'Автомобиль';
                    const profileColor = route.profile === 'foot' ? 'var(--accent-color)' : 
                                       route.profile === 'bike' ? 'var(--success-color)' : 'var(--danger-color)';
                    
                    routesHTML += `
                        <div class="saved-route-item" data-id="${route.id}" style="
                            padding: 15px;
                            margin-bottom: 20px;
                            background-color: var(--background);
                            border-radius: 15px;
                            box-shadow: 5px 5px 10px var(--shadow-dark), -5px -5px 10px var(--shadow-light);
                            overflow: hidden;
                            position: relative;
                        ">
                            <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 6px; background-color: ${profileColor};"></div>
                            
                            <div style="padding-left: 10px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                    <h3 style="margin: 0; font-size: 1.2em; color: var(--accent-color);">${route.name}</h3>
                                    <span style="font-size: 0.85em; color: #666;">${date} ${time}</span>
                                </div>
                                
                                <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: var(--text-color);">
                                    <span>Расстояние: <b>${route.distance.toFixed(2)} км</b></span>
                                    <span>Время: <b>${route.duration} мин.</b></span>
                                    <span>Тип: <b>${profileText}</b></span>
                                </div>
                                
                                <div style="margin-top: 15px; display: flex; justify-content: space-between; gap: 10px;">
                                    <button class="show-route-btn neo-button" style="
                                        flex: 1;
                                        background-color: var(--accent-color);
                                        color: white;
                                        text-align: center;
                                        margin-bottom: 0;
                                    ">Показать на карте</button>
                                    
                                    <button class="delete-route-btn neo-button" style="
                                        flex: 1;
                                        background-color: var(--danger-color);
                                        color: white;
                                        text-align: center;
                                        margin-bottom: 0;
                                    ">Удалить</button>
                                </div>
                            </div>
                        </div>
                    `;
                });
                
                modalContainer.innerHTML = `
                    <div class="neo-modal">
                        <div class="neo-modal-header">
                            <h2>Сохраненные маршруты</h2>
                            <button id="close-routes-modal" class="neo-close-button">&times;</button>
                        </div>
                        
                        <div id="saved-routes-list">
                            ${routesHTML}
                        </div>
                    </div>
                `;
                
                document.body.appendChild(modalContainer);
                
                // Функция для закрытия модального окна
                const closeModal = () => {
                    console.log('Закрытие модального окна сохраненных маршрутов');
                    // Удаляем модальное окно из DOM
                    if (document.getElementById('saved-routes-modal')) {
                        document.body.removeChild(document.getElementById('saved-routes-modal'));
                    }
                };

                // Обработчик закрытия модального окна через кнопку X
                const closeButton = document.getElementById('close-routes-modal');
                if (closeButton) {
                    console.log('Настраиваю обработчик для кнопки закрытия');
                    
                    // Удаляем все существующие обработчики и заменяем кнопку новой
                    const newCloseButton = document.createElement('button');
                    newCloseButton.id = 'close-routes-modal';
                    newCloseButton.className = 'neo-close-button';
                    newCloseButton.innerHTML = '&times;';
                    newCloseButton.style.cursor = 'pointer';
                    newCloseButton.style.fontWeight = 'bold';
                    newCloseButton.style.fontSize = '24px';
                    
                    // Заменяем старую кнопку новой
                    closeButton.parentNode.replaceChild(newCloseButton, closeButton);
                    
                    // Добавляем обработчик для новой кнопки
                    newCloseButton.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Кнопка закрытия нажата!');
                        closeModal();
                    });
                }

                // Закрытие по клику вне модального окна
                modalContainer.onclick = function(e) {
                    if (e.target === modalContainer) {
                        e.preventDefault();
                        e.stopPropagation();
                        closeModal();
                        return false;
                    }
                };
                
                // Добавляем обработчик клавиши Escape для закрытия модального окна
                const escHandler = (e) => {
                    if (e.key === 'Escape') {
                        closeModal();
                        document.removeEventListener('keydown', escHandler);
                    }
                };
                document.addEventListener('keydown', escHandler);
                
                // Обработчики кнопок
                const showButtons = modalContainer.querySelectorAll('.show-route-btn');
                const deleteButtons = modalContainer.querySelectorAll('.delete-route-btn');
                
                // Обработчик показа маршрута
                showButtons.forEach(button => {
                    button.addEventListener('click', (e) => {
                        const routeItem = e.target.closest('.saved-route-item');
                        const routeId = routeItem.dataset.id;
                        
                        // Закрываем модальное окно
                        closeModal();
                        
                        // Загружаем маршрут
                        this.loadAndDisplayRoute(userId, routeId);
                    });
                });
                
                // Обработчик удаления маршрута
                deleteButtons.forEach(button => {
                    button.addEventListener('click', async (e) => {
                        const routeItem = e.target.closest('.saved-route-item');
                        const routeId = routeItem.dataset.id;
                        const routeName = routeItem.querySelector('h3').textContent;
                        
                        // Используем Promise чтобы дождаться ответа от пользователя
                        try {
                            const confirmResult = await new Promise(resolve => {
                                NeoDialog.confirm('Подтверждение удаления', `Вы уверены, что хотите удалить маршрут "${routeName}"?`, result => {
                                    resolve(result);
                                });
                            });
                            
                            if (confirmResult === true) {
                                this.deleteRoute(userId, routeId, routeItem);
                            } else {
                                console.log('Удаление отменено пользователем');
                            }
                        } catch (error) {
                            console.error('Ошибка при подтверждении удаления:', error);
                            NeoDialog.alert('Ошибка', 'Произошла ошибка при попытке удалить маршрут');
                        }
                    });
                });
            })
            .catch(error => {
                console.error('Ошибка при загрузке сохраненных маршрутов:', error);
                
                // Удаляем индикатор загрузки
                if (document.getElementById('routes-loading-indicator')) {
                    document.body.removeChild(document.getElementById('routes-loading-indicator'));
                }
                
                NeoDialog.alert('Ошибка', `Ошибка при загрузке сохраненных маршрутов: ${error.message}`);
            });
    }
    
    // Загрузка и отображение маршрута на карте
    loadAndDisplayRoute(userId, routeId) {
        // Показываем индикатор загрузки
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'route-loading-indicator';
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
            <div>Загрузка маршрута...</div>
        `;
        document.body.appendChild(loadingDiv);
        
        // Загружаем маршрут с сервера
        fetch(`/api/users/${userId}/routes/${routeId}`)
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => {
                        throw new Error(data.error || 'Ошибка при загрузке маршрута');
                    });
                }
                return response.json();
            })
            .then(routeData => {
                try {
                    // Удаляем индикатор загрузки
                    if (document.getElementById('route-loading-indicator')) {
                        document.body.removeChild(document.getElementById('route-loading-indicator'));
                    }
                    
                    console.log('Полученные данные маршрута:', routeData);
                    
                    // Получаем данные о маршруте
                    let routePoints = [];
                    
                    try {
                        if (routeData.routeData) {
                            const parsedRouteData = JSON.parse(routeData.routeData);
                            if (parsedRouteData && parsedRouteData.points && Array.isArray(parsedRouteData.points)) {
                                routePoints = parsedRouteData.points;
                            }
                        }
                    } catch (e) {
                        console.error('Ошибка при парсинге routeData:', e);
                    }
                    
                    // Проверка наличия точек маршрута
                    if (!routePoints || routePoints.length === 0) {
                        console.log('В маршруте отсутствуют точки, попробуем использовать точки POI');
                        
                        // Если нет точек маршрута, используем точки POI для создания маршрута
                        if (routeData.points && routeData.points.length > 0) {
                            routePoints = routeData.points.map(point => [point.lat || point.latitude, point.lng || point.longitude]);
                        } else {
                            throw new Error('Маршрут не содержит точек');
                        }
                    }
                    
                    // Валидация точек маршрута перед отображением
                    const validRoutePoints = [];
                    for (const point of routePoints) {
                        // Обработка различных форматов точек
                        if (Array.isArray(point) && point.length >= 2) {
                            // Формат [lat, lng]
                            if (typeof point[0] === 'number' && typeof point[1] === 'number') {
                                validRoutePoints.push(L.latLng(point[0], point[1]));
                            }
                        } else if (typeof point === 'object') {
                            // Формат {lat, lng} или {latitude, longitude}
                            let lat = null, lng = null;
                            
                            if ('lat' in point && typeof point.lat === 'number') {
                                lat = point.lat;
                            } else if ('latitude' in point && typeof point.latitude === 'number') {
                                lat = point.latitude;
                            }
                            
                            if ('lng' in point && typeof point.lng === 'number') {
                                lng = point.lng;
                            } else if ('longitude' in point && typeof point.longitude === 'number') {
                                lng = point.longitude;
                            }
                            
                            if (lat !== null && lng !== null) {
                                validRoutePoints.push(L.latLng(lat, lng));
                            }
                        }
                    }
                    
                    // Проверяем, есть ли валидные точки
                    if (validRoutePoints.length === 0) {
                        throw new Error('Не найдено валидных координат для маршрута');
                    }
                    
                    // Очищаем текущий маршрут на карте
                    if (window.clearMap && typeof window.clearMap === 'function') {
                        window.clearMap();
                    } else {
                        // Запасной вариант для очистки карты
                        if (window.routeLayer && map) {
                            map.removeLayer(window.routeLayer);
                            window.routeLayer = null;
                        }
                        if (window.poiMarkers && Array.isArray(window.poiMarkers)) {
                            window.poiMarkers.forEach(marker => map.removeLayer(marker));
                            window.poiMarkers = [];
                        }
                    }
                    
                    // Создаем полилинию маршрута
                    window.routeLayer = L.polyline(validRoutePoints, {
                        color: this.getRouteColor(routeData.profile),
                        weight: 4
                    }).addTo(map);
                    
                    // Отображаем точки маршрута
                    window.poiMarkers = [];
                    
                    if (routeData.points && routeData.points.length > 0) {
                        routeData.points.forEach((point, index) => {
                            // Проверяем координаты
                            const lat = point.latitude || point.lat;
                            const lng = point.longitude || point.lng;
                            
                            if (typeof lat !== 'number' || typeof lng !== 'number') {
                                console.warn(`Пропуск точки ${index}: недопустимые координаты`, point);
                                return; // Пропускаем точки с недопустимыми координатами
                            }
                            
                            const marker = L.marker([lat, lng], {
                                icon: L.divIcon({
                                    className: 'route-marker-poi',
                                    html: `<div style="
                                        width: 26px;
                                        height: 26px;
                                        border-radius: 50%;
                                        background-color: #2196F3;
                                        display: flex;
                                        justify-content: center;
                                        align-items: center;
                                        color: white;
                                        font-weight: bold;
                                        font-size: 12px;
                                        border: 2px solid white;
                                        box-shadow: 0 0 4px rgba(0,0,0,0.5);">${index + 1}</div>`,
                                    iconSize: [30, 30],
                                    iconAnchor: [15, 15],
                                    popupAnchor: [0, -15]
                                })
                            }).addTo(map);
                            
                            let popupContent = `<b>${point.name || `Точка ${index + 1}`}</b>`;
                            if (point.type && point.type !== 'waypoint') {
                                popupContent += `<br>Тип: ${point.type}`;
                            }
                            if (point.rating) {
                                popupContent += `<br>Рейтинг: ${point.rating}`;
                            }
                            
                            // Добавляем фотографию, если она доступна
                            if (point.photoUrl) {
                                console.log(`Данные фото для точки ${point.name || `Точка ${index + 1}`}:`, point.photoUrl);
                                
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
                                    popupContent += `<br><img src="${photoUrls[0]}" alt="${point.name || `Точка ${index + 1}`}" 
                                                     style="max-width: 200px; max-height: 150px; margin-top: 5px; 
                                                     border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">`;
                                }
                            }
                            
                            marker.bindPopup(popupContent);
                            window.poiMarkers.push(marker);
                        });
                    }
                    
                    // Масштабируем карту для отображения всего маршрута
                    if (window.routeLayer) {
                        try {
                            map.fitBounds(window.routeLayer.getBounds());
                        } catch (e) {
                            console.error('Ошибка при масштабировании карты:', e);
                            // Если не удалось определить границы маршрута, центрируем по первой точке
                            if (validRoutePoints.length > 0) {
                                map.setView(validRoutePoints[0], 13);
                            }
                        }
                    }
                    
                    // Обновляем информацию о маршруте
                    this.updateRouteInfo(routeData);
                    
                    // Устанавливаем активный профиль
                    this.setActiveProfile(routeData.profile);
                } catch (error) {
                    console.error('Ошибка при обработке данных маршрута:', error);
                    NeoDialog.alert('Ошибка', `Ошибка при отображении маршрута: ${error.message}`);
                }
            })
            .catch(error => {
                // Удаляем индикатор загрузки
                if (document.getElementById('route-loading-indicator')) {
                    document.body.removeChild(document.getElementById('route-loading-indicator'));
                }
                console.error('Ошибка при загрузке маршрута:', error);
                NeoDialog.alert('Ошибка', `Ошибка при загрузке маршрута: ${error.message}`);
            });
    }
    
    // Удаление маршрута
    deleteRoute(userId, routeId, routeItemElement) {
        console.log(`Удаляю маршрут с ID: ${routeId} для пользователя: ${userId}`);
        
        // Показываем индикатор загрузки
        const loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'delete-loading-indicator';
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
            text-align: center;
        `;
        loadingIndicator.innerHTML = 'Удаление маршрута...';
        document.body.appendChild(loadingIndicator);

        // Выполняем запрос на удаление
        fetch(`/api/users/${userId}/routes/${routeId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            // Удаляем индикатор загрузки
            if (document.getElementById('delete-loading-indicator')) {
                document.body.removeChild(document.getElementById('delete-loading-indicator'));
            }
            
            if (!response.ok) {
                if (response.headers.get('content-type')?.includes('application/json')) {
                    return response.json().then(data => {
                        throw new Error(data.error || 'Ошибка при удалении маршрута');
                    });
                } else {
                    throw new Error(`Ошибка при удалении маршрута: ${response.status} ${response.statusText}`);
                }
            }
            
            console.log(`Маршрут ${routeId} успешно удален`);
            
            // Удаляем элемент из списка с анимацией
            routeItemElement.style.height = routeItemElement.offsetHeight + 'px';
            routeItemElement.style.transition = 'all 0.3s ease';
            
            setTimeout(() => {
                routeItemElement.style.height = '0';
                routeItemElement.style.opacity = '0';
                routeItemElement.style.margin = '0';
                routeItemElement.style.padding = '0';
                
                setTimeout(() => {
                    // Удаляем элемент
                    if (routeItemElement.parentNode) {
                        routeItemElement.parentNode.removeChild(routeItemElement);
                        
                        // Проверяем, остались ли еще маршруты
                        const routesList = document.getElementById('saved-routes-list');
                        const remainingRoutes = routesList?.querySelectorAll('.saved-route-item');
                        
                        if (!remainingRoutes || remainingRoutes.length === 0) {
                            console.log('Больше нет маршрутов, закрываю модальное окно');
                            
                            // Закрываем модальное окно
                            const modal = document.getElementById('saved-routes-modal');
                            if (modal) {
                                document.body.removeChild(modal);
                                NeoDialog.alert('Сохраненные маршруты', 'У вас больше нет сохраненных маршрутов');
                            }
                        }
                    }
                }, 300);
            }, 10);
        })
        .catch(error => {
            // Удаляем индикатор загрузки
            if (document.getElementById('delete-loading-indicator')) {
                document.body.removeChild(document.getElementById('delete-loading-indicator'));
            }
            
            console.error('Ошибка при удалении маршрута:', error);
            NeoDialog.alert('Ошибка', `Ошибка при удалении маршрута: ${error.message}`);
        });
    }
    
    // Вспомогательные функции
    getRouteColor(profile) {
        switch (profile) {
            case 'foot':
                return '#3949AB'; // Indigo для пешеходных маршрутов
            case 'bike':
                return '#00897B'; // Teal для велосипедных маршрутов
            case 'car':
                return '#E64A19'; // Deep Orange для автомобильных маршрутов
            default:
                return '#3F51B5';
        }
    }
    
    updateRouteInfo(routeData) {
        const routeInfoPanel = document.getElementById('route-info');
        const infoDistance = document.getElementById('info-distance');
        const infoTime = document.getElementById('info-time');
        const routeType = document.getElementById('route-type');
        
        if (routeInfoPanel && infoDistance && infoTime) {
            infoDistance.textContent = routeData.distance.toFixed(2);
            infoTime.textContent = routeData.duration;
            
            if (routeType) {
                routeType.textContent = 'Сохраненный';
                routeType.style.color = '#4285f4';
            }
            
            routeInfoPanel.style.display = 'block';
        }
    }
    
    setActiveProfile(profile) {
        const profileButtons = document.querySelectorAll('#profile-buttons button');
        
        profileButtons.forEach(button => {
            button.classList.remove('active');
            
            if (button.id === `profile-${profile}`) {
                button.classList.add('active');
            }
        });
        
        // Обновляем глобальную переменную текущего профиля
        if (window.currentProfile !== undefined) {
            window.currentProfile = profile;
        }
    }
    
    showPreferences() {
        NeoDialog.alert('Уведомление', 'Настройки предпочтений будут реализованы в следующей версии');
    }
    
    /**
     * Сохраняет текущий маршрут в хранилище
     * @param {Object} routeData - данные о маршруте
     * @param {Array} poisData - данные о точках интереса на маршруте
     */
    async saveCurrentRoute(routeData, poisData) {
        // Проверяем, что пользователь авторизован
        if (!this.isAuthenticated) {
            // Используем NeoDialog.confirm напрямую с Promise
            return new Promise(resolve => {
                NeoDialog.confirm('Требуется авторизация', 'Для сохранения маршрута необходимо войти в систему. Хотите войти сейчас?', result => {
                    if (result) {
                        window.location.href = '/login';
                    }
                    resolve(false);
                });
            });
        }

        // Проверяем данные маршрута
        if (!routeData || !routeData.points || routeData.points.length === 0) {
            NeoDialog.alert('Ошибка', 'Данные маршрута отсутствуют');
            return;
        }

        // Запрашиваем имя маршрута используя NeoDialog.prompt напрямую
        return new Promise(resolve => {
            NeoDialog.prompt('Сохранение маршрута', 'Введите название маршрута:', '', routeName => {
                if (!routeName || routeName.trim() === '') {
                    NeoDialog.alert('Ошибка', 'Название маршрута не может быть пустым');
                    resolve(false);
                    return;
                }
                
                // Продолжаем сохранение маршрута
                this._saveRouteWithName(routeData, poisData, routeName);
                resolve(true);
            });
        });
    }

    // Новый приватный метод для сохранения маршрута с уже известным именем
    _saveRouteWithName(routeData, poisData, routeName) {
        // Гарантируем, что числовые параметры имеют числовой тип
        const safeRouteData = {
            name: routeName,
            distance: parseFloat(routeData.distance) || 0,
            time: parseInt(routeData.time) || 0,
            profile: routeData.profile || 'foot',
            createdAt: new Date().toISOString(),
            points: routeData.points
        };
        
        // Получаем ID пользователя
        const userId = this.userProfile.id;
        
        // Создаем JSON-объект для отправки
        const saveData = {
            name: routeName,
            profile: safeRouteData.profile,
            distance: safeRouteData.distance,
            duration: safeRouteData.time,
            routeData: JSON.stringify({
                points: safeRouteData.points
            }),
            pointsData: poisData.map((poi, index) => {
                // Проверяем и обрабатываем данные POI, преобразуя все числовые значения
                let rating = null;
                if (poi.rating !== undefined && poi.rating !== null) {
                    // Если rating строка "Нет данных", то null, иначе преобразуем в число
                    rating = poi.rating === 'Нет данных' ? null : parseFloat(poi.rating) || null;
                }
                
                return {
                    latitude: parseFloat(poi.lat) || 0,
                    longitude: parseFloat(poi.lng) || 0,
                    name: poi.name || `Точка ${index + 1}`,
                    type: poi.type || 'waypoint',
                    rating: rating,
                    sequenceOrder: index
                };
            })
        };
        
        console.log('Отправляемые данные:', saveData);
        
        // Показываем индикатор загрузки
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'route-saving-indicator';
        loadingDiv.className = 'neo-modal-container';
        loadingDiv.innerHTML = `
            <div style="
                background-color: var(--background);
                padding: 20px;
                border-radius: 15px;
                box-shadow: 10px 10px 20px var(--shadow-dark), -10px -10px 20px var(--shadow-light);
                text-align: center;
            ">
                <div style="
                    border: 4px solid var(--shadow-dark);
                    border-top: 4px solid var(--accent-color);
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    margin: 0 auto 15px auto;
                    animation: spin 1s linear infinite;
                "></div>
                <div>Сохранение маршрута...</div>
            </div>
        `;
        document.body.appendChild(loadingDiv);
        
        // Отправляем запрос на сервер
        fetch(`/api/users/${userId}/routes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(saveData)
        })
        .then(response => {
            // Удаляем индикатор загрузки
            if (document.getElementById('route-saving-indicator')) {
                document.body.removeChild(document.getElementById('route-saving-indicator'));
            }
            
            if (!response.ok) {
                // Проверяем формат ответа сервера
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    return response.json().then(data => {
                        throw new Error(data.error || 'Ошибка при сохранении маршрута');
                    });
                } else {
                    return response.text().then(text => {
                        throw new Error(`Ошибка при сохранении маршрута: ${response.status} - ${text || response.statusText}`);
                    });
                }
            }
            return response.json();
        })
        .then(data => {
            // Используем NeoDialog.alert вместо стандартного alert
            NeoDialog.alert('Успешно', `Маршрут "${routeName}" успешно сохранен!`);
            console.log('Маршрут сохранен:', data);
        })
        .catch(error => {
            console.error('Ошибка при сохранении маршрута:', error);
            // Используем NeoDialog.alert вместо стандартного alert
            NeoDialog.alert('Ошибка', `Ошибка при сохранении маршрута: ${error.message}`);
        });
    }
}

// Инициализируем модуль когда DOM загрузится
document.addEventListener('DOMContentLoaded', () => {
    window.personalizationModule = new PersonalizationModule();
}); 