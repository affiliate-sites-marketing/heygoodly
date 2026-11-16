-- liquibase formatted sql
-- changeset heygoodly:032-sync-project-admin-credentials splitStatements:true endDelimiter:;

UPDATE users
SET password_hash = '$2a$10$/EF2bJuYWtuJ4FlTBTgg/OnjMdJ.lV/msi00C5oCushFZXY7k2EO2',
    password_updated_at = NOW(),
    updated_at = NOW()
WHERE email = 'admin@heygoodly.com';
