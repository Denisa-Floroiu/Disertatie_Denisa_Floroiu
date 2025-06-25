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
ALTER TABLE utilizatori ADD COLUMN blocked_until TIMESTAMP DEFAULT NULL;
INSERT INTO utilizatori (
  email,
  password,
  pin_code,
  role,
  status
) VALUES (
  'user1@example.com',
  'parola_hashuita_aici',
  '1234',
  'user',
  'activ'
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

INSERT INTO history_logs (rfid_code, email, pin, status)
VALUES ('deni', 'user@example.com', '1234', 'ACCESS_GRANTED');

INSERT INTO rfid_asteptare (rfid_code) 
VALUES ('TEST1234578');

UPDATE utilizatori
SET status = 'activ'
WHERE role = 'admin'

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
DELETE FROM utilizatori WHERE role = 'admin';
INSERT INTO rfid_asteptare (rfid_code)
VALUES ('F9A123');
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

INSERT INTO lumina_ambientala (valoare, timestamp)
VALUES (73.5, CURRENT_TIMESTAMP);
INSERT INTO ambient (temperatura, umiditate)
VALUES (22.7, 58.4);
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
INSERT INTO sesiuni_consum (timestamp, curent_total, durata_secunde, mod)
VALUES 
  ('2025-06-13 08:15:00', 0.72, 120, 'automat'),
  ('2025-06-13 12:30:00', 1.20, 240, 'manual'),
  ('2025-06-13 18:45:00', 0.95, 180, 'automat');