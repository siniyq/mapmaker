package com.mapmaker.repository;

import com.mapmaker.model.User;
import com.mapmaker.model.UserPreference;
import com.mapmaker.model.UserPreference.PreferenceType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserPreferenceRepository extends JpaRepository<UserPreference, Long> {
    
    // Поиск всех предпочтений пользователя
    List<UserPreference> findByUser(User user);
    
    // Поиск предпочтений пользователя определенного типа (нравится/не нравится)
    List<UserPreference> findByUserAndPreferenceType(User user, PreferenceType preferenceType);
    
    // Поиск конкретного предпочтения пользователя по типу POI
    Optional<UserPreference> findByUserAndPoiType(User user, String poiType);
    
    // Проверка существования предпочтения у пользователя
    boolean existsByUserAndPoiType(User user, String poiType);
    
    // Удаление всех предпочтений пользователя
    void deleteByUser(User user);
} 