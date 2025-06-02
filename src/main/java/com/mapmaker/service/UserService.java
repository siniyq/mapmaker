package com.mapmaker.service;

import com.mapmaker.model.User;
import com.mapmaker.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Регистрация нового пользователя
     */
    @Transactional
    public User registerUser(String username, String email, String password, String firstName, String lastName) {
        // Проверяем, существует ли пользователь с таким именем
        if (userRepository.existsByUsername(username)) {
            throw new IllegalArgumentException("Пользователь с именем " + username + " уже существует");
        }
        
        // Проверяем, существует ли пользователь с такой почтой
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Пользователь с почтой " + email + " уже существует");
        }
        
        // Создаем нового пользователя
        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password)); // Шифруем пароль
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setCreatedAt(LocalDateTime.now());
        
        return userRepository.save(user);
    }

    /**
     * Аутентификация пользователя
     */
    public Optional<User> authenticateUser(String username, String password) {
        return userRepository.findByUsername(username)
                .filter(user -> passwordEncoder.matches(password, user.getPassword()))
                .map(user -> {
                    // Обновляем время последнего входа
                    user.setLastLogin(LocalDateTime.now());
                    return userRepository.save(user);
                });
    }

    /**
     * Обновление данных пользователя
     */
    @Transactional
    public User updateUserProfile(Long userId, String firstName, String lastName, String email) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден"));
        
        // Если меняется email, проверяем его уникальность
        if (email != null && !email.equals(user.getEmail()) && userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Пользователь с почтой " + email + " уже существует");
        }
        
        // Обновляем данные пользователя
        if (firstName != null) user.setFirstName(firstName);
        if (lastName != null) user.setLastName(lastName);
        if (email != null) user.setEmail(email);
        
        return userRepository.save(user);
    }

    /**
     * Изменение пароля пользователя
     */
    @Transactional
    public void changeUserPassword(Long userId, String oldPassword, String newPassword) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден"));
        
        // Проверяем старый пароль
        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            throw new IllegalArgumentException("Неверный текущий пароль");
        }
        
        // Обновляем пароль
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    /**
     * Получение пользователя по ID
     */
    public Optional<User> getUserById(Long userId) {
        return userRepository.findById(userId);
    }

    /**
     * Получение пользователя по имени
     */
    public Optional<User> getUserByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    /**
     * Получение всех пользователей
     */
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    /**
     * Удаление пользователя
     */
    @Transactional
    public void deleteUser(Long userId) {
        userRepository.deleteById(userId);
    }
} 