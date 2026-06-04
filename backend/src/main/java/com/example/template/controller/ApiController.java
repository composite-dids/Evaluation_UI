package com.example.template.controller;

import com.example.template.service.AppService;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "http://localhost:5173")
public class ApiController {

    private final AppService appService;

    public ApiController(AppService appService) {
        this.appService = appService;
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "Backend is running");
    }

    @GetMapping("/function-one")
    public Map<String, String> functionOne() {
        return Map.of("result", appService.functionOne());
    }

    @GetMapping("/function-two")
    public Map<String, String> functionTwo() {
        return Map.of("result", appService.functionTwo());
    }

    @GetMapping("/function-three")
    public Map<String, String> functionThree() {
        return Map.of("result", appService.functionThree());
    }
}
