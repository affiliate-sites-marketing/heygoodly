FROM maven:3.9.9-eclipse-temurin-21-alpine AS builder
WORKDIR /app
COPY pom.xml .
ENV MAVEN_OPTS="-Djava.net.preferIPv4Stack=true"
RUN --mount=type=cache,target=/root/.m2 \
    mvn dependency:go-offline -B -Djava.net.preferIPv4Stack=true
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 \
    mvn package -DskipTests -B -Djava.net.preferIPv4Stack=true \
 && java -Djarmode=tools -jar target/*.jar extract --layers --destination extracted \
 && mv extracted/application/*.jar extracted/application/app.jar

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN addgroup -S spring && adduser -S spring -G spring \
 && mkdir -p /var/www/heygoodly/uploads \
 && chown -R spring:spring /app /var/www/heygoodly/uploads

COPY --from=builder --chown=spring:spring /app/extracted/dependencies/ ./
COPY --from=builder --chown=spring:spring /app/extracted/spring-boot-loader/ ./
COPY --from=builder --chown=spring:spring /app/extracted/snapshot-dependencies/ ./
COPY --from=builder --chown=spring:spring /app/extracted/application/ ./

USER spring

EXPOSE 8080
ENTRYPOINT ["java", "-Djava.net.preferIPv4Stack=true", "-XX:+UseStringDeduplication", "-XX:+ExitOnOutOfMemoryError", "-jar", "app.jar"]
