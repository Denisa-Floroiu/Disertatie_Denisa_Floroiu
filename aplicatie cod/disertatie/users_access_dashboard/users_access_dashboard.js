let allLogs = [];
let accessChart;
let currentUserForChart = "";
let flatpickrInstance;

// ✅ Stochează ultimele statusuri selectate per email
const statusFilters = {};

document.addEventListener("DOMContentLoaded", () => {
    fetch("users_access_dashboard.php")
        .then(res => res.json())
        .then(data => {
            allLogs = data;
            renderTable();
        });

    document.getElementById("exportAllExcelBtn").addEventListener("click", exportAllToExcel);

    flatpickrInstance = flatpickr("#calendarRange", {
        mode: "range",
        dateFormat: "Y-m-d",
        onChange: function (selectedDates) {
            if (selectedDates.length === 2 && currentUserForChart) {
                renderSumChart(currentUserForChart, selectedDates[0], selectedDates[1]);
            }
        }
    });
});

function renderTable() {
    const container = document.getElementById("tablesContainer");
    container.innerHTML = "";

    const groupedLogs = {};
    allLogs.forEach(log => {
        if (!groupedLogs[log.email]) groupedLogs[log.email] = [];
        groupedLogs[log.email].push(log);
    });

    for (const email in groupedLogs) {
        renderSingleTable(email, statusFilters[email] || "all", false, container);
    }
}

function renderSingleTable(email, statusFilter = "all", replace = true, container = null) {
    const logs = allLogs.filter(log => log.email === email && (statusFilter === "all" || log.status === statusFilter));

    const tableWrapper = document.createElement("div");
    tableWrapper.className = "mb-4 user-table-wrapper";
    tableWrapper.dataset.email = email;

    tableWrapper.innerHTML = `
<div class="user-header-box bg-light d-flex justify-content-between align-items-center mb-2 p-3 rounded border">
  <span class="fw-bold">${email}</span>
  <div class="d-flex gap-2 flex-nowrap"> 
    <button class="btn btn-sm btn-outline-primary showStatsBtn" style="white-space: nowrap;" data-email="${email}" data-bs-toggle="modal" data-bs-target="#statsModal"><i class="fas fa-chart-column me-1"></i> Statistici</button>
    <button class="btn btn-sm btn-outline-secondary exportCsvBtn" style="white-space: nowrap;" data-email="${email}"><i class="fa-solid fa-file-csv">‌</i> Export CSV</button>
    <button class="btn btn-sm btn-success exportExcelBtn" style="white-space: nowrap;" data-email="${email}"><i class="fa-solid fa-download"></i> Export Excel</button>
  </div>
</div>


<table class="table table-striped">
  <thead>
    <tr>
      <th>ID</th>
      <th>RFID</th>
      <th>Email</th>
      <th>
        Status<br>
        <select class="statusFilterTable form-select form-select-sm" data-email="${email}">
          <option value="all" ${statusFilter === "all" ? "selected" : ""}>Toate</option>
          <option value="ACCESS_GRANTED" ${statusFilter === "ACCESS_GRANTED" ? "selected" : ""}>Permis</option>
          <option value="ACCESS_DENIED" ${statusFilter === "ACCESS_DENIED" ? "selected" : ""}>Respins</option>
        </select>
      </th>
      <th>Timp</th>
    </tr>
  </thead>

            <tbody>
                ${logs.map((log, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${log.rfid_code}</td>
                        <td>${log.email}</td>
                        <td>${log.status}</td>
                        <td>${formatDateTime(log.timestamp)}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;

    if (replace) {
        const existing = document.querySelector(`.user-table-wrapper[data-email="${email}"]`);
        if (existing) existing.replaceWith(tableWrapper);
    } else {
        container.appendChild(tableWrapper);
    }

    tableWrapper.querySelector(".statusFilterTable").addEventListener("change", e => {
        const newStatus = e.target.value;
        statusFilters[email] = newStatus;
        renderSingleTable(email, newStatus);
    });

    tableWrapper.querySelector(".showStatsBtn").addEventListener("click", () => {
        currentUserForChart = email;
        document.getElementById("modalEmailLabel").textContent = email;
        if (flatpickrInstance) flatpickrInstance.clear();
        if (accessChart) accessChart.destroy();
    });

    tableWrapper.querySelector(".exportCsvBtn").addEventListener("click", () => {
        const filter = statusFilters[email] || "all";
        const userLogs = allLogs.filter(log => log.email === email && (filter === "all" || log.status === filter));
        const csvHeader = "ID,RFID,Email,Status,Timp\n";
        const csvBody = userLogs.map(log => `${log.id},${log.rfid_code},${log.email},${log.status},${log.timestamp}`).join("\n");
        const blob = new Blob([csvHeader + csvBody], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `acces_export_${email}.csv`;
        link.click();
    });

    tableWrapper.querySelector(".exportExcelBtn").addEventListener("click", () => {
        exportToExcel(email);
    });
}

function exportToExcel(email) {
    const filter = statusFilters[email] || "all";
    const userLogs = allLogs.filter(log => log.email === email && (filter === "all" || log.status === filter));
    const worksheetData = [
        ["ID", "RFID", "Email", "Status", "Timp"],
        ...userLogs.map(log => [log.id, log.rfid_code, log.email, log.status, log.timestamp])
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Acces");
    XLSX.writeFile(workbook, `export_acces_${email}.xlsx`);
}

function exportAllToExcel() {
    const worksheetData = [
        ["ID", "RFID", "Email", "Status", "Timp"],
        ...allLogs.map(log => [log.id, log.rfid_code, log.email,  log.status, log.timestamp])
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ToateAccesari");
    XLSX.writeFile(workbook, "export_total_acces.xlsx");
}

function formatDate(date) {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60 * 1000);
    return localDate.toISOString().split("T")[0];
}
function formatDateTime(timestamp) {
    const dateObj = new Date(timestamp);
    const date = dateObj.toISOString().split("T")[0];
    const time = dateObj.toTimeString().split(" ")[0]; // ia doar hh:mm:ss
    return `${date} ${time}`;
}

function renderSumChart(email, startDate, endDate) {
    const startStr = formatDate(startDate);
    const endStr = formatDate(endDate);

    const granted = allLogs.filter(log =>
        log.email === email &&
        log.status === "ACCESS_GRANTED" &&
        log.timestamp.split(" ")[0] >= startStr &&
        log.timestamp.split(" ")[0] <= endStr
    ).length;

    const denied = allLogs.filter(log =>
        log.email === email &&
        log.status === "ACCESS_DENIED" &&
        log.timestamp.split(" ")[0] >= startStr &&
        log.timestamp.split(" ")[0] <= endStr
    ).length;

    if (accessChart) accessChart.destroy();

    const ctx = document.getElementById("accessChart").getContext("2d");
    accessChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ["Permis", "Respins"],
            datasets: [{
                label: "Număr accesări",
                data: [granted, denied],
                backgroundColor: ["green", "red"]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: startStr === endStr
                    ? `Accesări din data de ${startStr}`
                    : `Accesări între ${startStr} și ${endStr}`
                
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: "Număr accesări"
                    }
                }
            }
        }
    });

    document.getElementById("exportChartBtn").addEventListener("click", () => {
        if (accessChart) {
            const link = document.createElement('a');
            link.href = accessChart.toBase64Image();
            link.download = `grafic_acces_${currentUserForChart}.png`;
            link.click();
        }
    });
}
