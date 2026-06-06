package com.example.template.deploy;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

import org.springframework.stereotype.Service;

@Service
public class DeployService {

    public DeployResponse runDeployment(DeployRequest request) {
        validateRequest(request);

        String deployScriptPath = System.getenv().getOrDefault(
                "DEPLOY_SCRIPT_PATH",
                "contracts/scripts/deploy.sh"
        );

        try {
            ProcessBuilder processBuilder = new ProcessBuilder(
                    "bash",
                    deployScriptPath
            );

            processBuilder.directory(new File("."));
            processBuilder.redirectErrorStream(true);

            Process process = processBuilder.start();

            StringBuilder outputBuilder = new StringBuilder();

            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream())
            )) {
                String line;
                while ((line = reader.readLine()) != null) {
                    outputBuilder.append(line).append("\n");
                }
            }

            boolean finished = process.waitFor(
                    Duration.ofMinutes(8).toMillis(),
                    TimeUnit.MILLISECONDS
            );

            if (!finished) {
                process.destroyForcibly();
                throw new RuntimeException("Deployment timed out.");
            }

            int exitCode = process.exitValue();
            String output = outputBuilder.toString();

            if (exitCode != 0) {
                throw new RuntimeException("Deployment failed:\n" + output);
            }

            List<String> links = extractLinks(output);

            if (links.isEmpty()) {
                throw new RuntimeException("Deployment finished, but no Etherscan links were found.");
            }

            return new DeployResponse(
                    true,
                    links.get(0),
                    links,
                    output
            );

        } catch (Exception error) {
            throw new RuntimeException(error.getMessage(), error);
        }
    }

    private void validateRequest(DeployRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Missing deploy request.");
        }

        if (request.mechanism() == null || request.mechanism().isBlank()) {
            throw new IllegalArgumentException("Missing mechanism.");
        }

        if (request.signals() == null || request.signals().isEmpty()) {
            throw new IllegalArgumentException("Missing signals.");
        }

        if (request.signals().size() > 4) {
            throw new IllegalArgumentException("Deploy supports at most 4 signals.");
        }

        if (request.assignments() == null || request.assignments().isEmpty()) {
            throw new IllegalArgumentException("Missing signal assignments.");
        }
    }

    private List<String> extractLinks(String output) {
        List<String> links = new ArrayList<>();

        String[] lines = output.split("\\R");

        for (String line : lines) {
            String trimmed = line.trim();

            if (trimmed.startsWith("https://sepolia.etherscan.io/address/")) {
                links.add(trimmed);
            }
        }

        return links;
    }
}