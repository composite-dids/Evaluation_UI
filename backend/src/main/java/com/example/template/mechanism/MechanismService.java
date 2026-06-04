package com.example.template.mechanism;

import java.util.ArrayList;
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

    public OptimalMechanismResponse findOptimalMechanism(OptimalMechanismRequest request) {
        if (request.signals() == null || request.signals().isEmpty()) {
            throw new IllegalArgumentException("At least one signal is required.");
        }

        int signalCount = request.signals().size();

        double[][] probabilities = buildProbabilities(request.signals());

        List<List<Integer>> allDnfs = enumerateSignalDnfs(signalCount);

        List<Integer> bestDnf = null;
        double bestUniqueness = -1.0;
        double bestNotComplete = 0.0;
        double bestNotSybilProof = 0.0;

        for (List<Integer> dnf : allDnfs) {
            double[] result = evaluateDnf(probabilities, dnf);

            double notComplete = result[0];
            double uniqueness = result[1];
            double notSybilProof = result[2];

            if (uniqueness > bestUniqueness) {
                bestUniqueness = uniqueness;
                bestNotComplete = notComplete;
                bestNotSybilProof = notSybilProof;
                bestDnf = dnf;
            }
        }

        if (bestDnf == null) {
            throw new IllegalStateException("Could not compute optimal mechanism.");
        }

        return new OptimalMechanismResponse(
                dnfToString(bestDnf),
                dnfToSignalLists(bestDnf),
                roundToThreeDecimals(bestUniqueness * 100),
                roundToThreeDecimals(bestNotComplete * 100),
                roundToThreeDecimals(bestNotSybilProof * 100)
        );
    }
    public ManualMechanismResponse evaluateManualMechanism(ManualMechanismRequest request) {
        if (request.signals() == null || request.signals().isEmpty()) {
            throw new IllegalArgumentException("At least one signal is required.");
        }

        if (request.terms() == null || request.terms().isEmpty()) {
            throw new IllegalArgumentException("At least one mechanism term is required.");
        }

        double[][] probabilities = buildProbabilities(request.signals());

        List<Integer> dnf = new ArrayList<>();

        for (List<Integer> term : request.terms()) {
            dnf.add(termToMask(term));
        }

        double[] result = evaluateDnf(probabilities, dnf);

        double notComplete = result[0];
        double uniqueness = result[1];
        double notSybilProof = result[2];

        return new ManualMechanismResponse(
                dnfToString(dnf),
                roundToThreeDecimals(uniqueness * 100),
                roundToThreeDecimals(notComplete * 100),
                roundToThreeDecimals(notSybilProof * 100)
        );
    }
    private double[][] buildProbabilities(List<SignalProbability> signals) {
        double[][] probabilities = new double[signals.size()][3];

        for (int i = 0; i < signals.size(); i++) {
            SignalProbability signal = signals.get(i);

            double notComplete = signal.notComplete() / 100.0;
            double notSybilProof = signal.notSybilProof() / 100.0;
            double uniqueness = 1.0 - notComplete - notSybilProof;

            if (notComplete < 0 || notSybilProof < 0 || uniqueness < 0) {
                throw new IllegalArgumentException(
                        "Signal probabilities must satisfy: notComplete + notSybilProof <= 100."
                );
            }

            probabilities[i][0] = notComplete;
            probabilities[i][1] = uniqueness;
            probabilities[i][2] = notSybilProof;
        }

        return probabilities;
    }

    private List<List<Integer>> enumerateSignalDnfs(int signalCount) {
        return enumerateSubDnfs(new ArrayList<>(), 0, signalCount);
    }

    private List<List<Integer>> enumerateSubDnfs(
            List<Integer> baseDnf,
            int previousTerm,
            int signalCount
    ) {
        List<List<Integer>> dnfs = new ArrayList<>();

        int maxTerm = 1 << signalCount;

        for (int currentTerm = previousTerm + 1; currentTerm < maxTerm; currentTerm++) {
            if (!isCovered(currentTerm, baseDnf)) {
                List<Integer> newDnf = new ArrayList<>(baseDnf);
                newDnf.add(currentTerm);

                dnfs.add(new ArrayList<>(newDnf));
                dnfs.addAll(enumerateSubDnfs(newDnf, currentTerm, signalCount));
            }
        }

        return dnfs;
    }

    private boolean isCovered(int term, List<Integer> dnf) {
        for (Integer existingTerm : dnf) {
            if ((existingTerm & term) == existingTerm) {
                return true;
            }
        }

        return false;
    }

    private double[] evaluateDnf(double[][] probabilities, List<Integer> dnf) {
        int signalCount = probabilities.length;
        int scenarioCount = (int) Math.pow(3, signalCount);

        double notComplete = 0.0;
        double uniqueness = 0.0;
        double notSybilProof = 0.0;

        for (int scenario = 0; scenario < scenarioCount; scenario++) {
            int temp = scenario;
            double scenarioProbability = 1.0;

            int userMask = 0;
            int attackerMask = 0;

            for (int signalIndex = 0; signalIndex < signalCount; signalIndex++) {
                int state = temp % 3;
                temp /= 3;

                scenarioProbability *= probabilities[signalIndex][state];

                if (state == 1 || state == 2) {
                    userMask |= 1 << signalIndex;
                }

                if (state == 2) {
                    attackerMask |= 1 << signalIndex;
                }
            }

            boolean userAccepted = accepts(dnf, userMask);
            boolean attackerAccepted = accepts(dnf, attackerMask);

            if (!userAccepted) {
                notComplete += scenarioProbability;
            } else if (attackerAccepted) {
                notSybilProof += scenarioProbability;
            } else {
                uniqueness += scenarioProbability;
            }
        }

        return new double[]{notComplete, uniqueness, notSybilProof};
    }

    private boolean accepts(List<Integer> dnf, int availableSignalsMask) {
        for (Integer term : dnf) {
            if ((availableSignalsMask & term) == term) {
                return true;
            }
        }

        return false;
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

    private List<List<Integer>> dnfToSignalLists(List<Integer> dnf) {
        List<List<Integer>> terms = new ArrayList<>();

        for (Integer termMask : dnf) {
            List<Integer> term = new ArrayList<>();

            int signalNumber = 1;
            int temp = termMask;

            while (temp > 0) {
                if ((temp & 1) == 1) {
                    term.add(signalNumber);
                }

                temp >>= 1;
                signalNumber++;
            }

            terms.add(term);
        }

        return terms;
    }

    private String dnfToString(List<Integer> dnf) {
        List<String> terms = new ArrayList<>();

        for (Integer termMask : dnf) {
            List<String> signals = new ArrayList<>();

            int signalNumber = 1;
            int temp = termMask;

            while (temp > 0) {
                if ((temp & 1) == 1) {
                    signals.add("s" + signalNumber);
                }

                temp >>= 1;
                signalNumber++;
            }

            terms.add("(" + String.join(" ∧ ", signals) + ")");
        }

        return String.join(" ∨ ", terms);
    }

    private double roundToThreeDecimals(double value) {
        return Math.round(value * 1000.0) / 1000.0;
    }
}
