package com.example.template.deploy;

import java.util.List;

public record DeployResponse(
        boolean success,
        String link,
        List<String> links,
        String output
) {
}