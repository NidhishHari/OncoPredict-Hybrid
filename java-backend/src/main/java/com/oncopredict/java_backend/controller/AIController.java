package com.oncopredict.java_backend.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.oncopredict.java_backend.dto.BiomarkerRequest;
import com.oncopredict.java_backend.dto.PredictionResponse;
import com.oncopredict.java_backend.service.AIClientService;

import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/ai")
public class AIController {

    private final AIClientService aiClientService;

    public AIController(AIClientService aiClientService) {
        this.aiClientService = aiClientService;
    }

    @PostMapping("/predict")
    public Mono<PredictionResponse> predict(@RequestBody BiomarkerRequest request) {
        return aiClientService.getPrediction(request);
    }
}
