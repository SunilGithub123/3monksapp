FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

# Import Zscaler root CA (needed if building behind corporate proxy)
# On Lightsail this is harmless — cert is only used during build
COPY zscaler_root.pem /tmp/zscaler_root.pem
RUN keytool -importcert -file /tmp/zscaler_root.pem -alias zscaler_root \
    -cacerts -storepass changeit -noprompt

COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

# Security: run as non-root
RUN groupadd -r appuser && useradd -r -g appuser appuser
USER appuser

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
