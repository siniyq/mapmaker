package com.mapmaker.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class MainController {
    
    @GetMapping("/")
    public String home() {
        return "map"; // Отображаем map.html по умолчанию
    }
    
    @GetMapping("/map")
    public String map() {
        return "map";
    }
    
    @GetMapping("/login")
    public String login() {
        return "login";
    }
    
    @GetMapping("/register")
    public String register() {
        return "register";
    }
} 