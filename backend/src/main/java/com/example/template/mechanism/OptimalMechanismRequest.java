package com.example.template.mechanism;

import java.util.List;

public record OptimalMechanismRequest(
        List<SignalProbability> signals
) {
}