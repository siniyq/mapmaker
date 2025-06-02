/**
 * Модуль аутентификации для MapMaker
 */
class AuthModule {
    constructor() {
        this.userProfile = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        
        // Загружаем профиль пользователя из localStorage
        this.loadUserProfile();
        
        this.initialized = true;
        console.log('AuthModule инициализирован');
    }

    loadUserProfile() {
        try {
            const userDataStr = localStorage.getItem('userData');
            if (userDataStr) {
                this.userProfile = JSON.parse(userDataStr);
                console.log('Профиль пользователя загружен:', this.userProfile.username);
            }
        } catch (e) {
            console.error('Ошибка при загрузке профиля пользователя:', e);
            this.userProfile = null;
        }
    }

    isAuthenticated() {
        return !!this.userProfile;
    }

    login(username, password) {
        return fetch('/api/users/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || 'Ошибка при входе');
                });
            }
            return response.json();
        })
        .then(data => {
            // Сохраняем данные пользователя
            this.userProfile = data;
            localStorage.setItem('userData', JSON.stringify(data));
            
            // Обновляем интерфейс
            this.updateUI();
            
            return data;
        });
    }

    register(username, email, password, firstName, lastName) {
        return fetch('/api/users/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                email: email,
                password: password,
                firstName: firstName,
                lastName: lastName
            })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || 'Ошибка при регистрации');
                });
            }
            return response.json();
        })
        .then(data => {
            // Автоматически входим после регистрации
            return this.login(username, password);
        });
    }

    logout() {
        // Удаляем данные пользователя
        this.userProfile = null;
        localStorage.removeItem('userData');
        
        // Обновляем интерфейс
        this.updateUI();
        
        // Отправляем запрос на сервер для завершения сессии
        return fetch('/api/users/logout', { method: 'POST' })
            .catch(error => console.error('Ошибка при выходе:', error));
    }

    updateUI() {
        // Обновляем UI в зависимости от статуса авторизации
        const authContainer = document.getElementById('auth-container');
        const userProfile = document.getElementById('user-profile');
        
        if (this.isAuthenticated()) {
            // Пользователь авторизован
            if (authContainer) authContainer.style.display = 'none';
            if (userProfile) {
                userProfile.style.display = 'block';
                const userName = document.getElementById('user-name');
                if (userName) {
                    userName.textContent = this.userProfile.firstName || this.userProfile.username;
                }
            }
            
            // Уведомляем о успешном входе
            console.log('Вход выполнен успешно:', this.userProfile.username);
        } else {
            // Пользователь не авторизован
            if (authContainer) authContainer.style.display = 'block';
            if (userProfile) userProfile.style.display = 'none';
        }
    }

    /**
     * Показать неоморфное модальное окно авторизации
     */
    showNeoAuthModal() {
        // Создаем модальное окно, если его еще нет
        let modalContainer = document.getElementById('auth-modal-container');
        
        if (!modalContainer) {
            modalContainer = document.createElement('div');
            modalContainer.id = 'auth-modal-container';
            modalContainer.className = 'neo-modal-container';
            
            modalContainer.innerHTML = `
                <div class="neo-modal">
                    <div class="neo-modal-header">
                        <h2>Вход / Регистрация</h2>
                        <button class="neo-close-button">&times;</button>
                    </div>
                    
                    <div class="auth-tabs" style="display: flex; margin-bottom: 20px;">
                        <button class="neo-button active" style="flex: 1; margin-right: 10px;" data-tab="login">Вход</button>
                        <button class="neo-button" style="flex: 1;" data-tab="register">Регистрация</button>
                    </div>
                    
                    <div class="auth-content">
                        <div class="tab-content active" id="login-tab">
                            <form id="login-form">
                                <div style="margin-bottom: 15px;">
                                    <label for="login-username" style="display: block; margin-bottom: 8px; color: var(--text-color);">Имя пользователя</label>
                                    <input type="text" id="login-username" required style="
                                        width: 100%;
                                        padding: 10px;
                                        border: none;
                                        background-color: var(--background);
                                        border-radius: 10px;
                                        box-shadow: inset 2px 2px 5px var(--shadow-dark), 
                                                    inset -2px -2px 5px var(--shadow-light);
                                        color: var(--text-color);
                                        font-size: 16px;
                                    ">
                                </div>
                                
                                <div style="margin-bottom: 20px;">
                                    <label for="login-password" style="display: block; margin-bottom: 8px; color: var(--text-color);">Пароль</label>
                                    <input type="password" id="login-password" required style="
                                        width: 100%;
                                        padding: 10px;
                                        border: none;
                                        background-color: var(--background);
                                        border-radius: 10px;
                                        box-shadow: inset 2px 2px 5px var(--shadow-dark), 
                                                    inset -2px -2px 5px var(--shadow-light);
                                        color: var(--text-color);
                                        font-size: 16px;
                                    ">
                                </div>
                                
                                <button type="submit" class="neo-button" style="
                                    background-color: var(--accent-color);
                                    color: white;
                                    text-align: center;
                                    font-weight: bold;
                                ">Войти</button>
                                
                                <div class="error-message" style="color: var(--danger-color); margin-top: 15px; text-align: center;"></div>
                            </form>
                        </div>
                        
                        <div class="tab-content" id="register-tab" style="display: none;">
                            <form id="register-form">
                                <div style="margin-bottom: 15px;">
                                    <label for="register-username" style="display: block; margin-bottom: 8px; color: var(--text-color);">Имя пользователя</label>
                                    <input type="text" id="register-username" required style="
                                        width: 100%;
                                        padding: 10px;
                                        border: none;
                                        background-color: var(--background);
                                        border-radius: 10px;
                                        box-shadow: inset 2px 2px 5px var(--shadow-dark), 
                                                    inset -2px -2px 5px var(--shadow-light);
                                        color: var(--text-color);
                                        font-size: 16px;
                                    ">
                                </div>
                                
                                <div style="margin-bottom: 15px;">
                                    <label for="register-email" style="display: block; margin-bottom: 8px; color: var(--text-color);">Email</label>
                                    <input type="email" id="register-email" required style="
                                        width: 100%;
                                        padding: 10px;
                                        border: none;
                                        background-color: var(--background);
                                        border-radius: 10px;
                                        box-shadow: inset 2px 2px 5px var(--shadow-dark), 
                                                    inset -2px -2px 5px var(--shadow-light);
                                        color: var(--text-color);
                                        font-size: 16px;
                                    ">
                                </div>
                                
                                <div style="margin-bottom: 15px;">
                                    <label for="register-password" style="display: block; margin-bottom: 8px; color: var(--text-color);">Пароль</label>
                                    <input type="password" id="register-password" required style="
                                        width: 100%;
                                        padding: 10px;
                                        border: none;
                                        background-color: var(--background);
                                        border-radius: 10px;
                                        box-shadow: inset 2px 2px 5px var(--shadow-dark), 
                                                    inset -2px -2px 5px var(--shadow-light);
                                        color: var(--text-color);
                                        font-size: 16px;
                                    ">
                                </div>
                                
                                <div style="margin-bottom: 15px;">
                                    <label for="register-first-name" style="display: block; margin-bottom: 8px; color: var(--text-color);">Имя</label>
                                    <input type="text" id="register-first-name" style="
                                        width: 100%;
                                        padding: 10px;
                                        border: none;
                                        background-color: var(--background);
                                        border-radius: 10px;
                                        box-shadow: inset 2px 2px 5px var(--shadow-dark), 
                                                    inset -2px -2px 5px var(--shadow-light);
                                        color: var(--text-color);
                                        font-size: 16px;
                                    ">
                                </div>
                                
                                <div style="margin-bottom: 20px;">
                                    <label for="register-last-name" style="display: block; margin-bottom: 8px; color: var(--text-color);">Фамилия</label>
                                    <input type="text" id="register-last-name" style="
                                        width: 100%;
                                        padding: 10px;
                                        border: none;
                                        background-color: var(--background);
                                        border-radius: 10px;
                                        box-shadow: inset 2px 2px 5px var(--shadow-dark), 
                                                    inset -2px -2px 5px var(--shadow-light);
                                        color: var(--text-color);
                                        font-size: 16px;
                                    ">
                                </div>
                                
                                <button type="submit" class="neo-button" style="
                                    background-color: var(--accent-color);
                                    color: white;
                                    text-align: center;
                                    font-weight: bold;
                                ">Зарегистрироваться</button>
                                
                                <div class="error-message" style="color: var(--danger-color); margin-top: 15px; text-align: center;"></div>
                            </form>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modalContainer);
            
            // Настраиваем обработчики событий для модального окна
            const closeButton = modalContainer.querySelector('.neo-close-button');
            closeButton.addEventListener('click', () => {
                modalContainer.remove();
            });
            
            // Закрытие модального окна при клике вне его
            modalContainer.addEventListener('click', (e) => {
                if (e.target === modalContainer) {
                    modalContainer.remove();
                }
            });
            
            // Переключение вкладок
            const tabButtons = modalContainer.querySelectorAll('.auth-tabs button');
            tabButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const tabName = button.getAttribute('data-tab');
                    
                    // Активируем кнопку вкладки
                    tabButtons.forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');
                    
                    // Показываем содержимое вкладки
                    const tabContents = modalContainer.querySelectorAll('.tab-content');
                    tabContents.forEach(tab => tab.style.display = 'none');
                    modalContainer.querySelector(`#${tabName}-tab`).style.display = 'block';
                });
            });
            
            // Обработка формы входа
            const loginForm = modalContainer.querySelector('#login-form');
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const username = document.getElementById('login-username').value;
                const password = document.getElementById('login-password').value;
                
                this.login(username, password)
                    .then(() => {
                        modalContainer.remove();
                    })
                    .catch(error => {
                        const errorMessage = loginForm.querySelector('.error-message');
                        errorMessage.textContent = error.message;
                    });
            });
            
            // Обработка формы регистрации
            const registerForm = modalContainer.querySelector('#register-form');
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const username = document.getElementById('register-username').value;
                const email = document.getElementById('register-email').value;
                const password = document.getElementById('register-password').value;
                const firstName = document.getElementById('register-first-name').value;
                const lastName = document.getElementById('register-last-name').value;
                
                this.register(username, email, password, firstName, lastName)
                    .then(() => {
                        modalContainer.remove();
                    })
                    .catch(error => {
                        const errorMessage = registerForm.querySelector('.error-message');
                        errorMessage.textContent = error.message;
                    });
            });
        }
    }
}

// Создаем глобальный экземпляр модуля аутентификации
window.authModule = new AuthModule();

// Инициализируем модуль при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    window.authModule.init();
}); 