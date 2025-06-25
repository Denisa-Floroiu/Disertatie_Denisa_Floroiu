document.addEventListener("DOMContentLoaded", () => {
    const tbody = document.getElementById("rfidBody");
  
    fetch("get_rfid.php")
      .then(res => res.json())
      .then(data => {
        tbody.innerHTML = "";
  
        if (!data.rfids || data.rfids.length === 0) {
          tbody.innerHTML = '<tr><td colspan="4">Nu există RFID-uri în așteptare.</td></tr>';
          return;
        }
  
          data.rfids.forEach(rfid => {
          const tr = document.createElement("tr");
  
          const tdRfid = document.createElement("td");
          tdRfid.textContent = rfid.rfid_code;
  
          const tdTime = document.createElement("td");
          tdTime.textContent = rfid.detected_at;
  
          const tdSelect = document.createElement("td");
          const select = document.createElement("select");
          select.innerHTML = '<option value="">-- Selectează utilizator --</option>';
          data.users.forEach(user => {
            const option = document.createElement("option");
            option.value = user.id;
            option.textContent = user.email;
            select.appendChild(option);
          });
          tdSelect.appendChild(select);
  
          const tdAction = document.createElement("td");
          // Setăm stiluri pentru tdAction
          tdAction.style.display = "flex";
          tdAction.style.flexDirection = "row";
          tdAction.style.alignItems = "center";
          tdAction.style.gap = "6px";

          // Stil comun pentru ambele butoane
          const baseStyle = `
            padding: 4px 8px;
            font-size: 13px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 5px;
          `;

          // Buton Asociază
          const btnAssign = document.createElement("button");
          btnAssign.innerHTML = '<i class="fas fa-check"></i> Asociază';
          btnAssign.style.marginRight = "8px";
          btnAssign.style.cssText ="background-color:rgb(135, 145, 206); color: white;";

          btnAssign.onclick = () => {
            const userId = select.value;
            if (!userId) return alert("Alege un utilizator.");

            fetch("assign_rfid.php", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: `rfid_code=${encodeURIComponent(rfid.rfid_code)}&user_id=${encodeURIComponent(userId)}`
            })
              .then(res => {
                if (res.ok) {
                  tr.style.backgroundColor = "#d4edda";
                  btnAssign.disabled = true;
                  select.disabled = true;
                  btnAssign.innerHTML = '<i class="fas fa-check"></i> Asociat';
                  setTimeout(() => {
                    tr.remove();
                  }, 3000);
                } else {
                  alert("Eroare la asociere.");
                }
              });
          };
          tdAction.appendChild(btnAssign);

          //  Buton Șterge
          const btnDelete = document.createElement("button");
          btnDelete.className = "delete-btn";
          btnDelete.innerHTML = '<i class="fas fa-trash"></i> Șterge'; 

          btnDelete.onclick = () => {
            if (!confirm("Sigur vrei să ștergi acest cod RFID?")) return;

            fetch("delete_rfid_definitiv.php", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: `rfid_code=${encodeURIComponent(rfid.rfid_code)}`
            })
              .then(res => res.json())
              .then(data => {
                if (data.success) {
                  tr.remove();
                } else {
                  alert("Eroare la ștergere: " + (data.error || ""));
                }
              })
              .catch(err => {
                console.error(err);
                alert("Eroare la comunicarea cu serverul.");
              });
          };
          tdAction.appendChild(btnDelete);

  
          tr.appendChild(tdRfid);
          tr.appendChild(tdTime);
          tr.appendChild(tdSelect);
          tr.appendChild(tdAction);
  
          tbody.appendChild(tr);
        });
      });
  });
  