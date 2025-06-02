package com.mapmaker.repository;

import com.mapmaker.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    // Поиск пользователя по имени пользователя
    Optional<User> findByUsername(String username);
    
    // Поиск пользователя по электронной почте
    Optional<User> findByEmail(String email);
    
    // Проверка существования пользователя по имени пользователя
    boolean existsByUsername(String username);
    
    // Проверка существования пользователя по электронной почте
    boolean existsByEmail(String email);
} 