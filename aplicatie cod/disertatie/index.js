// index.js

function openAdminModal() {
  document.getElementById("adminSetupModal").style.display = "flex";
}

function closeAdminModal() {
  document.getElementById("adminSetupModal").style.display = "none";
}

function openLoginModal() {
  document.getElementById("loginModal").style.display = "flex";
}

function closeLoginModal() {
  document.getElementById("loginModal").style.display = "none";
  const loginForm = document.querySelector("#loginModal form");
  if (loginForm) {
    loginForm.reset();
  }
}
function closeConfirmChangePasswordModal() {
  document.getElementById('confirmChangePasswordModal').style.display = 'none';
}
function closeChangePasswordFormModal() {
  document.getElementById('changePasswordFormModal').style.display = 'none';
}
function openPinModal(pin) {
  document.getElementById("adminPinDisplay").textContent = pin;
  document.getElementById("adminPinModal").style.display = "flex";
}

function closePinModal() {
  document.getElementById("adminPinModal").style.display = "none";
  document.getElementById("setPinModal").style.display = "flex";
}

function showConfirmChangePasswordModal(onYes, onNo) {
  const modal = document.getElementById('confirmChangePasswordModal');
  modal.style.display = 'block';

  document.getElementById('confirmChangeYes').onclick = () => {
    modal.style.display = 'none';
    onYes();
  };

  document.getElementById('confirmChangeNo').onclick = () => {
    modal.style.display = 'none';
    onNo();
  };
}

function showChangePasswordFormModal(onSuccess) {
  const modal = document.getElementById('changePasswordFormModal');
  modal.style.display = 'flex';

  const form = document.getElementById('changePasswordForm');
  form.reset();

  form.onsubmit = async (e) => {
    e.preventDefault();
    const newPass = document.getElementById('newPassword').value;
    const confirmPass = document.getElementById('confirmPassword').value;

    if (newPass !== confirmPass) {
      alert('Parolele nu coincid!');
      return;
    }

    try {
      const res = await fetch('change_password.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPass }),
        credentials: 'include'
      });

      const data = await res.json();

      if (data.success) {
        alert('Parola a fost schimbată cu succes!');
        modal.style.display = 'none';
        onSuccess();
      } else {
        alert(data.error || 'Eroare la schimbarea parolei!');
              // Clear câmpurile de parolă pentru retry
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
      }
    } catch (err) {
      console.error(err);
      alert('Eroare la comunicarea cu serverul.');
    }
  };
}

document.addEventListener('DOMContentLoaded', () => {
  // Login form submit handler
  const loginForm = document.querySelector('#loginModal form');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(loginForm);
    const email = formData.get('email');
    const password = formData.get('password');

    try {
      const response = await fetch('../login.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: `email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`
      });
      const data = await response.json();

      if (!data.success) {
        alert(data.error || 'Date incorecte!');
        return;
      }
      if (data.status && data.status !== 'activ') {
        alert('Contul tău este inactiv și nu poate accesa aplicația.');
        return;
      }
if (data.must_change_password) {
  closeLoginModal();

  // Deschide formularul de schimbare parolă
  showChangePasswordFormModal(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("email", email);
    url.searchParams.set("role", data.role);
    window.history.replaceState({}, '', url);

    // Verifică dacă trebuie setat și PIN-ul
    if (data.pin_code === "1234") {
      document.getElementById("setPinModal").style.display = "flex";
    } else {
      // PIN-ul este deja setat, mergi direct la dashboard
      if (data.role === "admin") {
        window.location.href = "admin_dashboard.html";
      } else {
        window.location.href = `dashboard_user.html?email=${encodeURIComponent(email)}`;
      }
    }
  });
} else {
  // Dacă nu e nevoie să schimbe parola, mergem direct la dashboard
  closeLoginModal();
  if (data.role === 'admin') {
    window.location.href = 'admin_dashboard.html';
  } else {
    window.location.href = `dashboard_user.html?email=${encodeURIComponent(email)}`;
  }
}


    } catch (err) {
      alert('Eroare la autentificare.');
      console.error(err);
    }
  });

  document.getElementById("setPinForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const formData = new FormData(this);
  const pin = formData.get("pin_code");
  const urlParams = new URLSearchParams(window.location.search);
  const email = urlParams.get("email");
  const role = urlParams.get("role");
  const userId = urlParams.get("user_id"); // dacă îl ai, altfel îl obții la login

  // Validare simplă (opțională, redundanță pentru `pattern`)
if (!/^\d{4}$/.test(pin)) {
  alert("PIN-ul trebuie să conțină exact 4 cifre.");
  return;
}

  try {
    const res = await fetch("set_pin.php", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `pin_code=${encodeURIComponent(pin)}&email=${encodeURIComponent(email)}&role=${encodeURIComponent(role)}`
    });

    const data = await res.json();

    if (data.success) {
      alert(" PIN salvat cu succes!");
      document.getElementById("setPinModal").style.display = "none";
      // Citim emailul și rolul din URL ca să redirecționăm corect
      const urlParams = new URLSearchParams(window.location.search);
      const email = urlParams.get("email");
      const role = urlParams.get("role");

      if (role === "admin") {
        window.location.href = "admin_dashboard.html";
      } else {
        window.location.href = `dashboard_user.html?email=${encodeURIComponent(email)}`;
      }
    } else {
      alert(" " + data.error);
    }
  } catch (err) {
    console.error("Eroare AJAX:", err);
    alert(" Eroare la trimitere. Încearcă din nou.");
  }
});


  // Alte inițializări, dacă ai nevoie
  const params = new URLSearchParams(window.location.search);
  if (params.get("success") === "1" && params.get("pin")) {
    openPinModal(params.get("pin"));
  // Salvăm email + role în istoric pentru redirecționări ulterioare
  const email = params.get("email");
  const role = params.get("role");
  if (email && role) {
    window.history.replaceState({}, '', `?email=${email}&role=${role}&pin=${params.get("pin")}`);
  }
  }

  function checkAdminRepeat() {
    fetch("../check_admin.php")
      .then(response => response.json())
      .then(data => {
        if (!data.exists) {
          console.log("Nu există admin. FORȚĂM popup-ul.");
          openAdminModal();
        }
      })
      .catch(error => {
        console.error("Eroare verificare admin:", error);
      });
  }
  checkAdminRepeat();
  setInterval(checkAdminRepeat, 3000);
});
document.getElementById("adminSetupModal").addEventListener("submit", function (e) {
  const pass = document.querySelector("input[name='password']").value;
  const confirm = document.querySelector("input[name='confirm_password']").value;

  if (pass !== confirm) {
    e.preventDefault();
    alert(" Parolele nu coincid!");
  }
});
