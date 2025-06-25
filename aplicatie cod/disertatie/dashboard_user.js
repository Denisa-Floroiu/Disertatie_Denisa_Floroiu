window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const email = params.get('email');
  if (email) {
    localStorage.setItem('userEmail', email);
    showEmail(email);

    // Șterge parametrii din URL fără să reîncarce pagina
    const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
    window.history.replaceState({}, document.title, newUrl);
  } else {
    const storedEmail = localStorage.getItem('userEmail');
    if (storedEmail) {
      showEmail(storedEmail);
    }
  }
  afiseazaUserCurent();
});


function showEmail(email) {
  const container = document.getElementById('userEmailContainer');
  if (container) {
    container.textContent = `Bine ai venit, ${email}`;
  }
}
// Presupunem că ai emailul userului logat într-o variabilă
const currentUserEmail = localStorage.getItem('userEmail') || '';

// Apoi faci fetch la toți userii, dar afișezi doar pe cel curent:
function afiseazaUserCurent() {
  const currentUserEmail = localStorage.getItem('userEmail') || '';

  fetch("../list_users.php")
    .then(res => res.json())
    .then(users => {
      const container = document.getElementById("userInfoContainer");
      container.innerHTML = "";

      const currentUser = users.find(user => user.email === currentUserEmail);

      if (!currentUser) {
        container.innerHTML = "<p>Nu s-au găsit date pentru utilizatorul curent.</p>";
        return;
      }

      window.selectedUserId = currentUser.id;

      const status = currentUser.status === 'activ'
        ? '<span class="status-active">activ</span>'
        : '<span class="status-inactive">inactiv</span>';

      container.innerHTML = `
        <div><strong>ROL:</strong> ${currentUser.role}</div>
        <div><strong>RFID:</strong> ${currentUser.rfid_code || '-'}</div>
        <div><strong>STATUS:</strong> ${status}</div>
        <div>
            <strong>PIN Code:</strong>
            <span id="pin-${currentUser.id}">****</span>
            <img
              id="icon-${currentUser.id}"
              src="image/hidden.png"
              alt="Toggle PIN"
              onclick="togglePin('${currentUser.id}', '${currentUser.pin_code}')"
              style="width: 16px; height: 16px; cursor: pointer; vertical-align: middle; margin-left: 5px;"
            />
        </div>
        <div class="button-group-inline">
            <button id="btnResetParola" onclick="deschideModalReset()"> Schimbă parola</button>
            <button id="btnResetParola" onclick="deschideModalResetPIN()"> Schimbă PIN</button>
        </div>
      `;
    })
    .catch(err => {
      console.error("Eroare la încărcarea utilizatorului:", err);
    });
}

function togglePin(id, realPin) {
  const span = document.getElementById(`pin-${id}`);
  const icon = document.getElementById(`icon-${id}`);

  const openEye = "image/eye.png";
  const closedEye = "image/hidden.png";

  if (span.textContent === '****') {
    span.textContent = realPin;
    icon.src = openEye;
  } else {
    span.textContent = '****';
    icon.src = closedEye;
  }
}
function deschideModalReset() {
    document.getElementById('modalResetParola').style.display = 'flex';
}
function inchideModalReset() {
    document.getElementById('modalResetParola').style.display = 'none';
}
function deschideModalResetPIN() {
    document.getElementById('modalResetPIN').style.display = 'flex';
}
function inchideModalResetPIN() {
    document.getElementById('modalResetPIN').style.display = 'none';
}
function trimiteSchimbarePin() {

  const pin = document.getElementById("edit-pin").value.trim();

  if (!/^\d{4}$/.test(pin)) {
    alert("PIN-ul trebuie să conțină exact 4 cifre!");
    return false;
  }

  // Exemplu trimitere AJAX
  fetch("update_pin.php", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `pin_code=${encodeURIComponent(pin)}&user_id=${selectedUserId}` // selectedUserId trebuie setat înainte
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert("PIN actualizat cu succes!");
        document.getElementById("modalResetPIN").style.display = "none";
        afiseazaUserCurent();
      } else {
        alert("Eroare: " + data.error);
      }
    });

  return false;
}

function trimiteSchimbareParola() {
  const parolaVeche = document.getElementById('parolaVeche').value;
  const parolaNoua = document.getElementById('parolaNoua').value;
  const parolaConfirmare = document.getElementById('parolaConfirmare').value;
  const email = currentUserEmail; // setează acest email din contextul tău JS

  if (!parolaVeche || !parolaNoua || !parolaConfirmare) {
    alert("Completează toate câmpurile.");
    return;
  }

  if (parolaNoua !== parolaConfirmare) {
    alert("Parolele noi nu coincid.");
    return;
  }

  fetch("resetare_parola_de_catre_user.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: `email=${encodeURIComponent(email)}&parolaVeche=${encodeURIComponent(parolaVeche)}&parolaNoua=${encodeURIComponent(parolaNoua)}`
  })
  .then(res => res.text())
  .then(msg => {
    alert(msg);
    if (msg.includes("succes")) {
      inchideModalReset();
      document.getElementById('parolaVeche').value = '';
      document.getElementById('parolaNoua').value = '';
      document.getElementById('parolaConfirmare').value = '';
    }
  })
  .catch(err => {
    console.error(err);
    alert("Eroare la trimiterea datelor.");
  });
}
