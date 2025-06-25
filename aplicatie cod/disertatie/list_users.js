  // Declari global
const container = document.getElementById("userContainer");
  function loadUsers() {
    container.innerHTML = ""; // curățăm conținutul

    fetch("../list_users.php")
      .then(res => res.json())
      .then(users => {
        users.forEach(user => {
          const card = document.createElement("div");
          card.className = "user-card";

          card.innerHTML = `
            <div><strong>Email:</strong> ${user.email}</div>
            <div><strong>Rol:</strong> ${user.role}</div>
            <div style="display: flex; align-items: center;">
              <strong style="margin-right: 5px;">RFID:</strong>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span id="rfid-${user.id}">${user.rfid_code || '-'}</span>
                ${
                  user.rfid_code
                    ? `<button onclick="removeRfid(${user.id})" title="Șterge RFID"
              style="
                background-color: #f8d7da;
                border: none;
                color: red;
                cursor: pointer;
                padding: 0;
                border-radius: 40%;
                width: 18px;
                height: 18px;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
                top: -5px;
              ">
              <i class="fa fa-times" style="font-size: 10px; position: relative; top: 0px;"></i>

            </button>
            `
                    : ''
                }
              </div>
            </div>
            <div>
              <strong>PIN Code:</strong>
              <span id="pin-${user.id}">****</span>
              <img
                id="icon-${user.id}"
                src="image/hidden.png"
                alt="Toggle PIN"
                onclick="togglePin('${user.id}', '${user.pin_code}')"
                style="width: 16px; height: 16px; cursor: pointer; vertical-align: middle; margin-left: 5px;"
              />
            </div>
            <div><strong>Creat la:</strong> ${user.created_at}</div>
          `;

          //  Afișează doar dacă există updated_at
          if (user.update_at) {
            const updatedDiv = document.createElement("div");
            updatedDiv.innerHTML = `<strong>Modificat la:</strong> ${user.update_at}`;
            card.appendChild(updatedDiv);
          }

          const statusRow = document.createElement("div");
          statusRow.innerHTML = `<strong>Status:</strong> `;

          if (user.role === "admin") {
            const statusText = document.createElement("span");
            statusText.textContent = "Activ permanent";
            statusText.style.fontWeight = "bold";
            statusText.style.color = "green";
            statusRow.appendChild(statusText);
          } else {
            const switchLabel = document.createElement("label");
            switchLabel.className = "switch";

            const input = document.createElement("input");
            input.type = "checkbox";
            input.checked = user.status === "activ";

            const slider = document.createElement("span");
            slider.className = "slider round";

            input.addEventListener("change", () => {
              const newStatus = input.checked ? "activ" : "inactiv";

              fetch("../toggle_status.php", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: `id=${user.id}&status=${newStatus}`
              })
                .then(res => res.json())
                .then(data => {
                  if (!data.success) {
                    alert(" Eroare la actualizare!");
                    input.checked = !input.checked;
                  }
                });
            });

            switchLabel.appendChild(input);
            switchLabel.appendChild(slider);
            statusRow.appendChild(switchLabel);
          }
          card.appendChild(statusRow);
          const buttonContainer = document.createElement("div");
          buttonContainer.className = "button-container";

          // Buton editare
          const editButton = document.createElement("button");
          editButton.className = "edit-btn";
          editButton.innerHTML = '<i class="fas fa-pen"></i>'; 
          editButton.addEventListener("click", () => openEditModal(user));
          buttonContainer.appendChild(editButton);

          //  Buton ștergere
          const deleteButton = document.createElement("button");
          deleteButton.className = "delete-btn";
          deleteButton.innerHTML = '<i class="fas fa-trash"></i>'; 
          deleteButton.addEventListener("click", () => {
            if (confirm(`Sigur vrei să ștergi utilizatorul ${user.email}?`)) {
              stergeUtilizator(user.id);
            }
          });
          buttonContainer.appendChild(deleteButton);

          // Apoi adaugă containerul în cardul .cardcontrol
          card.appendChild(buttonContainer);

        //Resetare PIN ADMIN
        if (user.role === "admin") {
          const resetPinButton = document.createElement("button");
          resetPinButton.className = "reset-btn";
          resetPinButton.innerHTML = '<i class="fa-solid fa-repeat"></i> Resetează PIN ADMIN';
          resetPinButton.addEventListener("click", () => {if (!confirm("Sigur vrei să resetezi PIN-ul pentru înrolarea cardurilor RFID ?")) return;
            fetch("../reset_admin_pin.php", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: `user_id=${user.id}`
            })
              .then(res => res.json())
              .then(data => {
                if (data.success) {
                  showPinPopup(data.pin);
                } else {
                  alert("❌ " + data.error);
                }
              });
          });
          card.appendChild(resetPinButton);
        }


          //Resetare Parola
          const resetPasswordButton = document.createElement("button");
          resetPasswordButton.className = "reset-btn";
          resetPasswordButton.innerHTML = '<i class="fa-solid fa-repeat"></i> Resetează PAROLĂ';
          resetPasswordButton.addEventListener("click", () => {if (!confirm("Sigur vrei să resetezi parola acestui utilizator?")) return;
          fetch("../reset_password.php", {
            method: "POST",
            headers: {"Content-Type": "application/x-www-form-urlencoded" },
            body: `user_id=${user.id}`
          })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              alert(" Parola a fost resetată și trimisă utilizatorului pe email.");
            } else {
              alert(" Eroare: " + data.error);
            }
          });
          });
          card.appendChild(resetPasswordButton);
          container.appendChild(card);
          });
      });
  }
document.addEventListener("DOMContentLoaded", () => {


    // Inițial încarcă toți utilizatorii
  loadUsers(); // inițial

    

  // Adaugă cont – modal
  document.getElementById("openModal").addEventListener("click", () => {document.getElementById("addUserModal").style.display = "flex";});

  document.getElementById("closeModal").addEventListener("click", () => {document.getElementById("addUserModal").style.display = "none";});

  //  MODAL EDITARE
  document.getElementById("closeEditModal").addEventListener("click", () => {document.getElementById("editUserModal").style.display = "none";});

  //Trimitere date cont nou pt salvare
  document.getElementById("addUserForm").addEventListener("submit", (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);

    fetch("../add_users.php", {
      method: "POST",
      body: new URLSearchParams(formData),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert(" Utilizator adăugat cu succes!");
          document.getElementById("addUserModal").style.display = "none";
          loadUsers(); // încarcă lista actualizată
        } else {
          alert(" " + data.error);
        }
      })
      .catch(err => {
        alert(" Eroare rețea!");
        console.error(err);
      });
  });

  document.getElementById("editUserForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const pin = document.getElementById("edit-pin").value;
      if (pin.length !== 4) {
        e.preventDefault();
        alert("PIN-ul trebuie să aibă exact 4 caractere.");
         return; 
      }
    fetch("../update_list_users.php", {
      method: "POST",
      body: new URLSearchParams(formData),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert(" Utilizator actualizat!");
          document.getElementById("editUserModal").style.display = "none";
          loadUsers(); //  Reîncarcă toți utilizatorii și va apărea „Modificat la”
        } else {
          alert(" Eroare la salvare!");
        }
      });
  });
});
function showPinPopup(pin) {
  const modal = document.createElement("div");
  modal.style.position = "fixed";
  modal.style.top = "0";
  modal.style.left = "0";
  modal.style.width = "100%";
  modal.style.height = "100%";
  modal.style.background = "rgba(0,0,0,0.5)";
  modal.style.display = "flex";
  modal.style.justifyContent = "center";
  modal.style.alignItems = "center";
  modal.innerHTML = `
    <div style="background: white; padding: 30px; border-radius: 8px; text-align: center;">
      <h3> Noul PIN admin</h3>
      <p style="font-size: 24px; font-weight: bold;">${pin}</p>
      <p>Salvează-l acum! Nu va mai fi afișat.</p>
      <button onclick="this.parentElement.parentElement.remove()">Închide</button>
    </div>
  `;
  document.body.appendChild(modal);
}
  //functie stergere cont utilizator
function stergeUtilizator(id) {
  fetch("../delete_user.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: `user_id=${encodeURIComponent(id)}`
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      alert(" Utilizator șters cu succes!");
      loadUsers(); 
    } else {
      alert(" Eroare la ștergere: " + data.error);
    }
  })
  .catch(error => {
    console.error("Eroare rețea:", error);
    alert(" Eroare de rețea!");
  });
}

function removeRfid(userId) {
  if (!confirm("Sigur vrei să ștergi codul RFID?")) return;

  fetch("../remove_rfid.php", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `user_id=${userId}`
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        const span = document.getElementById(`rfid-${userId}`);
        span.textContent = "-";
        span.nextElementSibling?.remove(); 
      } else {
        alert("Eroare la ștergerea RFID: " + data.error);
      }
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

//  Funcție deschidere modal editare
function openEditModal(user) {
  document.getElementById("edit-id").value = user.id;
  document.getElementById("edit-email").value = user.email;
  document.getElementById("edit-rfid").value = user.rfid_code || '';
  document.getElementById("edit-pin").value = user.pin_code || '';
  document.getElementById("editUserModal").style.display = "flex";
}
