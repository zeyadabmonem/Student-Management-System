// Constants for DOM elements and API base path
const API_URL = '/api';
const authContainer = document.getElementById('auth-container');
const mainContainer = document.getElementById('main-container');
const loginForm = document.getElementById('login-form');
const studentForm = document.getElementById('student-form');
const studentTableBody = document.getElementById('student-body');
const modal = document.getElementById('student-modal');
const closeModal = document.querySelector('.close-modal');
const addStudentBtn = document.getElementById('add-student-btn');
const logoutBtn = document.getElementById('logout-btn');
const userDisplay = document.getElementById('user-display');
const loginError = document.getElementById('login-error');

// App State: We retrieve the token and username from localStorage if they exist.
// This allows the user to stay logged in after refreshing the page.
let authToken = localStorage.getItem('token');
let currentUser = localStorage.getItem('username');

// Initialization: Check if user is already authenticated on page load.
document.addEventListener('DOMContentLoaded', () => {
    if (authToken) {
        showDashboard(); // If token exists, skip login and show the main dashboard.
    } else {
        showLogin(); // Otherwise, show the login screen.
    }
});

// --- Authentication Section ---

// Handles the login form submission.
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            const data = await response.json();
            authToken = data.token;
            currentUser = data.username;
            
            // Store credentials in localStorage for persistence.
            localStorage.setItem('token', authToken);
            localStorage.setItem('username', currentUser);
            
            showDashboard();
        } else {
            const error = await response.json();
            loginError.textContent = error.message || 'Login failed';
        }
    } catch (err) {
        loginError.textContent = 'Connection error';
    }
});

// Handles logout by clearing local state and returning to the login screen.
logoutBtn.addEventListener('click', () => {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    showLogin();
});

// UI helper to toggle between Login and Dashboard views.
function showLogin() {
    authContainer.style.display = 'flex';
    mainContainer.style.display = 'none';
}

function showDashboard() {
    authContainer.style.display = 'none';
    mainContainer.style.display = 'block';
    userDisplay.textContent = `Welcome, ${currentUser}`;
    loadStudents(); // Fetch the student list once authenticated.
}

// --- Student Management Section ---

// Fetches the list of students from the backend API.
async function loadStudents() {
    try {
        const response = await fetch(`${API_URL}/students`, {
            headers: { 'Authorization': `Bearer ${authToken}` } // Include JWT token in headers.
        });

        // If the token is expired or invalid (401), force a logout.
        if (response.status === 401) {
            logoutBtn.click();
            return;
        }

        const students = await response.json();
        renderStudents(students);
    } catch (err) {
        console.error('Error loading students:', err);
    }
}

// Dynamically creates table rows for each student.
function renderStudents(students) {
    studentTableBody.innerHTML = '';
    students.forEach(student => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${student.firstName}</td>
            <td>${student.lastName}</td>
            <td>${student.email}</td>
            <td>${student.course}</td>
            <td>${new Date(student.enrollmentDate).toLocaleDateString()}</td>
            <td>
                <button class="btn edit" onclick="editStudent(${student.id})">Edit</button>
                <button class="btn delete" onclick="deleteStudent(${student.id})">Delete</button>
            </td>
        `;
        studentTableBody.appendChild(tr);
    });
}

// --- Modal & Form Logic ---

// Opens the modal for adding a new student.
addStudentBtn.onclick = () => {
    document.getElementById('modal-title').textContent = 'Add Student';
    studentForm.reset(); // Clear form fields.
    document.getElementById('student-id').value = ''; // Ensure ID is empty for new records.
    modal.style.display = 'block';
};

// Closes the modal.
closeModal.onclick = () => {
    modal.style.display = 'none';
};

// Close modal if user clicks outside of the modal content.
window.onclick = (event) => {
    if (event.target == modal) {
        modal.style.display = 'none';
    }
};

// Handles both Creating (POST) and Updating (PUT) students.
studentForm.onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('student-id').value;
    const studentData = {
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        email: document.getElementById('email').value,
        course: document.getElementById('course').value
    };

    // If 'id' exists, we are editing; otherwise, we are adding.
    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_URL}/students/${id}` : `${API_URL}/students`;
    
    if (id) studentData.id = parseInt(id);

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(studentData)
        });

        if (response.ok) {
            modal.style.display = 'none';
            loadStudents(); // Refresh the list after save.
        } else {
            alert('Error saving student');
        }
    } catch (err) {
        console.error('Error saving student:', err);
    }
};

// Fetches a single student's details and populates the modal for editing.
async function editStudent(id) {
    try {
        const response = await fetch(`${API_URL}/students/${id}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const student = await response.json();

        document.getElementById('modal-title').textContent = 'Edit Student';
        document.getElementById('student-id').value = student.id;
        document.getElementById('firstName').value = student.firstName;
        document.getElementById('lastName').value = student.lastName;
        document.getElementById('email').value = student.email;
        document.getElementById('course').value = student.course;
        
        modal.style.display = 'block';
    } catch (err) {
        console.error('Error fetching student details:', err);
    }
}

// Sends a DELETE request to the API.
async function deleteStudent(id) {
    if (!confirm('Are you sure you want to delete this student?')) return;

    try {
        const response = await fetch(`${API_URL}/students/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            loadStudents(); // Refresh the list after deletion.
        } else {
            alert('Error deleting student');
        }
    } catch (err) {
        console.error('Error deleting student:', err);
    }
}

