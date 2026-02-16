package com.oncopredict.java_backend.service;

import com.oncopredict.java_backend.dto.BiomarkerRequest;
import com.oncopredict.java_backend.dto.PredictionResponse;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@Service
public class AIClientService {

    private final WebClient webClient;

    public AIClientService() {
        this.webClient = WebClient.create("http://localhost:8000");
    }

    public Mono<PredictionResponse> getPrediction(BiomarkerRequest request) {
        return webClient.post()
                .uri("/predict")
                .bodyValue(request)
                .retrieve()
                .bodyToMono(PredictionResponse.class);
    }
}
