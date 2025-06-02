package com.mapmaker.controller;

import com.mapmaker.model.UserPreference;
import com.mapmaker.model.UserPreference.PreferenceType;
import com.mapmaker.service.UserPreferenceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users/{userId}/preferences")
public class UserPreferenceController {

    private final UserPreferenceService preferenceService;

    @Autowired
    public UserPreferenceController(UserPreferenceService preferenceService) {
        this.preferenceService = preferenceService;
    }

    @GetMapping
    public ResponseEntity<?> getUserPreferences(@PathVariable Long userId) {
        try {
            List<UserPreference> preferences = preferenceService.getUserPreferences(userId);
            
            // Преобразуем в формат, удобный для клиента
            List<Map<String, Object>> response = preferences.stream()
                    .map(pref -> {
                        Map<String, Object> map = new HashMap<>();
                        map.put("id", pref.getId());
                        map.put("poiType", pref.getPoiType());
                        map.put("preferenceType", pref.getPreferenceType().name());
                        return map;
                    })
                    .collect(Collectors.toList());
            
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Произошла ошибка при получении предпочтений пользователя"));
        }
    }

    @GetMapping("/liked")
    public ResponseEntity<?> getLikedPreferences(@PathVariable Long userId) {
        try {
            List<String> likedTypes = preferenceService.getLikedPoiTypes(userId);
            return ResponseEntity.ok(likedTypes);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Произошла ошибка при получении предпочтений пользователя"));
        }
    }

    @GetMapping("/disliked")
    public ResponseEntity<?> getDislikedPreferences(@PathVariable Long userId) {
        try {
            List<String> dislikedTypes = preferenceService.getDislikedPoiTypes(userId);
            return ResponseEntity.ok(dislikedTypes);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Произошла ошибка при получении предпочтений пользователя"));
        }
    }

    @PostMapping
    public ResponseEntity<?> setPreference(@PathVariable Long userId, @RequestBody Map<String, String> request) {
        try {
            String poiType = request.get("poiType");
            String preferenceTypeStr = request.get("preferenceType");
            
            if (poiType == null || preferenceTypeStr == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Необходимо указать poiType и preferenceType"));
            }
            
            PreferenceType preferenceType;
            try {
                preferenceType = PreferenceType.valueOf(preferenceTypeStr.toUpperCase());
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Неверное значение preferenceType. Допустимые значения: LIKE, DISLIKE"));
            }
            
            UserPreference preference = preferenceService.setPreference(userId, poiType, preferenceType);
            
            Map<String, Object> response = new HashMap<>();
            response.put("id", preference.getId());
            response.put("poiType", preference.getPoiType());
            response.put("preferenceType", preference.getPreferenceType().name());
            
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Произошла ошибка при установке предпочтения"));
        }
    }

    @DeleteMapping("/{poiType}")
    public ResponseEntity<?> removePreference(@PathVariable Long userId, @PathVariable String poiType) {
        try {
            preferenceService.removePreference(userId, poiType);
            return ResponseEntity.ok(Map.of("message", "Предпочтение успешно удалено"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Произошла ошибка при удалении предпочтения"));
        }
    }

    @DeleteMapping
    public ResponseEntity<?> removeAllPreferences(@PathVariable Long userId) {
        try {
            preferenceService.removeAllPreferences(userId);
            return ResponseEntity.ok(Map.of("message", "Все предпочтения успешно удалены"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Произошла ошибка при удалении предпочтений"));
        }
    }
} 