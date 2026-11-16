-- liquibase formatted sql
-- changeset heygoodly:033-clean-demo-data-keep-base splitStatements:true endDelimiter:;

TRUNCATE TABLE
    affiliate_clicks,
    audit_logs,
    user_login_records,
    entity_tags,
    tags,
    store_reviews,
    reviewer_profiles,
    offers,
    posts,
    stores,
    categories,
    media_items,
    feedbacks,
    subscribers
RESTART IDENTITY CASCADE;

DELETE FROM users WHERE email = 'sarah@heygoodly.com';
