package com.example.template.deploy;

import java.util.List;
import java.util.Map;

public record DeployRequest(
        String mechanism,
        Map<String, String> assignments,
        List<Integer> signals,
        List<List<Integer>> terms
) {
}