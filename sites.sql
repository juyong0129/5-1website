-- Database: sites_zuv0

-- DROP DATABASE IF EXISTS sites_zuv0;

CREATE DATABASE sites_zuv0
    WITH 
    OWNER = sites_zuv0_user
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF8'
    LC_CTYPE = 'en_US.UTF8'
    LOCALE_PROVIDER = 'libc'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1
    IS_TEMPLATE = False;

ALTER DATABASE sites_zuv0
    SET "TimeZone" TO 'utc';

ALTER DEFAULT PRIVILEGES FOR ROLE postgres
GRANT ALL ON TABLES TO sites_zuv0_user;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres
GRANT ALL ON SEQUENCES TO sites_zuv0_user;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres
GRANT EXECUTE ON FUNCTIONS TO sites_zuv0_user;

-- 테이블 생성
CREATE TABLE sites (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    count INTEGER DEFAULT 1
);
