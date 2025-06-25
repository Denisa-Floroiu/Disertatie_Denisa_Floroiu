function toggleExtras() {
  const mod = document.getElementById("modul").value;
  const extras = document.getElementById("extras");
  const utilizatoriContainer = document.getElementById("utilizatoriContainer");
  const intervalAccess = document.getElementById("intervalAccess");
  utilizatoriContainer.innerHTML = "";
  intervalAccess.style.display = mod === "normal" ? "none" : "block"; ;


  extras.style.display = "block";
  utilizatoriContainer.style.display = "block";

  // încarcă conținutul în funcție de modul selectat
  incarcareUtilizatori(mod);
}

document.getElementById("setariModal").addEventListener("shown.bs.modal", function () {
  toggleExtras(); //  forțăm inițializarea modului selectat
});


function incarcareUtilizatori(mod) {
  const container = document.getElementById("utilizatoriContainer");
  const inputs = document.querySelectorAll("#intervalAccess input");

  if (mod === "normal") {
    container.innerHTML = `
      <p style="color: #0d6efd; font-weight: 600; font-size: 15px; margin-bottom: 8px;">
        <img src="image/important.png" alt="important" width="40" height="40" class="me-2">
        <span style="font-weight: 500; color: #333;">Toți utilizatorii au acces în acest mod.</span>
      </p>`;
    
    // Golește și intervalele dacă e modul normal
    inputs[0].value = "";
    inputs[1].value = "";
    return;
  }

  fetch(`get_users_moduri.php?mod=${mod}`)
    .then(r => r.json())
    .then(data => {
      const utilizatori = data.users || [];

      container.innerHTML = "";
      const title = document.createElement("p");
      title.textContent = "Utilizatori cu acces:";
      title.style.fontWeight = "600";
      title.className = "mb-2";
      container.appendChild(title);

      utilizatori.forEach(user => {
        const isAdmin = user.role === "admin";
        const checked = isAdmin || user.are_acces ? "checked" : "";
        const lock = isAdmin ? `onclick="return false;"` : "";

        const wrapper = document.createElement("div");
        wrapper.className = "form-check custom-checkbox d-flex align-items-center mb-2";

        wrapper.innerHTML = `
          <input class="form-check-input me-2" type="checkbox" id="${user.email}" value="${user.email}" ${checked} ${lock}>
          <label class="form-check-label" for="${user.email}">
            ${user.email}${isAdmin ? ' <span class="badge bg-secondary ms-2">admin</span>' : ''}
          </label>
        `;

        container.appendChild(wrapper);
      });

      //  Setează intervalul
      const start = data.interval?.start || "";
      const end = data.interval?.end || "";
      inputs[0].value = start;
      inputs[1].value = end;
    })
    .catch(error => {
      console.error("Eroare la încărcarea datelor:", error);
    });
}



function salveazaSetari(mod) {

  // Selectăm checkbox-urile bifate (care nu sunt disabled)
  const checkboxes = document.querySelectorAll("#utilizatoriContainer input[type='checkbox']");
  const selected = Array.from(checkboxes)
    .filter(cb => cb.checked && !cb.disabled)
    .map(cb => cb.value);

  // Luăm valorile din inputurile datetime-local pentru interval
  const startInput = document.querySelector("#intervalAccess input:nth-of-type(1)");
  const endInput = document.querySelector("#intervalAccess input:nth-of-type(2)");
  const start = startInput ? startInput.value : "";
  const end = endInput ? endInput.value : "";

  // Trimitem toate datele către server
  fetch("saved_mod.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mod,
      emails: selected,
      interval: { start, end }
    })
  })
  .then(response => response.json())
  .then(data => {
    alert(data.message || "Setările au fost salvate cu succes.");
    window.location.href = "admin_dashboard.html";
  })
  .catch(error => {
    console.error("Eroare la salvarea setărilor:", error);
    alert("A apărut o eroare la salvare.");
  });
}
