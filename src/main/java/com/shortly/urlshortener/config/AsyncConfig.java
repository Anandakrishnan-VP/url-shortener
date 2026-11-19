package com.shortly.urlshortener.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;
import java.util.concurrent.RejectedExecutionHandler;

@Configuration
public class AsyncConfig {

    private static final Logger log = LoggerFactory.getLogger(AsyncConfig.class);

    @Bean(name = "analyticsExecutor")
    public Executor analyticsExecutor(
            @Value("${app.analytics.core-pool-size:2}") int corePoolSize,
            @Value("${app.analytics.max-pool-size:4}") int maxPoolSize,
            @Value("${app.analytics.queue-capacity:1000}") int queueCapacity
    ) {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(corePoolSize);
        executor.setMaxPoolSize(maxPoolSize);
        executor.setQueueCapacity(queueCapacity);
        executor.setThreadNamePrefix("analytics-");
        executor.setRejectedExecutionHandler((r, exec) ->
                log.warn("Analytics task dropped: queue is full and maximum pool size reached")
        );
        executor.initialize();
        return executor;
    }
}
