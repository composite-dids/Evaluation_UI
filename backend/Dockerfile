FROM maven:3.9.9-eclipse-temurin-17 AS build

WORKDIR /app

COPY pom.xml .
COPY src ./src

RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jdk

WORKDIR /app

RUN apt-get update && \
    apt-get install -y curl bash ca-certificates git && \
    rm -rf /var/lib/apt/lists/*

RUN curl -L https://foundry.paradigm.xyz | bash && \
    /root/.foundry/bin/foundryup

ENV PATH="/root/.foundry/bin:${PATH}"

COPY --from=build /app/target/backend-0.0.1-SNAPSHOT.jar app.jar

COPY contracts ./contracts

RUN chmod +x ./contracts/scripts/*.sh

EXPOSE 8080

CMD ["java", "-jar", "app.jar"]