package wap.web2.server.auth;

import static org.junit.jupiter.api.Assertions.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.jpa.repository.support.JpaRepositoryFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.SharedEntityManagerCreator;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.interceptor.TransactionInterceptor;
import wap.web2.server.exception.ConflictException;
import wap.web2.server.global.security.config.AppProperties;
import wap.web2.server.global.security.jwt.TokenProvider;
import wap.web2.server.member.repository.UserRepository;

/** Recreates tables: DEV_LOGIN_TEST_URL must point to a disposable MySQL database. */
@EnabledIfEnvironmentVariable(named = "DEV_LOGIN_TEST_URL", matches = ".+")
class DevLoginConcurrencyTest {
    @Test
    void allocatesOneHundredIndependentAccountsAndReclaimsReleasedOrExpiredSlots() throws Exception {
        var dataSource = new DriverManagerDataSource(System.getenv("DEV_LOGIN_TEST_URL"), "root", "");
        var factory = new LocalContainerEntityManagerFactoryBean();
        factory.setDataSource(dataSource);
        factory.setPackagesToScan("wap.web2.server");
        factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
        factory.setJpaPropertyMap(Map.of(
            "hibernate.hbm2ddl.auto", "create-drop",
            "hibernate.physical_naming_strategy", "org.hibernate.boot.model.naming.CamelCaseToUnderscoresNamingStrategy",
            "hibernate.jdbc.time_zone", "UTC"
        ));
        factory.afterPropertiesSet();
        var executor = Executors.newFixedThreadPool(20);
        try {
            var jdbc = new JdbcTemplate(dataSource);
            jdbc.execute("DROP TABLE dev_login_slot");
            new ResourceDatabasePopulator(new ClassPathResource("db/migration/V8__create_dev_login_slots.sql"))
                .execute(dataSource);
            var em = SharedEntityManagerCreator.createSharedEntityManager(factory.getObject());
            var repositories = new JpaRepositoryFactory(em);
            var slots = repositories.getRepository(DevLoginSlotRepository.class);
            var users = repositories.getRepository(UserRepository.class);
            var beans = new DefaultListableBeanFactory();
            beans.registerSingleton("validator", new DevLoginSessionValidator(slots));
            var properties = new AppProperties();
            properties.getAuth().setTokenSecret("test-key-".repeat(10));
            properties.getAuth().setTokenExpirationMsec(3600000);
            var tokens = new TokenProvider(properties, beans.getBeanProvider(DevLoginSessionValidator.class));
            var tx = new JpaTransactionManager(factory.getObject());
            var proxy = new ProxyFactory(new DevLoginService(slots, users, tokens));
            proxy.addAdvice(new TransactionInterceptor(tx, new AnnotationTransactionAttributeSource()));
            var service = (DevLoginService) proxy.getProxy();

            var start = new CountDownLatch(1);
            var sessions = new ArrayList<UUID>();
            var futures = new ArrayList<Future<DevLoginService.DevLoginResponse>>();
            for (int i = 0; i < 100; i++) {
                var session = UUID.randomUUID();
                sessions.add(session);
                futures.add(executor.submit(() -> { start.await(); return service.login(session); }));
            }
            start.countDown();
            var responses = new ArrayList<DevLoginService.DevLoginResponse>();
            var accountNumbers = new HashSet<Integer>();
            var userIds = new HashSet<Long>();
            for (var future : futures) {
                var result = future.get(60, TimeUnit.SECONDS);
                responses.add(result);
                assertTrue(accountNumbers.add(result.accountNumber()));
                assertTrue(userIds.add(tokens.getUserIdFromToken(result.accessToken())));
                assertTrue(tokens.validateToken(result.accessToken()));
            }
            assertEquals(100, accountNumbers.size());
            assertEquals(100, users.count());
            assertThrows(ConflictException.class, () -> service.login(UUID.randomUUID()));
            var first = responses.get(0);
            assertEquals(first.accountNumber(), service.login(sessions.get(0)).accountNumber());

            service.release(sessions.get(0));
            assertFalse(tokens.validateToken(first.accessToken()));
            var replacement = service.login(UUID.randomUUID());
            assertEquals(first.accountNumber(), replacement.accountNumber());
            assertEquals(tokens.getUserIdFromToken(first.accessToken()), tokens.getUserIdFromToken(replacement.accessToken()));
            assertTrue(tokens.validateToken(replacement.accessToken()));
            assertFalse(tokens.validateToken(first.accessToken()));
            service.release(sessions.get(0)); // A delayed old logout must not release the new occupant.
            assertTrue(tokens.validateToken(replacement.accessToken()));

            jdbc.update("UPDATE dev_login_slot SET expires_at = ? WHERE slot_number = ?",
                java.sql.Timestamp.from(Instant.now().minusSeconds(1)), replacement.accountNumber());
            assertFalse(tokens.validateToken(replacement.accessToken()));
            var nextSession = UUID.randomUUID();
            // Concurrent retries for one browser all reuse the same free slot.
            var retries = new ArrayList<Future<DevLoginService.DevLoginResponse>>();
            for (int i = 0; i < 20; i++) retries.add(executor.submit(() -> service.login(nextSession)));
            for (var retry : retries) assertEquals(first.accountNumber(), retry.get(30, TimeUnit.SECONDS).accountNumber());
            assertEquals(100, users.count());

            var productionTokens = new TokenProvider(properties,
                new DefaultListableBeanFactory().getBeanProvider(DevLoginSessionValidator.class));
            assertFalse(productionTokens.validateToken(responses.get(1).accessToken()));
        } finally {
            executor.shutdownNow();
            executor.awaitTermination(10, TimeUnit.SECONDS);
            factory.destroy();
        }
    }
}
