CREATE SEQUENCE IF NOT EXISTS short_url_id_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS short_url (
    id BIGINT PRIMARY KEY,
    short_code VARCHAR(32) NOT NULL UNIQUE,
    original_url VARCHAR(2048) NOT NULL,
    custom_alias BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS click_event (
    id BIGSERIAL PRIMARY KEY,
    short_code VARCHAR(32) NOT NULL,
    clicked_at TIMESTAMP WITH TIME ZONE NOT NULL,
    device_type VARCHAR(32) NOT NULL,
    user_agent VARCHAR(512),
    referrer VARCHAR(2048)
);

CREATE INDEX IF NOT EXISTS idx_click_event_short_code ON click_event(short_code);
CREATE INDEX IF NOT EXISTS idx_click_event_clicked_at ON click_event(clicked_at);
