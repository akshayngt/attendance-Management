function fetchEmployeeList() {
    fetch('http://localhost:3000/api/employees')
        .then(response => response.json())
        .then(data => {
            if (data.result) {
                const employeeTable = document.getElementById('employee-list');
                employeeTable.innerHTML = '';

                data.employees.forEach(employee => {
                    const row = document.createElement('tr');

                    const nameCell = document.createElement('td');
                    nameCell.textContent = employee.employee_name;
                    row.appendChild(nameCell);

                    const roleCell = document.createElement('td');
                    roleCell.textContent = employee.employee_role;
                    row.appendChild(roleCell);

                    // const inTimeCell = document.createElement('td');
                    // inTimeCell.textContent = employee.last_in_time;
                    // row.appendChild(inTimeCell);

                    // const outTimeCell = document.createElement('td');
                    // outTimeCell.textContent = employee.last_out_time;
                    // row.appendChild(outTimeCell);

                    employeeTable.appendChild(row);
                });

                document.getElementById('attendance-table').style.display = 'table';
            } else {
                alert('No employees found.');
            }
        })
        .catch(error => console.error('Error fetching employee list:', error));
}
fetchEmployeeList()