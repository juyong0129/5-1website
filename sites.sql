CREATE TABLE sites (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    count INTEGER DEFAULT 1
);

CREATE TABLE teacher_sites (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    count INTEGER DEFAULT 1
);

CREATE TABLE timetable (
    id SERIAL PRIMARY KEY,
    time VARCHAR(255) NOT NULL,
    monday VARCHAR(255),
    tuesday VARCHAR(255),
    wednesday VARCHAR(255),
    thursday VARCHAR(255),
    friday VARCHAR(255)
);
