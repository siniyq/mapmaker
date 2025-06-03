/**
 * Неоморфные модальные диалоги
 */
class NeoDialog {
    static overlay = null;
    static dialog = null;
    
    static init() {
        // Создаем элементы диалога если их нет
        if (!this.overlay) {
            this.overlay = document.getElementById('neo-dialog-overlay');
            this.dialog = document.getElementById('neo-dialog');
        }
    }
    
    // Показ alert-диалога
    static alert(title, message, callback = null) {
        this.init();
        
        const content = `
            <div class="neo-dialog-header">
                <h3 class="neo-dialog-title">${title}</h3>
            </div>
            <div class="neo-dialog-content">${message}</div>
            <div class="neo-dialog-buttons">
                <button class="primary" id="neo-dialog-ok">ОК</button>
            </div>
        `;
        
        this.dialog.innerHTML = content;
        this.overlay.classList.add('active');
        
        const okButton = document.getElementById('neo-dialog-ok');
        if (okButton) {
            okButton.onclick = () => {
                this.close();
                if (callback) callback(true);
            };
            
            // Фокус на кнопке
            setTimeout(() => okButton.focus(), 100);
        }
        
        // Обработчик Esc для закрытия
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                this.close();
                if (callback) callback(true);
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }
    
    // Показ confirm-диалога
    static confirm(title, message, callback) {
        this.init();
        
        const content = `
            <div class="neo-dialog-header">
                <h3 class="neo-dialog-title">${title}</h3>
            </div>
            <div class="neo-dialog-content">${message}</div>
            <div class="neo-dialog-buttons">
                <button class="secondary" id="neo-dialog-cancel">Отмена</button>
                <button class="primary" id="neo-dialog-confirm">Подтвердить</button>
            </div>
        `;
        
        this.dialog.innerHTML = content;
        this.overlay.classList.add('active');
        
        const cancelButton = document.getElementById('neo-dialog-cancel');
        const confirmButton = document.getElementById('neo-dialog-confirm');
        
        // Очистка обработчиков при закрытии
        const clearHandlers = () => {
            if (cancelButton) cancelButton.onclick = null;
            if (confirmButton) confirmButton.onclick = null;
            document.removeEventListener('keydown', escHandler);
        };
        
        if (cancelButton) {
            cancelButton.onclick = () => {
                clearHandlers();
                this.close();
                callback(false);
            };
        }
        
        if (confirmButton) {
            confirmButton.onclick = () => {
                clearHandlers();
                this.close();
                callback(true);
            };
            
            // Фокус на кнопке подтверждения
            setTimeout(() => confirmButton.focus(), 100);
        }
        
        // Обработчик Esc для закрытия
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                clearHandlers();
                this.close();
                callback(false);
            }
        };
        document.addEventListener('keydown', escHandler);
    }
    
    // Показ prompt-диалога
    static prompt(title, message, defaultValue = '', callback) {
        this.init();
        
        const content = `
            <div class="neo-dialog-header">
                <h3 class="neo-dialog-title">${title}</h3>
            </div>
            <div class="neo-dialog-content">
                ${message}
                <div class="neo-input-group">
                    <input type="text" id="neo-dialog-input" class="neo-input" value="${defaultValue}">
                </div>
            </div>
            <div class="neo-dialog-buttons">
                <button class="secondary" id="neo-dialog-cancel">Отмена</button>
                <button class="primary" id="neo-dialog-confirm">Подтвердить</button>
            </div>
        `;
        
        this.dialog.innerHTML = content;
        this.overlay.classList.add('active');
        
        const inputEl = document.getElementById('neo-dialog-input');
        const cancelButton = document.getElementById('neo-dialog-cancel');
        const confirmButton = document.getElementById('neo-dialog-confirm');
        
        // Очистка обработчиков при закрытии
        const clearHandlers = () => {
            if (inputEl) inputEl.onkeydown = null;
            if (cancelButton) cancelButton.onclick = null;
            if (confirmButton) confirmButton.onclick = null;
            document.removeEventListener('keydown', escHandler);
        };
        
        if (inputEl) {
            setTimeout(() => inputEl.focus(), 100);
            
            inputEl.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    clearHandlers();
                    this.close();
                    callback(inputEl.value);
                }
            };
        }
        
        if (cancelButton) {
            cancelButton.onclick = () => {
                clearHandlers();
                this.close();
                callback(null);
            };
        }
        
        if (confirmButton) {
            confirmButton.onclick = () => {
                clearHandlers();
                this.close();
                callback(inputEl ? inputEl.value : null);
            };
        }
        
        // Обработчик Esc для закрытия
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                clearHandlers();
                this.close();
                callback(null);
            }
        };
        document.addEventListener('keydown', escHandler);
    }
    
    // Закрытие диалога
    static close() {
        if (this.overlay) {
            this.overlay.classList.remove('active');
        }
        
        // Задержка для анимации
        setTimeout(() => {
            // Полная очистка содержимого
            if (this.dialog) {
                // Удаляем все обработчики событий с элементов внутри диалога
                const buttons = this.dialog.querySelectorAll('button');
                buttons.forEach(button => {
                    button.onclick = null;
                });
                
                const inputs = this.dialog.querySelectorAll('input');
                inputs.forEach(input => {
                    input.onkeydown = null;
                });
                
                // Очищаем HTML
                this.dialog.innerHTML = '';
                
                // Проверяем наличие других модальных окон
                const activeModals = document.querySelectorAll('.neo-modal-container.active, .neo-dialog-overlay.active');
                console.log(`Активных модальных окон: ${activeModals.length}`);
                
                // Удаляем все "зависшие" пустые диалоги
                const emptyDialogs = document.querySelectorAll('.neo-dialog:empty');
                emptyDialogs.forEach(dialog => {
                    const overlay = dialog.closest('.neo-dialog-overlay');
                    if (overlay) {
                        overlay.classList.remove('active');
                        console.log('Удален зависший пустой диалог');
                    }
                });
            }
        }, 300);
    }
}

// Замена стандартных диалогов на неоморфные
if (typeof window !== 'undefined') {
    window.originalAlert = window.alert;
    window.alert = function(message) {
        NeoDialog.alert('Внимание', message);
    };
    
    window.originalConfirm = window.confirm;
    window.confirm = function(message) {
        // Используем Promise для синхронного поведения
        return new Promise(resolve => {
            NeoDialog.confirm('Подтверждение', message, result => {
                resolve(result);
            });
        });
    };
    
    window.originalPrompt = window.prompt;
    window.prompt = function(message, defaultValue = '') {
        return new Promise(resolve => {
            NeoDialog.prompt('Ввод данных', message, defaultValue, result => {
                resolve(result);
            });
        });
    };
}

// Экспортируем NeoDialog в глобальную область видимости
window.NeoDialog = NeoDialog; 