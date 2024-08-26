function populateDropdowns() {
    const yearSelect = document.getElementById('year');
    const monthSelect = document.getElementById('month');
    const dateSelect = document.getElementById('date');
    const today = new Date();

    // Populate year dropdown
    const currentYear = today.getFullYear();
    for (let i = currentYear - 10; i <= currentYear; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        yearSelect.appendChild(option);
    }
    yearSelect.value = currentYear;

    // Populate month dropdown
    for (let i = 1; i <= 12; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        monthSelect.appendChild(option);
    }
    monthSelect.value = today.getMonth() + 1;

    // Populate date dropdown
    const daysInMonth = new Date(currentYear, today.getMonth() + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        dateSelect.appendChild(option);
    }
    dateSelect.value = today.getDate();

    // Set initial visibility
    toggleDateInputs();
    fetchAttendance();
}

function toggleDateInputs() {
    const currentDateContainer = document.getElementById('current-date-container');
    const dateRangeContainer = document.getElementById('date-range-container');

    if (document.getElementById('current-date').checked) {
        currentDateContainer.style.display = 'block';
        dateRangeContainer.style.display = 'none';
    } else if (document.getElementById('date-range').checked) {
        currentDateContainer.style.display = 'none';
        dateRangeContainer.style.display = 'block';
    }
}

document.querySelectorAll('input[name="report-type"]').forEach((elem) => {
    elem.addEventListener("change", toggleDateInputs);
});

function fetchAttendance() {
    const status = document.getElementById('status').value;
    let isValidRequest = true;
    let url='';
    if (document.getElementById('current-date').checked) {
        url = 'http://localhost:3000/api/get-attendance?';
        const year = document.getElementById('year').value;
        const month = document.getElementById('month').value;
        const date = document.getElementById('date').value;
        
        if (year && month && date) {
            const selectedDate = `${year}-${month.padStart(2, '0')}-${date.padStart(2, '0')}`;
            url += `date=${selectedDate}&status=${status}`;
        } else {
            isValidRequest = false;
            alert("Please select year, month, and date.");
        }
    } else if (document.getElementById('date-range').checked) {
        url = 'http://localhost:3000/api/get-attendance-range?';
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;

        if (startDate && endDate) {
            url += `from=${startDate}&to=${endDate}&status=${status}`;
        } else {
            isValidRequest = false;
            alert("Please select both start and end dates.");
        }
    }

    if (isValidRequest) {
        fetch(url)
            .then(response => response.json())
            .then(data => {
                const table = document.getElementById('attendance-table');
                const tbody = document.getElementById('employee-list');
                tbody.innerHTML = '';
                table.style.display = 'none';

                if (data.employees && data.employees.length > 0) {
                    data.employees.forEach(employee => {
                        const tr = document.createElement('tr');

                        const nameTd = document.createElement('td');
                        nameTd.textContent = employee.emp_name;
                        tr.appendChild(nameTd);

                        const roleTd = document.createElement('td');
                        roleTd.textContent = employee.emp_role;
                        tr.appendChild(roleTd);

                        const inTimeTd = document.createElement('td');
                        inTimeTd.textContent = employee.in_time ? new Date(employee.in_time).toLocaleString() : 'N/A';
                        tr.appendChild(inTimeTd);

                        const outTimeTd = document.createElement('td');
                        outTimeTd.textContent = employee.out_time ? new Date(employee.out_time).toLocaleString() : 'N/A';
                        tr.appendChild(outTimeTd);

                        tbody.appendChild(tr);
                    });

                    table.style.display = 'table';
                } else {
                    const tr = document.createElement('tr');
                    const td = document.createElement('td');
                    td.colSpan = 4;
                    td.textContent = 'No data available';
                    tr.appendChild(td);
                    tbody.appendChild(tr);
                    table.style.display = 'table';
                }
            })
            .catch(error => console.error('Error fetching attendance:', error));
    }
}


function exportToExcel() {
    const table = document.getElementById('attendance-table');
    if (table.style.display === 'none') {
        alert('No data to export.');
        return;
    }

    const wb = XLSX.utils.table_to_book(table, { sheet: "Attendance Report" });
    const today = new Date().toISOString().split('T')[0];
    const filename = `Attendance_Report_${today}.xlsx`;

    XLSX.writeFile(wb, filename);
}

window.onload = populateDropdowns;
