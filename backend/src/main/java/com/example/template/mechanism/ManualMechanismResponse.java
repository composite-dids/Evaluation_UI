package com.example.template.mechanism;

public record ManualMechanismResponse(
        String mechanism,
        double uniqueness,
        double notComplete,
        double notSybilProof
) {
}