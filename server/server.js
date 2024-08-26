const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const cors = require('cors');
const moment = require('moment');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Gtdev123#@!',
    database: 'face_data'
});

db.connect(err => {
    if (err) {
        console.error('Database connection error:', err.stack);
        throw err;
    }
    console.log('MySQL connected...');
});

// Get all employee details
app.get('/api/get-faces', (req, res) => {
    const query = `
        SELECT 
            e.emp_name AS image_name, 
            IFNULL(MAX(a.in_time), MAX(a.out_time)) AS last_capture_time 
        FROM 
            employee_details e
        LEFT JOIN 
            attendance a 
        ON 
            e.id = a.employee_id
        GROUP BY 
            e.emp_name
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Database query error:', err.stack);
            return res.status(500).json({ result: false, message: 'Internal Server Error' });
        }

        if (results.length === 0) {
            return res.status(404).json({ result: false, message: 'No faces found' });
        }

        res.status(200).json({ result: true, data: results });
    });
});

app.post('/api/save-face', (req, res) => {
    const { imageName, captureTime, status } = req.body;

    if (!imageName || !captureTime || !status) {
        return res.status(400).json({ result: false, message: 'Bad Request: Missing imageName, captureTime, or status' });
    }

    const formattedTime = moment(captureTime).format('YYYY-MM-DD HH:mm:ss');
    const currentDate = moment(captureTime).format('YYYY-MM-DD');
    const empName = imageName.split('.')[0];

    const checkEmployeeQuery = 'SELECT id FROM employee_details WHERE emp_name = ?';
    db.query(checkEmployeeQuery, [empName], (err, results) => {
        if (err) {
            console.error('Database query error:', err.stack);
            return res.status(500).json({ result: false, message: 'Server error' });
        }

        if (results.length === 0) {
            return res.status(400).json({ result: false, message: 'Employee not found' });
        }

        const employeeId = results[0].id;

        // If the status is OUT, check if there is an existing record with IN status
        if (status === 'OUT') {
            const checkInQuery = `
                SELECT * FROM attendance 
                WHERE employee_id = ? AND status = 'IN' AND DATE(in_time) = ?
            `;
            db.query(checkInQuery, [employeeId, currentDate], (err, results) => {
                if (err) {
                    console.error('Database query error:', err.stack);
                    return res.status(500).json({ result: false, message: 'Server error' });
                }

                if (results.length === 0) {
                    return res.status(400).json({ result: false, message: 'No IN record found for today. Cannot set OUT time.' });
                }

                // Update the existing IN record with OUT time
                const updateQuery = `
                    UPDATE attendance
                    SET out_time = ?
                    WHERE employee_id = ? AND status = 'IN' AND DATE(in_time) = ?
                `;
                db.query(updateQuery, [formattedTime, employeeId, currentDate], (err, result) => {
                    if (err) {
                        console.error('Database query error:', err.stack);
                        return res.status(500).json({ result: false, message: 'Server error' });
                    }
                    res.status(200).json({ result: true, message: 'Attendance OUT time updated' });
                });
            });
        } else if (status === 'IN') {
            // Check if an entry already exists for the current day with the same status
            const checkAttendanceQuery = `
                SELECT * FROM attendance 
                WHERE employee_id = ? AND status = ? AND DATE(in_time) = ?
            `;
            db.query(checkAttendanceQuery, [employeeId, status, currentDate], (err, results) => {
                if (err) {
                    console.error('Database query error:', err.stack);
                    return res.status(500).json({ result: false, message: 'Server error' });
                }

                if (results.length > 0) {
                    return res.status(400).json({ result: false, message: `Attendance for status '${status}' has already been recorded today.` });
                }

                // If no entry exists, insert the new attendance record
                const insertQuery = `
                    INSERT INTO attendance (status, in_time, employee_id)
                    VALUES (?, ?, ?)
                `;
                db.query(insertQuery, [status, formattedTime, employeeId], (err, result) => {
                    if (err) {
                        console.error('Database query error:', err.stack);
                        return res.status(500).json({ result: false, message: 'Server error' });
                    }
                    res.status(200).json({ result: true, message: 'Attendance record saved' });
                });
            });
        } else {
            return res.status(400).json({ result: false, message: 'Invalid status. Use IN or OUT.' });
        }
    });
});

// Create a new user
app.post('/api/create-user', (req, res) => {
    const { user_name, password, user_role } = req.body;

    if (!user_name || !password || !user_role) {
        return res.status(400).json({ result: false, message: 'Bad Request: Missing user_name, password, or user_role' });
    }

    const insertQuery = `
        INSERT INTO master_user (user_name, password, user_role)
        VALUES (?, ?, ?)
    `;
    db.query(insertQuery, [user_name, password, user_role], (err, result) => {
        if (err) {
            console.error('Database query error:', err.stack);
            return res.status(500).json({ result: false, message: 'Server error' });
        }
        res.status(201).json({ result: true, message: 'User created successfully' });
    });
});
app.post('/api/login', (req, res) => {
    const { user_name, password } = req.body;

    if (!user_name || !password) {
        return res.status(400).json({ result: false, message: 'Bad Request: Missing user_name or password' });
    }

    const query = 'SELECT * FROM master_user WHERE user_name = ? AND password = ?';
    db.query(query, [user_name, password], (err, results) => {
        if (err) {
            console.error('Database query error:', err.stack);
            return res.status(500).json({ result: false, message: 'Server error' });
        }

        if (results.length > 0) {
            const user = results[0];
            res.status(200).json({
                result: true,
                message: 'Login successful',
                user: {
                    id: user.id,
                    user_name: user.user_name,
                    user_role: user.user_role,
                    created_date: user.created_date,
                    updated_date: user.updated_date
                }
            });
        } else {
            res.status(401).json({ result: false, message: 'Invalid username or password' });
        }
    });
});
// Get attendance stats
app.get('/api/get-stats', (req, res) => {
    // Query to get total employees
    const totalEmployeesQuery = 'SELECT COUNT(*) AS total FROM employee_details';

    // Query to get present employees today
    const presentTodayQuery = `
        SELECT COUNT(DISTINCT employee_id) AS present_today
        FROM attendance
        WHERE DATE(in_time) = CURDATE() AND status = 'IN'
    `;

    // Query to get absent employees today
    const absentTodayQuery = `
        SELECT COUNT(*) AS absent_today
        FROM employee_details
        WHERE id NOT IN (
            SELECT DISTINCT employee_id
            FROM attendance
            WHERE DATE(in_time) = CURDATE() AND status = 'IN'
        )
    `;

    // Execute queries
    db.query(totalEmployeesQuery, (err, totalResults) => {
        if (err) {
            console.error('Database query error:', err.stack);
            return res.status(500).json({ result: false, message: 'Server error' });
        }

        db.query(presentTodayQuery, (err, presentResults) => {
            if (err) {
                console.error('Database query error:', err.stack);
                return res.status(500).json({ result: false, message: 'Server error' });
            }

            db.query(absentTodayQuery, (err, absentResults) => {
                if (err) {
                    console.error('Database query error:', err.stack);
                    return res.status(500).json({ result: false, message: 'Server error' });
                }

                res.status(200).json({
                    result: true,
                    data: {
                        totalEmployees: totalResults[0].total,
                        presentToday: presentResults[0].present_today,
                        absentToday: absentResults[0].absent_today
                    }
                });
            });
        });
    });
});
app.get('/api/get-attendance', (req, res) => {
    const { date, status } = req.query;

    if (!date || !status) {
        return res.status(400).json({ result: false, error: 'Date and status parameters are required' });
    }

    let query;
    if (status === 'Present') {
        query = `
            SELECT e.id, e.emp_name, e.emp_role, a.in_time, a.out_time
            FROM employee_details e
            JOIN attendance a ON e.id = a.employee_id
            WHERE DATE(a.in_time) like ? AND a.status = 'IN' OR a.status = 'OUT'
        `;
    } else if (status === 'Absent') {
        query = `
            SELECT e.id, e.emp_name, e.emp_role
            FROM employee_details e
            LEFT JOIN attendance a ON e.id = a.employee_id AND DATE(a.in_time) = ?
            WHERE a.employee_id IS NULL
        `;
    } else {
        return res.status(400).json({ result: false, error: 'Invalid status parameter' });
    }

    db.query(query, [date], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database query error' });
        }

        res.json({ result: true, employees: results });
    });
});
// Get attendance between from and to date
app.get('/api/get-attendance-range', (req, res) => {
    const { from, to } = req.query;

    if (!from || !to) {
        return res.status(400).json({ error: 'Both from and to date parameters are required' });
    }

    const query = `
        SELECT e.id, e.emp_name, e.emp_role, a.in_time, a.out_time, a.status
        FROM employee_details e
        JOIN attendance a ON e.id = a.employee_id
        WHERE DATE(a.in_time) BETWEEN ? AND ?
        ORDER BY a.in_time ASC
    `;

    db.query(query, [from, to], (err, results) => {
        if (err) {
            console.error('Database query error:', err.stack);
            return res.status(500).json({ error: 'Database query error' });
        }

        res.json({ result: true, employees: results });
    });
});
// Get all employees with their details
app.get('/api/employees', (req, res) => {
    const query = `
        SELECT 
            e.id AS employee_id, 
            e.emp_name AS employee_name, 
            e.emp_role AS employee_role,
            IFNULL(MAX(a.in_time), '-') AS last_in_time,
            IFNULL(MAX(a.out_time), '-') AS last_out_time
        FROM 
            employee_details e
        LEFT JOIN 
            attendance a 
        ON 
            e.id = a.employee_id
        GROUP BY 
            e.id, e.emp_name, e.emp_role
        ORDER BY 
            e.emp_name ASC
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Database query error:', err.stack);
            return res.status(500).json({ result: false, message: 'Internal Server Error' });
        }

        if (results.length === 0) {
            return res.status(404).json({ result: false, message: 'No employees found' });
        }

        res.status(200).json({ result: true, employees: results });
    });
});

//  add login api 

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
