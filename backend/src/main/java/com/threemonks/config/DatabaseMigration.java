package com.threemonks.config;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Order(1) // Run before DataInitializer
public class DatabaseMigration implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DatabaseMigration.class);

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        migrateProductImageColumn();
    }

    /**
     * Migrate the products.image column from OID to BYTEA if needed.
     * This fixes the issue where @Lob previously created the column as OID type,
     * but the entity now expects BYTEA.
     */
    private void migrateProductImageColumn() {
        try {
            // Check if the products table exists
            String checkTable = "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'products')";
            Boolean tableExists = jdbcTemplate.queryForObject(checkTable, Boolean.class);

            if (Boolean.FALSE.equals(tableExists)) {
                logger.info("Products table does not exist yet, skipping image column migration");
                return;
            }

            // Check the current data type of the image column
            String checkColumnType = """
                    SELECT data_type FROM information_schema.columns
                    WHERE table_name = 'products' AND column_name = 'image'
                    """;

            String dataType;
            try {
                dataType = jdbcTemplate.queryForObject(checkColumnType, String.class);
            } catch (Exception e) {
                logger.info("Image column does not exist yet, skipping migration");
                return;
            }

            if ("oid".equalsIgnoreCase(dataType)) {
                logger.info("Migrating products.image column from OID to BYTEA...");
                jdbcTemplate.execute("ALTER TABLE products ALTER COLUMN image TYPE BYTEA USING lo_get(image)");
                logger.info("Successfully migrated products.image column to BYTEA");
            } else {
                logger.info("Products.image column is already type: {}, no migration needed", dataType);
            }
        } catch (Exception e) {
            logger.warn("Image column migration failed (may be safe to ignore if column is already correct): {}",
                    e.getMessage());
        }
    }
}
