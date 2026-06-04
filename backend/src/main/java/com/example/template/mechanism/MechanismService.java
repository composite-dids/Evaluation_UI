package com.example.template.mechanism;

import java.util.List;

import org.springframework.stereotype.Service;

@Service
public class MechanismService {

    public MechanismResponse checkIfNewTermIsDominated(MechanismRequest request) {
        if (request.newTerm() == null || request.newTerm().isEmpty()) {
            return new MechanismResponse(
                    true,
                    "Cannot add an empty term.",
                    null
            );
        }

        int newTermMask = termToMask(request.newTerm());

        if (request.existingTerms() == null || request.existingTerms().isEmpty()) {
            return new MechanismResponse(
                    false,
                    "The new term is valid and can be added.",
                    null
            );
        }

        for (List<Integer> existingTerm : request.existingTerms()) {
            int existingTermMask = termToMask(existingTerm);

            if (isDominatedBy(newTermMask, existingTermMask)) {
                return new MechanismResponse(
                        true,
                        "The new term is already dominated by an existing term.",
                        existingTerm
                );
            }
        }

        return new MechanismResponse(
                false,
                "The new term is valid and can be added.",
                null
        );
    }

    private boolean isDominatedBy(int newTermMask, int existingTermMask) {
        return (newTermMask & existingTermMask) == existingTermMask;
    }

    private int termToMask(List<Integer> term) {
        int mask = 0;

        for (Integer signalNumber : term) {
            if (signalNumber == null || signalNumber <= 0) {
                throw new IllegalArgumentException("Invalid signal number: " + signalNumber);
            }

            mask |= 1 << (signalNumber - 1);
        }

        return mask;
    }
}