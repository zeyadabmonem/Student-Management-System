// Gradely Administrative Dashboard Orchestrator
const API_URL = '/api';

// --- System State Store ---
const state = {
    students: [],
    filteredStudents: [],
    authToken: localStorage.getItem('token'),
    currentUser: localStorage.getItem('username'),
    activeTab: 'overview',
    theme: localStorage.getItem('theme') || 'light',
    sortColumn: 'name',
    sortDirection: 'asc'
};

// --- DOM Elements Cache ---
const el = {
    authContainer: document.getElementById('auth-container'),
    authCard: document.querySelector('.auth-card'),
    mainContainer: document.getElementById('main-container'),
    loginForm: document.getElementById('login-form'),
    studentForm: document.getElementById('student-form'),
    studentFormContent: document.querySelector('#student-modal .modal-content'),
    studentTableBody: document.getElementById('student-body'),
    studentModal: document.getElementById('student-modal'),
    modalTitle: document.getElementById('modal-title'),
    addStudentBtn: document.getElementById('add-student-btn'),
    quickAddStudentBtn: document.getElementById('quick-add-student-btn'),
    logoutBtn: document.getElementById('logout-btn'),
    userDisplay: document.getElementById('user-display'),
    loginError: document.getElementById('login-error'),
    themeToggle: document.getElementById('theme-toggle'),
    sidebar: document.querySelector('.sidebar'),
    sidebarAvatar: document.getElementById('sidebar-avatar'),
    sidebarUsername: document.getElementById('sidebar-username'),
    navItems: document.querySelectorAll('.nav-item'),
    viewPanels: document.querySelectorAll('.view-panel'),
    viewTitle: document.getElementById('view-title'),
    toastContainer: document.getElementById('toast-container'),
    
    // Stats Cards
    statTotalStudents: document.getElementById('stat-total-students'),
    statActiveCourses: document.getElementById('stat-active-courses'),
    statRecentEnrollments: document.getElementById('stat-recent-enrollments'),
    courseDistributionContainer: document.getElementById('course-distribution-container'),
    
    // Filters & Tables
    searchStudent: document.getElementById('search-student'),
    filterCourse: document.getElementById('filter-course'),
    clearFiltersBtn: document.getElementById('clear-filters-btn'),
    exportCsvBtn: document.getElementById('export-csv-btn'),
    studentTableHeaders: document.querySelectorAll('#student-table th[data-sort]'),
    
    // Mobile Navigation Controls
    mobileSidebarToggle: document.getElementById('mobile-sidebar-toggle'),
    
    // Confirmation Dialog
    confirmModal: document.getElementById('confirm-modal'),
    confirmTitle: document.getElementById('confirm-title'),
    confirmMessage: document.getElementById('confirm-message'),
    confirmSuccessBtn: document.getElementById('confirm-success-btn'),
    confirmCancelBtn: document.getElementById('confirm-cancel-btn')
};

// --- Initializing System ---
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initNavigation();
    initSearchAndFilters();
    initSorting();
    initModalHandlers();
    initCsvExport();
    initMobileSidebar();

    if (state.authToken) {
        showDashboard();
    } else {
        showLogin();
    }
});

// --- Theme Management Section ---
function initTheme() {
    if (state.theme === 'dark') {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }

    el.themeToggle.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('dark-theme');
        state.theme = isDark ? 'dark' : 'light';
        localStorage.setItem('theme', state.theme);
        
        // Re-render student list immediately so avatar badge HSL styles adapt perfectly to new dark/light contrast
        if (state.authToken && state.students.length > 0) {
            renderStudentListTable();
        }
        
        showToast(`Switched to ${state.theme} theme`, 'info', 2000);
    });
}

// --- Responsive Mobile Sidebar Controls ---
function initMobileSidebar() {
    if (el.mobileSidebarToggle) {
        el.mobileSidebarToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            el.sidebar.classList.toggle('sidebar-open');
        });

        // Click anywhere outside sidebar drawer on mobile to close it smoothly
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 640 && el.sidebar.classList.contains('sidebar-open')) {
                if (!el.sidebar.contains(e.target) && !el.mobileSidebarToggle.contains(e.target)) {
                    el.sidebar.classList.remove('sidebar-open');
                }
            }
        });
    }
}

// --- Dynamic Sidebar Navigation Section ---
function initNavigation() {
    el.navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetTab = item.getAttribute('data-tab');
            switchTab(targetTab);
            
            // Auto close mobile drawer when selecting navigation tabs
            if (window.innerWidth <= 640) {
                el.sidebar.classList.remove('sidebar-open');
            }
        });
    });

    el.logoutBtn.addEventListener('click', handleLogout);
}

function switchTab(tabId) {
    state.activeTab = tabId;
    
    // Update navigation active state
    el.navItems.forEach(nav => {
        if (nav.getAttribute('data-tab') === tabId) {
            nav.classList.add('active');
        } else {
            nav.classList.remove('active');
        }
    });

    // Update panels visibility
    el.viewPanels.forEach(panel => {
        if (panel.id === `${tabId}-panel`) {
            panel.classList.add('active');
        } else {
            panel.classList.remove('active');
        }
    });

    // Update main header title
    if (tabId === 'overview') {
        el.viewTitle.textContent = 'Dashboard Overview';
        // Trigger course distribution bar animation width resets
        setTimeout(animateCourseDistributionBars, 50);
    } else if (tabId === 'students') {
        el.viewTitle.textContent = 'Student Directory';
    }
}

// --- Advanced Local Filters, Searches, and Sorting ---
function initSearchAndFilters() {
    const handleInput = () => {
        toggleClearFiltersBtnVisibility();
        filterAndRenderStudents();
    };

    el.searchStudent.addEventListener('input', handleInput);
    el.filterCourse.addEventListener('change', handleInput);

    // Elegant clear filters sliding button event handler
    if (el.clearFiltersBtn) {
        el.clearFiltersBtn.addEventListener('click', () => {
            el.searchStudent.value = '';
            el.filterCourse.value = '';
            hideClearFiltersBtn();
            filterAndRenderStudents();
            showToast('Cleared active search directory filters', 'info', 2000);
        });
    }
}

// Clear Filters button visibility slider animations
function toggleClearFiltersBtnVisibility() {
    if (!el.clearFiltersBtn) return;
    const hasQuery = el.searchStudent.value.trim().length > 0;
    const hasCourse = el.filterCourse.value !== '';

    if (hasQuery || hasCourse) {
        if (el.clearFiltersBtn.style.display !== 'inline-flex') {
            el.clearFiltersBtn.style.display = 'inline-flex';
            // Stagger animation state paint
            setTimeout(() => {
                el.clearFiltersBtn.style.opacity = '1';
                el.clearFiltersBtn.style.transform = 'scale(1)';
            }, 20);
        }
    } else {
        hideClearFiltersBtn();
    }
}

function hideClearFiltersBtn() {
    if (!el.clearFiltersBtn) return;
    el.clearFiltersBtn.style.opacity = '0';
    el.clearFiltersBtn.style.transform = 'scale(0.9)';
    
    // Set layout display hidden after transition completes
    const transitionEndHandler = () => {
        if (el.clearFiltersBtn.style.opacity === '0') {
            el.clearFiltersBtn.style.display = 'none';
        }
        el.clearFiltersBtn.removeEventListener('transitionend', transitionEndHandler);
    };
    el.clearFiltersBtn.addEventListener('transitionend', transitionEndHandler);
}

function filterAndRenderStudents() {
    const query = el.searchStudent.value.toLowerCase().trim();
    const selectedCourse = el.filterCourse.value;

    state.filteredStudents = state.students.filter(student => {
        const matchesQuery = 
            student.firstName.toLowerCase().includes(query) ||
            student.lastName.toLowerCase().includes(query) ||
            student.email.toLowerCase().includes(query) ||
            student.course.toLowerCase().includes(query);
            
        const matchesCourse = selectedCourse === "" || student.course === selectedCourse;

        return matchesQuery && matchesCourse;
    });

    // Apply active sort state
    sortFilteredDataset();
    renderStudentListTable();
}

function initSorting() {
    el.studentTableHeaders.forEach(th => {
        th.addEventListener('click', () => {
            const column = th.getAttribute('data-sort');
            
            if (state.sortColumn === column) {
                // Toggle direction
                state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                state.sortColumn = column;
                state.sortDirection = 'asc';
            }

            // Update UI headers
            el.studentTableHeaders.forEach(header => {
                header.classList.remove('sorted-asc', 'sorted-desc');
                if (header.getAttribute('data-sort') === column) {
                    header.classList.add(state.sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc');
                }
            });

            sortFilteredDataset();
            renderStudentListTable();
        });
    });
}

function sortFilteredDataset() {
    const col = state.sortColumn;
    const dir = state.sortDirection === 'asc' ? 1 : -1;

    state.filteredStudents.sort((a, b) => {
        let valA, valB;

        if (col === 'name') {
            valA = `${a.firstName} ${a.lastName}`.toLowerCase();
            valB = `${b.firstName} ${b.lastName}`.toLowerCase();
        } else if (col === 'enrollmentDate') {
            valA = new Date(a.enrollmentDate).getTime();
            valB = new Date(b.enrollmentDate).getTime();
        } else {
            valA = (a[col] || '').toString().toLowerCase();
            valB = (b[col] || '').toString().toLowerCase();
        }

        if (valA < valB) return -1 * dir;
        if (valA > valB) return 1 * dir;
        return 0;
    });
}

// --- Interactive Data Exporter ---
function initCsvExport() {
    el.exportCsvBtn.addEventListener('click', () => {
        if (state.filteredStudents.length === 0) {
            showToast('No students matching current filters to export', 'error');
            return;
        }

        // CSV Compilation
        const headers = ['ID', 'First Name', 'Last Name', 'Email', 'Course', 'Enrollment Date'];
        const rows = state.filteredStudents.map(s => [
            s.id,
            `"${s.firstName.replace(/"/g, '""')}"`,
            `"${s.lastName.replace(/"/g, '""')}"`,
            `"${s.email.replace(/"/g, '""')}"`,
            `"${s.course.replace(/"/g, '""')}"`,
            new Date(s.enrollmentDate).toLocaleDateString()
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const tempAnchor = document.createElement('a');
        tempAnchor.setAttribute('href', url);
        tempAnchor.setAttribute('download', `Gradely_Students_${new Date().toISOString().split('T')[0]}.csv`);
        tempAnchor.style.visibility = 'hidden';
        document.body.appendChild(tempAnchor);
        tempAnchor.click();
        document.body.removeChild(tempAnchor);
        URL.revokeObjectURL(url);

        showToast(`Successfully exported ${state.filteredStudents.length} student records`, 'success');
    });
}

// --- Floating Toast Alerts & Confirmation Systems ---
function showToast(message, type = 'success', duration = 4000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Pick appropriate SVG Icons
    let svgIcon = '';
    if (type === 'success') {
        svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
    } else if (type === 'error') {
        svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
    } else { // info
        svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
    }

    toast.innerHTML = `
        <div class="toast-icon">${svgIcon}</div>
        <div class="toast-message">${message}</div>
        <div class="toast-close">&times;</div>
        <div class="toast-progress"></div>
    `;

    el.toastContainer.appendChild(toast);

    // Setup visual progress slide timing line
    const progressLine = toast.querySelector('.toast-progress');
    progressLine.style.transition = `width ${duration}ms linear`;
    // Trigger paint so progress bar contracts
    setTimeout(() => { progressLine.style.width = '0%'; }, 50);

    const closeHandler = () => {
        if (toast.classList.contains('toast-closing')) return;
        toast.classList.add('toast-closing');
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    };

    toast.querySelector('.toast-close').addEventListener('click', closeHandler);
    
    // Auto closing timer
    const autoCloseTimer = setTimeout(closeHandler, duration);
    toast.addEventListener('mouseenter', () => clearTimeout(autoCloseTimer));
}

// Promise-based Elegant Confirm Dialog
function customConfirm(title, message) {
    return new Promise((resolve) => {
        el.confirmTitle.textContent = title;
        el.confirmMessage.textContent = message;
        el.confirmModal.style.display = 'block';

        const cleanUp = () => {
            el.confirmModal.style.display = 'none';
            el.confirmSuccessBtn.removeEventListener('click', confirmYes);
            el.confirmCancelBtn.removeEventListener('click', confirmNo);
            window.removeEventListener('click', outsideClick);
        };

        const confirmYes = () => {
            cleanUp();
            resolve(true);
        };

        const confirmNo = () => {
            cleanUp();
            resolve(false);
        };

        const outsideClick = (e) => {
            if (e.target === el.confirmModal) {
                cleanUp();
                resolve(false);
            }
        };

        el.confirmSuccessBtn.addEventListener('click', confirmYes);
        el.confirmCancelBtn.addEventListener('click', confirmNo);
        window.addEventListener('click', outsideClick);
    });
}

// --- Authentication Controllers ---
el.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            const data = await response.json();
            state.authToken = data.token;
            state.currentUser = data.username;
            
            localStorage.setItem('token', state.authToken);
            localStorage.setItem('username', state.currentUser);
            
            el.loginError.textContent = '';
            showDashboard();
            showToast(`Welcome back, ${state.currentUser}!`, 'success');
        } else {
            const error = await response.json();
            el.loginError.textContent = error.message || 'Invalid username or password';
            triggerFormShake(el.authCard);
            showToast('Authentication failed', 'error');
        }
    } catch (err) {
        el.loginError.textContent = 'Unable to connect to the backend server';
        triggerFormShake(el.authCard);
        showToast('Server connection error', 'error');
    }
});

function triggerFormShake(element) {
    if (!element) return;
    element.classList.add('shake');
    setTimeout(() => {
        element.classList.remove('shake');
    }, 500);
}

function handleLogout() {
    state.authToken = null;
    state.currentUser = null;
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    showLogin();
    showToast('Logged out successfully', 'info');
}

function showLogin() {
    el.authContainer.style.display = 'flex';
    el.mainContainer.style.display = 'none';
    el.loginForm.reset();
}

function showDashboard() {
    el.authContainer.style.display = 'none';
    el.mainContainer.style.display = 'grid';
    
    // Update Profile Displays
    el.userDisplay.textContent = state.currentUser;
    el.sidebarUsername.textContent = state.currentUser;
    el.sidebarAvatar.textContent = (state.currentUser || 'A').charAt(0).toUpperCase();

    switchTab('overview');
    loadStudents();
}

// --- Fetching and Local Data Calculation ---
async function loadStudents() {
    renderTableSkeletons();
    
    try {
        const response = await fetch(`${API_URL}/students`, {
            headers: { 'Authorization': `Bearer ${state.authToken}` }
        });

        if (response.status === 401) {
            handleLogout();
            return;
        }

        const studentsList = await response.json();
        state.students = studentsList;
        state.filteredStudents = [...studentsList];

        // Compute systems overview metrics
        calculateMetrics();
        populateCourseFilters();
        
        // Execute active table operations
        filterAndRenderStudents();
    } catch (err) {
        console.error('Error loading students:', err);
        showToast('Could not load student list', 'error');
    }
}

// Custom Premium numerical counter counting values up from zero
function animateValue(element, start, end, duration) {
    if (!element) return;
    if (start === end) {
        element.textContent = end;
        return;
    }
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        // Easing out quadratic
        const easeProgress = progress * (2 - progress);
        const current = Math.floor(easeProgress * (end - start) + start);
        element.textContent = current;
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            element.textContent = end;
        }
    };
    window.requestAnimationFrame(step);
}

// Dynamic Mock Sparkline line SVG renderer
function renderSparkline(cardType) {
    let points = [];
    if (cardType === 'primary') {
        points = [10, 35, 18, 42, 28, 48, 22, 54]; // Upward growth trend
    } else if (cardType === 'success') {
        points = [22, 26, 18, 32, 28, 38, 35, 42]; // Stable upward trend
    } else {
        points = [8, 24, 12, 38, 20, 46, 32, 50]; // Bouncy ascending trend
    }
    
    const width = 140;
    const height = 40;
    const maxVal = Math.max(...points);
    const minVal = Math.min(...points);
    const range = maxVal - minVal || 1;
    
    const coords = points.map((p, index) => {
        const x = (index / (points.length - 1)) * width;
        const y = height - ((p - minVal) / range) * (height - 8) - 4; // Add padding
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    
    const pathData = `M ${coords.join(' L ')}`;
    const fillData = `${pathData} L ${width},${height} L 0,${height} Z`;
    
    return `
        <div class="sparkline-container">
            <svg class="sparkline-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
                <path class="sparkline-fill" d="${fillData}"></path>
                <path class="sparkline-path" d="${pathData}"></path>
            </svg>
        </div>
    `;
}

// Perform statistical computations on local data cache
function calculateMetrics() {
    const list = state.students;
    
    // Animate statistics counting up dynamically
    animateValue(el.statTotalStudents, 0, list.length, 1000);

    // Courses List
    const uniqueCourses = [...new Set(list.map(s => s.course))].filter(Boolean);
    animateValue(el.statActiveCourses, 0, uniqueCourses.length, 1000);

    // Count enrollments within the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentCount = list.filter(s => new Date(s.enrollmentDate) >= thirtyDaysAgo).length;
    animateValue(el.statRecentEnrollments, 0, recentCount, 1000);

    // Inject Sparkline trendlines into Overview Cards dynamically
    const cards = document.querySelectorAll('.stat-card');
    cards.forEach(card => {
        const existing = card.querySelector('.sparkline-container');
        if (existing) existing.remove();
        
        const type = card.classList.contains('primary') ? 'primary' : (card.classList.contains('success') ? 'success' : 'accent');
        card.insertAdjacentHTML('beforeend', renderSparkline(type));
    });

    // Compile Graphical Progress bar list for Courses
    const courseGroups = {};
    list.forEach(s => {
        if (!s.course) return;
        courseGroups[s.course] = (courseGroups[s.course] || 0) + 1;
    });

    const sortedGroups = Object.entries(courseGroups).sort((a, b) => b[1] - a[1]);
    
    if (sortedGroups.length === 0) {
        el.courseDistributionContainer.innerHTML = `
            <div class="empty-state" style="padding: 1rem 0;">
                <p>No active courses listed in records</p>
            </div>
        `;
        return;
    }

    const maxEnrollments = Math.max(...sortedGroups.map(g => g[1]));
    
    el.courseDistributionContainer.innerHTML = sortedGroups.slice(0, 5).map(([course, count]) => {
        const percentage = maxEnrollments > 0 ? (count / maxEnrollments) * 100 : 0;
        return `
            <div class="course-dist-item">
                <div class="course-item-header">
                    <span>${course}</span>
                    <span style="color: var(--text-muted); font-size: 0.85rem;">${count} ${count === 1 ? 'student' : 'students'}</span>
                </div>
                <div class="course-item-bar-bg">
                    <div class="course-item-bar-fill" data-width="${percentage}%"></div>
                </div>
            </div>
        `;
    }).join('');

    // Trigger visual progress loading delay
    setTimeout(animateCourseDistributionBars, 50);
}

// Animate progress widths smoothly when overview renders
function animateCourseDistributionBars() {
    const bars = document.querySelectorAll('.course-item-bar-fill');
    bars.forEach(bar => {
        const targetWidth = bar.getAttribute('data-width');
        if (targetWidth) {
            bar.style.width = targetWidth;
        }
    });
}

// Populate search filter course selectors
function populateCourseFilters() {
    const list = state.students;
    const courses = [...new Set(list.map(s => s.course))].filter(Boolean).sort();
    
    const currentSelection = el.filterCourse.value;
    
    el.filterCourse.innerHTML = '<option value="">All Courses</option>' + 
        courses.map(c => `<option value="${c}">${c}</option>`).join('');

    // Restore previous selection if still available
    if (courses.includes(currentSelection)) {
        el.filterCourse.value = currentSelection;
    }
}

// Loading Skeleton UI Elements for Table
function renderTableSkeletons() {
    el.studentTableBody.innerHTML = Array(4).fill(0).map(() => `
        <tr class="skeleton-row">
            <td><div class="student-name-cell"><div class="avatar-initial skeleton" style="width:32px; height:32px; border-radius:50%;"></div><div class="skeleton skeleton-title"></div></div></td>
            <td><div class="skeleton skeleton-text"></div></td>
            <td><div class="skeleton skeleton-title"></div></td>
            <td><div class="skeleton skeleton-text" style="width: 60%"></div></td>
            <td><div style="display:flex; gap:0.5rem;"><div class="skeleton" style="width:32px; height:32px; border-radius:0.375rem;"></div><div class="skeleton" style="width:32px; height:32px; border-radius:0.375rem;"></div></div></td>
        </tr>
    `).join('');
}

// Generate unique HSL theme-compliant avatar initial colors dynamically based on student names hashes
function getAvatarStyle(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    const isDark = document.body.classList.contains('dark-theme');
    
    // Choose contrasting parameters for dark mode obsidian gradients and crisp light modes
    const bg = isDark ? `hsl(${hue}, 45%, 18%)` : `hsl(${hue}, 65%, 90%)`;
    const text = isDark ? `hsl(${hue}, 85%, 75%)` : `hsl(${hue}, 70%, 35%)`;
    const border = isDark ? `1px solid hsl(${hue}, 45%, 26%)` : `1px solid hsl(${hue}, 65%, 82%)`;
    
    return `background-color: ${bg}; color: ${text}; border: ${border};`;
}

// Render dynamic student items rows into Directory with staggered load transitions
function renderStudentListTable() {
    const list = state.filteredStudents;
    el.studentTableBody.innerHTML = '';

    if (list.length === 0) {
        el.studentTableBody.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <h3>No students found</h3>
                        <p>Try refining your search query or selected course filters</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    list.forEach((s, index) => {
        const fullName = `${s.firstName} ${s.lastName}`;
        const initial = s.firstName.charAt(0).toUpperCase();
        const tr = document.createElement('tr');
        
        // Stagger load entry delay
        tr.style.animationDelay = `${index * 0.04}s`;
        const avatarStyle = getAvatarStyle(fullName);
        
        tr.innerHTML = `
            <td>
                <div class="student-name-cell">
                    <div class="avatar-initial" style="${avatarStyle}">${initial}</div>
                    <span style="font-weight: 700;">${fullName}</span>
                </div>
            </td>
            <td><a href="mailto:${s.email}" style="color: inherit; text-decoration: none; font-weight:600;">${s.email}</a></td>
            <td><span class="badge course">${s.course}</span></td>
            <td style="color: var(--text-muted); font-weight:600;">${new Date(s.enrollmentDate).toLocaleDateString()}</td>
            <td>
                <div style="display: flex; gap: 0.55rem;">
                    <button class="btn icon-btn edit" onclick="openEditStudent(${s.id})" title="Edit Details">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:16px; height:16px;">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </button>
                    <button class="btn icon-btn delete" onclick="deleteStudent(${s.id})" title="Remove Student">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:16px; height:16px;">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </td>
        `;
        
        el.studentTableBody.appendChild(tr);
    });
}

// --- Add & Edit Student Modal Controllers ---
function initModalHandlers() {
    const triggerAdd = () => {
        el.modalTitle.textContent = 'Add New Student';
        el.studentForm.reset();
        document.getElementById('student-id').value = '';
        el.studentModal.style.display = 'block';
        document.getElementById('firstName').focus();
    };

    el.addStudentBtn.onclick = triggerAdd;
    el.quickAddStudentBtn.onclick = () => {
        switchTab('students');
        triggerAdd();
    };

    // Modal Closing triggers
    document.querySelectorAll('.close-modal, .close-modal-btn').forEach(btn => {
        btn.onclick = () => {
            el.studentModal.style.display = 'none';
        };
    });

    window.addEventListener('click', (event) => {
        if (event.target === el.studentModal) {
            el.studentModal.style.display = 'none';
        }
    });

    // Form Submissions Actions (Creates/Updates)
    el.studentForm.onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('student-id').value;
        const studentData = {
            firstName: document.getElementById('firstName').value.trim(),
            lastName: document.getElementById('lastName').value.trim(),
            email: document.getElementById('email').value.trim(),
            course: document.getElementById('course').value.trim()
        };

        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_URL}/students/${id}` : `${API_URL}/students`;
        
        if (id) studentData.id = parseInt(id);

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${state.authToken}`
                },
                body: JSON.stringify(studentData)
            });

            if (response.ok) {
                el.studentModal.style.display = 'none';
                showToast(id ? 'Student record updated successfully' : 'New student enrolled successfully', 'success');
                loadStudents(); // Full refresh & recalcs
            } else {
                triggerFormShake(el.studentFormContent);
                showToast('Failed to save student details. Check inputs', 'error');
            }
        } catch (err) {
            console.error('Error saving student:', err);
            triggerFormShake(el.studentFormContent);
            showToast('Network error, could not save record', 'error');
        }
    };
}

// Fetch single record for modal editing
async function openEditStudent(id) {
    try {
        const response = await fetch(`${API_URL}/students/${id}`, {
            headers: { 'Authorization': `Bearer ${state.authToken}` }
        });
        
        if (response.status === 401) {
            handleLogout();
            return;
        }

        const student = await response.json();

        el.modalTitle.textContent = 'Edit Student Details';
        document.getElementById('student-id').value = student.id;
        document.getElementById('firstName').value = student.firstName;
        document.getElementById('lastName').value = student.lastName;
        document.getElementById('email').value = student.email;
        document.getElementById('course').value = student.course;
        
        el.studentModal.style.display = 'block';
        document.getElementById('firstName').focus();
    } catch (err) {
        console.error('Error fetching student details:', err);
        showToast('Unable to fetch student details', 'error');
    }
}

// Execute DELETION
async function deleteStudent(id) {
    const student = state.students.find(s => s.id === id);
    const fullName = student ? `${student.firstName} ${student.lastName}` : 'this student';

    const confirmed = await customConfirm(
        'Remove Student Record?',
        `Are you sure you want to remove ${fullName} from Gradely? All associated data will be deleted permanentely.`
    );

    if (!confirmed) return;

    try {
        const response = await fetch(`${API_URL}/students/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${state.authToken}` }
        });

        if (response.ok) {
            showToast('Student record deleted successfully', 'success');
            loadStudents(); // Reloads, updates states, recalculates statistics
        } else {
            showToast('Could not delete student. Unauthorized or database error', 'error');
        }
    } catch (err) {
        console.error('Error deleting student:', err);
        showToast('Network error, failed to execute deletion', 'error');
    }
}

// Expose modal handlers globally so raw HTML onclicks work perfectly
window.openEditStudent = openEditStudent;
window.deleteStudent = deleteStudent;
