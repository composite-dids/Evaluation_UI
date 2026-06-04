package com.example.template.mechanism;

import java.util.List;

public record MechanismRequest(
        List<List<Integer>> existingTerms,
        List<Integer> newTerm
) {
}