--liquibase formatted sql

--changeset heygoodly:001-baseline-schema-and-seed splitStatements:true endDelimiter:;
--preconditions onFail:MARK_RAN
--precondition-sql-check expectedResult:0 SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'

CREATE TABLE public.affiliate_clicks (
    id bigint NOT NULL,
    click_code character varying(64) NOT NULL,
    store_id bigint,
    offer_id bigint,
    target_url text NOT NULL,
    user_ip character varying(50),
    user_agent text,
    referer_url text,
    utm_source character varying(100),
    utm_medium character varying(100),
    utm_campaign character varying(100),
    utm_term character varying(100),
    utm_content character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE SEQUENCE public.affiliate_clicks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.affiliate_clicks_id_seq OWNED BY public.affiliate_clicks.id;
CREATE TABLE public.audit_logs (
    id bigint NOT NULL,
    user_id bigint,
    user_email character varying(150),
    action character varying(50) NOT NULL,
    module character varying(50) NOT NULL,
    resource_id character varying(100),
    resource_name character varying(255),
    ip_address character varying(50),
    device character varying(255),
    changes jsonb,
    status character varying(20) DEFAULT 'SUCCESS'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE SEQUENCE public.audit_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;
CREATE TABLE public.categories (
    id bigint NOT NULL,
    parent_id bigint,
    name character varying(150) NOT NULL,
    slug character varying(200) NOT NULL,
    type character varying(50) DEFAULT 'post'::character varying NOT NULL,
    description text,
    image character varying(500),
    sort_order integer DEFAULT 9999 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    show_on_home boolean DEFAULT false NOT NULL,
    show_on_nav boolean DEFAULT true NOT NULL,
    meta_title character varying(255),
    meta_keywords character varying(255),
    meta_description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by character varying(100),
    is_deleted boolean DEFAULT false NOT NULL
);
CREATE SEQUENCE public.categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;
CREATE TABLE public.entity_tags (
    id bigint NOT NULL,
    entity_type character varying(20) NOT NULL,
    entity_id bigint NOT NULL,
    tag_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE SEQUENCE public.entity_tags_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.entity_tags_id_seq OWNED BY public.entity_tags.id;
CREATE TABLE public.feedbacks (
    id bigint NOT NULL,
    name character varying(150) NOT NULL,
    email character varying(150) NOT NULL,
    phone character varying(50),
    type character varying(50) DEFAULT 'general'::character varying NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    reply_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE SEQUENCE public.feedbacks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.feedbacks_id_seq OWNED BY public.feedbacks.id;
CREATE TABLE public.i18n_messages (
    id bigint NOT NULL,
    message_key character varying(150) NOT NULL,
    message_en text NOT NULL,
    message_vi text NOT NULL,
    category character varying(50) DEFAULT 'ERROR'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE SEQUENCE public.i18n_messages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.i18n_messages_id_seq OWNED BY public.i18n_messages.id;
CREATE TABLE public.media_items (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    object_key character varying(500) NOT NULL,
    bucket character varying(100) DEFAULT 'heygoodly-media'::character varying NOT NULL,
    url character varying(500) NOT NULL,
    category character varying(50) DEFAULT 'articles'::character varying NOT NULL,
    size_bytes bigint,
    mime_type character varying(100),
    dimensions character varying(50),
    tags jsonb,
    uploaded_by bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE SEQUENCE public.media_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.media_items_id_seq OWNED BY public.media_items.id;
CREATE TABLE public.menus (
    id bigint NOT NULL,
    parent_id bigint,
    "position" character varying(50) DEFAULT 'main'::character varying NOT NULL,
    title character varying(150) NOT NULL,
    target_type character varying(50) DEFAULT 'url'::character varying NOT NULL,
    target_value character varying(500) NOT NULL,
    image_icon character varying(500),
    sort_order integer DEFAULT 9999 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE SEQUENCE public.menus_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.menus_id_seq OWNED BY public.menus.id;
CREATE TABLE public.offers (
    id bigint NOT NULL,
    store_id bigint NOT NULL,
    name character varying(255) NOT NULL,
    discount_value character varying(100) NOT NULL,
    code character varying(100),
    url_ref text NOT NULL,
    description text,
    is_verified boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 9999 NOT NULL,
    expire_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by character varying(100),
    is_deleted boolean DEFAULT false NOT NULL,
    image character varying(500),
    tags jsonb,
    start_at timestamp with time zone,
    has_expiration boolean DEFAULT false NOT NULL,
    is_exclusive boolean DEFAULT false NOT NULL
);
CREATE SEQUENCE public.offers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.offers_id_seq OWNED BY public.offers.id;
CREATE TABLE public.pages (
    id bigint NOT NULL,
    title character varying(200) NOT NULL,
    slug character varying(200) NOT NULL,
    image character varying(500),
    content text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 9999 NOT NULL,
    meta_title character varying(255),
    meta_description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by character varying(100),
    is_deleted boolean DEFAULT false NOT NULL
);
CREATE SEQUENCE public.pages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.pages_id_seq OWNED BY public.pages.id;
CREATE TABLE public.permissions (
    id bigint NOT NULL,
    module character varying(100) NOT NULL,
    action character varying(100) NOT NULL,
    code character varying(100) NOT NULL,
    name character varying(150) NOT NULL,
    description character varying(500)
);
CREATE SEQUENCE public.permissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;
CREATE TABLE public.posts (
    id bigint NOT NULL,
    category_id bigint,
    author_id bigint,
    store_id bigint,
    title character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    excerpt text,
    content text NOT NULL,
    image character varying(500),
    read_time character varying(50) DEFAULT '5 min read'::character varying,
    rating numeric(3,2) DEFAULT 4.80,
    status character varying(20) DEFAULT 'PUBLISHED'::character varying NOT NULL,
    is_featured boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 9999 NOT NULL,
    published_at timestamp with time zone DEFAULT now() NOT NULL,
    scheduled_at timestamp with time zone,
    view_count bigint DEFAULT 0 NOT NULL,
    tags jsonb,
    sidebar_config jsonb,
    meta_title character varying(255),
    meta_keywords character varying(255),
    meta_description text,
    canonical_url character varying(500),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by character varying(100),
    is_deleted boolean DEFAULT false NOT NULL,
    author_name character varying(150),
    author_role character varying(150)
);
CREATE SEQUENCE public.posts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.posts_id_seq OWNED BY public.posts.id;
CREATE TABLE public.reviewer_profiles (
    id bigint NOT NULL,
    name character varying(120) NOT NULL,
    avatar_url character varying(500),
    is_verified boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by character varying(100),
    is_deleted boolean DEFAULT false NOT NULL
);
CREATE SEQUENCE public.reviewer_profiles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.reviewer_profiles_id_seq OWNED BY public.reviewer_profiles.id;
CREATE TABLE public.role_permissions (
    role_id bigint NOT NULL,
    permission_id bigint NOT NULL
);
CREATE TABLE public.roles (
    id bigint NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    description character varying(500),
    is_system boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE SEQUENCE public.roles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;
CREATE TABLE public.store_reviews (
    id bigint NOT NULL,
    store_id bigint NOT NULL,
    reviewer_name character varying(120) NOT NULL,
    reviewer_avatar character varying(500),
    is_verified boolean DEFAULT true NOT NULL,
    rating integer DEFAULT 5 NOT NULL,
    review_date_label character varying(80),
    comment text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by character varying(100),
    is_deleted boolean DEFAULT false NOT NULL,
    reviewer_profile_id bigint,
    CONSTRAINT store_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);
CREATE SEQUENCE public.store_reviews_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.store_reviews_id_seq OWNED BY public.store_reviews.id;
CREATE TABLE public.stores (
    id bigint NOT NULL,
    category_id bigint,
    assigned_user_id bigint,
    name character varying(150) NOT NULL,
    slug character varying(200) NOT NULL,
    logo character varying(500),
    social_card_image character varying(500),
    social_title character varying(255),
    social_description character varying(500),
    about_store text,
    max_offer integer DEFAULT 50 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_searchable boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 9999 NOT NULL,
    rating_score numeric(3,2) DEFAULT 5.00 NOT NULL,
    rating_count integer DEFAULT 0 NOT NULL,
    af_website character varying(500),
    af_status character varying(50) DEFAULT 'unregistered'::character varying,
    af_visit_count bigint DEFAULT 0 NOT NULL,
    af_portal_url character varying(500),
    af_account character varying(150),
    af_commission character varying(100),
    internal_note text,
    ads_status character varying(50) DEFAULT 'none'::character varying,
    ads_account character varying(100),
    meta_title character varying(255),
    meta_keywords character varying(255),
    meta_description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by character varying(100),
    is_deleted boolean DEFAULT false NOT NULL,
    is_featured boolean DEFAULT false NOT NULL,
    popular_searches jsonb,
    faqs jsonb,
    tags jsonb,
    rating_breakdown jsonb
);
CREATE SEQUENCE public.stores_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.stores_id_seq OWNED BY public.stores.id;
CREATE TABLE public.subscribers (
    id bigint NOT NULL,
    email character varying(150) NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    source character varying(100) DEFAULT 'homepage_footer'::character varying,
    ip_address character varying(50),
    subscribed_at timestamp with time zone DEFAULT now() NOT NULL,
    unsubscribed_at timestamp with time zone
);
CREATE SEQUENCE public.subscribers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.subscribers_id_seq OWNED BY public.subscribers.id;
CREATE TABLE public.system_settings (
    id bigint NOT NULL,
    setting_key character varying(100) NOT NULL,
    setting_value text,
    category character varying(50) DEFAULT 'general'::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE SEQUENCE public.system_settings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.system_settings_id_seq OWNED BY public.system_settings.id;
CREATE TABLE public.tags (
    id bigint NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(120) NOT NULL,
    description text,
    color character varying(30) DEFAULT '#6366f1'::character varying,
    is_featured boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_by character varying(100),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE SEQUENCE public.tags_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.tags_id_seq OWNED BY public.tags.id;
CREATE TABLE public.user_login_records (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    ip_address character varying(50) NOT NULL,
    location character varying(150),
    device character varying(255),
    auth_method character varying(50) DEFAULT 'Password'::character varying NOT NULL,
    status character varying(50) DEFAULT 'Success'::character varying NOT NULL,
    duration character varying(50),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE SEQUENCE public.user_login_records_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.user_login_records_id_seq OWNED BY public.user_login_records.id;
CREATE TABLE public.user_preferences (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    theme_mode character varying(20) DEFAULT 'light'::character varying NOT NULL,
    locale character varying(10) DEFAULT 'en'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE SEQUENCE public.user_preferences_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.user_preferences_id_seq OWNED BY public.user_preferences.id;
CREATE TABLE public.users (
    id bigint NOT NULL,
    role_id bigint NOT NULL,
    full_name character varying(150) NOT NULL,
    email character varying(150) NOT NULL,
    password_hash character varying(255) NOT NULL,
    phone character varying(50),
    avatar character varying(500),
    department character varying(150),
    timezone character varying(100) DEFAULT 'America/New_York (EST / UTC-5)'::character varying,
    bio text,
    social_x character varying(255),
    social_linkedin character varying(255),
    is_super_admin boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    two_factor_enabled boolean DEFAULT false NOT NULL,
    two_factor_secret character varying(255),
    two_factor_recovery_codes jsonb,
    last_login_at timestamp with time zone,
    last_login_ip character varying(50),
    login_count integer DEFAULT 0 NOT NULL,
    password_updated_at timestamp with time zone DEFAULT now(),
    must_change_password boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by character varying(100),
    is_deleted boolean DEFAULT false NOT NULL,
    notification_preferences jsonb DEFAULT '{"browserPush": false, "twoFaChanges": true, "securityLogins": true, "commissionSpikes": true, "customerFeedback": true, "couponExpirations": true}'::jsonb
);
CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;
ALTER TABLE ONLY public.affiliate_clicks ALTER COLUMN id SET DEFAULT nextval('public.affiliate_clicks_id_seq'::regclass);
ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);
ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);
ALTER TABLE ONLY public.entity_tags ALTER COLUMN id SET DEFAULT nextval('public.entity_tags_id_seq'::regclass);
ALTER TABLE ONLY public.feedbacks ALTER COLUMN id SET DEFAULT nextval('public.feedbacks_id_seq'::regclass);
ALTER TABLE ONLY public.i18n_messages ALTER COLUMN id SET DEFAULT nextval('public.i18n_messages_id_seq'::regclass);
ALTER TABLE ONLY public.media_items ALTER COLUMN id SET DEFAULT nextval('public.media_items_id_seq'::regclass);
ALTER TABLE ONLY public.menus ALTER COLUMN id SET DEFAULT nextval('public.menus_id_seq'::regclass);
ALTER TABLE ONLY public.offers ALTER COLUMN id SET DEFAULT nextval('public.offers_id_seq'::regclass);
ALTER TABLE ONLY public.pages ALTER COLUMN id SET DEFAULT nextval('public.pages_id_seq'::regclass);
ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);
ALTER TABLE ONLY public.posts ALTER COLUMN id SET DEFAULT nextval('public.posts_id_seq'::regclass);
ALTER TABLE ONLY public.reviewer_profiles ALTER COLUMN id SET DEFAULT nextval('public.reviewer_profiles_id_seq'::regclass);
ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);
ALTER TABLE ONLY public.store_reviews ALTER COLUMN id SET DEFAULT nextval('public.store_reviews_id_seq'::regclass);
ALTER TABLE ONLY public.stores ALTER COLUMN id SET DEFAULT nextval('public.stores_id_seq'::regclass);
ALTER TABLE ONLY public.subscribers ALTER COLUMN id SET DEFAULT nextval('public.subscribers_id_seq'::regclass);
ALTER TABLE ONLY public.system_settings ALTER COLUMN id SET DEFAULT nextval('public.system_settings_id_seq'::regclass);
ALTER TABLE ONLY public.tags ALTER COLUMN id SET DEFAULT nextval('public.tags_id_seq'::regclass);
ALTER TABLE ONLY public.user_login_records ALTER COLUMN id SET DEFAULT nextval('public.user_login_records_id_seq'::regclass);
ALTER TABLE ONLY public.user_preferences ALTER COLUMN id SET DEFAULT nextval('public.user_preferences_id_seq'::regclass);
ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);

INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (1, 'common.success', 'Operation completed successfully.', 'Thao tác thực hiện thành công.', 'COMMON', '2026-11-17 13:32:48.716096+00', '2026-11-17 13:32:48.716096+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (2, 'common.created', 'Resource created successfully.', 'Tạo mới dữ liệu thành công.', 'COMMON', '2026-11-17 13:32:48.716096+00', '2026-11-17 13:32:48.716096+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (3, 'common.updated', 'Resource updated successfully.', 'Cập nhật dữ liệu thành công.', 'COMMON', '2026-11-17 13:32:48.716096+00', '2026-11-17 13:32:48.716096+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (4, 'common.deleted', 'Resource deleted successfully.', 'Xóa dữ liệu thành công.', 'COMMON', '2026-11-17 13:32:48.716096+00', '2026-11-17 13:32:48.716096+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (5, 'error.unauthorized', 'Authentication is required to access this resource.', 'Vui lòng đăng nhập để truy cập tài nguyên này.', 'AUTH', '2026-11-17 13:32:48.716096+00', '2026-11-17 13:32:48.716096+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (6, 'error.access_denied', 'You do not have permission to perform this action.', 'Bạn không có quyền thực hiện thao tác này.', 'AUTH', '2026-11-17 13:32:48.716096+00', '2026-11-17 13:32:48.716096+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (7, 'error.invalid_credentials', 'Invalid email or password.', 'Email hoặc mật khẩu không chính xác.', 'AUTH', '2026-11-17 13:32:48.716096+00', '2026-11-17 13:32:48.716096+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (8, 'error.two_factor_required', 'Two-factor authentication code is required.', 'Yêu cầu nhập mã xác thực 2 bước (2FA).', 'AUTH', '2026-11-17 13:32:48.716096+00', '2026-11-17 13:32:48.716096+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (9, 'error.invalid_otp_code', 'Invalid or expired 2FA verification code.', 'Mã xác thực 2FA không hợp lệ hoặc đã hết hạn.', 'AUTH', '2026-11-17 13:32:48.716096+00', '2026-11-17 13:32:48.716096+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (10, 'error.account_locked', 'Account is temporarily locked due to too many failed attempts. Try again later.', 'Tài khoản tạm thời bị khóa do đăng nhập sai nhiều lần. Vui lòng thử lại sau.', 'AUTH', '2026-11-17 13:32:48.716096+00', '2026-11-17 13:32:48.716096+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (11, 'error.resource_not_found', 'Requested resource was not found.', 'Không tìm thấy dữ liệu yêu cầu.', 'ERROR', '2026-11-17 13:32:48.716096+00', '2026-11-17 13:32:48.716096+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (12, 'error.store_not_found', 'The requested store does not exist.', 'Cửa hàng không tồn tại trong hệ thống.', 'ERROR', '2026-11-17 13:32:48.716096+00', '2026-11-17 13:32:48.716096+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (13, 'error.offer_not_found', 'The requested coupon or deal offer does not exist.', 'Mã giảm giá hoặc ưu đãi không tồn tại.', 'ERROR', '2026-11-17 13:32:48.716096+00', '2026-11-17 13:32:48.716096+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (14, 'error.post_not_found', 'The requested article review does not exist.', 'Bài viết đánh giá không tồn tại.', 'ERROR', '2026-11-17 13:32:48.716096+00', '2026-11-17 13:32:48.716096+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (15, 'error.duplicate_resource', 'A record with this identifier already exists.', 'Dữ liệu với định danh này đã tồn tại trong hệ thống.', 'ERROR', '2026-11-17 13:32:48.716096+00', '2026-11-17 13:32:48.716096+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (16, 'error.validation_failed', 'Validation failed for one or more fields.', 'Dữ liệu nhập vào không hợp lệ hoặc bị thiếu trường bắt buộc.', 'VALIDATION', '2026-11-17 13:32:48.716096+00', '2026-11-17 13:32:48.716096+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (17, 'error.internal_server_error', 'An unexpected system error occurred. Please contact the administrator.', 'Đã xảy ra lỗi hệ thống. Vui lòng liên hệ quản trị viên.', 'ERROR', '2026-11-17 13:32:48.716096+00', '2026-11-17 13:32:48.716096+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (18, 'error.file_upload_failed', 'Failed to upload media file to storage.', 'Tải lên tập tin thất bại.', 'ERROR', '2026-11-17 13:32:48.716096+00', '2026-11-17 13:32:48.716096+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (19, 'error.invalid_file_type', 'The uploaded file format is not supported.', 'Định dạng tệp tải lên không được hỗ trợ.', 'ERROR', '2026-11-17 13:32:48.716096+00', '2026-11-17 13:32:48.716096+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (20, 'error.token_expired', 'Session token has expired. Please refresh your session.', 'Phiên đăng nhập đã hết hạn. Vui lòng làm mới phiên làm việc.', 'AUTH', '2026-11-17 13:32:48.853355+00', '2026-11-17 13:32:48.853355+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (21, 'error.token_invalid', 'Invalid authentication token. Please sign in again.', 'Mã xác thực không hợp lệ. Vui lòng đăng nhập lại.', 'AUTH', '2026-11-17 13:32:48.853355+00', '2026-11-17 13:32:48.853355+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (22, 'error.token_missing', 'Authentication token is required to access this resource.', 'Yêu cầu mã xác thực để truy cập tài nguyên này.', 'AUTH', '2026-11-17 13:32:48.853355+00', '2026-11-17 13:32:48.853355+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (23, 'error.token_revoked', 'This session has been logged out or revoked. Please sign in again.', 'Phiên đăng nhập đã bị đăng xuất hoặc thu hồi. Vui lòng đăng nhập lại.', 'AUTH', '2026-11-17 13:32:48.855643+00', '2026-11-17 13:32:48.855643+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (24, 'validation.field.required', 'This field is required.', 'Trường này là bắt buộc.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (25, 'validation.name.required', 'Name is required.', 'Tên là bắt buộc không được để trống.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (26, 'validation.name.size', 'Name must be between 2 and 150 characters.', 'Tên phải có độ dài từ 2 đến 150 ký tự.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (27, 'validation.title.required', 'Title is required.', 'Tiêu đề là bắt buộc.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (28, 'validation.title.size.200', 'Title must not exceed 200 characters.', 'Tiêu đề không được vượt quá 200 ký tự.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (29, 'validation.title.size.255', 'Title must not exceed 255 characters.', 'Tiêu đề không được vượt quá 255 ký tự.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (30, 'validation.content.required', 'Content is required.', 'Nội dung là bắt buộc.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (31, 'validation.slug.required', 'Slug is required.', 'Đường dẫn tĩnh (slug) là bắt buộc.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (32, 'validation.slug.invalid', 'Slug must only contain lowercase alphanumeric characters and hyphens.', 'Slug chỉ được chứa chữ cái thường không dấu, số và dấu gạch ngang (a-z, 0-9, -).', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (33, 'validation.slug.letters_numbers_hyphens', 'Slug must contain only lowercase letters, numbers, and hyphens.', 'Slug chỉ được chứa chữ cái thường không dấu, số và dấu gạch ngang.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (34, 'validation.slug.size.160', 'Slug must not exceed 160 characters.', 'Slug không được vượt quá 160 ký tự.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (35, 'validation.slug.size.255', 'Slug must not exceed 255 characters.', 'Slug không được vượt quá 255 ký tự.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (36, 'validation.slug.size.120', 'Slug must be at most 120 characters', 'Slug tối đa 120 ký tự.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (37, 'validation.email.required', 'Email address is required.', 'Địa chỉ email là bắt buộc.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (38, 'validation.email.is_required', 'Email is required.', 'Email là bắt buộc.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (39, 'validation.email.invalid', 'Please enter a valid email address.', 'Vui lòng nhập địa chỉ email hợp lệ (ví dụ: user@company.com).', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (40, 'validation.email.format_invalid', 'Email format is invalid.', 'Định dạng email không hợp lệ.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (41, 'validation.email.provide_valid', 'Please provide a valid email address.', 'Vui lòng cung cấp một địa chỉ email hợp lệ.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (42, 'validation.password.required', 'Password is required.', 'Mật khẩu là bắt buộc.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (43, 'validation.password.size', 'Password must be at least 6 characters.', 'Mật khẩu phải có ít nhất 6 ký tự.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (44, 'validation.password.current_required', 'Current password is required.', 'Mật khẩu hiện tại là bắt buộc.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (45, 'validation.password.new_required', 'New password is required.', 'Mật khẩu mới là bắt buộc.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (46, 'validation.password.new_min_8', 'New password must be at least 8 characters long.', 'Mật khẩu mới phải có ít nhất 8 ký tự.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (47, 'validation.password.confirm_required', 'Password confirmation is required.', 'Xác nhận mật khẩu là bắt buộc.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (48, 'validation.auth.temp_token_required', 'Temporary token is required.', 'Mã xác thực tạm thời là bắt buộc.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (49, 'validation.auth.otp_required', 'OTP code is required.', 'Mã xác thực 2FA OTP là bắt buộc.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (50, 'validation.auth.refresh_token_required', 'Refresh token is required.', 'Mã làm mới phiên đăng nhập (Refresh token) là bắt buộc.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (52, 'validation.color.hex', 'Invalid HEX color code (e.g. #e11d48).', 'Mã màu HEX không hợp lệ (ví dụ: #e11d48 hoặc #fff).', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (53, 'validation.color.size.30', 'Color code must be at most 30 characters', 'Mã màu tối đa 30 ký tự.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (54, 'validation.store.name.required', 'Store name is required.', 'Tên thương hiệu là bắt buộc.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (55, 'validation.store.name.size', 'Store name must not exceed 150 characters.', 'Tên thương hiệu không được vượt quá 150 ký tự.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (56, 'validation.store.slug.required', 'Store slug is required.', 'Đường dẫn tĩnh thương hiệu (slug) là bắt buộc.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (57, 'validation.store.rating.min', 'Rating must be at least 0.0.', 'Điểm đánh giá phải từ 0.0 trở lên.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (58, 'validation.store.rating.max', 'Rating must not exceed 5.0.', 'Điểm đánh giá tối đa là 5.0.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (59, 'validation.store.rating.range', 'Rating score must be between 0.0 and 5.0.', 'Điểm đánh giá phải nằm trong khoảng từ 0.0 đến 5.0.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (60, 'validation.store.rating_count.min', 'Rating count cannot be negative.', 'Số lượt đánh giá không được là số âm.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (61, 'validation.store.rating_count.non_negative', 'Rating count must be non-negative.', 'Số lượt đánh giá phải là số không âm.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (62, 'validation.store.max_offer.min', 'Max offers must be at least 1.', 'Số lượng ưu đãi tối thiểu là 1.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (63, 'validation.store.max_offer.max', 'Max offers must not exceed 500.', 'Số lượng ưu đãi không được vượt quá 500.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (64, 'validation.store.max_offer.range', 'Maximum active offers must be between 1 and 500.', 'Số lượng ưu đãi hiển thị tối đa phải từ 1 đến 500.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (65, 'validation.store.url.invalid', 'Store website URL must start with http:// or https://.', 'Website thương hiệu phải bắt đầu bằng http:// hoặc https://.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (66, 'validation.offer.store_id.required', 'Store ID is required.', 'Mã thương hiệu đối tác là bắt buộc.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (67, 'validation.offer.title.required', 'Offer title is required.', 'Tiêu đề ưu đãi là bắt buộc.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (68, 'validation.offer.title.size', 'Offer title must be between 3 and 255 characters.', 'Tiêu đề ưu đãi phải từ 3 đến 255 ký tự.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (69, 'validation.offer.discount_value.required', 'Discount value is required.', 'Giá trị giảm giá là bắt buộc.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (70, 'validation.offer.affiliate_url.required', 'Affiliate tracking URL is required.', 'Liên kết tiếp thị (Affiliate URL) là bắt buộc.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (71, 'validation.offer.store.required', 'Please select an associated merchant store.', 'Vui lòng chọn thương hiệu đối tác cho ưu đãi này.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (72, 'validation.offer.coupon_code.required', 'Coupon promo code is required for coupon offers.', 'Mã giảm giá là bắt buộc đối với loại ưu đãi Mã Voucher / Coupon.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (73, 'validation.offer.discount.min', 'Discount amount must be greater than 0.', 'Giá trị giảm giá phải lớn hơn 0.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (74, 'validation.offer.discount_percentage.max', 'Discount percentage cannot exceed 100%.', 'Mức giảm giá phần trăm không được vượt quá 100%.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (75, 'validation.offer.affiliate_url.invalid', 'Affiliate destination URL must start with http:// or https://.', 'Liên kết tiếp thị (Affiliate URL) phải bắt đầu bằng http:// hoặc https://.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (76, 'validation.post.title.required', 'Article title is required.', 'Tiêu đề bài viết là bắt buộc.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (77, 'validation.post.title.size', 'Article title must be at least 5 characters.', 'Tiêu đề bài viết phải có ít nhất 5 ký tự.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (78, 'validation.post.category.required', 'Please select a category for this article.', 'Vui lòng chọn chuyên mục cho bài viết này.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (79, 'validation.post.content.required', 'Article content cannot be empty.', 'Nội dung bài viết không được để trống.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (80, 'validation.post.rating.range', 'Editorial rating score must be between 0.0 and 5.0.', 'Điểm đánh giá biên tập phải từ 0.0 đến 5.0.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (81, 'validation.post.schedule.future', 'Scheduled publishing date must be in the future.', 'Thời gian lên lịch xuất bản phải lớn hơn thời gian hiện tại.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (82, 'validation.category.name.required', 'Category name is required.', 'Tên chuyên mục là bắt buộc.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (83, 'validation.category.name.size', 'Category name must be between 2 and 100 characters.', 'Tên chuyên mục phải từ 2 đến 100 ký tự.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (84, 'validation.category.name.size.150', 'Category name must not exceed 150 characters.', 'Tên chuyên mục không được vượt quá 150 ký tự.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (85, 'validation.category.type.invalid', 'Category type must be post, store, or offer.', 'Loại chuyên mục phải là post, store hoặc offer.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (86, 'validation.category.type.one_of', 'Type must be one of: ''post'', ''store'', ''offer''.', 'Loại chuyên mục phải là một trong các giá trị: ''post'', ''store'', ''offer''.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (87, 'validation.tag.name.required', 'Tag name is required.', 'Tên thẻ tag là bắt buộc.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (88, 'validation.tag.name.blank', 'Tag name cannot be blank', 'Tên thẻ tag không được để trống.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (89, 'validation.tag.name.size', 'Tag name must be between 2 and 100 characters.', 'Tên thẻ tag phải từ 2 đến 100 ký tự.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (90, 'validation.tag.name.size.100', 'Tag name must be at most 100 characters', 'Tên thẻ tag tối đa 100 ký tự.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (91, 'validation.user.name.required', 'Full name is required.', 'Họ và tên nhân sự là bắt buộc.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (92, 'validation.user.name.size', 'Full name must be between 2 and 150 characters.', 'Họ và tên nhân sự phải từ 2 đến 150 ký tự.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (93, 'validation.role.name.required', 'Role name is required.', 'Tên vai trò là bắt buộc.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (94, 'validation.setting.empty', 'Settings map cannot be empty.', 'Danh sách cấu hình không được để trống.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (95, 'error.store.duplicate_slug', 'A merchant store with this slug already exists.', 'Đã tồn tại thương hiệu đối tác với đường dẫn tĩnh (slug) này.', 'ERROR', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (96, 'error.post.duplicate_slug', 'An article with this slug already exists.', 'Đã tồn tại bài viết với đường dẫn tĩnh (slug) này.', 'ERROR', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (97, 'error.category.duplicate_slug', 'A category with this slug already exists.', 'Đã tồn tại chuyên mục với đường dẫn tĩnh (slug) này.', 'ERROR', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (98, 'error.tag.duplicate_slug', 'A tag with this slug already exists.', 'Đã tồn tại thẻ tag với đường dẫn tĩnh (slug) này.', 'ERROR', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (99, 'error.user.duplicate_email', 'An account with this email address already exists.', 'Đã tồn tại tài khoản với địa chỉ email này.', 'ERROR', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (100, 'error.resource_conflict', 'A record with this identifier or unique attribute already exists.', 'Dữ liệu với định danh hoặc thuộc tính duy nhất này đã tồn tại trong hệ thống.', 'ERROR', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.585312+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (101, 'validation.menu.position.required', 'Position is required (main, header, footer).', 'Vị trí hiển thị menu là bắt buộc (main, header, footer).', 'VALIDATION', '2026-11-17 13:32:49.591909+00', '2026-11-17 13:32:49.591909+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (102, 'validation.menu.position.size', 'Position must not exceed 50 characters.', 'Vị trí không được vượt quá 50 ký tự.', 'VALIDATION', '2026-11-17 13:32:49.591909+00', '2026-11-17 13:32:49.591909+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (103, 'validation.menu.title.required', 'Menu title is required.', 'Tiêu đề menu là bắt buộc.', 'VALIDATION', '2026-11-17 13:32:49.591909+00', '2026-11-17 13:32:49.591909+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (104, 'validation.menu.title.size', 'Menu title must not exceed 150 characters.', 'Tiêu đề menu không được vượt quá 150 ký tự.', 'VALIDATION', '2026-11-17 13:32:49.591909+00', '2026-11-17 13:32:49.591909+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (105, 'validation.menu.target_type.required', 'Target type is required (page, category, url).', 'Loại đích điều hướng là bắt buộc (page, category, url).', 'VALIDATION', '2026-11-17 13:32:49.591909+00', '2026-11-17 13:32:49.591909+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (106, 'validation.menu.target_type.size', 'Target type must not exceed 50 characters.', 'Loại đích không được vượt quá 50 ký tự.', 'VALIDATION', '2026-11-17 13:32:49.591909+00', '2026-11-17 13:32:49.591909+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (107, 'validation.menu.target_value.required', 'Target value is required.', 'Giá trị liên kết đích là bắt buộc.', 'VALIDATION', '2026-11-17 13:32:49.591909+00', '2026-11-17 13:32:49.591909+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (108, 'validation.menu.target_value.size', 'Target value must not exceed 500 characters.', 'Giá trị liên kết không được vượt quá 500 ký tự.', 'VALIDATION', '2026-11-17 13:32:49.591909+00', '2026-11-17 13:32:49.591909+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (109, 'validation.phone.size', 'Phone number must not exceed 50 characters.', 'Số điện thoại không được vượt quá 50 ký tự.', 'VALIDATION', '2026-11-17 13:32:49.591909+00', '2026-11-17 13:32:49.591909+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (51, 'validation.phone.invalid', 'Invalid phone number format.', 'Định dạng số điện thoại không hợp lệ.', 'VALIDATION', '2026-11-17 13:32:49.585312+00', '2026-11-17 13:32:49.591909+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (111, 'validation.content.size', 'Content exceeds maximum allowable length.', 'Nội dung vượt quá độ dài tối đa cho phép.', 'VALIDATION', '2026-11-17 13:32:49.591909+00', '2026-11-17 13:32:49.591909+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (112, 'validation.email.size', 'Email must not exceed 150 characters.', 'Email không được vượt quá 150 ký tự.', 'VALIDATION', '2026-11-17 13:32:49.591909+00', '2026-11-17 13:32:49.591909+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (113, 'validation.avatar.size', 'Avatar URL must not exceed 500 characters.', 'Đường dẫn ảnh đại diện không được vượt quá 500 ký tự.', 'VALIDATION', '2026-11-17 13:32:49.591909+00', '2026-11-17 13:32:49.591909+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (114, 'validation.department.size', 'Department must not exceed 150 characters.', 'Phòng ban không được vượt quá 150 ký tự.', 'VALIDATION', '2026-11-17 13:32:49.591909+00', '2026-11-17 13:32:49.591909+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (115, 'validation.timezone.size', 'Timezone must not exceed 100 characters.', 'Múi giờ không được vượt quá 100 ký tự.', 'VALIDATION', '2026-11-17 13:32:49.591909+00', '2026-11-17 13:32:49.591909+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (116, 'validation.social_x.size', 'Social X URL must not exceed 255 characters.', 'Đường dẫn tài khoản X (Twitter) không được vượt quá 255 ký tự.', 'VALIDATION', '2026-11-17 13:32:49.591909+00', '2026-11-17 13:32:49.591909+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (117, 'validation.social_linkedin.size', 'Social LinkedIn URL must not exceed 255 characters.', 'Đường dẫn tài khoản LinkedIn không được vượt quá 255 ký tự.', 'VALIDATION', '2026-11-17 13:32:49.591909+00', '2026-11-17 13:32:49.591909+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (118, 'validation.auth.temp_token.required', 'Temporary token is required.', 'Mã xác thực tạm thời là bắt buộc.', 'VALIDATION', '2026-11-17 13:32:49.591909+00', '2026-11-17 13:32:49.591909+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (119, 'validation.auth.otp.required', 'OTP code is required.', 'Mã OTP xác thực là bắt buộc.', 'VALIDATION', '2026-11-17 13:32:49.591909+00', '2026-11-17 13:32:49.591909+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (120, 'validation.auth.refresh_token.required', 'Refresh token is required.', 'Mã refresh token là bắt buộc.', 'VALIDATION', '2026-11-17 13:32:49.591909+00', '2026-11-17 13:32:49.591909+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (121, 'validation.password.current.required', 'Current password is required.', 'Mật khẩu hiện tại là bắt buộc.', 'VALIDATION', '2026-11-17 13:32:49.591909+00', '2026-11-17 13:32:49.591909+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (122, 'validation.password.new.required', 'New password is required.', 'Mật khẩu mới là bắt buộc.', 'VALIDATION', '2026-11-17 13:32:49.591909+00', '2026-11-17 13:32:49.591909+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (123, 'validation.password.new.size', 'New password must be at least 8 characters long.', 'Mật khẩu mới phải có ít nhất 8 ký tự.', 'VALIDATION', '2026-11-17 13:32:49.591909+00', '2026-11-17 13:32:49.591909+00');
INSERT INTO public.i18n_messages (id, message_key, message_en, message_vi, category, created_at, updated_at) VALUES (124, 'validation.password.confirm.required', 'Password confirmation is required.', 'Xác nhận mật khẩu là bắt buộc.', 'VALIDATION', '2026-11-17 13:32:49.591909+00', '2026-11-17 13:32:49.591909+00');
INSERT INTO public.menus (id, parent_id, "position", title, target_type, target_value, image_icon, sort_order, is_active, created_at, updated_at) VALUES (1, NULL, 'main', 'Stores', 'url', '/stores', NULL, 1, true, '2026-11-17 13:32:48.692375+00', '2026-11-17 13:32:48.692375+00');
INSERT INTO public.menus (id, parent_id, "position", title, target_type, target_value, image_icon, sort_order, is_active, created_at, updated_at) VALUES (2, NULL, 'main', 'Categories', 'url', '/categories', NULL, 2, true, '2026-11-17 13:32:48.692375+00', '2026-11-17 13:32:48.692375+00');
INSERT INTO public.menus (id, parent_id, "position", title, target_type, target_value, image_icon, sort_order, is_active, created_at, updated_at) VALUES (3, NULL, 'main', 'Editor Picks', 'url', '/posts', NULL, 3, true, '2026-11-17 13:32:48.692375+00', '2026-11-17 13:32:48.692375+00');
INSERT INTO public.menus (id, parent_id, "position", title, target_type, target_value, image_icon, sort_order, is_active, created_at, updated_at) VALUES (4, NULL, 'main', 'About Us', 'page', '/about-us', NULL, 4, true, '2026-11-17 13:32:48.692375+00', '2026-11-17 13:32:48.692375+00');
INSERT INTO public.menus (id, parent_id, "position", title, target_type, target_value, image_icon, sort_order, is_active, created_at, updated_at) VALUES (5, NULL, 'main', 'Contact', 'url', '/contact-us', NULL, 5, true, '2026-11-17 13:32:48.692375+00', '2026-11-17 13:32:48.692375+00');
INSERT INTO public.menus (id, parent_id, "position", title, target_type, target_value, image_icon, sort_order, is_active, created_at, updated_at) VALUES (6, NULL, 'footer', 'All Stores', 'url', '/stores', NULL, 1, true, '2026-11-17 13:32:48.692375+00', '2026-11-17 13:32:48.692375+00');
INSERT INTO public.menus (id, parent_id, "position", title, target_type, target_value, image_icon, sort_order, is_active, created_at, updated_at) VALUES (7, NULL, 'footer', 'Categories', 'url', '/categories', NULL, 2, true, '2026-11-17 13:32:48.692375+00', '2026-11-17 13:32:48.692375+00');
INSERT INTO public.menus (id, parent_id, "position", title, target_type, target_value, image_icon, sort_order, is_active, created_at, updated_at) VALUES (8, NULL, 'footer', 'About Us', 'page', '/about-us', NULL, 3, true, '2026-11-17 13:32:48.692375+00', '2026-11-17 13:32:48.692375+00');
INSERT INTO public.menus (id, parent_id, "position", title, target_type, target_value, image_icon, sort_order, is_active, created_at, updated_at) VALUES (9, NULL, 'footer', 'Affiliate Disclosure', 'page', '/affiliate-disclosure', NULL, 4, true, '2026-11-17 13:32:48.692375+00', '2026-11-17 13:32:48.692375+00');
INSERT INTO public.menus (id, parent_id, "position", title, target_type, target_value, image_icon, sort_order, is_active, created_at, updated_at) VALUES (10, NULL, 'footer', 'Privacy Policy', 'page', '/privacy-policy', NULL, 5, true, '2026-11-17 13:32:48.692375+00', '2026-11-17 13:32:48.692375+00');
INSERT INTO public.menus (id, parent_id, "position", title, target_type, target_value, image_icon, sort_order, is_active, created_at, updated_at) VALUES (11, NULL, 'footer', 'Terms of Service', 'page', '/terms', NULL, 6, true, '2026-11-17 13:32:48.692375+00', '2026-11-17 13:32:48.692375+00');
INSERT INTO public.menus (id, parent_id, "position", title, target_type, target_value, image_icon, sort_order, is_active, created_at, updated_at) VALUES (12, NULL, 'footer', 'Contact Us', 'url', '/contact-us', NULL, 7, true, '2026-11-17 13:32:48.692375+00', '2026-11-17 13:32:48.692375+00');
INSERT INTO public.pages (id, title, slug, image, content, is_active, sort_order, meta_title, meta_description, created_at, updated_at, created_by, is_deleted) VALUES (1, 'About Us', 'about-us', NULL, '<h2>Welcome to HeyGoodly - The Premier Shopping & Savings Destination</h2><p>HeyGoodly was built with a single focused goal: ensuring shoppers never pay full retail price online again. Founded by veteran e-commerce and affiliate specialists, our platform bridges consumers with trusted direct-to-consumer (DTC) brands across the globe.</p><h3>Our Verification Standards</h3><p>Unlike generic coupon scrapers, our editorial team personally hand-tests each coupon code on live merchant shopping carts every single day. If a code fails to discount an order, we immediately remove or flag it.</p>', true, 1, 'About HeyGoodly - Trusted Deals, Coupons & Editorial Reviews', 'Learn about HeyGoodly mission, our expert coupon verification process, and how we help millions of online shoppers save money safely.', '2026-11-17 13:32:48.692375+00', '2026-11-17 13:32:48.692375+00', NULL, false);
INSERT INTO public.pages (id, title, slug, image, content, is_active, sort_order, meta_title, meta_description, created_at, updated_at, created_by, is_deleted) VALUES (2, 'Affiliate Disclosure', 'affiliate-disclosure', NULL, '<h2>Affiliate Disclosure & Transparency Policy</h2><p>In compliance with Federal Trade Commission (FTC) guidelines, HeyGoodly maintains full transparency regarding our merchant partnerships. When you click through our affiliate links (such as /go/ or /out/) and complete a purchase, we may earn an affiliate commission at no additional cost to you.</p><p>This compensation supports our editorial team and website maintenance. Our reviews and rankings remain strictly objective and unbiased.</p>', true, 2, 'Affiliate Disclosure - HeyGoodly Transparency & FTC Compliance', 'Read the HeyGoodly FTC affiliate disclosure policy explaining affiliate tracking links, commissions, and editorial independence.', '2026-11-17 13:32:48.692375+00', '2026-11-17 13:32:48.692375+00', NULL, false);
INSERT INTO public.pages (id, title, slug, image, content, is_active, sort_order, meta_title, meta_description, created_at, updated_at, created_by, is_deleted) VALUES (3, 'Privacy Policy', 'privacy-policy', NULL, '<h2>Privacy Policy</h2><p>At HeyGoodly, accessible from https://heygoodly.com, the privacy of our visitors is of paramount importance. This Privacy Policy documents the types of information collected and how we use it in accordance with GDPR and CCPA regulations.</p><p>We do not sell personal data. Information collected via server logs and cookies is utilized strictly to analyze trends, administer the site, and track outbound affiliate referrals.</p>', true, 3, 'Privacy Policy - HeyGoodly', 'HeyGoodly Privacy Policy regarding cookies, user data protection, and compliance with GDPR and CCPA regulations.', '2026-11-17 13:32:48.692375+00', '2026-11-17 13:32:48.692375+00', NULL, false);
INSERT INTO public.pages (id, title, slug, image, content, is_active, sort_order, meta_title, meta_description, created_at, updated_at, created_by, is_deleted) VALUES (4, 'Terms of Service', 'terms', NULL, '<h2>Terms of Service</h2><p>By accessing the HeyGoodly website, you agree to abide by these terms of service, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws.</p><p>Coupon codes and discount promotions provided on HeyGoodly are subject to merchant terms and may expire without prior notice.</p>', true, 4, 'Terms of Service - HeyGoodly', 'Review the terms of service governing usage of the HeyGoodly website and discount coupon services.', '2026-11-17 13:32:48.692375+00', '2026-11-17 13:32:48.692375+00', NULL, false);
INSERT INTO public.pages (id, title, slug, image, content, is_active, sort_order, meta_title, meta_description, created_at, updated_at, created_by, is_deleted) VALUES (5, 'Editorial Guidelines', 'editorial-guidelines', NULL, '<h2>Editorial Independence & Laboratory Testing Standards</h2><p>Every hardware review, software benchmark, and merchant coupon assessment published on HeyGoodly follows strict editorial independence protocols. Commercial partnerships and affiliate networks have zero influence over product scores, pros and cons lists, or editorial verdicts.</p><h3>Hands-On Verification Methodology</h3><p>Products undergo multi-week real-world durability and performance testing before publication. Promotional codes are verified directly against live merchant checkouts and audited continuously.</p>', true, 5, 'Editorial Guidelines & Testing Methodology - HeyGoodly', 'Learn how HeyGoodly editors independently test products, verify merchant coupon codes, and maintain strict editorial integrity.', '2026-11-17 13:32:49.522221+00', '2026-11-17 13:32:49.522221+00', NULL, false);
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (1, 'Auth', 'access', 'backend.access', 'Access Backend', 'Permission to log into ProCMS administration panel');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (2, 'Category', 'view', 'category.view', 'View Categories', 'Permission to view category list');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (3, 'Category', 'create', 'category.create', 'Create Category', 'Permission to add new categories');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (4, 'Category', 'update', 'category.update', 'Update Category', 'Permission to edit categories');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (5, 'Category', 'delete', 'category.delete', 'Delete Category', 'Permission to remove categories');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (6, 'Post', 'view', 'post.view', 'View Posts', 'Permission to view article list');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (7, 'Post', 'create', 'post.create', 'Create Post', 'Permission to compose new posts');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (8, 'Post', 'update', 'post.update', 'Update Post', 'Permission to edit posts');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (9, 'Post', 'delete', 'post.delete', 'Delete Post', 'Permission to delete posts');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (10, 'Post', 'clone', 'post.clone', 'Clone Post', 'Permission to duplicate posts');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (11, 'Post', 'publish', 'post.publish', 'Publish Post', 'Permission to publish posts directly to public portal');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (12, 'Store', 'view', 'store.view', 'View Stores', 'Permission to view store list');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (13, 'Store', 'create', 'store.create', 'Create Store', 'Permission to add new stores');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (14, 'Store', 'update', 'store.update', 'Update Store', 'Permission to update store details');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (15, 'Store', 'delete', 'store.delete', 'Delete Store', 'Permission to delete stores');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (16, 'Store', 'affiliate_intel', 'store.affiliate_intel', 'Manage Affiliate Intel', 'Permission to view commissions, portal urls and accounts');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (17, 'Store', 'ads_assign', 'store.ads_assign', 'Assign Ads Operations', 'Permission to assign ads personnel to stores');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (18, 'Offer', 'view', 'offer.view', 'View Offers', 'Permission to view deals and coupons list');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (19, 'Offer', 'create', 'offer.create', 'Create Offer', 'Permission to add new offers and coupon codes');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (20, 'Offer', 'update', 'offer.update', 'Update Offer', 'Permission to edit offers and tracking urls');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (21, 'Offer', 'delete', 'offer.delete', 'Delete Offer', 'Permission to delete offers');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (22, 'Offer', 'verify', 'offer.verify', 'Verify Offer', 'Permission to mark offers as verified');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (23, 'Offer', 'clone', 'offer.clone', 'Clone Offer', 'Permission to clone offers');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (24, 'Page', 'view', 'page.view', 'View Static Pages', 'Permission to view static page list');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (25, 'Page', 'create', 'page.create', 'Create Static Page', 'Permission to create static pages');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (26, 'Page', 'update', 'page.update', 'Update Static Page', 'Permission to edit static pages');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (27, 'Page', 'delete', 'page.delete', 'Delete Static Page', 'Permission to remove static pages');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (28, 'Menu', 'manage', 'menu.manage', 'Manage Navigation Menus', 'Permission to manage navigation menus and links');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (29, 'Feedback', 'view', 'feedback.view', 'View Feedbacks', 'Permission to view feedback from visitors');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (30, 'Feedback', 'delete', 'feedback.delete', 'Delete Feedback', 'Permission to delete feedback messages');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (31, 'File', 'upload', 'file.upload', 'Upload Media Files', 'Permission to upload images and files');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (32, 'File', 'delete', 'file.delete', 'Delete Media Files', 'Permission to delete media files');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (33, 'User', 'view', 'user.view', 'View Users', 'Permission to view system user list');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (34, 'User', 'create', 'user.create', 'Create User', 'Permission to create new user accounts');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (35, 'User', 'update', 'user.update', 'Update User', 'Permission to update user accounts');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (36, 'User', 'delete', 'user.delete', 'Delete User', 'Permission to delete user accounts');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (37, 'User', '2fa_self', 'user.2fa_self', 'Manage Own 2FA', 'Permission to enable/disable 2FA for own account');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (38, 'User', '2fa_reset', 'user.2fa_reset', 'Reset User 2FA', 'Permission to reset 2FA on other user accounts');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (39, 'Role', 'view', 'role.view', 'View Roles', 'Permission to view roles and permission matrix');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (40, 'Role', 'create', 'role.create', 'Create Role', 'Permission to create custom roles');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (41, 'Role', 'update', 'role.update', 'Update Role', 'Permission to edit role permissions');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (42, 'Role', 'delete', 'role.delete', 'Delete Role', 'Permission to delete custom roles');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (43, 'Setting', 'general', 'setting.general', 'General Settings', 'Permission to configure general site identity');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (44, 'Setting', 'seo', 'setting.seo', 'SEO Settings', 'Permission to configure SEO metadata and verification tags');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (45, 'Setting', 'tracking', 'setting.tracking', 'Tracking Scripts', 'Permission to embed GTAG, GTM and analytics scripts');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (46, 'Setting', 'social', 'setting.social', 'Social Settings', 'Permission to configure social media links and card images');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (47, 'Setting', 'ads', 'setting.ads', 'Ads Banners', 'Permission to configure advertising slots and banners');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (48, 'Tag', 'view', 'tag.view', 'View Tags', 'Permission to view tag directory');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (49, 'Tag', 'create', 'tag.create', 'Create Tag', 'Permission to add new tags');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (50, 'Tag', 'update', 'tag.update', 'Update Tag', 'Permission to edit tags');
INSERT INTO public.permissions (id, module, action, code, name, description) VALUES (51, 'Tag', 'delete', 'tag.delete', 'Delete Tag', 'Permission to remove tags');
INSERT INTO public.roles (id, name, slug, description, is_system, created_at, updated_at) VALUES (1, 'Administrator', 'admin', 'Super administrator with full system privileges', true, '2026-11-17 13:32:48.672478+00', '2026-11-17 13:32:48.672478+00');
INSERT INTO public.roles (id, name, slug, description, is_system, created_at, updated_at) VALUES (2, 'Staff', 'staff', 'Default operational staff role for content and deals management', true, '2026-11-17 13:32:48.672478+00', '2026-11-17 13:32:48.672478+00');
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 1);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 2);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 3);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 4);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 5);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 6);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 7);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 8);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 9);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 10);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 11);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 12);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 13);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 14);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 15);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 16);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 17);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 18);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 19);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 20);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 21);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 22);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 23);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 24);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 25);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 26);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 27);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 28);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 29);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 30);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 31);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 32);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 33);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 34);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 35);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 36);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 37);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 38);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 39);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 40);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 41);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 42);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 43);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 44);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 45);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 46);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 47);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (2, 1);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (2, 2);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (2, 6);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (2, 7);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (2, 8);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (2, 10);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (2, 11);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (2, 12);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (2, 13);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (2, 14);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (2, 18);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (2, 19);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (2, 20);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (2, 22);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (2, 23);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (2, 31);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (2, 37);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 48);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 49);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 50);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 51);
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (3, 'no_index', 'false', 'general', '2026-11-17 13:32:48.688092+00', '2026-11-17 13:32:48.688092+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (4, 'search_store_enabled', 'true', 'general', '2026-11-17 13:32:48.688092+00', '2026-11-17 13:32:48.688092+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (7, 'meta_description', 'Discover verified promo codes, discounts, exclusive deals, and honest shopping reviews to save more every day.', 'general', '2026-11-17 13:32:48.688092+00', '2026-11-17 13:32:48.688092+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (8, 'two_factor_issuer', 'HeyGoodlyProCMS', 'security', '2026-11-17 13:32:48.688092+00', '2026-11-17 13:32:48.688092+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (9, 'two_factor_window_size', '3', 'security', '2026-11-17 13:32:48.688092+00', '2026-11-17 13:32:48.688092+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (10, 'two_factor_dev_bypass_enabled', 'true', 'security', '2026-11-17 13:32:48.688092+00', '2026-11-17 13:32:48.688092+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (11, 'two_factor_dev_otp', '884219', 'security', '2026-11-17 13:32:48.688092+00', '2026-11-17 13:32:48.688092+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (12, 'two_factor_dev_recovery_code', '8A41-92F0', 'security', '2026-11-17 13:32:48.688092+00', '2026-11-17 13:32:48.688092+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (13, 'auth_max_failed_attempts', '5', 'security', '2026-11-17 13:32:48.688092+00', '2026-11-17 13:32:48.688092+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (14, 'auth_lockout_seconds', '30', 'security', '2026-11-17 13:32:48.688092+00', '2026-11-17 13:32:48.688092+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (16, 'contact_hotline', '+1 (800) 555-0199', 'general', '2026-11-17 13:32:49.517805+00', '2026-11-17 13:32:49.517805+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (17, 'contact_address', '100 Montgomery St, Suite 1800, San Francisco, CA 94104', 'general', '2026-11-17 13:32:49.517805+00', '2026-11-17 13:32:49.517805+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (20, 'google_meta', '<meta name="google-site-verification" content="google_auth_token_8892" />', 'seo', '2026-11-17 13:32:49.517805+00', '2026-11-17 13:32:49.517805+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (21, 'bing_meta', '<meta name="msvalidate.01" content="bing_auth_token_4412" />', 'seo', '2026-11-17 13:32:49.517805+00', '2026-11-17 13:32:49.517805+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (23, 'og_image', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&h=630&fit=crop&q=80', 'seo', '2026-11-17 13:32:49.517805+00', '2026-11-17 13:32:49.517805+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (24, 'gtm_id', 'GTM-BG9942A', 'telemetry', '2026-11-17 13:32:49.517805+00', '2026-11-17 13:32:49.517805+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (25, 'gtag_id', 'G-772910842', 'telemetry', '2026-11-17 13:32:49.517805+00', '2026-11-17 13:32:49.517805+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (26, 'facebook_pixel', '88291029481920', 'telemetry', '2026-11-17 13:32:49.517805+00', '2026-11-17 13:32:49.517805+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (27, 'cloudflare_token', 'cf_token_9918238472910', 'telemetry', '2026-11-17 13:32:49.517805+00', '2026-11-17 13:32:49.517805+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (28, 'header_ads_active', 'true', 'monetization', '2026-11-17 13:32:49.517805+00', '2026-11-17 13:32:49.517805+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (29, 'header_ads_badge', 'Partner Spotlight', 'monetization', '2026-11-17 13:32:49.517805+00', '2026-11-17 13:32:49.517805+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (30, 'header_ads_subtitle', 'Vetted Promotion', 'monetization', '2026-11-17 13:32:49.517805+00', '2026-11-17 13:32:49.517805+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (31, 'header_ads_title', 'Seasonal Consumer Tech & Smart Home Clearance Deals', 'monetization', '2026-11-17 13:32:49.517805+00', '2026-11-17 13:32:49.517805+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (32, 'header_ads_description', 'Hand-tested promo codes checked against live merchant checkouts.', 'monetization', '2026-11-17 13:32:49.517805+00', '2026-11-17 13:32:49.517805+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (33, 'header_ads_button_text', 'Discover', 'monetization', '2026-11-17 13:32:49.517805+00', '2026-11-17 13:32:49.517805+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (34, 'header_ads_banner_url', 'https://www.anker.com/?cj_ref=heygoodly', 'monetization', '2026-11-17 13:32:49.517805+00', '2026-11-17 13:32:49.517805+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (35, 'header_ads_banner_img', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=728&h=90&fit=crop&q=80', 'monetization', '2026-11-17 13:32:49.517805+00', '2026-11-17 13:32:49.517805+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (36, 'affiliate_redirect_prefix', '/out/', 'monetization', '2026-11-17 13:32:49.517805+00', '2026-11-17 13:32:49.517805+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (37, 'affiliate_amazon_tag', 'heygoodly-20', 'monetization', '2026-11-17 13:32:49.517805+00', '2026-11-17 13:32:49.517805+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (38, 'affiliate_impact_id', 'HG_IMP_49102', 'monetization', '2026-11-17 13:32:49.517805+00', '2026-11-17 13:32:49.517805+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (39, 'affiliate_cj_id', 'HG_CJ_881920', 'monetization', '2026-11-17 13:32:49.517805+00', '2026-11-17 13:32:49.517805+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (40, 'affiliate_shareasale_id', 'HG_SAS_11029', 'monetization', '2026-11-17 13:32:49.517805+00', '2026-11-17 13:32:49.517805+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (41, 'affiliate_disclosure', 'HeyGoodly is reader-supported. When you buy through links on our site, we may earn an affiliate commission at no extra cost to you.', 'monetization', '2026-11-17 13:32:49.517805+00', '2026-11-17 13:32:49.517805+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (42, 'newsletter_enabled', 'true', 'newsletter', '2026-11-17 13:32:49.517805+00', '2026-11-17 13:32:49.517805+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (43, 'newsletter_eyebrow', 'The HeyGoodly Dispatch', 'newsletter', '2026-11-17 13:32:49.517805+00', '2026-11-17 13:32:49.517805+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (44, 'newsletter_title', 'Independent Reviews & Product Tests, Weekly', 'newsletter', '2026-11-17 13:32:49.517805+00', '2026-11-17 13:32:49.517805+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (45, 'newsletter_description', 'Zero sponsored ranking manipulation. Join 45,000+ smart readers who rely on our independent testing laboratory.', 'newsletter', '2026-11-17 13:32:49.517805+00', '2026-11-17 13:32:49.517805+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (46, 'newsletter_placeholder', 'Enter your email address...', 'newsletter', '2026-11-17 13:32:49.517805+00', '2026-11-17 13:32:49.517805+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (47, 'newsletter_button_text', 'Subscribe', 'newsletter', '2026-11-17 13:32:49.517805+00', '2026-11-17 13:32:49.517805+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (48, 'newsletter_success_message', 'Thank you for subscribing! Watch your inbox for the next Dispatch.', 'newsletter', '2026-11-17 13:32:49.517805+00', '2026-11-17 13:32:49.517805+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (49, 'newsletter_welcome_subject', 'Welcome to HeyGoodly Dispatch - Your Tech & Deal Briefing', 'newsletter', '2026-11-17 13:32:49.517805+00', '2026-11-17 13:32:49.517805+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (50, 'newsletter_double_optin', 'false', 'newsletter', '2026-11-17 13:32:49.517805+00', '2026-11-17 13:32:49.517805+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (51, 'custom_head_code', '', 'seo', '2026-11-17 13:32:49.64975+00', '2026-11-17 13:32:49.64975+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (52, 'holiday_theme_mode', 'off', 'general', '2026-11-17 13:32:49.651344+00', '2026-11-17 13:32:49.651344+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (53, 'holiday_theme_manual', 'none', 'general', '2026-11-17 13:32:49.651344+00', '2026-11-17 13:32:49.651344+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (54, 'holiday_effects_enabled', 'true', 'general', '2026-11-17 13:32:49.651344+00', '2026-11-17 13:32:49.651344+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (55, 'holiday_country_overrides', '{}', 'general', '2026-11-17 13:32:49.652854+00', '2026-11-17 13:32:49.652854+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (56, 'holiday_custom_rules', '[]', 'general', '2026-11-17 13:32:49.652854+00', '2026-11-17 13:32:49.652854+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (1, 'site_name', 'HeyGoodly', 'general', '2026-11-17 13:32:48.688092+00', '2026-11-17 13:32:48.688092+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (2, 'site_slogan', 'HeyGoodly - Smart News & Hot Deals', 'general', '2026-11-17 13:32:48.688092+00', '2026-11-17 13:32:48.688092+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (15, 'contact_email', 'contact@heygoodly.com', 'general', '2026-11-17 13:32:49.517805+00', '2026-11-17 13:32:49.517805+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (22, 'canonical_url', 'https://heygoodly.com', 'seo', '2026-11-17 13:32:49.517805+00', '2026-11-17 13:32:49.517805+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (5, 'footer_copyright', '© 2026 HeyGoodly. All rights reserved.', 'general', '2026-11-17 13:32:48.688092+00', '2026-11-17 13:32:48.688092+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (6, 'meta_title', 'HeyGoodly - Latest Deals, Verified Coupons & Shopping Reviews 2026', 'general', '2026-11-17 13:32:48.688092+00', '2026-11-17 13:32:48.688092+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (18, 'site_logo', '', 'general', '2026-11-17 13:32:49.517805+00', '2026-11-17 13:37:48.415674+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (19, 'site_favicon', '', 'general', '2026-11-17 13:32:49.517805+00', '2026-11-17 13:37:48.415742+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (57, 'brand_theme_preset', 'emerald', 'general', '2026-11-18 13:25:37.876934+00', '2026-11-18 13:25:37.876934+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (58, 'brand_primary_color', '#047857', 'general', '2026-11-18 13:25:37.897318+00', '2026-11-18 13:25:37.897318+00');
INSERT INTO public.system_settings (id, setting_key, setting_value, category, created_at, updated_at) VALUES (59, 'brand_hover_color', '#065F46', 'general', '2026-11-18 13:25:37.89866+00', '2026-11-18 13:25:37.89866+00');
INSERT INTO public.users (id, role_id, full_name, email, password_hash, phone, avatar, department, timezone, bio, social_x, social_linkedin, is_super_admin, is_active, two_factor_enabled, two_factor_secret, two_factor_recovery_codes, last_login_at, last_login_ip, login_count, password_updated_at, must_change_password, created_at, updated_at, created_by, is_deleted, notification_preferences) VALUES (1, 1, 'Super Administrator', 'admin@heygoodly.com', '$2a$10$/EF2bJuYWtuJ4FlTBTgg/OnjMdJ.lV/msi00C5oCushFZXY7k2EO2', '+1 (800) 555-0199', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80', 'Core Operations & Affiliate Strategy', 'America/New_York (EST / UTC-5)', 'Senior editor and technical administrator overseeing HeyGoodly affiliate pipelines, verified deal indexing, and laboratory benchmark integrity.', 'https://x.com/heygoodly_admin', 'https://linkedin.com/in/heygoodly', true, true, false, NULL, NULL, NULL, NULL, 0, '2026-11-17 13:32:49.655955+00', false, '2026-11-17 13:32:48.678355+00', '2026-11-18 13:17:42.022364+00', 'system', false, '{"browserPush": false, "twoFaChanges": true, "securityLogins": true, "commissionSpikes": true, "customerFeedback": true, "couponExpirations": true}');
INSERT INTO public.user_preferences (id, user_id, theme_mode, locale, created_at, updated_at) VALUES (1, 1, 'dark', 'vi', '2026-11-18 13:23:02.764789+00', '2026-11-18 13:24:19.985019+00');
SELECT pg_catalog.setval('public.i18n_messages_id_seq', 124, true);
SELECT pg_catalog.setval('public.menus_id_seq', 12, true);
SELECT pg_catalog.setval('public.pages_id_seq', 5, true);
SELECT pg_catalog.setval('public.permissions_id_seq', 51, true);
SELECT pg_catalog.setval('public.roles_id_seq', 2, true);
SELECT pg_catalog.setval('public.system_settings_id_seq', 59, true);
SELECT pg_catalog.setval('public.user_preferences_id_seq', 1, true);
SELECT pg_catalog.setval('public.users_id_seq', 2, true);

ALTER TABLE ONLY public.affiliate_clicks
    ADD CONSTRAINT affiliate_clicks_click_code_key UNIQUE (click_code);
ALTER TABLE ONLY public.affiliate_clicks
    ADD CONSTRAINT affiliate_clicks_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);
ALTER TABLE ONLY public.entity_tags
    ADD CONSTRAINT entity_tags_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.feedbacks
    ADD CONSTRAINT feedbacks_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.i18n_messages
    ADD CONSTRAINT i18n_messages_message_key_key UNIQUE (message_key);
ALTER TABLE ONLY public.i18n_messages
    ADD CONSTRAINT i18n_messages_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.media_items
    ADD CONSTRAINT media_items_object_key_key UNIQUE (object_key);
ALTER TABLE ONLY public.media_items
    ADD CONSTRAINT media_items_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.menus
    ADD CONSTRAINT menus_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.offers
    ADD CONSTRAINT offers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_slug_key UNIQUE (slug);
ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_code_key UNIQUE (code);
ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_slug_key UNIQUE (slug);
ALTER TABLE ONLY public.reviewer_profiles
    ADD CONSTRAINT reviewer_profiles_name_key UNIQUE (name);
ALTER TABLE ONLY public.reviewer_profiles
    ADD CONSTRAINT reviewer_profiles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id);
ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_slug_key UNIQUE (slug);
ALTER TABLE ONLY public.store_reviews
    ADD CONSTRAINT store_reviews_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_slug_key UNIQUE (slug);
ALTER TABLE ONLY public.subscribers
    ADD CONSTRAINT subscribers_email_key UNIQUE (email);
ALTER TABLE ONLY public.subscribers
    ADD CONSTRAINT subscribers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_setting_key_key UNIQUE (setting_key);
ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_slug_key UNIQUE (slug);
ALTER TABLE ONLY public.entity_tags
    ADD CONSTRAINT uq_entity_tags UNIQUE (entity_type, entity_id, tag_id);
ALTER TABLE ONLY public.user_login_records
    ADD CONSTRAINT user_login_records_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_key UNIQUE (user_id);
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);
CREATE INDEX idx_affiliate_clicks_code ON public.affiliate_clicks USING btree (click_code);
CREATE INDEX idx_affiliate_clicks_created ON public.affiliate_clicks USING btree (created_at DESC);
CREATE INDEX idx_affiliate_clicks_offer ON public.affiliate_clicks USING btree (offer_id);
CREATE INDEX idx_affiliate_clicks_store ON public.affiliate_clicks USING btree (store_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);
CREATE INDEX idx_audit_logs_created ON public.audit_logs USING btree (created_at DESC);
CREATE INDEX idx_audit_logs_module ON public.audit_logs USING btree (module);
CREATE INDEX idx_audit_logs_user ON public.audit_logs USING btree (user_id);
CREATE INDEX idx_categories_active ON public.categories USING btree (is_active);
CREATE INDEX idx_categories_slug ON public.categories USING btree (slug);
CREATE INDEX idx_categories_sort_order ON public.categories USING btree (sort_order);
CREATE INDEX idx_categories_type ON public.categories USING btree (type);
CREATE INDEX idx_entity_tags_entity ON public.entity_tags USING btree (entity_type, entity_id);
CREATE INDEX idx_entity_tags_tag ON public.entity_tags USING btree (tag_id, entity_type);
CREATE INDEX idx_feedbacks_created ON public.feedbacks USING btree (created_at DESC);
CREATE INDEX idx_feedbacks_read ON public.feedbacks USING btree (is_read);
CREATE INDEX idx_i18n_messages_category ON public.i18n_messages USING btree (category);
CREATE INDEX idx_i18n_messages_key ON public.i18n_messages USING btree (message_key);
CREATE INDEX idx_media_items_category ON public.media_items USING btree (category);
CREATE INDEX idx_media_items_created ON public.media_items USING btree (created_at DESC);
CREATE INDEX idx_menus_parent_id ON public.menus USING btree (parent_id);
CREATE INDEX idx_menus_position ON public.menus USING btree ("position");
CREATE INDEX idx_menus_sort_order ON public.menus USING btree (sort_order);
CREATE INDEX idx_offers_active ON public.offers USING btree (is_active);
CREATE INDEX idx_offers_code ON public.offers USING btree (code);
CREATE INDEX idx_offers_sort ON public.offers USING btree (sort_order, created_at DESC);
CREATE INDEX idx_offers_store_id ON public.offers USING btree (store_id);
CREATE INDEX idx_pages_active ON public.pages USING btree (is_active);
CREATE INDEX idx_pages_slug ON public.pages USING btree (slug);
CREATE INDEX idx_permissions_code ON public.permissions USING btree (code);
CREATE INDEX idx_permissions_module ON public.permissions USING btree (module);
CREATE INDEX idx_posts_author_id ON public.posts USING btree (author_id);
CREATE INDEX idx_posts_category_id ON public.posts USING btree (category_id);
CREATE INDEX idx_posts_featured ON public.posts USING btree (is_featured);
CREATE INDEX idx_posts_published_at ON public.posts USING btree (published_at DESC);
CREATE INDEX idx_posts_slug ON public.posts USING btree (slug);
CREATE INDEX idx_posts_status ON public.posts USING btree (status);
CREATE INDEX idx_posts_store_id ON public.posts USING btree (store_id);
CREATE INDEX idx_reviewer_profiles_lower_name ON public.reviewer_profiles USING btree (lower((name)::text));
CREATE INDEX idx_roles_slug ON public.roles USING btree (slug);
CREATE INDEX idx_store_reviews_store_id ON public.store_reviews USING btree (store_id, is_deleted, is_active, sort_order, id);
CREATE INDEX idx_stores_active ON public.stores USING btree (is_active);
CREATE INDEX idx_stores_category_id ON public.stores USING btree (category_id);
CREATE INDEX idx_stores_clicks ON public.stores USING btree (af_visit_count DESC);
CREATE INDEX idx_stores_featured ON public.stores USING btree (is_featured);
CREATE INDEX idx_stores_slug ON public.stores USING btree (slug);
CREATE INDEX idx_subscribers_email ON public.subscribers USING btree (email);
CREATE INDEX idx_subscribers_status ON public.subscribers USING btree (status);
CREATE INDEX idx_system_settings_category ON public.system_settings USING btree (category);
CREATE INDEX idx_system_settings_key ON public.system_settings USING btree (setting_key);
CREATE INDEX idx_tags_is_active ON public.tags USING btree (is_active);
CREATE INDEX idx_tags_is_featured ON public.tags USING btree (is_featured);
CREATE INDEX idx_tags_slug ON public.tags USING btree (slug);
CREATE INDEX idx_user_login_records_created ON public.user_login_records USING btree (created_at DESC);
CREATE INDEX idx_user_login_records_user ON public.user_login_records USING btree (user_id);
CREATE INDEX idx_user_preferences_user_id ON public.user_preferences USING btree (user_id);
CREATE INDEX idx_users_active ON public.users USING btree (is_active);
CREATE INDEX idx_users_email ON public.users USING btree (email);
CREATE INDEX idx_users_role_id ON public.users USING btree (role_id);
ALTER TABLE ONLY public.affiliate_clicks
    ADD CONSTRAINT affiliate_clicks_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES public.offers(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.affiliate_clicks
    ADD CONSTRAINT affiliate_clicks_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.entity_tags
    ADD CONSTRAINT entity_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.media_items
    ADD CONSTRAINT media_items_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.menus
    ADD CONSTRAINT menus_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.menus(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.offers
    ADD CONSTRAINT offers_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.store_reviews
    ADD CONSTRAINT store_reviews_reviewer_profile_id_fkey FOREIGN KEY (reviewer_profile_id) REFERENCES public.reviewer_profiles(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.store_reviews
    ADD CONSTRAINT store_reviews_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_assigned_user_id_fkey FOREIGN KEY (assigned_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.user_login_records
    ADD CONSTRAINT user_login_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE RESTRICT;

--changeset heygoodly:002-ensure-user-preferences splitStatements:true endDelimiter:;
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    theme_mode VARCHAR(20) NOT NULL DEFAULT 'light',
    locale VARCHAR(10) NOT NULL DEFAULT 'en',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);
INSERT INTO public.user_preferences (user_id, theme_mode, locale) SELECT id, 'light', 'en' FROM public.users ON CONFLICT (user_id) DO NOTHING;

--changeset heygoodly:003-performance-indexes splitStatements:true endDelimiter:;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_stores_public_sort ON public.stores (sort_order, id) WHERE is_deleted = false AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_stores_public_clicks ON public.stores (af_visit_count DESC, id) WHERE is_deleted = false AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_offers_public_store_sort ON public.offers (store_id, sort_order, id) WHERE is_deleted = false AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_posts_public_published ON public.posts (published_at DESC, id) WHERE is_deleted = false AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_posts_public_cat_sort ON public.posts (category_id, sort_order, published_at DESC) WHERE is_deleted = false AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_categories_public_type_sort ON public.categories (type, sort_order, id) WHERE is_deleted = false AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_menus_public_pos_sort ON public.menus ("position", sort_order, id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_pages_public_sort ON public.pages (sort_order, id) WHERE is_deleted = false AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_stores_name_lower_trgm ON public.stores USING gin (lower((name)::text) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_stores_slug_lower_trgm ON public.stores USING gin (lower((slug)::text) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_offers_name_lower_trgm ON public.offers USING gin (lower((name)::text) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_offers_code_lower_trgm ON public.offers USING gin (lower((code)::text) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_posts_title_lower_trgm ON public.posts USING gin (lower((title)::text) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_media_items_name_lower_trgm ON public.media_items USING gin (lower((name)::text) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_lower_trgm ON public.audit_logs USING gin (lower((action)::text) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_lower_trgm ON public.audit_logs USING gin (lower((resource_name)::text) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_posts_tags_gin ON public.posts USING gin (tags);
CREATE INDEX IF NOT EXISTS idx_stores_tags_gin ON public.stores USING gin (tags);
CREATE INDEX IF NOT EXISTS idx_media_items_tags_gin ON public.media_items USING gin (tags);
CREATE INDEX IF NOT EXISTS idx_offers_tags_gin ON public.offers USING gin (tags);

--changeset heygoodly:004-store-template-library splitStatements:true endDelimiter:;
CREATE TABLE IF NOT EXISTS public.store_review_templates (
    id BIGSERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL DEFAULT 'savings',
    title VARCHAR(180) NOT NULL,
    reviewer_name VARCHAR(120) NOT NULL,
    rating SMALLINT NOT NULL DEFAULT 5,
    review_date_label VARCHAR(80),
    is_verified BOOLEAN NOT NULL DEFAULT TRUE,
    comment_template TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 100,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_store_review_templates_active
    ON public.store_review_templates (is_deleted, category, sort_order, id);

CREATE TABLE IF NOT EXISTS public.store_faq_templates (
    id BIGSERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL DEFAULT 'promo',
    title VARCHAR(180) NOT NULL,
    question_template TEXT NOT NULL,
    answer_template TEXT NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL DEFAULT 100,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_store_faq_templates_active
    ON public.store_faq_templates (is_deleted, is_default, sort_order, id);


--changeset heygoodly:005-seed-default-review-templates splitStatements:true endDelimiter:;
INSERT INTO public.store_review_templates (category, title, reviewer_name, rating, review_date_label, is_verified, comment_template, sort_order, created_by)
SELECT v.category, v.title, v.reviewer_name, v.rating, v.review_date_label, TRUE, v.comment_template, v.sort_order, 'system'
FROM (VALUES
    ('savings', 'Instant Checkout Promo Worked', 'Hannah M.', 5, '2 days ago', 10, 'Grabbed a verified {brand} coupon code here right before checking out and saved 20% instantly. Took less than ten seconds and worked on the first try.'),
    ('savings', 'Stacked Welcome Offer + Sale', 'Daniel R.', 5, '5 days ago', 11, 'Used the {brand} promo code on a bundle that was already marked down. Nice extra savings and no expired coupon guesswork like other sites.'),
    ('savings', 'Saved Enough to Upgrade Order', 'Rachel K.', 5, '1 week ago', 12, 'Almost placed my {brand} order at full price until I checked for a discount code first. Knocked over $25 off the total effortlessly.'),
    ('savings', 'Storewide Code Applied Cleanly', 'Kevin T.', 5, '2 weeks ago', 13, 'Great experience ordering directly from {brand}. The storewide promo code applied smoothly in the cart and I still qualified for free shipping.'),
    ('savings', 'Repeat Customer Discount Find', 'Sophia B.', 5, '3 weeks ago', 14, 'I reorder from {brand} every few months and always check this page beforehand. The seasonal markdown link saved me a solid chunk this time too.'),
    ('savings', 'Verified Deal on Best-Seller', 'Marcus W.', 5, '1 month ago', 15, 'Wasn’t expecting a coupon to work on their newest release, but the {brand} promo link unlocked a real percentage discount right in the cart.'),
    ('quality', 'Exceeded Expectations on Quality', 'Emily C.', 5, '4 days ago', 20, 'Everything from {brand} arrived well packaged and feels genuinely well-made. Combined with the promo code discount, the value is hard to beat.'),
    ('quality', 'Worth Every Penny With Promo', 'Jason P.', 5, '1 week ago', 21, 'Compared a few brands before picking {brand}. Solid build, clean checkout, and getting extra money off made the decision easy.'),
    ('quality', 'Clear Details & Zero Surprises', 'Olivia N.', 5, '10 days ago', 22, 'Product specs on {brand} matched what showed up at my door. Love that the deal terms were clear up front with no hidden checkout fees.'),
    ('quality', 'Gift Order Was a Hit', 'Tyler H.', 5, '2 weeks ago', 23, 'Ordered a gift set from {brand} using one of the verified deals. Presentation looked premium and the coupon covered more than the shipping cost.'),
    ('quality', 'Glad I Switched to This Brand', 'Natalie G.', 5, '3 weeks ago', 24, 'First-time buyer with {brand} and very impressed so far. Quality noticeably beats budget alternatives, especially with the new-customer savings.'),
    ('shipping', 'Fast Dispatch & Smooth Tracking', 'Brandon D.', 5, '3 days ago', 30, 'My {brand} order shipped out the very next morning with tracking updates all the way to delivery. Promo code applied cleanly at checkout too.'),
    ('shipping', 'Helpful Support Team', 'Chloe S.', 5, '6 days ago', 31, 'Had a quick question about sizing before ordering from {brand} and support replied the same afternoon. Smooth delivery and nice coupon savings.'),
    ('shipping', 'Hassle-Free Size Exchange', 'Austin F.', 5, '2 weeks ago', 32, 'Needed to swap one item from {brand} and their exchange portal was painless. Fast turnaround and the discount from my original order still held.'),
    ('shipping', 'Free Shipping Threshold Worked', 'Samantha V.', 5, '1 month ago', 33, 'Hit the {brand} free shipping minimum easily and stacked a 15% off coupon on top. Arrived two days earlier than estimated.'),
    ('balanced', 'Great Product, Slight Shipping Wait', 'Nathan L.', 4, '5 days ago', 40, 'Really happy with what I ordered from {brand} and the coupon code gave a real discount. Standard shipping took an extra day over the weekend, otherwise great.'),
    ('balanced', 'Second Code Worked Great', 'Grace Y.', 4, '2 weeks ago', 41, 'The top code only applied to full-priced items, so I switched to the second {brand} deal for 15% off my whole cart. Smooth checkout after that.'),
    ('balanced', 'Good Value When Discounted', 'Ryan Z.', 4, '3 weeks ago', 42, '{brand} pricing feels a touch steep without a promo, so definitely grab a coupon from this page first. With 20% off, I’d gladly order again.')
) AS v(category, title, reviewer_name, rating, review_date_label, sort_order, comment_template)
WHERE NOT EXISTS (SELECT 1 FROM public.store_review_templates);


--changeset heygoodly:006-post-hero-and-featured-at splitStatements:true endDelimiter:;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_hero BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS featured_at TIMESTAMPTZ;
UPDATE public.posts SET featured_at = COALESCE(updated_at, published_at, created_at) WHERE is_featured = TRUE AND featured_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_posts_public_hero ON public.posts (is_hero, updated_at DESC) WHERE is_deleted = false AND is_active = true AND is_hero = true;
CREATE INDEX IF NOT EXISTS idx_posts_public_featured_at ON public.posts (featured_at DESC, id DESC) WHERE is_deleted = false AND is_active = true AND is_featured = true;


--changeset heygoodly:007-ensure-other-post-category splitStatements:true endDelimiter:;
INSERT INTO public.categories (name, slug, type, is_active, show_on_home, sort_order, description, is_deleted, created_by, created_at, updated_at)
SELECT 'Other', 'other', 'post', TRUE, TRUE, 999, 'General articles, guides, and miscellaneous reviews.', FALSE, 'system', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE slug = 'other');
UPDATE public.posts
SET category_id = (SELECT id FROM public.categories WHERE slug = 'other' LIMIT 1)
WHERE category_id IS NULL AND is_deleted = FALSE;


--changeset heygoodly:008-store-display-domain splitStatements:true endDelimiter:;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS display_domain VARCHAR(255);
