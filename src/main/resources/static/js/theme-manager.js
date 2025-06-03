/**
 * Модуль управления темами интерфейса
 */
class ThemeManager {
    constructor() {
        this.lightMapUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        this.darkMapUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
        
        this.init();
    }
    
    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.initThemeToggle();
            this.applySavedTheme();
        });
    }
    
    initThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle');
        const themeIcon = document.getElementById('theme-icon');
        const themeText = document.getElementById('theme-text');
        
        if (!themeToggle) return;
        
        // Toggle theme
        themeToggle.addEventListener('click', () => {
            if (document.body.classList.contains('dark-theme')) {
                // Switch to light theme
                document.body.classList.remove('dark-theme');
                themeIcon.textContent = '🌙';
                themeText.textContent = 'Темная тема';
                localStorage.setItem('mapmaker-theme', 'light');
                this.setMapStyle(false); // Устанавливаем светлую карту
            } else {
                // Switch to dark theme
                document.body.classList.add('dark-theme');
                themeIcon.textContent = '☀️';
                themeText.textContent = 'Светлая тема';
                localStorage.setItem('mapmaker-theme', 'dark');
                this.setMapStyle(true); // Устанавливаем темную карту
            }
        });
    }
    
    applySavedTheme() {
        const savedTheme = localStorage.getItem('mapmaker-theme');
        const themeIcon = document.getElementById('theme-icon');
        const themeText = document.getElementById('theme-text');
        
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
            if (themeIcon) themeIcon.textContent = '☀️';
            if (themeText) themeText.textContent = 'Светлая тема';
        }
        
        // Устанавливаем стиль карты
        this.setMapStyle(savedTheme === 'dark');
    }
    
    setMapStyle(isDark) {
        if (!window.map || !window.tileLayer) return;
        
        if (window.tileLayer) {
            window.map.removeLayer(window.tileLayer);
        }
        
        const mapUrl = isDark ? this.darkMapUrl : this.lightMapUrl;
        const attribution = isDark 
            ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
            
        window.tileLayer = L.tileLayer(mapUrl, {
            maxZoom: 19,
            attribution: attribution
        }).addTo(window.map);
    }
}

// Инициализируем менеджер тем
const themeManager = new ThemeManager();

// Экспортируем для использования в других модулях
window.themeManager = themeManager; 