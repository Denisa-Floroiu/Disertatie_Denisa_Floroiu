const ESP_IP = "http://192.168.100.35"; // ← IP ESP32
const ESP_LUMINA = "http://192.168.100.32";
function actualizeazaStari() {
  // Status pentru ușă (ESP1)
  $.ajax({
    url: ESP_IP + "/status",
    type: "GET",
    dataType: "json",
    success: function(data) {
      $("#statusUsa").text("Stare: ușa este " + data.usa);
      if (data.motiv_usa) {
        $("#notificariUsa").html(" Motiv: " + data.motiv_usa).show();
      } else {
        $("#notificariUsa").hide();
      }
    },
    error: function() {
      $("#statusUsa").text(" Eroare la citirea stării ușii");
      $("#notificariUsa").html(" ESP32 nu răspunde").show();
    }
  });

  // Status pentru lumină (ESP2)
  $.ajax({
    url: ESP_LUMINA + "/status",
    type: "GET",
    dataType: "json",
    success: function(data) {
      $("#statusLumina").text("Stare: lumina este " + data.lumina);
      if (data.motiv_lumina) {
        $("#notificariLumina").html("💡 Motiv: " + data.motiv_lumina).show();
      } else {
        $("#notificariLumina").hide();
      }
    },
    error: function() {
      $("#statusLumina").text(" Eroare la citirea stării luminii");
      $("#notificariLumina").html(" ESP32 nu răspunde").show();
    }
  });
}

      function actualizeazaAmbient() {
      $.ajax({
        url: "get_ambient.php",
        method: "GET",
        dataType: "json",
        success: function(data) {
      $("#temperaturaCurenta").text(data.temperatura ?? "--");
      $("#umiditateCurenta").text(data.umiditate ?? "--");

        },
        error: function() {
          $("#temperaturaCurenta").text("❌");
          $("#umiditateCurenta").text("❌");
        }
      });
      }

      function actualizeazaLuminaAmbientala() {
  $.ajax({
    url: "get_lumina.php",
    method: "GET",
    dataType: "json",
    success: function(data) {
      document.getElementById("nivel_lumina").textContent = data.valoare == 0 ? "Detectată": "Absentă";
    },
    error: function() {
      $("#luminaAmbient").text("❌");
    }
  });
}

function trimiteComanda(comanda) {
  $.ajax({
    url: ESP_IP + "/control",
    type: "POST",
    contentType: "text/plain",
    data: comanda,
    dataType: "json",
    success: function(raspuns) {
      alert("✅ " + raspuns.status);
      actualizeazaStari();
    },
    error: function() {
      alert(" Eroare la trimiterea comenzii.");
    }
  });
}

function trimiteComandaLuminaESP2(comanda) {
  $.ajax({
    url: ESP_LUMINA + "/control", // endpoint-ul definit în ESP2
    type: "POST",
    contentType: "text/plain",
    data: comanda,
    dataType: "json",
    success: function(raspuns) {
      alert("💡 " + raspuns.status);
      actualizeazaModCurent();
    },
    error: function() {
      alert(" Nu s-a putut trimite comanda către ESP-ul de lumină.");
    }
  });
}
function actualizeazaModCurent() {
  fetch(ESP_LUMINA + "/status")
    .then(res => res.json())
    .then(data => {
      document.getElementById("modCurent").innerText = "Mod curent: " + data.mod_curent;
    })
    .catch(() => {
      document.getElementById("modCurent").innerText = "Mod curent: necunoscut";
    });
}

function setModAutomat() {
  fetch(ESP_LUMINA + "/control", {
    method: "POST",
    body: "set_mod_automat"
  }).then(() => actualizeazaModCurent());
}

function setModManual() {
  fetch(ESP_LUMINA + "/control", {
    method: "POST",
    body: "set_mod_manual"
  }).then(() => actualizeazaModCurent());
}


let grafic = null;

function inchideModal() {
  document.getElementById("raportModal").style.display = "none";
  if (grafic) grafic.destroy();
}
function cauta() {
  const start = document.getElementById("start").value;
  const end   = document.getElementById("end").value;

  if (!start || !end) {
    alert("Completează ambele date.");
    return;
  }

  const formData = new FormData();
  formData.append("start", start.replace("T", " "));
  formData.append("end", end.replace("T", " "));

  fetch("get_curent.php", {
    method: "POST",
    body: formData
  })
  .then(resp => resp.json())
  .then(data => {
    if (data.error) {
      alert(data.error);
      return;
    }

    window.ultimeleSesiuni = data.sesiuni;

    // Actualizare afișaj cu valori pe moduri separate
    document.getElementById("rezultat").innerHTML = `
      🟦 Automat – Sesiuni: <b>${data.auto.count}</b>,
             Total Ah: <b>${data.auto.totalAh}</b>,
             Wh: <b>${data.auto.totalWh}</b><br>
      🟥 Manual – Sesiuni: <b>${data.manual.count}</b>,
             Total Ah: <b>${data.manual.totalAh}</b>,
             Wh: <b>${data.manual.totalWh}</b><br><br>
      <button onclick="afiseazaGrafic()"> Vezi grafic</button>
    `;
  })
  .catch(err => alert("Eroare la preluarea datelor"));
}
function exportaSesiuniCSV() {
  const sesiuni = window.ultimeleSesiuni;
  if (!sesiuni || !sesiuni.length) {
    alert(" Nicio sesiune disponibilă pentru export.");
    return;
  }

  // Determinăm intervalul (în funcție de timestamp)
  const dateSortate = [...sesiuni].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const start = new Date(dateSortate[0].timestamp).toLocaleString();
  const end = new Date(dateSortate[dateSortate.length - 1].timestamp).toLocaleString();

  const header = ["Mod", "Timestamp", "Durata (s)", "Consum (Ah)", "Consum (Wh)"];
  const rows = sesiuni.map(s =>
    [
      s.mod,
      new Date(s.timestamp).toLocaleString(),
      s.durata_secunde,
      Number(s.curent_total).toFixed(4),
      Number(s.energie_wh).toFixed(2)
    ]
  );

  const csvContent = [
    [`Interval test:`, `${start} - ${end}`],
    [],
    header,
    ...rows
  ].map(r => r.join(",")).join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "raport_consum_sesiuni.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function afiseazaGrafic() {
  const sesiuni = window.ultimeleSesiuni;
  if (!sesiuni || !sesiuni.length) {
    alert(" Nicio sesiune disponibilă.");
    return;
  }

  // Grupare și totalizare
  let totalAutomat = 0, totalManual = 0;
  let nrAutomat = 0, nrManual = 0;

  sesiuni.forEach(s => {
    const wh = parseFloat(s.energie_wh);
    if (s.mod === "automat") {
      totalAutomat += wh;
      nrAutomat++;
    } else {
      totalManual += wh;
      nrManual++;
    }
  });

  // Evitare împărțire la zero
  const economie = totalManual > 0
    ? (((totalManual - totalAutomat) / totalManual) * 100).toFixed(1)
    : 0;

  // Determinare interval date
  const sortate = [...sesiuni].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const start = new Date(sortate[0].timestamp).toLocaleString();
  const end = new Date(sortate[sortate.length - 1].timestamp).toLocaleString();
  const intervalTitlu = `Interval: ${start} – ${end}`;
  const economieText = `Eficiența energetică a modului Automat față de modul Manual: ${economie}%`;

  // Setări grafic
  const ctx = document.getElementById("graficConsum").getContext("2d");
  if (grafic) grafic.destroy();

  grafic = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Mod Automat", "Mod Manual"],
      datasets: [{
        label: "Consum total (Wh)",
        data: [totalAutomat.toFixed(2), totalManual.toFixed(2)],
        backgroundColor: ["#3498db", "#e74c3c"],
        datalabels: {
          anchor: 'end',
          align: 'top',
          formatter: val => `${val} Wh`,
          font: { weight: 'bold' }
        }
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: [
            "Comparație consum – Mod Manual vs Automat",
            intervalTitlu,
            economieText
          ],
          font: {
            size: 16,
            weight: 'bold'
          }
        },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.parsed.y} Wh`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          suggestedMax: Math.max(totalAutomat, totalManual) * 1.2,
          title: {
            display: true,
            text: "Consum energie (Wh)"
          }
        }
      }
    },
    plugins: [ChartDataLabels]
  });

  document.getElementById("raportModal").style.display = "flex";
}

$(document).ready(function() {
  actualizeazaStari();
  setInterval(actualizeazaStari,2000);
  // Apelez periodic
  setInterval(actualizeazaAmbient,2000 );
  actualizeazaAmbient();
  actualizeazaModCurent();
  setInterval(actualizeazaLuminaAmbientala, 2000);
  actualizeazaLuminaAmbientala();
  fetch("verifica_role.php")
    .then(res => res.json())
    .then(data => {
      // Selectează bara de navigare
      const nav = document.querySelector(".nav-links");

      // Verifică dacă e autentificat
      if (!data.success) {
        nav.innerHTML = `<a href="index.html"> Logout</a>`;
        return;
      }
  let linksHTML=""
      // Linkuri pentru admin
      if (data.role === "admin") {
        linksHTML += `
                  <a href="admin_dashboard.html" class="active"><i class="fa-solid fa-house"></i> Acasă</a>
                  <a href="list_users.html"><i class="fa-solid fa-users"></i> Utilizatori</a>
                  <a href="list_rfid.html"><i class="fa-solid fa-id-card"></i> Carduri RFID neasociate</a>
  `;
      }
          if (data.role === "user") {
        linksHTML += `
                  <a href="dashboard_user.html" class="active"><i class="fa-solid fa-house"></i>  Acasă</a>
                      `;
      }
          // Linkuri comune
      linksHTML += `
                                  <a href="control_sistem.html"><i class="fa fa-cog" aria-hidden="true"></i> Control și monitorizare sistem</a> 
      `;
      // Link logout
      linksHTML += `<a href="index.html"><i class="fa-solid fa-arrow-right-from-bracket"></i> Logout</a>`;

      // Injectează linkurile
      nav.innerHTML = linksHTML;

      // Ascunde cardul de mod funcționare dacă nu e admin
      if (data.role === "admin") {
        document.querySelector(".card-mod-func").style.display = "block";
      }
    });

    // Butoane control sistem
    $("#btnDeschideUsa").click(() => trimiteComanda("open_door"));
    $("#btnInchideUsa").click(() => trimiteComanda("close_door"));
    $("#btnAprindeLumina").click(() => trimiteComandaLuminaESP2("turn_on_light"));
    $("#btnStingeLumina").click(() => trimiteComandaLuminaESP2("turn_off_light"));

    //  Setează limita maximă pentru calendar la data curentă
    const azi = new Date().toISOString().slice(0, 16); // "YYYY-MM-DDTHH:mm"
    $("#start").attr("max", azi);
    $("#end").attr("max", azi);


  
});

