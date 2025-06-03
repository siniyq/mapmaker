/**
 * Модуль управления авторизацией пользователей
 */
class AuthManager {
    constructor() {
        this.init();
    }
    
    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.initAuthHandlers();
            this.checkAuthStatus();
            
            // Проверяем каждую секунду, не изменился ли статус авторизации
            setInterval(() => this.checkAuthStatus(), 1000);
        });
    }
    
    initAuthHandlers() {
        // Обработчик для кнопки "Сохраненные маршруты"
        const savedRoutesBtn = document.getElementById('saved-routes');
        if (savedRoutesBtn) {
            savedRoutesBtn.addEventListener('click', () => {
                if (window.personalizationModule) {
                    window.personalizationModule.showSavedRoutes();
                } else {
                    NeoDialog.alert('Ошибка', 'Модуль персонализации не загружен');
                }
            });
        }
    }
    
    // Функция проверки статуса авторизации
    checkAuthStatus() {
        console.log('Выполняется проверка статуса авторизации...');
        
        // Проверяем localStorage на наличие данных пользователя
        const userDataStr = localStorage.getItem('userData');
        
        const authContainer = document.getElementById('auth-container');
        const userProfile = document.getElementById('user-profile');
        const userName = document.getElementById('user-name');
        
        if (userDataStr) {
            try {
                const userData = JSON.parse(userDataStr);
                
                // Если данные о пользователе найдены, показываем профиль
                if (authContainer) {
                    authContainer.style.display = 'none';
                }
                
                if (userProfile) {
                    userProfile.style.display = 'block';
                }
                
                if (userName) {
                    // Используем имя или фамилию, если они есть, иначе имя пользователя
                    let displayName = userData.username || 'Пользователь';
                    if (userData.firstName && userData.firstName.trim() !== '') {
                        displayName = userData.firstName;
                        if (userData.lastName && userData.lastName.trim() !== '') {
                            displayName += ' ' + userData.lastName;
                        }
                    }
                    userName.textContent = displayName;
                    userName.style.fontWeight = 'bold';
                    userName.style.color = '#4285f4';
                }
                
                console.log('Пользователь авторизован:', userData.username);
                
                // Устанавливаем статус авторизации для personalizationModule
                if (window.personalizationModule) {
                    window.personalizationModule.isAuthenticated = true;
                    window.personalizationModule.userProfile = userData;
                }
                
                return true;
            } catch (e) {
                console.error('Ошибка при загрузке данных пользователя:', e);
                localStorage.removeItem('userData'); // Удаляем поврежденные данные
            }
        }
        
        // Если данные о пользователе не найдены или произошла ошибка, показываем форму логина
        if (authContainer) {
            authContainer.style.display = 'block';
        }
        
        if (userProfile) {
            userProfile.style.display = 'none';
        }
        
        return false;
    }
    
    // Функция выхода из системы
    logout() {
        console.log('Выполняется выход из системы...');
        
        // Удаляем данные пользователя из localStorage
        localStorage.removeItem('userData');
        
        // Обновляем интерфейс напрямую
        const authContainer = document.getElementById('auth-container');
        const userProfile = document.getElementById('user-profile');
        
        if (authContainer) {
            authContainer.style.display = 'block';
            console.log('Контейнер авторизации показан');
        }
        
        if (userProfile) {
            userProfile.style.display = 'none';
            console.log('Профиль пользователя скрыт');
        }
        
        // Обновляем статус в модуле персонализации
        if (window.personalizationModule) {
            window.personalizationModule.isAuthenticated = false;
            window.personalizationModule.userProfile = null;
            console.log('Модуль персонализации обновлен');
        }
        
        // Показываем уведомление
        NeoDialog.alert('Уведомление', 'Вы вышли из системы');
        
        // Запрос на сервер для завершения сессии
        fetch('/api/users/logout', { method: 'POST' })
            .then(response => console.log('Серверная сессия завершена'))
            .catch(error => console.error('Ошибка при выходе из системы:', error));
    }
    
    // Глобальная функция для отладки состояния авторизации
    debugAuth() {
        const userDataStr = localStorage.getItem('userData');
        console.log('Debug - userData в localStorage:', userDataStr);
        
        const authContainer = document.getElementById('auth-container');
        console.log('Debug - authContainer:', authContainer);
        console.log('Debug - authContainer display:', authContainer ? authContainer.style.display : 'element not found');
        
        const userProfile = document.getElementById('user-profile');
        console.log('Debug - userProfile:', userProfile);
        console.log('Debug - userProfile display:', userProfile ? userProfile.style.display : 'element not found');
        
        const userName = document.getElementById('user-name');
        console.log('Debug - userName:', userName);
        console.log('Debug - userName content:', userName ? userName.textContent : 'element not found');
        
        console.log('Debug - isAuthenticated:', window.personalizationModule ? window.personalizationModule.isAuthenticated : 'module not found');
    }
}

// Инициализируем менеджер авторизации
const authManager = new AuthManager();

// Экспортируем функции для использования в HTML
window.logout = () => authManager.logout();
window.debugAuth = () => authManager.debugAuth();
window.authManager = authManager; 