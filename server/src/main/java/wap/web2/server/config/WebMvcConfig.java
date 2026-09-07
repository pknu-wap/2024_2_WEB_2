package wap.web2.server.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    private final long MAX_AGE_SECS = 3600;

    // @Value("${app.cors.allowedOrigins}")
    private final String[] allowedOrigins = {
        "https://waps.store",
        "https://www.waps.store",
        "https://wapst.netlify.app",
        "https://waps.im",
        "https://dev.waps.im",
        "https://waps-deploy.netlify.app",
        "https://waps-web.netlify.app",
        "https://waps-develop.netlify.app",
        "http://localhost:3000",
        "http://localhost:8080"
    };

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry
            .addMapping("/**")
            .allowedOrigins(allowedOrigins)
            .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
            .allowedHeaders("*")
            .allowCredentials(true)
            .maxAge(MAX_AGE_SECS);
    }
}
