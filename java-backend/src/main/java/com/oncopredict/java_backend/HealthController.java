package com.oncopredict.java_backend;

import java.util.HashMap;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    @GetMapping("/health")
public Map<String, Object> health() {
    Map<String, Object> status = new HashMap<>();
    status.put("service", "OncoPredict Java Backend");
    status.put("status", "UP");
    status.put("timestamp", System.currentTimeMillis());
    return status;
    }
}
