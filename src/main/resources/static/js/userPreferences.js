/**
 * Модуль для работы с предпочтениями пользователя
 */
class UserPreferencesModule {
    constructor() {
        this.preferences = {
            liked: [],
            disliked: []
        };
        
        // Инициализация
        this.init();
    }
    
    /**
     * Инициализация модуля
     */
    init() {
        // Загружаем предпочтения, если пользователь авторизован
        this.loadPreferences();
        
        // Настраиваем обработчики событий
        document.addEventListener('userLoggedIn', () => this.loadPreferences());
        document.addEventListener('userLoggedOut', () => this.clearPreferences());
        
        // Кнопка настроек предпочтений
        const preferencesButton = document.getElementById('preferences');
        if (preferencesButton) {
            preferencesButton.addEventListener('click', () => this.showPreferencesModal());
        }
    }
    
    /**
     * Загрузка предпочтений пользователя с сервера
     */
    async loadPreferences() {
        // Проверяем, авторизован ли пользователь
        if (!window.authModule || !window.authModule.isAuthenticated()) {
            return;
        }
        
        const userId = window.authModule.getCurrentUser().id;
        
        try {
            // Получаем список предпочтений "нравится"
            const likedResponse = await fetch(`/api/users/${userId}/preferences/liked`);
            if (likedResponse.ok) {
                this.preferences.liked = await likedResponse.json();
            }
            
            // Получаем список предпочтений "не нравится"
            const dislikedResponse = await fetch(`/api/users/${userId}/preferences/disliked`);
            if (dislikedResponse.ok) {
                this.preferences.disliked = await dislikedResponse.json();
            }
            
            // Обновляем UI
            this.updateUI();
            
            console.log('Предпочтения пользователя загружены:', this.preferences);
        } catch (error) {
            console.error('Ошибка при загрузке предпочтений:', error);
        }
    }
    
    /**
     * Очистка предпочтений пользователя (при выходе)
     */
    clearPreferences() {
        this.preferences = {
            liked: [],
            disliked: []
        };
    }
    
    /**
     * Обновление UI на основе предпочтений пользователя
     */
    updateUI() {
        // Выделяем любимые типы POI
        const poiButtons = document.querySelectorAll('#poi-buttons button');
        poiButtons.forEach(button => {
            const poiType = button.id.replace('poi-', '');
            
            // Сбрасываем специальные стили
            button.style.border = '';
            button.style.opacity = '';
            
            // Применяем стили на основе предпочтений
            if (this.preferences.liked.includes(poiType)) {
                button.style.border = '2px solid #4CAF50'; // Зеленая рамка для любимых типов
                button.title = 'Вам нравится этот тип мест';
            } else if (this.preferences.disliked.includes(poiType)) {
                button.style.opacity = '0.6'; // Полупрозрачность для нелюбимых типов
                button.title = 'Вы избегаете этот тип мест';
            }
        });
    }
    
    /**
     * Показать модальное окно настройки предпочтений
     */
    showPreferencesModal() {
        // Проверяем, авторизован ли пользователь
        if (!window.authModule || !window.authModule.isAuthenticated()) {
            alert('Необходимо войти в систему для настройки предпочтений');
            return;
        }
        
        // Создаем модальное окно
        let modalContainer = document.getElementById('preferences-modal-container');
        
        if (!modalContainer) {
            modalContainer = document.createElement('div');
            modalContainer.id = 'preferences-modal-container';
            modalContainer.innerHTML = `
                <div class="preferences-modal">
                    <div class="preferences-header">
                        <h3>Настройки предпочтений</h3>
                        <span class="close-button">&times;</span>
                    </div>
                    <div class="preferences-content">
                        <p>Выберите типы мест, которые вам нравятся или не нравятся:</p>
                        <div class="poi-preferences">
                            <div class="poi-type" data-type="restaurant">
                                <span class="poi-name">Рестораны</span>
                                <div class="preference-buttons">
                                    <button class="like-button" title="Нравится">👍</button>
                                    <button class="dislike-button" title="Не нравится">👎</button>
                                    <button class="neutral-button" title="Нейтрально">❌</button>
                                </div>
                            </div>
                            <div class="poi-type" data-type="cafe">
                                <span class="poi-name">Кафе</span>
                                <div class="preference-buttons">
                                    <button class="like-button" title="Нравится">👍</button>
                                    <button class="dislike-button" title="Не нравится">👎</button>
                                    <button class="neutral-button" title="Нейтрально">❌</button>
                                </div>
                            </div>
                            <div class="poi-type" data-type="bar">
                                <span class="poi-name">Бары</span>
                                <div class="preference-buttons">
                                    <button class="like-button" title="Нравится">👍</button>
                                    <button class="dislike-button" title="Не нравится">👎</button>
                                    <button class="neutral-button" title="Нейтрально">❌</button>
                                </div>
                            </div>
                            <div class="poi-type" data-type="pharmacy">
                                <span class="poi-name">Аптеки</span>
                                <div class="preference-buttons">
                                    <button class="like-button" title="Нравится">👍</button>
                                    <button class="dislike-button" title="Не нравится">👎</button>
                                    <button class="neutral-button" title="Нейтрально">❌</button>
                                </div>
                            </div>
                            <div class="poi-type" data-type="bank">
                                <span class="poi-name">Банки</span>
                                <div class="preference-buttons">
                                    <button class="like-button" title="Нравится">👍</button>
                                    <button class="dislike-button" title="Не нравится">👎</button>
                                    <button class="neutral-button" title="Нейтрально">❌</button>
                                </div>
                            </div>
                            <div class="poi-type" data-type="school">
                                <span class="poi-name">Школы</span>
                                <div class="preference-buttons">
                                    <button class="like-button" title="Нравится">👍</button>
                                    <button class="dislike-button" title="Не нравится">👎</button>
                                    <button class="neutral-button" title="Нейтрально">❌</button>
                                </div>
                            </div>
                            <div class="poi-type" data-type="gym">
                                <span class="poi-name">Спортзалы</span>
                                <div class="preference-buttons">
                                    <button class="like-button" title="Нравится">👍</button>
                                    <button class="dislike-button" title="Не нравится">👎</button>
                                    <button class="neutral-button" title="Нейтрально">❌</button>
                                </div>
                            </div>
                        </div>
                        <div class="preferences-actions">
                            <button class="save-button">Сохранить</button>
                            <button class="cancel-button">Отмена</button>
                        </div>
                    </div>
                </div>
            `;
            
            // Добавляем стили для модального окна
            const style = document.createElement('style');
            style.textContent = `
                #preferences-modal-container {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.5);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 1000;
                }
                
                .preferences-modal {
                    background-color: white;
                    border-radius: 5px;
                    box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
                    width: 500px;
                    max-width: 90%;
                    max-height: 90%;
                    overflow-y: auto;
                }
                
                .preferences-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 15px;
                    border-bottom: 1px solid #eee;
                }
                
                .preferences-header h3 {
                    margin: 0;
                }
                
                .close-button {
                    cursor: pointer;
                    font-size: 22px;
                }
                
                .preferences-content {
                    padding: 15px;
                }
                
                .poi-preferences {
                    margin-top: 15px;
                }
                
                .poi-type {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px;
                    border-bottom: 1px solid #eee;
                }
                
                .poi-name {
                    font-weight: bold;
                }
                
                .preference-buttons {
                    display: flex;
                    gap: 5px;
                }
                
                .preference-buttons button {
                    background: none;
                    border: 1px solid #ddd;
                    border-radius: 3px;
                    padding: 5px 10px;
                    cursor: pointer;
                    font-size: 16px;
                }
                
                .preference-buttons button.active {
                    background-color: #f0f0f0;
                    border-color: #999;
                }
                
                .preferences-actions {
                    margin-top: 20px;
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                }
                
                .preferences-actions button {
                    padding: 8px 15px;
                    border-radius: 3px;
                    cursor: pointer;
                }
                
                .save-button {
                    background-color: #4CAF50;
                    color: white;
                    border: none;
                }
                
                .cancel-button {
                    background-color: #f0f0f0;
                    border: 1px solid #ddd;
                }
            `;
            
            document.head.appendChild(style);
            document.body.appendChild(modalContainer);
            
            // Настраиваем обработчики событий для модального окна
            const closeButton = modalContainer.querySelector('.close-button');
            closeButton.addEventListener('click', () => {
                modalContainer.remove();
            });
            
            // Закрытие модального окна при клике вне его
            modalContainer.addEventListener('click', (e) => {
                if (e.target === modalContainer) {
                    modalContainer.remove();
                }
            });
            
            // Отображаем текущие предпочтения
            this.updatePreferencesUI(modalContainer);
            
            // Обработка нажатия на кнопки предпочтений
            const preferenceButtons = modalContainer.querySelectorAll('.preference-buttons button');
            preferenceButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const poiType = e.target.closest('.poi-type').getAttribute('data-type');
                    const buttonType = e.target.classList.contains('like-button') ? 'like' :
                                      e.target.classList.contains('dislike-button') ? 'dislike' : 'neutral';
                    
                    // Сбрасываем активное состояние всех кнопок в группе
                    const buttonsGroup = e.target.closest('.preference-buttons');
                    buttonsGroup.querySelectorAll('button').forEach(btn => {
                        btn.classList.remove('active');
                    });
                    
                    // Активируем выбранную кнопку
                    if (buttonType !== 'neutral') {
                        e.target.classList.add('active');
                    }
                });
            });
            
            // Обработка кнопки сохранения
            const saveButton = modalContainer.querySelector('.save-button');
            saveButton.addEventListener('click', () => {
                this.savePreferences(modalContainer)
                    .then(() => {
                        modalContainer.remove();
                    });
            });
            
            // Обработка кнопки отмены
            const cancelButton = modalContainer.querySelector('.cancel-button');
            cancelButton.addEventListener('click', () => {
                modalContainer.remove();
            });
        }
    }
    
    /**
     * Обновление UI модального окна предпочтений
     */
    updatePreferencesUI(modalContainer) {
        const poiTypes = modalContainer.querySelectorAll('.poi-type');
        
        poiTypes.forEach(poiTypeElement => {
            const poiType = poiTypeElement.getAttribute('data-type');
            const likeButton = poiTypeElement.querySelector('.like-button');
            const dislikeButton = poiTypeElement.querySelector('.dislike-button');
            
            // Сбрасываем активное состояние всех кнопок
            poiTypeElement.querySelectorAll('button').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Устанавливаем активное состояние в зависимости от предпочтений
            if (this.preferences.liked.includes(poiType)) {
                likeButton.classList.add('active');
            } else if (this.preferences.disliked.includes(poiType)) {
                dislikeButton.classList.add('active');
            }
        });
    }
    
    /**
     * Сохранение предпочтений пользователя на сервере
     */
    async savePreferences(modalContainer) {
        // Проверяем, авторизован ли пользователь
        if (!window.authModule || !window.authModule.isAuthenticated()) {
            alert('Необходимо войти в систему для сохранения предпочтений');
            return;
        }
        
        const userId = window.authModule.getCurrentUser().id;
        
        try {
            // Получаем новые предпочтения из UI
            const newPreferences = {
                liked: [],
                disliked: []
            };
            
            const poiTypes = modalContainer.querySelectorAll('.poi-type');
            poiTypes.forEach(poiTypeElement => {
                const poiType = poiTypeElement.getAttribute('data-type');
                const likeButton = poiTypeElement.querySelector('.like-button');
                const dislikeButton = poiTypeElement.querySelector('.dislike-button');
                
                if (likeButton.classList.contains('active')) {
                    newPreferences.liked.push(poiType);
                } else if (dislikeButton.classList.contains('active')) {
                    newPreferences.disliked.push(poiType);
                }
            });
            
            // Удаляем старые предпочтения
            await fetch(`/api/users/${userId}/preferences`, {
                method: 'DELETE'
            });
            
            // Сохраняем предпочтения "нравится"
            for (const poiType of newPreferences.liked) {
                await fetch(`/api/users/${userId}/preferences`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        poiType: poiType,
                        preferenceType: 'LIKE'
                    })
                });
            }
            
            // Сохраняем предпочтения "не нравится"
            for (const poiType of newPreferences.disliked) {
                await fetch(`/api/users/${userId}/preferences`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        poiType: poiType,
                        preferenceType: 'DISLIKE'
                    })
                });
            }
            
            // Обновляем локальные предпочтения
            this.preferences = newPreferences;
            
            // Обновляем UI
            this.updateUI();
            
            console.log('Предпочтения успешно сохранены:', this.preferences);
        } catch (error) {
            console.error('Ошибка при сохранении предпочтений:', error);
            alert('Произошла ошибка при сохранении предпочтений');
        }
    }
    
    /**
     * Проверка, нравится ли пользователю данный тип POI
     */
    isLiked(poiType) {
        return this.preferences.liked.includes(poiType);
    }
    
    /**
     * Проверка, не нравится ли пользователю данный тип POI
     */
    isDisliked(poiType) {
        return this.preferences.disliked.includes(poiType);
    }
    
    /**
     * Получение всех предпочтений пользователя
     */
    getPreferences() {
        return this.preferences;
    }
}

// Инициализируем модуль при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.userPreferencesModule = new UserPreferencesModule();
}); 