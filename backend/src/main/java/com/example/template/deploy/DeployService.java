package com.example.template.deploy;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

@Service
public class DeployService {

    public DeployResponse runDeployment(DeployRequest request) {
        validateRequest(request);

        File deployScript = findDeployScript();

        // Build the slot-ordered verifier sources + the remapped DNF term bitmaps.
        List<Integer> usedSignals = request.signals().stream()
                .distinct()
                .sorted()
                .collect(Collectors.toList());

        String sourcesArg = buildSourcesArg(usedSignals, request.assignments());
        String termsArg = buildTermsArg(usedSignals, request.terms());

        try {
            ProcessBuilder processBuilder = new ProcessBuilder(
                    "bash",
                    deployScript.getAbsolutePath(),
                    "--sources", sourcesArg,
                    "--terms", termsArg
            );

            processBuilder.directory(deployScript.getParentFile());
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

            // The script prints the REGISTRY link first; that is the address users paste.
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

    /**
     * Map each used signal (in ascending order, one per registry slot) to the verifier
     * source token the script understands: github | google | arxiv | balance.
     */
    private String buildSourcesArg(List<Integer> usedSignals, Map<String, String> assignments) {
        List<String> sources = new ArrayList<>();

        for (Integer signalNumber : usedSignals) {
            String assigned = assignments.get(String.valueOf(signalNumber));

            if (assigned == null || assigned.isBlank()) {
                throw new IllegalArgumentException("Missing source assignment for signal s" + signalNumber + ".");
            }

            sources.add(normalizeSource(assigned, signalNumber));
        }

        return String.join(",", sources);
    }

    private String normalizeSource(String option, int signalNumber) {
        switch (option.trim().toLowerCase(Locale.ROOT)) {
            case "github":
                return "github";
            case "gmail":
            case "google":
                return "google";
            case "arxiv":
                return "arxiv";
            case "ether":
            case "balance":
                return "balance";
            default:
                throw new IllegalArgumentException(
                        "Unknown source '" + option + "' for signal s" + signalNumber + "."
                );
        }
    }

    /**
     * Remap each DNF term (a list of 1-based signal numbers) onto contiguous slot bits
     * (slot i = position of that signal in {@code usedSignals}) and return a comma list
     * of the resulting uint8 bitmaps.
     */
    private String buildTermsArg(List<Integer> usedSignals, List<List<Integer>> terms) {
        List<String> masks = new ArrayList<>();

        for (List<Integer> term : terms) {
            if (term == null || term.isEmpty()) {
                throw new IllegalArgumentException("A mechanism term is empty.");
            }

            int mask = 0;

            for (Integer signalNumber : term) {
                int slot = usedSignals.indexOf(signalNumber);

                if (slot < 0) {
                    throw new IllegalArgumentException(
                            "Term references signal s" + signalNumber + " which has no assignment."
                    );
                }

                mask |= (1 << slot);
            }

            masks.add(String.valueOf(mask));
        }

        return String.join(",", masks);
    }

    private File findDeployScript() {
        String envPath = System.getenv("DEPLOY_SCRIPT_PATH");

        List<String> candidates = new ArrayList<>();

        if (envPath != null && !envPath.isBlank()) {
            candidates.add(envPath);
        }

        candidates.add("contracts/scripts/deploy-mechanism.sh");
        candidates.add("../contracts/scripts/deploy-mechanism.sh");
        candidates.add("backend/contracts/scripts/deploy-mechanism.sh");
        candidates.add("./contracts/scripts/deploy-mechanism.sh");
        candidates.add("./backend/contracts/scripts/deploy-mechanism.sh");

        for (String candidate : candidates) {
            File file = new File(candidate);

            if (file.exists() && file.isFile()) {
                return file;
            }
        }

        throw new RuntimeException(
                "Could not find deploy-mechanism.sh. Checked paths: " + String.join(", ", candidates)
        );
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

        if (request.terms() == null || request.terms().isEmpty()) {
            throw new IllegalArgumentException("Missing mechanism terms.");
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
