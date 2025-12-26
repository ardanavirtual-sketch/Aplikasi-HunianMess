// ===== CONFIGURATION =====
const CONFIG = {
    APP_NAME: 'MessHub',
    VERSION: '1.0.0',
    SUPABASE_URL: 'https://ahzfpguvgdjytshlgjfv.supabase.co',
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoemZwZ3V2Z2RqeXRzaGxnamZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2OTYwOTYsImV4cCI6MjA4MjI3MjA5Nn0.sMgxg6MaWTii-i6Pf84JzM-p2ut__yHG0v0bhurnt74',
    ITEMS_PER_PAGE: 20,
    THEME: 'light',
    LANGUAGE: 'id'
};

// ===== STATE MANAGEMENT =====
let state = {
    currentPage: 'dashboard',
    karyawan: [],
    hunian: [],
    filteredKaryawan: [],
    currentPageIndex: 1,
    isLoading: false,
    supabase: null,
    charts: {},
    searchResults: [],
    notifications: [],
    sidebarCollapsed: false,
    darkMode: false
};

// ===== UTILITY FUNCTIONS =====
const Utils = {
    formatNumber: (num) => new Intl.NumberFormat('id-ID').format(num),
    
    formatDate: (date) => {
        return dayjs(date).locale(CONFIG.LANGUAGE).format('DD MMM YYYY, HH:mm');
    },
    
    formatCurrency: (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    },
    
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    generateAvatar: (name, size = 100) => {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=${size}&background=4f46e5&color=fff&bold=true`;
    },
    
    calculateAge: (birthDate) => {
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    }
};

// ===== INITIALIZATION =====
async function initApp() {
    console.log('🚀 Initializing MessHub Application...');
    
    // Initialize loading animation
    initLoadingAnimation();
    
    // Load saved preferences
    loadPreferences();
    
    // Initialize Supabase
    await initSupabase();
    
    // Initialize UI Components
    initUIComponents();
    
    // Load initial data
    await loadInitialData();
    
    // Initialize Charts
    initCharts();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup routing
    setupRouting();
    
    // Start service worker for PWA
    registerServiceWorker();
    
    // Finalize loading
    setTimeout(() => {
        document.getElementById('loading').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('app').classList.remove('d-none');
            showToast('Sistem siap digunakan!', 'success');
            updateConnectionStatus();
        }, 500);
    }, 1000);
}

function initLoadingAnimation() {
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 10;
        if (progress > 100) {
            progress = 100;
            clearInterval(interval);
        }
        document.getElementById('loadingBar').style.width = `${progress}%`;
        
        // Update loading messages
        const messages = [
            'Memuat konfigurasi sistem...',
            'Menyiapkan database...',
            'Memuat data karyawan...',
            'Menyiapkan antarmuka...',
            'Hampir selesai...'
        ];
        const index = Math.floor(progress / 20);
        if (index < messages.length) {
            document.querySelector('.loading-message').textContent = messages[index];
        }
    }, 200);
}

function loadPreferences() {
    // Load theme preference
    const savedTheme = localStorage.getItem('messhub_theme');
    if (savedTheme === 'dark') {
        toggleDarkMode(true);
    }
    
    // Load sidebar state
    const sidebarState = localStorage.getItem('messhub_sidebar');
    if (sidebarState === 'collapsed') {
        toggleSidebar(true);
    }
}

// ===== SUPABASE INITIALIZATION =====
async function initSupabase() {
    if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_KEY) {
        console.warn('⚠️ Supabase credentials not configured. Using mock data.');
        return;
    }
    
    try {
        state.supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
        
        // Test connection
        const { data, error } = await state.supabase.from('karyawan').select('count', { count: 'exact' });
        
        if (error) throw error;
        
        console.log('✅ Supabase connected successfully');
        showToast('Database terhubung', 'success');
    } catch (error) {
        console.error('❌ Supabase connection error:', error);
        showToast('Koneksi database gagal. Menggunakan data lokal.', 'warning');
    }
}

// ===== UI COMPONENTS INITIALIZATION =====
function initUIComponents() {
    // Initialize tooltips
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
    
    // Initialize theme toggle
    document.getElementById('themeToggle').addEventListener('click', () => {
        toggleDarkMode(!state.darkMode);
    });
    
    // Initialize sidebar toggle
    document.getElementById('sidebarToggle').addEventListener('click', () => {
        toggleSidebar(!state.sidebarCollapsed);
    });
    
    // Initialize user dropdown
    document.querySelector('.user-dropdown').addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelector('.user-dropdown-menu').classList.toggle('show');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
        document.querySelector('.user-dropdown-menu')?.classList.remove('show');
    });
}

// ===== DARK MODE TOGGLE =====
function toggleDarkMode(enable) {
    state.darkMode = enable;
    const html = document.documentElement;
    
    if (enable) {
        html.setAttribute('data-bs-theme', 'dark');
        document.getElementById('themeToggle').className = 'fas fa-sun';
        localStorage.setItem('messhub_theme', 'dark');
    } else {
        html.setAttribute('data-bs-theme', 'light');
        document.getElementById('themeToggle').className = 'fas fa-moon';
        localStorage.setItem('messhub_theme', 'light');
    }
}

// ===== SIDEBAR TOGGLE =====
function toggleSidebar(collapse) {
    state.sidebarCollapsed = collapse;
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const toggleIcon = document.getElementById('sidebarToggle').querySelector('i');
    
    if (collapse) {
        sidebar.style.width = 'var(--sidebar-collapsed)';
        mainContent.style.marginLeft = 'var(--sidebar-collapsed)';
        toggleIcon.className = 'fas fa-chevron-right';
        document.querySelectorAll('.sidebar .menu-item span, .sidebar .user-info, .sidebar-footer .menu-item span, .logo h2')
            .forEach(el => el.style.display = 'none');
        localStorage.setItem('messhub_sidebar', 'collapsed');
    } else {
        sidebar.style.width = 'var(--sidebar-width)';
        mainContent.style.marginLeft = 'var(--sidebar-width)';
        toggleIcon.className = 'fas fa-bars';
        document.querySelectorAll('.sidebar .menu-item span, .sidebar .user-info, .sidebar-footer .menu-item span, .logo h2')
            .forEach(el => el.style.display = 'block');
        localStorage.setItem('messhub_sidebar', 'expanded');
    }
}

// ===== CHART INITIALIZATION =====
function initCharts() {
    // Initialize dashboard charts
    initDashboardCharts();
    
    // Initialize analytics charts
    initAnalyticsCharts();
}

function initDashboardCharts() {
    // Occupancy Chart
    const occupancyChart = new ApexCharts(document.getElementById('occupancyChart'), {
        series: [{
            name: 'Terisi',
            data: [30, 40, 35, 50, 49, 60, 70, 91, 125, 150, 170, 180]
        }],
        chart: {
            type: 'area',
            height: 350,
            toolbar: { show: false },
            zoom: { enabled: false }
        },
        colors: [CONFIG.THEME === 'dark' ? '#818cf8' : '#4f46e5'],
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 3 },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.7,
                opacityTo: 0.3,
                stops: [0, 90, 100]
            }
        },
        xaxis: {
            categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        },
        tooltip: {
            theme: CONFIG.THEME,
            x: { show: false }
        }
    });
    
    occupancyChart.render();
    state.charts.occupancy = occupancyChart;
    
    // Department Distribution Chart
    const deptData = [
        { department: 'Dispatch', count: 45 },
        { department: 'Warehouse', count: 30 },
        { department: 'Production', count: 25 },
        { department: 'Equipment', count: 20 },
        { department: 'Power Plant', count: 15 }
    ];
    
    const deptChart = new ApexCharts(document.getElementById('deptChart'), {
        series: deptData.map(d => d.count),
        chart: {
            type: 'donut',
            height: 350
        },
        colors: ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
        labels: deptData.map(d => d.department),
        legend: {
            position: 'bottom'
        },
        plotOptions: {
            pie: {
                donut: {
                    size: '65%',
                    labels: {
                        show: true,
                        total: {
                            show: true,
                            label: 'Total',
                            color: CONFIG.THEME === 'dark' ? '#cbd5e1' : '#64748b'
                        }
                    }
                }
            }
        }
    });
    
    deptChart.render();
    state.charts.department = deptChart;
}

// ===== DATA LOADING =====
async function loadInitialData() {
    try {
        state.isLoading = true;
        updateLoadingIndicator(true);
        
        // Load data in parallel
        const [karyawanData, hunianData, statsData] = await Promise.all([
            loadKaryawanData(),
            loadHunianData(),
            loadStatistics()
        ]);
        
        state.karyawan = karyawanData;
        state.hunian = hunianData;
        state.filteredKaryawan = karyawanData;
        
        // Update UI with loaded data
        updateDashboardStats(statsData);
        updateSidebarCounts();
        
        console.log('✅ Data loaded successfully');
    } catch (error) {
        console.error('❌ Error loading data:', error);
        showToast('Gagal memuat data', 'error');
    } finally {
        state.isLoading = false;
        updateLoadingIndicator(false);
        updateLastUpdateTime();
    }
}

async function loadKaryawanData() {
    if (!state.supabase) {
        return getMockKaryawanData();
    }
    
    try {
        const { data, error } = await state.supabase
            .from('karyawan')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1000);
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error loading karyawan:', error);
        return getMockKaryawanData();
    }
}

function getMockKaryawanData() {
    // Return comprehensive mock data
    const departments = ['Dispatch', 'Warehouse', 'Production', 'Equipment', 'Power Plant', 'Maintenance', 'Security'];
    const positions = ['Operator', 'Supervisor', 'Manager', 'Technician', 'Driver', 'Engineer', 'Analyst'];
    const companies = ['PT. HJF', 'PT. ONC', 'PT. HPAL', 'PT. DCM'];
    const locations = ['MENTARI', 'SURYA RESIDENCE (P2)', 'PRIMA MESS', 'SENTOSA MESS'];
    
    return Array.from({ length: 150 }, (_, i) => ({
        id: i + 1,
        nik: `F${String(i + 10000).padStart(7, '0')}`,
        nama: `Karyawan ${i + 1}`,
        gender: Math.random() > 0.5 ? 'L' : 'P',
        department: departments[Math.floor(Math.random() * departments.length)],
        jabatan: positions[Math.floor(Math.random() * positions.length)],
        perusahaan: companies[Math.floor(Math.random() * companies.length)],
        lokasi_hunian: locations[Math.floor(Math.random() * locations.length)],
        lantai: Math.random() > 0.5 ? 'Lantai Atas' : 'Lantai Bawah',
        block: Math.floor(Math.random() * 10) + 1,
        no_kamar: Math.floor(Math.random() * 20) + 1,
        status_kamar: Math.random() > 0.3 ? 'TERISI' : 'KOSONG',
        tanggal_masuk: dayjs().subtract(Math.floor(Math.random() * 365), 'day').format('YYYY-MM-DD'),
        created_at: dayjs().subtract(Math.floor(Math.random() * 30), 'day').format('YYYY-MM-DD HH:mm:ss')
    }));
}

// ===== DASHBOARD RENDERING =====
function renderDashboard() {
    const stats = calculateDashboardStats();
    
    return `
        <div class="animated-content">
            <!-- Quick Stats -->
            <div class="row mb-4">
                <div class="col-xl-3 col-lg-6 mb-4">
                    <div class="stats-card">
                        <div class="d-flex align-items-center">
                            <div class="card-icon bg-primary-light text-primary">
                                <i class="fas fa-users"></i>
                            </div>
                            <div class="ms-3">
                                <h3 class="stats-number">${Utils.formatNumber(stats.totalKaryawan)}</h3>
                                <p class="stats-label">Total Karyawan</p>
                                <div class="stats-change positive">
                                    <i class="fas fa-arrow-up"></i>
                                    <span>12% dari bulan lalu</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-xl-3 col-lg-6 mb-4">
                    <div class="stats-card">
                        <div class="d-flex align-items-center">
                            <div class="card-icon bg-success-light text-success">
                                <i class="fas fa-bed"></i>
                            </div>
                            <div class="ms-3">
                                <h3 class="stats-number">${Utils.formatNumber(stats.totalHunian)}</h3>
                                <p class="stats-label">Total Hunian</p>
                                <div class="stats-change positive">
                                    <i class="fas fa-arrow-up"></i>
                                    <span>8% dari bulan lalu</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-xl-3 col-lg-6 mb-4">
                    <div class="stats-card">
                        <div class="d-flex align-items-center">
                            <div class="card-icon bg-warning-light text-warning">
                                <i class="fas fa-door-closed"></i>
                            </div>
                            <div class="ms-3">
                                <h3 class="stats-number">${Utils.formatNumber(stats.kosong)}</h3>
                                <p class="stats-label">Kamar Kosong</p>
                                <div class="stats-change ${stats.kosongChange >= 0 ? 'positive' : 'negative'}">
                                    <i class="fas fa-arrow-${stats.kosongChange >= 0 ? 'up' : 'down'}"></i>
                                    <span>${Math.abs(stats.kosongChange)}% dari bulan lalu</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-xl-3 col-lg-6 mb-4">
                    <div class="stats-card">
                        <div class="d-flex align-items-center">
                            <div class="card-icon bg-info-light text-info">
                                <i class="fas fa-percentage"></i>
                            </div>
                            <div class="ms-3">
                                <h3 class="stats-number">${stats.occupancyRate}%</h3>
                                <p class="stats-label">Tingkat Okupansi</p>
                                <div class="stats-change ${stats.occupancyChange >= 0 ? 'positive' : 'negative'}">
                                    <i class="fas fa-arrow-${stats.occupancyChange >= 0 ? 'up' : 'down'}"></i>
                                    <span>${Math.abs(stats.occupancyChange)}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Charts Section -->
            <div class="row mb-4">
                <div class="col-lg-8 mb-4">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="card-title">Trend Okupansi Hunian</h5>
                            <div class="card-actions">
                                <select class="form-select form-select-sm" style="width: auto;">
                                    <option>Tahun 2024</option>
                                    <option>Tahun 2023</option>
                                </select>
                            </div>
                        </div>
                        <div class="card-body">
                            <div id="occupancyChart"></div>
                        </div>
                    </div>
                </div>
                
                <div class="col-lg-4 mb-4">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="card-title">Distribusi Departemen</h5>
                        </div>
                        <div class="card-body">
                            <div id="deptChart"></div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Recent Activity & Top Departments -->
            <div class="row">
                <div class="col-lg-6 mb-4">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="card-title">Aktivitas Terbaru</h5>
                            <button class="btn btn-sm btn-outline" onclick="loadActivities()">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                        </div>
                        <div class="card-body">
                            <div class="activity-timeline">
                                ${renderRecentActivities()}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-lg-6 mb-4">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="card-title">Departemen Terbanyak</h5>
                        </div>
                        <div class="card-body">
                            <div class="department-rankings">
                                ${renderDepartmentRankings()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function calculateDashboardStats() {
    const totalKaryawan = state.karyawan.length;
    const totalHunian = state.hunian.length;
    const terisi = state.hunian.filter(h => h.status === 'TERISI').length;
    const kosong = totalHunian - terisi;
    const occupancyRate = totalHunian > 0 ? Math.round((terisi / totalHunian) * 100) : 0;
    
    // Mock changes for demo
    const kosongChange = 5;
    const occupancyChange = 2;
    
    return {
        totalKaryawan,
        totalHunian,
        terisi,
        kosong,
        occupancyRate,
        kosongChange,
        occupancyChange
    };
}

function renderRecentActivities() {
    const activities = [
        { type: 'add', user: 'Admin', action: 'menambahkan karyawan baru', time: '5 menit lalu', icon: 'user-plus' },
        { type: 'update', user: 'Manager', action: 'memperbarui data hunian', time: '1 jam lalu', icon: 'edit' },
        { type: 'import', user: 'System', action: 'mengimpor data dari Excel', time: '3 jam lalu', icon: 'file-import' },
        { type: 'report', user: 'Admin', action: 'menghasilkan laporan bulanan', time: '5 jam lalu', icon: 'file-pdf' },
        { type: 'maintenance', user: 'System', action: 'melakukan backup database', time: '1 hari lalu', icon: 'database' }
    ];
    
    return activities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon bg-${activity.type}">
                <i class="fas fa-${activity.icon}"></i>
            </div>
            <div class="activity-content">
                <div class="activity-text">
                    <strong>${activity.user}</strong> ${activity.action}
                </div>
                <div class="activity-time">${activity.time}</div>
            </div>
        </div>
    `).join('');
}

function renderDepartmentRankings() {
    const departments = {};
    state.karyawan.forEach(k => {
        if (k.department) {
            departments[k.department] = (departments[k.department] || 0) + 1;
        }
    });
    
    const sorted = Object.entries(departments)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    return sorted.map(([dept, count], index) => `
        <div class="ranking-item">
            <div class="ranking-rank">${index + 1}</div>
            <div class="ranking-info">
                <div class="ranking-name">${dept}</div>
                <div class="ranking-count">${count} karyawan</div>
            </div>
            <div class="ranking-progress">
                <div class="progress" style="height: 8px;">
                    <div class="progress-bar" style="width: ${(count / Math.max(...sorted.map(s => s[1]))) * 100}%"></div>
                </div>
            </div>
        </div>
    `).join('');
}

// ===== MODERN KARYAWAN TABLE =====
function renderKaryawanTable() {
    const startIndex = (state.currentPageIndex - 1) * CONFIG.ITEMS_PER_PAGE;
    const endIndex = startIndex + CONFIG.ITEMS_PER_PAGE;
    const currentItems = state.filteredKaryawan.slice(startIndex, endIndex);
    
    return `
        <div class="animated-content">
            <!-- Advanced Filters -->
            <div class="card mb-4">
                <div class="card-body">
                    <div class="row g-3">
                        <div class="col-lg-3 col-md-6">
                            <div class="form-group">
                                <label class="form-label">Cari</label>
                                <div class="input-group">
                                    <span class="input-group-text">
                                        <i class="fas fa-search"></i>
                                    </span>
                                    <input type="text" class="form-control" placeholder="NIK, nama, atau jabatan..." 
                                           oninput="Utils.debounce(searchKaryawan, 300)(this.value)">
                                </div>
                            </div>
                        </div>
                        <div class="col-lg-3 col-md-6">
                            <div class="form-group">
                                <label class="form-label">Departemen</label>
                                <select class="form-select" onchange="filterByDepartment(this.value)">
                                    <option value="">Semua Departemen</option>
                                    ${getDepartmentOptions()}
                                </select>
                            </div>
                        </div>
                        <div class="col-lg-3 col-md-6">
                            <div class="form-group">
                                <label class="form-label">Status</label>
                                <select class="form-select" onchange="filterByStatus(this.value)">
                                    <option value="">Semua Status</option>
                                    <option value="TERISI">Terisi</option>
                                    <option value="KOSONG">Kosong</option>
                                </select>
                            </div>
                        </div>
                        <div class="col-lg-3 col-md-6">
                            <div class="form-group">
                                <label class="form-label">Perusahaan</label>
                                <select class="form-select" onchange="filterByCompany(this.value)">
                                    <option value="">Semua Perusahaan</option>
                                    ${getCompanyOptions()}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Table -->
            <div class="card">
                <div class="card-header">
                    <h5 class="card-title">Data Karyawan</h5>
                    <div class="card-actions">
                        <button class="btn btn-sm btn-outline" onclick="exportToExcel()">
                            <i class="fas fa-download"></i> Export
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="showKaryawanForm()">
                            <i class="fas fa-plus"></i> Tambah
                        </button>
                    </div>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th width="50">#</th>
                                    <th>Karyawan</th>
                                    <th>Departemen</th>
                                    <th>Jabatan</th>
                                    <th>Hunian</th>
                                    <th>Status</th>
                                    <th width="120">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${currentItems.map((karyawan, index) => `
                                    <tr>
                                        <td>${startIndex + index + 1}</td>
                                        <td>
                                            <div class="d-flex align-items-center">
                                                <img src="${Utils.generateAvatar(karyawan.nama, 40)}" 
                                                     class="rounded-circle me-3" width="40" height="40" alt="${karyawan.nama}">
                                                <div>
                                                    <div class="fw-semibold">${karyawan.nama}</div>
                                                    <small class="text-muted">${karyawan.nik}</small>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span class="badge bg-primary">${karyawan.department || '-'}</span>
                                        </td>
                                        <td>${karyawan.jabatan || '-'}</td>
                                        <td>
                                            <div class="text-sm">
                                                <div>${karyawan.lokasi_hunian || '-'}</div>
                                                <small class="text-muted">
                                                    ${karyawan.lantai || ''} • Block ${karyawan.block || ''} • No. ${karyawan.no_kamar || ''}
                                                </small>
                                            </div>
                                        </td>
                                        <td>
                                            <span class="badge ${karyawan.status_kamar === 'TERISI' ? 'badge-success' : 'badge-warning'}">
                                                <i class="fas fa-${karyawan.status_kamar === 'TERISI' ? 'check' : 'times'} me-1"></i>
                                                ${karyawan.status_kamar}
                                            </span>
                                        </td>
                                        <td>
                                            <div class="btn-group btn-group-sm">
                                                <button class="btn btn-outline" onclick="viewKaryawanDetail('${karyawan.id || karyawan.nik}')"
                                                        data-bs-toggle="tooltip" title="Detail">
                                                    <i class="fas fa-eye"></i>
                                                </button>
                                                <button class="btn btn-outline" onclick="editKaryawan('${karyawan.id || karyawan.nik}')"
                                                        data-bs-toggle="tooltip" title="Edit">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                                <button class="btn btn-outline-danger" onclick="deleteKaryawan('${karyawan.id || karyawan.nik}')"
                                                        data-bs-toggle="tooltip" title="Hapus">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="card-footer">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            Menampilkan ${startIndex + 1} - ${Math.min(endIndex, state.filteredKaryawan.length)} 
                            dari ${Utils.formatNumber(state.filteredKaryawan.length)} karyawan
                        </div>
                        <nav>
                            ${renderPagination()}
                        </nav>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ===== MODERN MODALS =====
function showKaryawanForm(karyawan = null) {
    const modalId = 'karyawanFormModal';
    const modalHtml = `
        <div class="modal-overlay" id="${modalId}">
            <div class="modal" style="max-width: 800px;">
                <div class="modal-header">
                    <h3 class="modal-title">
                        <i class="fas fa-user me-2"></i>
                        ${karyawan ? 'Edit Karyawan' : 'Tambah Karyawan Baru'}
                    </h3>
                    <button class="modal-close" onclick="closeModal('${modalId}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="karyawanForm" class="row g-3">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label class="form-label">NIK *</label>
                                <input type="text" class="form-control" name="nik" 
                                       value="${karyawan?.nik || ''}" required
                                       ${karyawan ? 'readonly' : ''}
                                       placeholder="Masukkan NIK">
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label class="form-label">Nama Lengkap *</label>
                                <input type="text" class="form-control" name="nama" 
                                       value="${karyawan?.nama || ''}" required
                                       placeholder="Masukkan nama lengkap">
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label class="form-label">Jenis Kelamin</label>
                                <div class="d-flex gap-3">
                                    <label class="form-check">
                                        <input type="radio" class="form-check-input" name="gender" value="L" 
                                               ${karyawan?.gender === 'L' ? 'checked' : ''}>
                                        <span class="form-check-label">Laki-laki</span>
                                    </label>
                                    <label class="form-check">
                                        <input type="radio" class="form-check-input" name="gender" value="P"
                                               ${karyawan?.gender === 'P' ? 'checked' : ''}>
                                        <span class="form-check-label">Perempuan</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label class="form-label">Departemen</label>
                                <select class="form-select" name="department">
                                    <option value="">Pilih Departemen</option>
                                    <option value="Dispatch" ${karyawan?.department === 'Dispatch' ? 'selected' : ''}>Dispatch</option>
                                    <option value="Warehouse" ${karyawan?.department === 'Warehouse' ? 'selected' : ''}>Warehouse</option>
                                    <option value="Production" ${karyawan?.department === 'Production' ? 'selected' : ''}>Production</option>
                                    <option value="Equipment" ${karyawan?.department === 'Equipment' ? 'selected' : ''}>Equipment</option>
                                    <option value="Power Plant" ${karyawan?.department === 'Power Plant' ? 'selected' : ''}>Power Plant</option>
                                </select>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label class="form-label">Jabatan</label>
                                <input type="text" class="form-control" name="jabatan" 
                                       value="${karyawan?.jabatan || ''}"
                                       placeholder="Masukkan jabatan">
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label class="form-label">Perusahaan</label>
                                <select class="form-select" name="perusahaan">
                                    <option value="">Pilih Perusahaan</option>
                                    <option value="PT. HJF" ${karyawan?.perusahaan === 'PT. HJF' ? 'selected' : ''}>PT. HJF</option>
                                    <option value="PT. ONC" ${karyawan?.perusahaan === 'PT. ONC' ? 'selected' : ''}>PT. ONC</option>
                                    <option value="PT. HPAL" ${karyawan?.perusahaan === 'PT. HPAL' ? 'selected' : ''}>PT. HPAL</option>
                                </select>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label class="form-label">Lokasi Hunian</label>
                                <select class="form-select" name="lokasi_hunian">
                                    <option value="">Pilih Lokasi</option>
                                    <option value="MENTARI" ${karyawan?.lokasi_hunian === 'MENTARI' ? 'selected' : ''}>MENTARI</option>
                                    <option value="SURYA RESIDENCE (P2)" ${karyawan?.lokasi_hunian === 'SURYA RESIDENCE (P2)' ? 'selected' : ''}>SURYA RESIDENCE (P2)</option>
                                </select>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label class="form-label">Status Kamar</label>
                                <select class="form-select" name="status_kamar">
                                    <option value="TERISI" ${karyawan?.status_kamar === 'TERISI' ? 'selected' : ''}>Terisi</option>
                                    <option value="KOSONG" ${karyawan?.status_kamar === 'KOSONG' ? 'selected' : ''}>Kosong</option>
                                </select>
                            </div>
                        </div>
                        <div class="col-12">
                            <div class="form-group">
                                <label class="form-label">Alamat Lengkap</label>
                                <textarea class="form-control" name="alamat" rows="2"
                                          placeholder="Masukkan alamat lengkap">${karyawan?.alamat || ''}</textarea>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeModal('${modalId}')">
                        Batal
                    </button>
                    <button type="button" class="btn btn-primary" onclick="saveKaryawan('${modalId}')">
                        <i class="fas fa-save me-2"></i>
                        ${karyawan ? 'Perbarui' : 'Simpan'}
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('modalsContainer').innerHTML = modalHtml;
    setTimeout(() => {
        document.getElementById(modalId).classList.add('active');
    }, 10);
}

// ===== TOAST NOTIFICATIONS =====
function showToast(message, type = 'info', duration = 5000) {
    const toastId = 'toast-' + Date.now();
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    
    const toastHtml = `
        <div id="${toastId}" class="toast toast-${type}">
            <div class="toast-icon">
                <i class="fas fa-${icons[type] || 'info-circle'}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="closeToast('${toastId}')">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    container.insertAdjacentHTML('beforeend', toastHtml);
    
    // Auto remove after duration
    setTimeout(() => {
        closeToast(toastId);
    }, duration);
}

function closeToast(toastId) {
    const toast = document.getElementById(toastId);
    if (toast) {
        toast.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }
}

// ===== SERVICE WORKER =====
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js')
            .then(registration => {
                console.log('✅ Service Worker registered:', registration);
            })
            .catch(error => {
                console.log('❌ Service Worker registration failed:', error);
            });
    }
}

// ===== UPDATE FUNCTIONS =====
function updateDashboardStats(stats) {
    // Update dashboard stats in real-time
    if (state.currentPage === 'dashboard') {
        setTimeout(() => renderPage('dashboard'), 100);
    }
}

function updateSidebarCounts() {
    const karyawanCount = state.karyawan.length;
    const countElement = document.querySelector('.sidebar-menu [data-page="karyawan"] .badge');
    if (countElement) {
        countElement.textContent = karyawanCount;
    }
}

function updateLastUpdateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('id-ID', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    document.getElementById('lastUpdate').textContent = timeString;
}

function updateConnectionStatus() {
    const statusElement = document.getElementById('connectionStatus');
    if (state.supabase) {
        statusElement.textContent = 'Online';
        document.querySelector('.status-dot').classList.add('online');
    } else {
        statusElement.textContent = 'Offline';
        document.querySelector('.status-dot').classList.remove('online');
    }
}

function updateLoadingIndicator(loading) {
    const app = document.getElementById('app');
    if (loading) {
        app.classList.add('loading');
    } else {
        app.classList.remove('loading');
    }
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Global search with debounce
    const searchInput = document.getElementById('globalSearch');
    if (searchInput) {
        searchInput.addEventListener('input', Utils.debounce((e) => {
            performGlobalSearch(e.target.value);
        }, 300));
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + K for search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            document.getElementById('globalSearch').focus();
        }
        
        // Ctrl/Cmd + N for new karyawan
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            showKaryawanForm();
        }
        
        // Escape to close modals
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
    
    // Window resize for responsive sidebar
    window.addEventListener('resize', () => {
        if (window.innerWidth < 1024 && !state.sidebarCollapsed) {
            toggleSidebar(true);
        }
    });
}

// ===== INITIALIZE ON LOAD =====
window.addEventListener('DOMContentLoaded', initApp);

// Export functions to global scope
window.navigate = navigate;
window.showKaryawanForm = showKaryawanForm;
window.showImportModal = showImportModal;
window.Utils = Utils;
window.state = state;
