var map = L.map('map').setView([55.1904, 30.2049], 13);
var markersLayer = L.layerGroup();

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

function showLayer(type) {
    if (window.currentLayers) {
        window.currentLayers.forEach(layer => map.removeLayer(layer));
    }
    markersLayer.clearLayers();
    window.currentLayers = [];

    fetch(`/heatmap/${type}`)
        .then(response => response.json())
        .then(data => {
            console.log('Received data:', data);
            
            // Разделяем точки по рейтингу
            const goodPoints = [];
            const mediumPoints = [];
            const badPoints = [];
            
            data.features.forEach(feature => {
                const lat = feature.geometry.coordinates[1];
                const lng = feature.geometry.coordinates[0];
                const rating = feature.properties.rating;
                
                if (rating >= 4.0) {
                    goodPoints.push([lat, lng, 1]);
                } else if (rating >= 3.0 && rating < 4.0) {
                    mediumPoints.push([lat, lng, 1]);
                } else {
                    badPoints.push([lat, lng, 1]);
                }
            });

            // Создаем отдельные тепловые карты для каждой категории
            if (goodPoints.length > 0) {
                const goodHeat = L.heatLayer(goodPoints, {
                    radius: 25,
                    blur: 20,
                    maxZoom: 18,
                    max: 1.0,
                    minOpacity: 0.9,
                    gradient: {
                        0.4: '#00ff00',
                        1.0: '#00ff00'
                    }
                }).addTo(map);
                window.currentLayers.push(goodHeat);
            }

            if (mediumPoints.length > 0) {
                const mediumHeat = L.heatLayer(mediumPoints, {
                    radius: 25,
                    blur: 20,
                    maxZoom: 18,
                    max: 1.0,
                    minOpacity: 0.8,
                    gradient: {
                        0.4: '#ffff00',
                        1.0: '#ffff00'
                    }
                }).addTo(map);
                window.currentLayers.push(mediumHeat);
            }

            if (badPoints.length > 0) {
                const badHeat = L.heatLayer(badPoints, {
                    radius: 25,
                    blur: 20,
                    maxZoom: 18,
                    max: 1.0,
                    minOpacity: 0.6,
                    gradient: {
                        0.4: '#ff0000',
                        1.0: '#ff0000'
                    }
                }).addTo(map);
                window.currentLayers.push(badHeat);
            }
        })
        .catch(error => console.error('Error:', error));
}

function showAllMarkers() {
    console.log('Вызвана функция showAllMarkers');
    
    if (window.currentLayers) {
        window.currentLayers.forEach(layer => map.removeLayer(layer));
    }
    markersLayer.clearLayers();
    window.currentLayers = [];

    fetch('/heatmap/all')
        .then(response => response.json())
        .then(data => {
            console.log('Получены данные:', data);
            
            // Разделяем точки по рейтингу
            const goodPoints = [];
            const mediumPoints = [];
            const badPoints = [];
            
            data.features.forEach(feature => {
                const lat = feature.geometry.coordinates[1];
                const lng = feature.geometry.coordinates[0];
                const rating = feature.properties.rating;
                
                if (rating >= 4.0) {
                    goodPoints.push([lat, lng, 1]);
                } else if (rating >= 3.0 && rating < 4.0) {
                    mediumPoints.push([lat, lng, 1]);
                } else {
                    badPoints.push([lat, lng, 1]);
                }
            });

            // Создаем отдельные тепловые карты для каждой категории
            if (goodPoints.length > 0) {
                const goodHeat = L.heatLayer(goodPoints, {
                    radius: 25,
                    blur: 20,
                    maxZoom: 18,
                    max: 1.0,
                    minOpacity: 0.9,
                    gradient: {
                        0.4: '#00ff00',
                        1.0: '#00ff00'
                    }
                }).addTo(map);
                window.currentLayers.push(goodHeat);
            }

            if (mediumPoints.length > 0) {
                const mediumHeat = L.heatLayer(mediumPoints, {
                    radius: 25,
                    blur: 20,
                    maxZoom: 18,
                    max: 1.0,
                    minOpacity: 0.8,
                    gradient: {
                        0.4: '#ffff00',
                        1.0: '#ffff00'
                    }
                }).addTo(map);
                window.currentLayers.push(mediumHeat);
            }

            if (badPoints.length > 0) {
                const badHeat = L.heatLayer(badPoints, {
                    radius: 25,
                    blur: 20,
                    maxZoom: 18,
                    max: 1.0,
                    minOpacity: 0.6,
                    gradient: {
                        0.4: '#ff0000',
                        1.0: '#ff0000'
                    }
                }).addTo(map);
                window.currentLayers.push(badHeat);
            }
        })
        .catch(error => console.error('Ошибка:', error));
}
