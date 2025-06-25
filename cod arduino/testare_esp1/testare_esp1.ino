#include <WiFi.h> 
#include <SPI.h>
#include <MFRC522.h>
#include <Keypad.h>
#include <HTTPClient.h>
#include <LiquidCrystal_I2C.h>
#include <ESP32Servo.h>
#include <PubSubClient.h>
#include <WebServer.h>

// WiFi
const char* ssid = "DIGI-pBx3";
const char* password = "3pMUCUtX";

// MQTT (Flespi)
const char* mqtt_server = "mqtt.flespi.io";
const int mqtt_port = 1883;
const char* mqtt_user = "ZJnlYn4aQcFKpLlEkqWOZreXnq6OfOan1KSfJtGbFCg0SqOdfBIPWYQLiAgEnza6";
const char* mqtt_token = "";
WiFiClient espClient;
PubSubClient mqttClient(espClient);
WebServer server(80);

// Server URLs
const char* accessServerURL = "http://192.168.100.8:8000/gestionare_rfid.php";
const char* historyLogsServerURL = "http://192.168.100.8:8000/insert_history_logs.php";

// Pini
#define RST_PIN 2
#define SS_PIN 4
#define BUZZER_PIN 16
#define LOCK_SERVO_PIN 15
#define EXIT_BUTTON_PIN 17

MFRC522 mfrc522(SS_PIN, RST_PIN);
LiquidCrystal_I2C lcd(0x27, 16, 2);
Servo lockServo;

//  variabile
bool enrollMode = false;
bool isUnlocked = false;
unsigned long unlockTimer = 0;
const unsigned long unlockDuration = 2 * 60 * 1000;// 2 minute 
String lastScannedRFID = "";
String motivUsa = "";

// configurare  Keypad
const byte ROWS = 4;
const byte COLS = 4;
char keys[ROWS][COLS] = {
  {'1','2','3','A'},
  {'4','5','6','B'},
  {'7','8','9','C'},
  {'*','0','#','D'}
};
byte rowPins[ROWS] = {25, 26, 27, 14};  // ← R1, R2, R3, R4
byte colPins[COLS] = {12, 13, 32, 33};  // ← C1, C2, C3, C4
Keypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, ROWS, COLS);


// Conectare la reteaua wifi
void initWiFi() {
  WiFi.begin(ssid, password);
  Serial.print(" Conectare WiFi...");
  while (WiFi.status() != WL_CONNECTED) delay(500);
  Serial.println("WiFi conectat: " + WiFi.localIP().toString());
}

// Conectare MQTT
void initMQTT() {
  mqttClient.setServer(mqtt_server, mqtt_port);
  while (!mqttClient.connected()) {
    Serial.print("Conectare la MQTT...");
    if (mqttClient.connect("ESP32", mqtt_user, mqtt_token)) {
      Serial.println(" MQTT conectat");
    } else {
      Serial.print(" Eroare MQTT: ");
      Serial.println(mqttClient.state());
      delay(2000);
    }
  }
}

void setup() {
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(EXIT_BUTTON_PIN, INPUT_PULLUP);
  Serial.begin(115200);
  SPI.begin();
  mfrc522.PCD_Init();

  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Conectare WiFi...");

  lockServo.attach(LOCK_SERVO_PIN);
  closeLock();

  initWiFi();
  initMQTT();
  server.on("/status", HTTP_GET, handleStatus);
  server.on("/control", HTTP_POST, handleControl);
  server.begin();
  Serial.println(" Server HTTP pornit!");

}

void loop() {
  mqttClient.loop();
  server.handleClient();
  if (isUnlocked && millis() - unlockTimer > unlockDuration) {
    closeLock();
    motivUsa = "Timeout automat";
    lcd.clear();
    lcd.print("Timeout: blocat");
    Serial.println(" Timeout: usa blocata");
    delay(2000);
  }

  handleExitButton();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Scaneaza card...");
  if (!mfrc522.PICC_IsNewCardPresent() || !mfrc522.PICC_ReadCardSerial()) return;

  String rfidCode = readRFID();
  String pin = "";

  if (enrollMode) {
    String result = sendAccessRequest(rfidCode, "");

    if (result.indexOf("Card nou adăugat") != -1) {
      lcd.clear();
      lcd.print("Card salvat!");
      Serial.println(" Card nou înregistrat!");
      enrollMode = false;
    } else if (result.indexOf("Cardul este deja") != -1 || result.indexOf("în lista de așteptare") != -1) {
      lcd.clear();
      lcd.print("Card existent!");
      Serial.println(" Cardul este deja cunoscut.");
      enrollMode = false;
    } else if (result.indexOf("Timpul pentru înregistrare") != -1){
      lcd.clear();
      lcd.print("Timp expirat!");
      Serial.println(" timpul de înregistrare a expirat.");
      enrollMode = false;
    }
    delay(3000);
    return;
  } else {
    String result = sendAccessRequest(rfidCode, "");

    if (result.indexOf("Card asociat automat") != -1) {
      lcd.clear();
      lcd.print("Card asociat!");
      delay(3000);
      return;
    }

    if (result.indexOf("Cont inactiv") != -1) {
      lcd.clear();
      lcd.print("Cont inactiv!");
      Serial.println(" Acces blocat de status.");
      delay(3000);
      return;
    }
    if (result.indexOf("Acces interzis în modul curent") != -1 || 
        result.indexOf("în afara intervalului") != -1) {
      lcd.clear();
      lcd.print("Fara acces acum");
      Serial.println(" Acces refuzat (mod/interval).");
      beepManual(2000, 300, 2);
      delay(3000);
      return;
    }
    if (result.indexOf("CERE_PIN") != -1) {
      pin = promptPIN();
      String finalResponse = sendAccessRequest(rfidCode, pin);

      if (finalResponse.indexOf("ACCESS_GRANTED") != -1) {
        motivUsa = "Card + PIN valid";
        lcd.clear();
        lcd.print("Acces permis");
        Serial.println(" Acces permis");
        beepManual(2000, 300, 1);
      } else if (finalResponse.indexOf("ACCESS_DENIED") != -1) {
        lcd.clear();
        lcd.print("PIN gresit!");
        Serial.println(" PIN greșit.");
        beepManual(2000, 300, 3);
      }
      delay(3000);
      return;
    }

    lcd.clear();
    lcd.print("Acces respins!");
    Serial.println(" Acces respins.");
    delay(2000);
  }
}

void handleExitButton() {
  if (digitalRead(EXIT_BUTTON_PIN) == LOW) {
    if (isUnlocked) {
      closeLock();
      motivUsa = "Închis de la buton";
      lcd.clear();
      lcd.print("Usa inchisa");
      Serial.println(" Usa inchisa manual!");
    } else {
      openLock();
      motivUsa = "Deschis cu buton ieșire";
      unlockTimer = millis();
      lcd.clear();
      lcd.print("Iesire activata");
      Serial.println(" Iesire: usa deschisa");
    }
    delay(1000);
  }
}
//Functie citire cod de pe cardul RFID
String readRFID() {
  String code = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    code += String(mfrc522.uid.uidByte[i], HEX);
  }
  code.toUpperCase();
  Serial.println("Card scanat: " + code);
  lcd.clear();
  lcd.print("Card scanat!");
  lcd.setCursor(0, 1);
  lcd.print(code);
  delay(3000);
  return code;
}
// Citire PIN de la tastatura
String promptPIN() {
  lcd.clear();
  lcd.print("Introdu PIN:");
  String pin = "";
  while (pin.length() < 4) {
    char key = keypad.getKey();
    if (key) {
      pin += key;
      lcd.print("*");
      Serial.print("*");
    }
  }
  Serial.println("\nPIN introdus: " + pin);
  return pin;
}
//Functie de solicitare acces
String sendAccessRequest(String rfid, String pin) {
  if (WiFi.status() != WL_CONNECTED) return "";

  HTTPClient http;
  http.begin(accessServerURL);
  http.addHeader("Content-Type", "application/x-www-form-urlencoded");

  String postData = "rfid_code=" + rfid;
  if (pin != "") {
    postData += "&pin=" + pin;
  }

  int httpCode = http.POST(postData);
  String response = http.getString();

  Serial.println("Răspuns server: " + response);
  lcd.clear();

  if (response.indexOf("Mod înregistrare activat") != -1) {
    enrollMode = true;
    lcd.print("Enroll activat!");
    Serial.println(" Enroll activat!");
    sendAccessLog(rfid, pin, "ENROLL_MODE");
  } else if (response.indexOf("ACCESS_GRANTED") != -1) {
    if (!isUnlocked) {
      openLock();
      unlockTimer = millis();
      lastScannedRFID = rfid;
      lcd.print("Acces permis");
      Serial.println(" Usa deschisa!");
      beepManual(2000, 300, 1);
      sendAccessLog(rfid, pin, "ACCESS_GRANTED");

    if (mqttClient.connected()) {
      unsigned long t = millis(); // timestamp local
      String mesajUnic = "1_" + String(t); // ex: 1_184332
      mqttClient.publish("casa/usa/deschisa", mesajUnic.c_str());
      Serial.println(" MQTT trimis: " + mesajUnic);
    } 
    } else if (rfid == lastScannedRFID) {
      closeLock();
      lcd.print("Usa blocata");
      Serial.println(" Usa blocata manual!");
    }
  } else if (response.indexOf("ACCESS_DENIED") != -1) {
    lcd.print("Acces respins!");
    Serial.println(" Acces respins.");
    beepManual(2000, 300, 3);
    sendAccessLog(rfid, pin, "ACCESS_DENIED");
  }

  http.end();
  return response;
}

//Functie de trimitere a logurilor de acces 
void sendAccessLog(String rfid, String pin, String status) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(historyLogsServerURL);
  http.addHeader("Content-Type", "application/x-www-form-urlencoded");

  String logData = "rfid_code=" + rfid + "&pin=" + pin + "&status=" + status;
  int httpCode = http.POST(logData);
  String response = http.getString();

  Serial.println("Log response: " + response);
  http.end();
}

//Deschidere usa
void openLock() {
  lockServo.write(0);
  isUnlocked = true;
  unlockTimer = millis();
  Serial.println(" Func openLock: usa deschisa");
}

//Inchidere usa
void closeLock() {
  lockServo.write(90);
  unlockTimer = millis();
  isUnlocked = false;
  Serial.println(" Func closeLock: usa inchisa");
}

//Functie de control buzzer pentru emiterea de bipuri
void beepManual(int frequency, int durationMs, int beeps) {
  int period = 1000000 / frequency;
  int halfPeriod = period / 2;
  for (int j = 0; j < beeps; j++) {
    unsigned long cycles = (durationMs * 1000L) / period;
    for (unsigned long i = 0; i < cycles; i++) {
      digitalWrite(BUZZER_PIN, HIGH);
      delayMicroseconds(halfPeriod);
      digitalWrite(BUZZER_PIN, LOW);
      delayMicroseconds(halfPeriod);
    }
    delay(200);
  }
}

//RASPUNS HTTP CU STAREA usii si motivul
void handleStatus() {
  String json = "{";
  json += "\"usa\":\"" + String(isUnlocked ? "deschisa" : "inchisa") + "\",";
  json += "\"motiv_usa\":\"" + motivUsa + "\"";
  json += "}";

  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", json);
}

// FUNCTIE CARE RASPUNDE LA COMENZIILE TRIMISE DIN APLICATIA WEB
void handleControl() {
  String comanda = server.arg("plain");
  server.sendHeader("Access-Control-Allow-Origin", "*");

  if (comanda == "open_door") {
    if (isUnlocked) {
      server.send(200, "application/json", "{\"status\":\"Ușa este deja deschisă\"}");
    } else {
      openLock();
      server.send(200, "application/json", "{\"status\":\"Ușa a fost deschisă\"}");
    }
  } 
  else if (comanda == "close_door") {
    if (!isUnlocked) {
      server.send(200, "application/json", "{\"status\":\"Ușa este deja închisă\"}");
    } else {
      closeLock();
      server.send(200, "application/json", "{\"status\":\"Ușa a fost închisă\"}");
    }
  } 
  else {
    server.send(400, "application/json", "{\"status\":\"Comandă necunoscută\"}");
  }
}


