package com.example.template.mechanism;

import java.util.List;

public record OptimalMechanismResponse(
        String mechanism,
        List<List<Integer>> terms,
        double uniqueness,
        double notComplete,
        double notSybilProof
) {
}