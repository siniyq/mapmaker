package com.mapmaker.service;

import com.mapmaker.model.User;
import com.mapmaker.model.UserPreference;
import com.mapmaker.model.UserPreference.PreferenceType;
import com.mapmaker.repository.UserPreferenceRepository;
import com.mapmaker.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class UserPreferenceService {

    private final UserPreferenceRepository preferenceRepository;
    private final UserRepository userRepository;

    @Autowired
    public UserPreferenceService(UserPreferenceRepository preferenceRepository, UserRepository userRepository) {
        this.preferenceRepository = preferenceRepository;
        this.userRepository = userRepository;
    }

    /**
     * Добавление или обновление предпочтения
     */
    @Transactional
    public UserPreference setPreference(Long userId, String poiType, PreferenceType preferenceType) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден"));
        
        // Проверяем, есть ли уже такое предпочтение
        Optional<UserPreference> existingPreference = preferenceRepository.findByUserAndPoiType(user, poiType);
        
        if (existingPreference.isPresent()) {
            // Обновляем существующее предпочтение
            UserPreference preference = existingPreference.get();
            preference.setPreferenceType(preferenceType);
            return preferenceRepository.save(preference);
        } else {
            // Создаем новое предпочтение
            UserPreference preference = new UserPreference(user, poiType, preferenceType);
            return preferenceRepository.save(preference);
        }
    }

    /**
     * Получение всех предпочтений пользователя
     */
    public List<UserPreference> getUserPreferences(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден"));
        
        return preferenceRepository.findByUser(user);
    }

    /**
     * Получение предпочтений пользователя определенного типа (нравится/не нравится)
     */
    public List<UserPreference> getUserPreferencesByType(Long userId, PreferenceType preferenceType) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден"));
        
        return preferenceRepository.findByUserAndPreferenceType(user, preferenceType);
    }

    /**
     * Получение типов POI, которые нравятся пользователю
     */
    public List<String> getLikedPoiTypes(Long userId) {
        return getUserPreferencesByType(userId, PreferenceType.LIKE)
                .stream()
                .map(UserPreference::getPoiType)
                .collect(Collectors.toList());
    }

    /**
     * Получение типов POI, которые не нравятся пользователю
     */
    public List<String> getDislikedPoiTypes(Long userId) {
        return getUserPreferencesByType(userId, PreferenceType.DISLIKE)
                .stream()
                .map(UserPreference::getPoiType)
                .collect(Collectors.toList());
    }

    /**
     * Удаление предпочтения
     */
    @Transactional
    public void removePreference(Long userId, String poiType) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден"));
        
        Optional<UserPreference> preference = preferenceRepository.findByUserAndPoiType(user, poiType);
        
        preference.ifPresent(preferenceRepository::delete);
    }

    /**
     * Удаление всех предпочтений пользователя
     */
    @Transactional
    public void removeAllPreferences(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден"));
        
        preferenceRepository.deleteByUser(user);
    }
} 