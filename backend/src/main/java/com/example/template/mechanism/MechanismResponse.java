package com.example.template.mechanism;

import java.util.List;

public record MechanismResponse(
        boolean dominated,
        String message,
        List<Integer> dominatingTerm
) {
}