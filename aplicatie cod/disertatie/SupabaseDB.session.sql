CREATE TABLE utilizatori(
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  rfid_code TEXT UNIQUE,
  pin_code TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP(0) DEFAULT (now() AT TIME ZONE 'Europe/Bucharest'),
  update_at TIMESTAMP(0) NULL,
  status TEXT DEFAULT 'activ',
  must_change_password BOOLEAN DEFAULT false,
  admin_pin TEXT,
  blocked_until TIMESTAMP DEFAULT NULL
);

CREATE TABLE rfid_asteptare (
  id SERIAL PRIMARY KEY,
  rfid_code TEXT UNIQUE NOT NULL,
  detected_at TIMESTAMP(0) DEFAULT (now() AT TIME ZONE 'Europe/Bucharest')
);

CREATE TABLE history_logs (
    id SERIAL PRIMARY KEY,
    rfid_code VARCHAR(50) NOT NULL,
    email TEXT NOT NULL,
    pin VARCHAR(10),
    status VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP(0) DEFAULT (now() AT TIME ZONE 'Europe/Bucharest')
);
CREATE TABLE pin_attempts (
  rfid_code VARCHAR(255) PRIMARY KEY,
  failed_count INT DEFAULT 0,
  last_attempt TIMESTAMP(0) DEFAULT (now() AT TIME ZONE 'Europe/Bucharest')
);


CREATE TABLE consum_curent (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP(0) DEFAULT (now() AT TIME ZONE 'Europe/Bucharest'),
    curent REAL NOT NULL,
    total_ah REAL NOT NULL
);
CREATE TABLE acces_moduri (
  id SERIAL PRIMARY KEY,
  email VARCHAR(100) NOT NULL,
  mod VARCHAR(20) CHECK (mod IN ('vacanta', 'nocturn')),
  acces BOOLEAN DEFAULT TRUE
);
CREATE TABLE interval_moduri (
  mod VARCHAR(20) PRIMARY KEY CHECK (mod IN ('vacanta', 'nocturn')),
 start TIMESTAMP(0) DEFAULT (now() AT TIME ZONE 'Europe/Bucharest'),
  "end" TIMESTAMP(0)
);

CREATE TABLE ambient (
  id SERIAL PRIMARY KEY,
  temperatura FLOAT,
  umiditate FLOAT,
  timestamp TIMESTAMP(0) DEFAULT (now() AT TIME ZONE 'Europe/Bucharest')
);

CREATE TABLE lumina_ambientala (
    id SERIAL PRIMARY KEY,
    valoare FLOAT NOT NULL,
    timestamp TIMESTAMP(0) DEFAULT (now() AT TIME ZONE 'Europe/Bucharest')
);


CREATE TABLE lumina_digitala (
  id SERIAL PRIMARY KEY,
  valoare SMALLINT,
  timestamp TIMESTAMP(0) DEFAULT (now() AT TIME ZONE 'Europe/Bucharest')
);

CREATE TABLE sesiuni_consum (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP(0) DEFAULT (now() AT TIME ZONE 'Europe/Bucharest'),
  curent_total REAL,
  durata_secunde INTEGER,
  mod TEXT
);
