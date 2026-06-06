package com.example.template.deploy;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({
        "/api/deploy",
        "/deploy"
})
@CrossOrigin(origins = {
        "http://localhost:5173",
        "https://composite-dids.github.io"
})
public class DeployController {

    private final DeployService deployService;

    public DeployController(DeployService deployService) {
        this.deployService = deployService;
    }

    @PostMapping("/run")
    public DeployResponse runDeployment(@RequestBody DeployRequest request) {
        return deployService.runDeployment(request);
    }

    @ExceptionHandler({
            IllegalArgumentException.class,
            RuntimeException.class
    })
    public ErrorResponse handleError(Exception error) {
        return new ErrorResponse(error.getMessage());
    }

    public record ErrorResponse(String error) {
    }
}