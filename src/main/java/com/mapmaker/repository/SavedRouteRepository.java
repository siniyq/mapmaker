package com.mapmaker.repository;

import com.mapmaker.model.SavedRoute;
import com.mapmaker.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SavedRouteRepository extends JpaRepository<SavedRoute, Long> {
    
    // Поиск всех маршрутов пользователя
    List<SavedRoute> findByUser(User user);
    
    // Поиск всех маршрутов пользователя, отсортированных по дате создания (сначала новые)
    List<SavedRoute> findByUserOrderByCreatedAtDesc(User user);
    
    // Поиск маршрутов по типу профиля (например, только пешие маршруты)
    List<SavedRoute> findByUserAndProfile(User user, String profile);
    
    // Поиск маршрутов с названием, содержащим определенный текст
    List<SavedRoute> findByUserAndNameContainingIgnoreCase(User user, String nameFragment);
    
    // Удаление всех маршрутов пользователя
    void deleteByUser(User user);
} 