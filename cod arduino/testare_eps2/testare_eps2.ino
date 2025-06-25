#include <WiFi.h>
#include <PubSubClient.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <DHT_U.h>
#include <WebServer.h>

#define DHTPIN 14
#define DHTTYPE DHT22
#define RELAY_PIN 13
#define CURENT_SENZOR_PIN 35
#define SENZOR_LUMINA_PIN 33
#define PIR_PIN 26
#define LED_BUILTIN 2

//Date retea si mqtt
const char* ssid = "DIGI-pBx3";
const char* password = "3pMUCUtX";

const char* mqtt_server = "mqtt.flespi.io";
const int mqtt_port = 1883;
const char* mqtt_user = "ZJnlYn4aQcFKpLlEkqWOZreXnq6OfOan1KSfJtGbFCg0SqOdfBIPWYQLiAgEnza6";
const char* mqtt_token = "";

//variabile globale
float temperatura = 0.0, umiditate = 0.0, offset = 0.0, totalCurentAh = 0.0;
float sensibilitate = 0.185;
bool esteModManual = false;
bool becAprins = false;
bool aprindereDeLaESP1 = false;
unsigned long timpAprindere = 0, ultimulTimpCurent = 0;
unsigned long timpUltimaMiscare = 0;
static bool miscareNoua = false;
static unsigned long timpUltimaStingere = 0;
int  stareLuminaAnterioara = -1, ultimaStareTrimisa = -1;
unsigned long momentSchimbareLumina = 0;
String motivLumina = "";
unsigned long momentPornire; 
unsigned long momentInceputIntuneric = 0;
static int stareAnterioaraPIR = LOW;
unsigned long momentStartStabilizarePIR;
bool pirStabilizat = false;

DHT dht(DHTPIN, DHTTYPE);
WiFiClient espClient;
PubSubClient client(espClient);
WebServer server(80);

// Conectare la reteaua wifi
void initWiFi() {
  WiFi.begin(ssid, password);
  Serial.print(" Conectare WiFi...");
  while (WiFi.status() != WL_CONNECTED) delay(500);
  Serial.println("WiFi conectat: " + WiFi.localIP().toString());
}
//initializare conexiune mqtt si subscribe la topicul trimis de esp1
void initMQTT() {
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
  while (!client.connected()) {
    if (client.connect("ESP2_TEST", mqtt_user, mqtt_token)) {
      client.subscribe("casa/usa/deschisa");
      Serial.println(" Subscris MQTT");


    } else {
      Serial.print(" MQTT: ");
      Serial.println(client.state());
      delay(2000);
    }
  }
}
//calibrare offset senzor curent
float calibrareOffset(int pin, int nrCitiri = 100) {
  long suma = 0;
  for (int i = 0; i < nrCitiri; i++) {
    suma += analogRead(pin);
    delay(2);
  }
  float medieADC = suma / (float)nrCitiri;
  return medieADC * (3.3 / 4095.0);
}

//configurare pini  si initailizare senzori
void initSenzori() {
  dht.begin();
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(PIR_PIN, INPUT);
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH);
  pinMode(SENZOR_LUMINA_PIN, INPUT);
  analogReadResolution(12);
  offset = calibrareOffset(CURENT_SENZOR_PIN, 100);
  Serial.print(" Offset curent: ");
  Serial.println(offset, 3);
}

//MASURARE CURENT
float masoaraCurent() {
  long suma = 0;
  for (int i = 0; i < 50; i++) {
    suma += analogRead(CURENT_SENZOR_PIN);
    delay(2);
  }
  float adcMediu = suma / 50.0;
  float tensiune = adcMediu * (3.3 / 4095.0);
  float curent = (tensiune - offset) / sensibilitate;
  return abs(curent) < 0.1 ? 0.0 : abs(curent);
}

// FUNCTIE APRINDERE BEC
void aprindeBec() {
  digitalWrite(RELAY_PIN, LOW);
  timpAprindere = millis();
  ultimulTimpCurent = millis();
  totalCurentAh = 0.0;
  becAprins = true;
  Serial.println(" Bec aprins");
}
//FUNCTIE STINGERE BEC
void stingeBec() {
  digitalWrite(RELAY_PIN, HIGH);
  becAprins = false;
  miscareNoua = false;
  aprindereDeLaESP1 = false;
  unsigned long durata = millis() - timpAprindere;
  trimiteSesiuneLaServer(totalCurentAh, durata);
}

// FUNCTIE DE CALLBACK LA PRIMIREA UNUI MESAJ MQTT
void callback(char* topic, byte* payload, unsigned int length) {
  String msg;
  for (int i = 0; i < length; i++) msg += (char)payload[i];


  if (String(topic) == "casa/usa/deschisa" && msg.startsWith("1")) {
    //  Comută înapoi în mod automat (dacă era manual)
    if (esteModManual) {
      esteModManual = false;
      Serial.println(" Modul automat activat din nou (usa deschisa)");
    }

    unsigned long momentActual = millis();
    bool esteIntuneric = digitalRead(SENZOR_LUMINA_PIN) == HIGH;
    bool intunericConfirmat = (esteIntuneric && (momentActual - momentInceputIntuneric >= 120000));
    bool startupRecent = (momentActual - momentPornire < 120000);
    bool intunericLaStartup = (startupRecent && esteIntuneric);

    if (intunericConfirmat || intunericLaStartup) {
      aprindeBec();
      aprindereDeLaESP1 = true;
      motivLumina = intunericLaStartup ? "usa deschisa + intuneric la pornire" : "usa deschisa + intuneric recent";
      Serial.println("MQTT => bec aprins de la usa deschisa + intuneric");
    } else {
      motivLumina = "usa deschisa dar lumina suficienta";
      Serial.println("MQTT => lumina suficienta, nu aprindem becul");
    }
  }

}


// FUNCTIE CARE RASPUNDE LA COMENZIILE TRIMISE DIN APLICATIA WEB
void handleControl() {
  String comanda = server.arg("plain");
  server.sendHeader("Access-Control-Allow-Origin", "*");
  bool becEsteAprins = (digitalRead(RELAY_PIN) == LOW);

  if (comanda == "turn_on_light") {
    if (!becEsteAprins) {
      aprindeBec();
      esteModManual = true;
      motivLumina = "comanda manuala: aprindere";
      server.send(200, "application/json", "{\"status\":\"Bec aprins\"}");
      Serial.println("comanda manuala: aprindere");
    } else server.send(200, "application/json", "{\"status\":\"Deja aprins\"}");
  } else if (comanda == "turn_off_light") {
    if (becEsteAprins) {
      stingeBec();
      esteModManual = true;
      motivLumina = "comanda manuala: stingere";
      server.send(200, "application/json", "{\"status\":\"Bec stins\"}");
        Serial.println("comanda manuala: stingere");
    } else server.send(200, "application/json", "{\"status\":\"Deja stins\"}");
  } else if (comanda == "set_mod_automat") {
    esteModManual = false;
    server.send(200, "application/json", "{\"status\":\"Mod setat: automat\"}");
  } else if (comanda == "set_mod_manual") {
    esteModManual = true;
    server.send(200, "application/json", "{\"status\":\"Mod setat: manual\"}");
  } else server.send(400, "application/json", "{\"status\":\"Comanda necunoscuta\"}");
}
//RASPUNS HTTP CU STAREA CURENTA A BECULUI SI MOTIVUL APRINDERII
void handleStatusLumina() {
  String json = "{";
  json += "\"lumina\":\"" + String(becAprins ? "aprinsa" : "stinsa") + "\",";
  json += "\"motiv_lumina\":\"" + motivLumina + "\",";
  json += "\"mod_curent\":\"" + String(esteModManual ? "manual" : "automat") + "\"}";
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", json);
}
//TRANSMITERE SESIUNE DE CONSUM 
void trimiteSesiuneLaServer(float totalAh, unsigned long durataMs) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin("http://192.168.100.8:8000/insert_sesiune.php");  // << endpoint nou
    http.addHeader("Content-Type", "application/x-www-form-urlencoded");

    String mod = esteModManual ? "manual" : "automat";
    unsigned long durataSec = durataMs / 1000;

    String postData = "curent_total=" + String(totalAh, 4) +
                      "&durata_sec=" + String(durataSec) +
                      "&mod=" + mod;

    int httpCode = http.POST(postData);
    Serial.printf(" Sesiune trimisă (%lus, %.4fAh, %s): %d\n", durataSec, totalAh, mod.c_str(), httpCode);

    http.end();
  }
}

// FUNCTIE DE TRIMITERE A VALORILOR PENTRU TEMPERATURA SI UMIDITATE MASURATE LA SERVER
void trimiteAmbientLaServer(float temperatura, float umiditate) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin("http://192.168.100.8:8000/insert_ambient.php");
    http.addHeader("Content-Type", "application/x-www-form-urlencoded");
    String postData = "temperatura=" + String(temperatura, 1) + "&umiditate=" + String(umiditate, 1);
    http.POST(postData);
    http.end();
  }
}
//FUNCTIE DE TRIMITERE A STARII LUMINII 
void trimiteLuminaLaServer(int valoareLumina) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin("http://192.168.100.8:8000/insert_lumina.php");
    http.addHeader("Content-Type", "application/x-www-form-urlencoded");
    String postData = "valoare=" + String(valoareLumina);
    http.POST(postData);
    http.end();
  }
}

void loop() {
  client.loop();
  server.handleClient();

  if (!pirStabilizat) {
    if (millis() - momentStartStabilizarePIR >= 60000) {
      pirStabilizat = true;
      Serial.println("\nPIR stabilizat!");
    } else {
      // Încă în perioada de stabilizare
      static unsigned long ultimulPrint = 0;
      if (millis() - ultimulPrint > 500) {
        Serial.print(".");
        ultimulPrint = millis();
      }
    }
  }
    if(pirStabilizat){
    unsigned long momentActual  = millis();
    const unsigned long intervalTrimitereLuminaPeriodica = 3000;
    static unsigned long ultimulTimpTrimitereLumina = 0;
    static unsigned long ultimulTimpCitireLumina = 0;
    static unsigned long ultimulTimpAmbient = 0;

    // Trimitere periodică stare lumină
    if (momentActual  - ultimulTimpTrimitereLumina >= intervalTrimitereLuminaPeriodica) {
      ultimulTimpTrimitereLumina = momentActual ;
      int stare = digitalRead(SENZOR_LUMINA_PIN);
      trimiteLuminaLaServer(stare);
      Serial.println(stare == LOW ? " Periodic: lumina" : " Periodic: intuneric");
    if (stare == HIGH && stareLuminaAnterioara == LOW) {
      // Doar la prima trecere la întuneric, salvăm momentul
      momentInceputIntuneric = millis();
      Serial.println(" Intuneric detectat - setăm momentInceputIntuneric");
    }
    }

    // Citire senzor lumină și PIR la fiecare 500ms
    if (momentActual  - ultimulTimpCitireLumina >= 500) {
      ultimulTimpCitireLumina = momentActual ;
      int citireLumina = digitalRead(SENZOR_LUMINA_PIN);
      int stareCurentaPIR = digitalRead(PIR_PIN);

      if (!esteModManual) {
        if (citireLumina != stareLuminaAnterioara) {
          stareLuminaAnterioara = citireLumina;
          momentSchimbareLumina = momentActual ;
        }

        // Detectare mișcare
        if (stareCurentaPIR == HIGH && stareAnterioaraPIR == LOW) {
          timpUltimaMiscare = momentActual ;
          miscareNoua = true;
          Serial.println(" Mișcare detectată!");
          digitalWrite(LED_BUILTIN, HIGH);
        } else if (stareCurentaPIR == LOW && stareAnterioaraPIR == HIGH) {
          Serial.println(" Mișcare oprită!");
          digitalWrite(LED_BUILTIN, LOW);
        } else if (stareCurentaPIR == LOW) {
          Serial.println(" Nu e mișcare.");
        } else {
          Serial.println(" Mișcare în curs.");
        }
        stareAnterioaraPIR = stareCurentaPIR;

        // Condiții lumină + mișcare
        bool intunericConfirmat = (citireLumina == HIGH && (momentActual  - momentSchimbareLumina >= 120000));
        bool intunericLaPornire = (citireLumina == HIGH && (momentActual  - momentPornire < 120000));

        if (!becAprins && miscareNoua && (momentActual  - timpUltimaStingere >= 60000) && (intunericConfirmat || intunericLaPornire)) {
          aprindeBec();
          motivLumina = intunericLaPornire ? "miscare + intuneric dupa pornire" : "miscare + intuneric constant";
          miscareNoua = false;
          Serial.println(" Bec aprins automat");
        }

        if (becAprins && stareCurentaPIR == LOW && (momentActual  - timpUltimaMiscare >= 30000) &&  (!aprindereDeLaESP1 || (momentActual  - timpAprindere >= 60000))) {
          stingeBec();
          motivLumina = "stingere automata: lipsa miscare 30s";
          Serial.println(" Bec stins - fără mișcare 30 sec");
        }

        if (becAprins && (momentActual  - momentSchimbareLumina >= 120000) && citireLumina == LOW) {
          stingeBec();
          motivLumina = "stingere automata: lumina naturala";
          Serial.println(" Bec stins - lumină naturală detectată");
        }

        if (becAprins && (momentActual  - timpAprindere >= 300000)) {
          stingeBec();
          motivLumina = "stingere automata: durata maxima atinsa";
          Serial.println(" Bec stins - durata maxima sesiune atinsa");
        }
      }

      if ((momentActual  - momentSchimbareLumina >= 120000) && citireLumina != ultimaStareTrimisa) {
        ultimaStareTrimisa = citireLumina;
        trimiteLuminaLaServer(citireLumina);
        Serial.println(ultimaStareTrimisa == LOW ? " Lumina confirmată" : " Intuneric confirmat");
      }
    }

    // Trimitere ambient
    if (momentActual  - ultimulTimpAmbient >= 60000) {
      ultimulTimpAmbient = momentActual ;
      float t = dht.readTemperature();
      float h = dht.readHumidity();
      if (!isnan(t) && !isnan(h)) {
        temperatura = t;
        umiditate = h;
        trimiteAmbientLaServer(t, h);
      }
    }

    // Măsurare curent
    if (becAprins && momentActual  - ultimulTimpCurent >= 1000) {
      ultimulTimpCurent = momentActual ;
      float curent = masoaraCurent();
      totalCurentAh += (curent / 3600.0);
    }
  }
}
void setup() {
  Serial.begin(115200);
  initSenzori();

  momentStartStabilizarePIR = millis();
  Serial.println("Așteptare stabilizare PIR…");
  
  momentPornire = millis();  // Marchez momentul inițial
  // Inițializare stare lumină și marcarea momentului actual ca referință
  stareLuminaAnterioara = digitalRead(SENZOR_LUMINA_PIN);
  momentSchimbareLumina = millis();  // prevenim false-negative la pornire
  if (stareLuminaAnterioara == HIGH) {
    // Dacă e deja întuneric, presupunem că a început cu 2 minute în urmă
    momentInceputIntuneric = millis() - 120000;
    Serial.println(" Startup: întuneric detectat, setăm ca început acum 2 minute");
  }
  delay(2000);
  initWiFi();
  initMQTT();
  server.on("/status", HTTP_GET, handleStatusLumina);
  server.on("/control", HTTP_POST, handleControl);
  server.begin();
}
