-- Обновление геометрических данных в поле location на основе latitude и longitude
UPDATE points_of_interest
SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
WHERE location IS NULL AND latitude IS NOT NULL AND longitude IS NOT NULL;

-- Проверка, сколько записей было обновлено
SELECT COUNT(*) as updated_records FROM points_of_interest WHERE location IS NOT NULL;

-- Проверка, сколько записей все еще не имеют location
SELECT COUNT(*) as records_without_location FROM points_of_interest WHERE location IS NULL; 