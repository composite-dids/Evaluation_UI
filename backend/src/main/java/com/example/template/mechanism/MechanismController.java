package com.example.template.mechanism;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/mechanism")
@CrossOrigin(origins = "http://localhost:5173")
public class MechanismController {

    private final MechanismService mechanismService;

    public MechanismController(MechanismService mechanismService) {
        this.mechanismService = mechanismService;
    }

    @PostMapping("/check-dominance")
    public MechanismResponse checkDominance(@RequestBody MechanismRequest request) {
        return mechanismService.checkIfNewTermIsDominated(request);
    }

    @PostMapping("/optimal")
    public OptimalMechanismResponse findOptimalMechanism(
            @RequestBody OptimalMechanismRequest request
    ) {
        return mechanismService.findOptimalMechanism(request);
    }

    @PostMapping("/manual/compute")
    public ManualMechanismResponse computeManualMechanism(
            @RequestBody ManualMechanismRequest request
    ) {
        return mechanismService.evaluateManualMechanism(request);
    }
        
    @ExceptionHandler(IllegalArgumentException.class)
    public ErrorResponse handleIllegalArgumentException(IllegalArgumentException error) {
        return new ErrorResponse(error.getMessage());
    }

    public record ErrorResponse(String error) {
    }
}