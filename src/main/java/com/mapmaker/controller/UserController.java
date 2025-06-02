package com.mapmaker.controller;

import com.mapmaker.model.User;
import com.mapmaker.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")
public class UserController {
    
    // Эндпоинт для проверки доступности сервиса авторизации
    @GetMapping("/auth-status")
    public ResponseEntity<?> checkAuthStatus() {
        return ResponseEntity.ok(Map.of(
            "status", "available",
            "message", "Сервис авторизации доступен"
        ));
    }

    private final UserService userService;

    @Autowired
    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody Map<String, String> request) {
        try {
            String username = request.get("username");
            String email = request.get("email");
            String password = request.get("password");
            String firstName = request.get("firstName");
            String lastName = request.get("lastName");
            
            User user = userService.registerUser(username, email, password, firstName, lastName);
            
            Map<String, Object> response = new HashMap<>();
            response.put("id", user.getId());
            response.put("username", user.getUsername());
            response.put("email", user.getEmail());
            response.put("firstName", user.getFirstName());
            response.put("lastName", user.getLastName());
            
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Произошла ошибка при регистрации"));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request) {
        try {
            String username = request.get("username");
            String password = request.get("password");
            
            Optional<User> userOptional = userService.authenticateUser(username, password);
            
            if (userOptional.isPresent()) {
                User user = userOptional.get();
                
                Map<String, Object> response = new HashMap<>();
                response.put("id", user.getId());
                response.put("username", user.getUsername());
                response.put("email", user.getEmail());
                response.put("firstName", user.getFirstName());
                response.put("lastName", user.getLastName());
                
                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.badRequest().body(Map.of("error", "Неверное имя пользователя или пароль"));
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Произошла ошибка при входе"));
        }
    }

    @GetMapping("/{userId}")
    public ResponseEntity<?> getUserProfile(@PathVariable Long userId) {
        try {
            Optional<User> userOptional = userService.getUserById(userId);
            
            if (userOptional.isPresent()) {
                User user = userOptional.get();
                
                Map<String, Object> response = new HashMap<>();
                response.put("id", user.getId());
                response.put("username", user.getUsername());
                response.put("email", user.getEmail());
                response.put("firstName", user.getFirstName());
                response.put("lastName", user.getLastName());
                
                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Произошла ошибка при получении профиля"));
        }
    }

    @PutMapping("/{userId}")
    public ResponseEntity<?> updateUserProfile(@PathVariable Long userId, @RequestBody Map<String, String> request) {
        try {
            String firstName = request.get("firstName");
            String lastName = request.get("lastName");
            String email = request.get("email");
            
            User user = userService.updateUserProfile(userId, firstName, lastName, email);
            
            Map<String, Object> response = new HashMap<>();
            response.put("id", user.getId());
            response.put("username", user.getUsername());
            response.put("email", user.getEmail());
            response.put("firstName", user.getFirstName());
            response.put("lastName", user.getLastName());
            
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Произошла ошибка при обновлении профиля"));
        }
    }

    @PutMapping("/{userId}/password")
    public ResponseEntity<?> changePassword(@PathVariable Long userId, @RequestBody Map<String, String> request) {
        try {
            String oldPassword = request.get("oldPassword");
            String newPassword = request.get("newPassword");
            
            userService.changeUserPassword(userId, oldPassword, newPassword);
            
            return ResponseEntity.ok(Map.of("message", "Пароль успешно изменен"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Произошла ошибка при изменении пароля"));
        }
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<?> deleteUser(@PathVariable Long userId) {
        try {
            userService.deleteUser(userId);
            return ResponseEntity.ok(Map.of("message", "Пользователь успешно удален"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Произошла ошибка при удалении пользователя"));
        }
    }
} 