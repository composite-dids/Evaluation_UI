package com.example.template.mechanism;

import java.util.List;

public record ManualMechanismRequest(
        List<SignalProbability> signals,
        List<List<Integer>> terms
) {
}