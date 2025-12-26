// Configuration
const CONFIG = {
    APP_NAME: 'Mess Hunian Karyawan',
    VERSION: '1.0.0',
    SUPABASE_URL: 'https://ahzfpguvgdjytshlgjfv.supabase.co', // Set your Supabase URL here
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoemZwZ3V2Z2RqeXRzaGxnamZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2OTYwOTYsImV4cCI6MjA4MjI3MjA5Nn0.sMgxg6MaWTii-i6Pf84JzM-p2ut__yHG0v0bhurnt74', // Set your Supabase anon key here
    ITEMS_PER_PAGE: 20
};

// State Management
let state = {
    currentPage: 'dashboard',
    karyawan: [],
    hunian: [],
    filteredKaryawan: [],
    currentPageIndex: 1,
    isLoading: false,
    supabase: null
};

// Initialize Supabase
function initSupabase() {
    if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_KEY) {
        showToast('Supabase URL dan Key belum diatur', 'warning');
        console.warn('Supabase credentials not set. Please update CONFIG in app.js');
        return;
    }
    
    state.supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
    
    // Test connection
    testSupabaseConnection();
}

// Test Supabase Connection
async function testSupabaseConnection() {
    try {
        const { data, error } = await state.supabase.from('karyawan').select('count');
        if (error) throw error;
        console.log('Supabase connected successfully');
    } catch (error) {
        console.error('Supabase connection error:', error);
        showToast('Koneksi database gagal', 'danger');
    }
}

// Initialize Application
async function initApp() {
    console.log('Initializing application...');
    
    // Initialize Supabase
    initSupabase();
    
    // Load initial data
    await loadInitialData();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup routing
    setupRouting();
    
    // Hide loading screen
    setTimeout(() => {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('app').classList.remove('d-none');
        
        // Navigate to initial page
        navigate(state.currentPage);
    }, 500);
}

// Load Initial Data
async function loadInitialData() {
    try {
        state.isLoading = true;
        
        // Load karyawan data
        const karyawanData = await loadKaryawanData();
        state.karyawan = karyawanData;
        state.filteredKaryawan = karyawanData;
        
        // Load hunian data
        state.hunian = await loadHunianData();
        
        console.log('Data loaded successfully');
    } catch (error) {
        console.error('Error loading initial data:', error);
        showToast('Gagal memuat data', 'danger');
    } finally {
        state.isLoading = false;
    }
}

// Load Karyawan Data
async function loadKaryawanData() {
    if (!state.supabase) {
        // Return mock data if Supabase is not configured
        return getMockKaryawanData();
    }
    
    try {
        const { data, error } = await state.supabase
            .from('karyawan')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error loading karyawan data:', error);
        return getMockKaryawanData();
    }
}

// Load Hunian Data
async function loadHunianData() {
    if (!state.supabase) {
        // Return mock data if Supabase is not configured
        return getMockHunianData();
    }
    
    try {
        const { data, error } = await state.supabase
            .from('hunian')
            .select('*')
            .order('lokasi_hunian')
            .order('block')
            .order('no_kamar');
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error loading hunian data:', error);
        return getMockHunianData();
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Global search
    document.getElementById('globalSearch')?.addEventListener('input', (e) => {
        const keyword = e.target.value.toLowerCase();
        if (keyword.length >= 2) {
            searchKaryawan(keyword);
        } else if (keyword.length === 0) {
            state.filteredKaryawan = state.karyawan;
            renderCurrentPage();
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl + S to save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (document.querySelector('.modal.show')) {
                document.querySelector('.modal.show .btn-primary')?.click();
            }
        }
        
        // Escape to close modals
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal.show');
            if (openModal) {
                bootstrap.Modal.getInstance(openModal)?.hide();
            }
        }
    });
}

// Setup Routing
function setupRouting() {
    // Handle hash changes
    window.addEventListener('hashchange', handleHashChange);
    
    // Initial hash check
    handleHashChange();
}

function handleHashChange() {
    const hash = window.location.hash.substring(1) || 'dashboard';
    navigate(hash);
}

// Navigation
function navigate(page) {
    state.currentPage = page;
    window.location.hash = page;
    
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${page}`) {
            link.classList.add('active');
        }
    });
    
    renderPage(page);
}

// Render Page
function renderPage(page) {
    const content = document.getElementById('content');
    
    switch(page) {
        case 'dashboard':
            content.innerHTML = renderDashboard();
            break;
        case 'karyawan':
            content.innerHTML = renderKaryawanPage();
            renderKaryawanTable();
            break;
        case 'hunian':
            content.innerHTML = renderHunianPage();
            renderHunianTable();
            break;
        case 'laporan':
            content.innerHTML = renderLaporanPage();
            renderLaporan();
            break;
        case 'settings':
            content.innerHTML = renderSettingsPage();
            break;
        default:
            content.innerHTML = renderNotFound();
    }
    
    // Add animation
    content.classList.add('page-enter');
    setTimeout(() => content.classList.remove('page-enter'), 300);
}

// Render Dashboard
function renderDashboard() {
    const totalKaryawan = state.karyawan.length;
    const totalHunian = state.hunian.length;
    const terisi = state.hunian.filter(h => h.status === 'TERISI').length;
    const kosong = totalHunian - terisi;
    
    return `
        <div class="page-enter">
            <h2 class="mb-4"><i class="fas fa-home me-2"></i>Dashboard</h2>
            
            <!-- Stats Cards -->
            <div class="row mb-4">
                <div class="col-md-3 col-sm-6 mb-3">
                    <div class="stats-card bg-primary">
                        <i class="fas fa-users"></i>
                        <div class="number">${totalKaryawan.toLocaleString()}</div>
                        <div class="label">Total Karyawan</div>
                    </div>
                </div>
                <div class="col-md-3 col-sm-6 mb-3">
                    <div class="stats-card bg-success">
                        <i class="fas fa-building"></i>
                        <div class="number">${totalHunian.toLocaleString()}</div>
                        <div class="label">Total Hunian</div>
                    </div>
                </div>
                <div class="col-md-3 col-sm-6 mb-3">
                    <div class="stats-card bg-warning">
                        <i class="fas fa-bed"></i>
                        <div class="number">${terisi.toLocaleString()}</div>
                        <div class="label">Kamar Terisi</div>
                    </div>
                </div>
                <div class="col-md-3 col-sm-6 mb-3">
                    <div class="stats-card bg-info">
                        <i class="fas fa-door-closed"></i>
                        <div class="number">${kosong.toLocaleString()}</div>
                        <div class="label">Kamar Kosong</div>
                    </div>
                </div>
            </div>
            
            <!-- Charts -->
            <div class="row mb-4">
                <div class="col-lg-6 mb-3">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="card-title mb-0">Distribusi Departemen</h5>
                        </div>
                        <div class="card-body">
                            <canvas id="deptChart" height="250"></canvas>
                        </div>
                    </div>
                </div>
                <div class="col-lg-6 mb-3">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="card-title mb-0">Status Hunian</h5>
                        </div>
                        <div class="card-body">
                            <canvas id="statusChart" height="250"></canvas>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Recent Activity -->
            <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h5 class="card-title mb-0">Aktivitas Terbaru</h5>
                    <button class="btn btn-sm btn-outline-primary" onclick="loadInitialData()">
                        <i class="fas fa-sync-alt"></i> Refresh
                    </button>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>Waktu</th>
                                    <th>Aktivitas</th>
                                    <th>Detail</th>
                                </tr>
                            </thead>
                            <tbody id="activityTable">
                                <!-- Activities will be loaded here -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Render Karyawan Page
function renderKaryawanPage() {
    return `
        <div class="page-enter">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2><i class="fas fa-users me-2"></i>Data Karyawan</h2>
                <div>
                    <button class="btn btn-success me-2" onclick="showImportModal()">
                        <i class="fas fa-file-import me-1"></i> Import Excel
                    </button>
                    <button class="btn btn-primary" onclick="showKaryawanForm()">
                        <i class="fas fa-plus me-1"></i> Tambah Karyawan
                    </button>
                </div>
            </div>
            
            <!-- Search and Filters -->
            <div class="card mb-4">
                <div class="card-body">
                    <div class="row g-3">
                        <div class="col-md-4">
                            <input type="text" class="form-control" placeholder="Cari NIK atau Nama..." 
                                   oninput="searchKaryawan(this.value)">
                        </div>
                        <div class="col-md-3">
                            <select class="form-select" onchange="filterByDepartment(this.value)">
                                <option value="">Semua Departemen</option>
                                ${getDepartmentOptions()}
                            </select>
                        </div>
                        <div class="col-md-3">
                            <select class="form-select" onchange="filterByStatus(this.value)">
                                <option value="">Semua Status</option>
                                <option value="TERISI">Terisi</option>
                                <option value="KOSONG">Kosong</option>
                            </select>
                        </div>
                        <div class="col-md-2">
                            <button class="btn btn-outline-secondary w-100" onclick="resetFilters()">
                                <i class="fas fa-redo"></i> Reset
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Karyawan Table -->
            <div class="card">
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>NIK</th>
                                    <th>Nama</th>
                                    <th>Department</th>
                                    <th>Jabatan</th>
                                    <th>Hunian</th>
                                    <th>Status</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody id="karyawanTableBody">
                                <!-- Data will be loaded here -->
                            </tbody>
                        </table>
                    </div>
                    
                    <!-- Pagination -->
                    <div class="d-flex justify-content-between align-items-center mt-3">
                        <div>
                            Menampilkan <span id="pageInfo"></span> dari ${state.karyawan.length} karyawan
                        </div>
                        <nav>
                            <ul class="pagination mb-0" id="pagination">
                                <!-- Pagination will be generated here -->
                            </ul>
                        </nav>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Render Hunian Page
function renderHunianPage() {
    return `
        <div class="page-enter">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2><i class="fas fa-bed me-2"></i>Data Hunian</h2>
                <button class="btn btn-primary" onclick="showHunianForm()">
                    <i class="fas fa-plus me-1"></i> Tambah Kamar
                </button>
            </div>
            
            <!-- Stats -->
            <div class="row mb-4">
                <div class="col-md-8">
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">Ketersediaan Kamar</h5>
                            <div class="progress" style="height: 30px;">
                                <div class="progress-bar bg-success" style="width: ${getOccupancyPercentage()}%">
                                    Terisi: ${getOccupiedCount()}
                                </div>
                                <div class="progress-bar bg-warning" style="width: ${100 - getOccupancyPercentage()}%">
                                    Kosong: ${getVacantCount()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card">
                        <div class="card-body text-center">
                            <h5 class="card-title">Kamar Kosong</h5>
                            <div class="display-4 text-primary">${getVacantCount()}</div>
                            <p class="text-muted">dari ${state.hunian.length} total kamar</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Hunian Table -->
            <div class="card">
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-hover" id="hunianTable">
                            <thead>
                                <tr>
                                    <th>Lokasi</th>
                                    <th>Lantai</th>
                                    <th>Block</th>
                                    <th>No. Kamar</th>
                                    <th>Kapasitas</th>
                                    <th>Status</th>
                                    <th>Penghuni</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                <!-- Data will be loaded here -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Render Laporan Page
function renderLaporanPage() {
    return `
        <div class="page-enter">
            <h2 class="mb-4"><i class="fas fa-chart-bar me-2"></i>Laporan</h2>
            
            <!-- Report Controls -->
            <div class="card mb-4">
                <div class="card-body">
                    <div class="row g-3">
                        <div class="col-md-3">
                            <label class="form-label">Jenis Laporan</label>
                            <select class="form-select" id="reportType" onchange="changeReportType()">
                                <option value="summary">Ringkasan</option>
                                <option value="occupancy">Okupansi Hunian</option>
                                <option value="department">Per Departemen</option>
                                <option value="company">Per Perusahaan</option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Dari Tanggal</label>
                            <input type="date" class="form-control" id="startDate">
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Sampai Tanggal</label>
                            <input type="date" class="form-control" id="endDate">
                        </div>
                        <div class="col-md-3 d-flex align-items-end">
                            <button class="btn btn-primary w-100" onclick="generateReport()">
                                <i class="fas fa-file-pdf me-1"></i> Generate Laporan
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Report Content -->
            <div class="card">
                <div class="card-body">
                    <div id="reportContent">
                        <!-- Report will be generated here -->
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Render Settings Page
function renderSettingsPage() {
    return `
        <div class="page-enter">
            <h2 class="mb-4"><i class="fas fa-cog me-2"></i>Pengaturan</h2>
            
            <div class="card">
                <div class="card-body">
                    <form id="settingsForm">
                        <div class="mb-3">
                            <h5>Konfigurasi Database</h5>
                            <div class="mb-3">
                                <label class="form-label">Supabase URL</label>
                                <input type="text" class="form-control" id="supabaseUrl" 
                                       value="${CONFIG.SUPABASE_URL}" placeholder="https://your-project.supabase.co">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Supabase Anon Key</label>
                                <input type="password" class="form-control" id="supabaseKey" 
                                       value="${CONFIG.SUPABASE_KEY}" placeholder="your-anon-key">
                            </div>
                        </div>
                        
                        <div class="mb-3">
                            <h5>Pengaturan Aplikasi</h5>
                            <div class="mb-3">
                                <label class="form-label">Items per Page</label>
                                <input type="number" class="form-control" value="${CONFIG.ITEMS_PER_PAGE}" 
                                       min="10" max="100" step="10">
                            </div>
                        </div>
                        
                        <div class="mb-3">
                            <h5>Backup & Restore</h5>
                            <div class="d-flex gap-2">
                                <button type="button" class="btn btn-outline-primary" onclick="backupData()">
                                    <i class="fas fa-download me-1"></i> Backup Data
                                </button>
                                <button type="button" class="btn btn-outline-success" onclick="showRestoreModal()">
                                    <i class="fas fa-upload me-1"></i> Restore Data
                                </button>
                            </div>
                        </div>
                        
                        <div class="d-flex justify-content-end">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-save me-1"></i> Simpan Pengaturan
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
}

// Render Not Found
function renderNotFound() {
    return `
        <div class="text-center py-5">
            <i class="fas fa-exclamation-triangle fa-4x text-warning mb-3"></i>
            <h3>Halaman Tidak Ditemukan</h3>
            <p class="text-muted">Halaman yang Anda cari tidak ditemukan.</p>
            <button class="btn btn-primary" onclick="navigate('dashboard')">
                <i class="fas fa-home me-1"></i> Kembali ke Dashboard
            </button>
        </div>
    `;
}

// Render Karyawan Table
function renderKaryawanTable() {
    const startIndex = (state.currentPageIndex - 1) * CONFIG.ITEMS_PER_PAGE;
    const endIndex = startIndex + CONFIG.ITEMS_PER_PAGE;
    const currentItems = state.filteredKaryawan.slice(startIndex, endIndex);
    
    const tableBody = document.getElementById('karyawanTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = currentItems.map(karyawan => `
        <tr>
            <td><strong>${karyawan.nik}</strong></td>
            <td>${karyawan.nama}</td>
            <td>${karyawan.department || '-'}</td>
            <td>${karyawan.jabatan || '-'}</td>
            <td>
                ${karyawan.lokasi_hunian || '-'}<br>
                <small class="text-muted">${karyawan.lantai || ''} - Block ${karyawan.block || ''} - No. ${karyawan.no_kamar || ''}</small>
            </td>
            <td>
                <span class="badge ${karyawan.status_kamar === 'TERISI' ? 'bg-success' : 'bg-warning'}">
                    ${karyawan.status_kamar}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="viewKaryawan('${karyawan.id || karyawan.nik}')">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-warning me-1" onclick="editKaryawan('${karyawan.id || karyawan.nik}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteKaryawan('${karyawan.id || karyawan.nik}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    // Update page info
    document.getElementById('pageInfo').textContent = 
        `${startIndex + 1}-${Math.min(endIndex, state.filteredKaryawan.length)}`;
    
    // Render pagination
    renderPagination();
}

// Render Pagination
function renderPagination() {
    const totalPages = Math.ceil(state.filteredKaryawan.length / CONFIG.ITEMS_PER_PAGE);
    const pagination = document.getElementById('pagination');
    if (!pagination) return;
    
    let html = '';
    
    // Previous button
    html += `
        <li class="page-item ${state.currentPageIndex === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${state.currentPageIndex - 1})">
                <i class="fas fa-chevron-left"></i>
            </a>
        </li>
    `;
    
    // Page numbers
    const maxVisible = 5;
    let startPage = Math.max(1, state.currentPageIndex - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `
            <li class="page-item ${i === state.currentPageIndex ? 'active' : ''}">
                <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
            </li>
        `;
    }
    
    // Next button
    html += `
        <li class="page-item ${state.currentPageIndex === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${state.currentPageIndex + 1})">
                <i class="fas fa-chevron-right"></i>
            </a>
        </li>
    `;
    
    pagination.innerHTML = html;
}

// Change Page
function changePage(page) {
    state.currentPageIndex = page;
    renderKaryawanTable();
}

// Search Karyawan
function searchKaryawan(keyword) {
    const searchTerm = keyword.toLowerCase();
    
    state.filteredKaryawan = state.karyawan.filter(karyawan =>
        karyawan.nik?.toLowerCase().includes(searchTerm) ||
        karyawan.nama?.toLowerCase().includes(searchTerm) ||
        karyawan.department?.toLowerCase().includes(searchTerm) ||
        karyawan.jabatan?.toLowerCase().includes(searchTerm)
    );
    
    state.currentPageIndex = 1;
    renderKaryawanTable();
}

// Filter by Department
function filterByDepartment(dept) {
    if (!dept) {
        state.filteredKaryawan = state.karyawan;
    } else {
        state.filteredKaryawan = state.karyawan.filter(k => k.department === dept);
    }
    state.currentPageIndex = 1;
    renderKaryawanTable();
}

// Filter by Status
function filterByStatus(status) {
    if (!status) {
        state.filteredKaryawan = state.karyawan;
    } else {
        state.filteredKaryawan = state.karyawan.filter(k => k.status_kamar === status);
    }
    state.currentPageIndex = 1;
    renderKaryawanTable();
}

// Reset Filters
function resetFilters() {
    state.filteredKaryawan = state.karyawan;
    state.currentPageIndex = 1;
    
    // Reset form inputs
    document.querySelectorAll('#karyawanPage input, #karyawanPage select').forEach(el => {
        if (el.type !== 'button' && el.type !== 'submit') {
            el.value = '';
        }
    });
    
    renderKaryawanTable();
}

// Get Department Options
function getDepartmentOptions() {
    const departments = [...new Set(state.karyawan.map(k => k.department).filter(Boolean))];
    return departments.map(dept => `<option value="${dept}">${dept}</option>`).join('');
}

// Show Karyawan Form Modal
function showKaryawanForm(karyawan = null) {
    const modalHtml = `
        <div class="modal fade" id="karyawanModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            ${karyawan ? 'Edit Karyawan' : 'Tambah Karyawan Baru'}
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="karyawanForm">
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">NIK *</label>
                                    <input type="text" class="form-control" name="nik" 
                                           value="${karyawan?.nik || ''}" required
                                           ${karyawan ? 'readonly' : ''}>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Nama *</label>
                                    <input type="text" class="form-control" name="nama" 
                                           value="${karyawan?.nama || ''}" required>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Gender</label>
                                    <select class="form-select" name="gender">
                                        <option value="L" ${karyawan?.gender === 'L' ? 'selected' : ''}>Laki-laki</option>
                                        <option value="P" ${karyawan?.gender === 'P' ? 'selected' : ''}>Perempuan</option>
                                    </select>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Department</label>
                                    <input type="text" class="form-control" name="department" 
                                           value="${karyawan?.department || ''}">
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Jabatan</label>
                                    <input type="text" class="form-control" name="jabatan" 
                                           value="${karyawan?.jabatan || ''}">
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Perusahaan</label>
                                    <input type="text" class="form-control" name="perusahaan" 
                                           value="${karyawan?.perusahaan || ''}">
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Lokasi Hunian</label>
                                    <input type="text" class="form-control" name="lokasi_hunian" 
                                           value="${karyawan?.lokasi_hunian || ''}">
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Status Kamar</label>
                                    <select class="form-select" name="status_kamar">
                                        <option value="TERISI" ${karyawan?.status_kamar === 'TERISI' ? 'selected' : ''}>Terisi</option>
                                        <option value="KOSONG" ${karyawan?.status_kamar === 'KOSONG' ? 'selected' : ''}>Kosong</option>
                                    </select>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
                        <button type="button" class="btn btn-primary" onclick="saveKaryawan()">
                            Simpan
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('modalsContainer').innerHTML = modalHtml;
    const modal = new bootstrap.Modal(document.getElementById('karyawanModal'));
    modal.show();
}

// Save Karyawan
async function saveKaryawan() {
    const form = document.getElementById('karyawanForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const formData = new FormData(form);
    const karyawanData = Object.fromEntries(formData.entries());
    
    try {
        if (state.supabase) {
            // Save to Supabase
            if (document.querySelector('#karyawanForm input[name="nik"]').readOnly) {
                // Update existing
                const { error } = await state.supabase
                    .from('karyawan')
                    .update(karyawanData)
                    .eq('nik', karyawanData.nik);
                
                if (error) throw error;
                showToast('Data karyawan berhasil diperbarui', 'success');
            } else {
                // Insert new
                const { error } = await state.supabase
                    .from('karyawan')
                    .insert([karyawanData]);
                
                if (error) throw error;
                showToast('Data karyawan berhasil disimpan', 'success');
            }
        } else {
            // Save to local storage (fallback)
            saveToLocalStorage(karyawanData);
        }
        
        // Reload data
        await loadInitialData();
        
        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('karyawanModal')).hide();
        
        // Refresh table
        renderKaryawanTable();
    } catch (error) {
        console.error('Error saving karyawan:', error);
        showToast('Gagal menyimpan data', 'danger');
    }
}

// View Karyawan Detail
function viewKaryawan(id) {
    const karyawan = state.karyawan.find(k => k.id === id || k.nik === id);
    if (!karyawan) return;
    
    const modalHtml = `
        <div class="modal fade" id="detailModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Detail Karyawan</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-4 text-center mb-4">
                                <div class="avatar-placeholder bg-primary rounded-circle d-flex align-items-center justify-content-center mx-auto" 
                                     style="width: 100px; height: 100px; font-size: 2rem;">
                                    ${karyawan.nama.charAt(0).toUpperCase()}
                                </div>
                                <h4 class="mt-3">${karyawan.nama}</h4>
                                <span class="badge bg-primary">${karyawan.nik}</span>
                            </div>
                            <div class="col-md-8">
                                <table class="table table-borderless">
                                    <tr>
                                        <th width="30%">Department</th>
                                        <td>${karyawan.department || '-'}</td>
                                    </tr>
                                    <tr>
                                        <th>Jabatan</th>
                                        <td>${karyawan.jabatan || '-'}</td>
                                    </tr>
                                    <tr>
                                        <th>Gender</th>
                                        <td>${karyawan.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</td>
                                    </tr>
                                    <tr>
                                        <th>Perusahaan</th>
                                        <td>${karyawan.perusahaan || '-'}</td>
                                    </tr>
                                    <tr>
                                        <th>Hunian</th>
                                        <td>
                                            ${karyawan.lokasi_hunian || '-'}<br>
                                            <small>Lantai ${karyawan.lantai || '-'} • Block ${karyawan.block || '-'} • No. ${karyawan.no_kamar || '-'}</small>
                                        </td>
                                    </tr>
                                    <tr>
                                        <th>Status</th>
                                        <td>
                                            <span class="badge ${karyawan.status_kamar === 'TERISI' ? 'bg-success' : 'bg-warning'}">
                                                ${karyawan.status_kamar}
                                            </span>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tutup</button>
                        <button type="button" class="btn btn-primary" onclick="editKaryawan('${id}')">
                            <i class="fas fa-edit me-1"></i> Edit
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('modalsContainer').innerHTML = modalHtml;
    const modal = new bootstrap.Modal(document.getElementById('detailModal'));
    modal.show();
}

// Edit Karyawan
function editKaryawan(id) {
    const karyawan = state.karyawan.find(k => k.id === id || k.nik === id);
    if (!karyawan) return;
    
    showKaryawanForm(karyawan);
}

// Delete Karyawan
async function deleteKaryawan(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus data karyawan ini?')) return;
    
    try {
        if (state.supabase) {
            const { error } = await state.supabase
                .from('karyawan')
                .delete()
                .eq('nik', id);
            
            if (error) throw error;
        }
        
        // Remove from local state
        state.karyawan = state.karyawan.filter(k => k.nik !== id);
        state.filteredKaryawan = state.filteredKaryawan.filter(k => k.nik !== id);
        
        showToast('Data karyawan berhasil dihapus', 'success');
        renderKaryawanTable();
    } catch (error) {
        console.error('Error deleting karyawan:', error);
        showToast('Gagal menghapus data', 'danger');
    }
}

// Show Import Modal
function showImportModal() {
    const modalHtml = `
        <div class="modal fade" id="importModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Import Data dari Excel</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle me-2"></i>
                            Format file Excel harus sesuai dengan template.
                            <a href="#" onclick="downloadTemplate()" class="alert-link">Download template</a>
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label">Pilih File Excel</label>
                            <input type="file" class="form-control" id="excelFile" accept=".xlsx,.xls">
                        </div>
                        
                        <div id="importPreview" class="d-none">
                            <h6>Preview Data:</h6>
                            <div class="table-responsive" style="max-height: 300px;">
                                <table class="table table-sm" id="previewTable">
                                    <!-- Preview will be shown here -->
                                </table>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
                        <button type="button" class="btn btn-primary" id="importButton" disabled 
                                onclick="processImport()">
                            Import Data
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('modalsContainer').innerHTML = modalHtml;
    const modal = new bootstrap.Modal(document.getElementById('importModal'));
    
    // Setup file input listener
    modal.show();
    document.getElementById('excelFile').addEventListener('change', handleFileSelect);
}

// Handle File Select for Import
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);
            
            // Show preview
            showImportPreview(jsonData.slice(0, 10)); // Show first 10 rows
            
            // Enable import button
            document.getElementById('importButton').disabled = false;
            document.getElementById('importButton').dataset.importData = JSON.stringify(jsonData);
        } catch (error) {
            console.error('Error reading Excel file:', error);
            showToast('Format file Excel tidak valid', 'danger');
        }
    };
    
    reader.readAsArrayBuffer(file);
}

// Show Import Preview
function showImportPreview(data) {
    const previewDiv = document.getElementById('importPreview');
    const previewTable = document.getElementById('previewTable');
    
    if (!data.length) return;
    
    // Create table headers from first object keys
    const headers = Object.keys(data[0]);
    let html = '<thead><tr>';
    headers.forEach(header => {
        html += `<th>${header}</th>`;
    });
    html += '</tr></thead><tbody>';
    
    // Create rows
    data.forEach(row => {
        html += '<tr>';
        headers.forEach(header => {
            html += `<td>${row[header] || ''}</td>`;
        });
        html += '</tr>';
    });
    html += '</tbody>';
    
    previewTable.innerHTML = html;
    previewDiv.classList.remove('d-none');
}

// Process Import
async function processImport() {
    const importButton = document.getElementById('importButton');
    const jsonData = JSON.parse(importButton.dataset.importData);
    
    try {
        // Transform Excel data to our format
        const karyawanData = jsonData.map(row => ({
            nik: row.NIK || row.nik || '',
            nama: row.NAMA || row.nama || '',
            gender: (row.GENDER || row.gender || 'L').toUpperCase() === 'P' ? 'P' : 'L',
            department: row.DEPARTMENT || row.department || '',
            jabatan: row.JABATAN || row.jabatan || '',
            perusahaan: row.PERUSAHAAN || row.perusahaan || '',
            lokasi_hunian: row['LOKASI HUNIAN'] || row.lokasi_hunian || '',
            lantai: row.FLOOR || row.lantai || '',
            block: parseInt(row.BLOCK || row.block) || 0,
            no_kamar: parseInt(row['NO KAMAR'] || row.no_kamar) || 0,
            status_kamar: (row['STATUS KAMAR'] || row.status_kamar) === 'TERISI' ? 'TERISI' : 'KOSONG'
        }));
        
        if (state.supabase) {
            // Import to Supabase
            const { error } = await state.supabase
                .from('karyawan')
                .insert(karyawanData);
            
            if (error) throw error;
        } else {
            // Import to local storage
            karyawanData.forEach(data => saveToLocalStorage(data));
        }
        
        // Reload data
        await loadInitialData();
        
        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('importModal')).hide();
        
        showToast(`${karyawanData.length} data berhasil diimport`, 'success');
        renderKaryawanTable();
    } catch (error) {
        console.error('Error importing data:', error);
        showToast('Gagal mengimport data', 'danger');
    }
}

// Download Template
function downloadTemplate() {
    const templateData = [
        {
            'NIK': 'F05240598',
            'NAMA': 'Mohammad Rahmadhani',
            'GENDER': 'L',
            'DEPARTMENT': 'Dispatch',
            'GOL': 'P1.3',
            'JABATAN': 'A2B Mechanic II',
            'FASILITAS': 'CR',
            'Point of Hire': 'Makassar',
            'TANGGAL MASUK KERJA': '2024-05-22',
            'PERUSAHAAN': 'PT. HJF',
            'LOKASI HUNIAN': 'MENTARI',
            'FLOOR': 'Lantai Bawah',
            'BLOCK': '19',
            'NO KAMAR': '1',
            'STATUS KAMAR': 'TERISI',
            'TANGGAL MASUK MESS HUNIAN P2': ''
        }
    ];
    
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    XLSX.writeFile(workbook, 'template_import_karyawan.xlsx');
}

// Render Current Page
function renderCurrentPage() {
    renderPage(state.currentPage);
}

// Show Toast Notification
function showToast(message, type = 'info') {
    const toastId = 'toast-' + Date.now();
    const toastHtml = `
        <div id="${toastId}" class="toast align-items-center text-white bg-${type} border-0" role="alert">
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;
    
    document.getElementById('toastContainer').innerHTML += toastHtml;
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
    toast.show();
    
    // Remove after hide
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

// Save to Local Storage (fallback)
function saveToLocalStorage(data) {
    const key = 'karyawan_' + data.nik;
    localStorage.setItem(key, JSON.stringify(data));
    
    // Update index
    let index = JSON.parse(localStorage.getItem('karyawan_index') || '[]');
    if (!index.includes(data.nik)) {
        index.push(data.nik);
        localStorage.setItem('karyawan_index', JSON.stringify(index));
    }
}

// Mock Data (for testing without Supabase)
function getMockKaryawanData() {
    return [
        {
            nik: 'F05240598',
            nama: 'Mohammad Rahmadhani',
            gender: 'L',
            department: 'Dispatch',
            jabatan: 'A2B Mechanic II',
            perusahaan: 'PT. HJF',
            lokasi_hunian: 'MENTARI',
            lantai: 'Lantai Bawah',
            block: 19,
            no_kamar: 1,
            status_kamar: 'TERISI'
        },
        {
            nik: 'F06240611',
            nama: 'Bambang Rudiono',
            gender: 'L',
            department: 'Dispatch',
            jabatan: 'Tyreman II',
            perusahaan: 'PT. HJF',
            lokasi_hunian: 'MENTARI',
            lantai: 'Lantai Bawah',
            block: 19,
            no_kamar: 1,
            status_kamar: 'TERISI'
        },
        {
            nik: 'F03240229',
            nama: 'Eko Prasetyo',
            gender: 'L',
            department: 'Dispatch',
            jabatan: 'A2B Mechanic I',
            perusahaan: 'PT. HJF',
            lokasi_hunian: 'MENTARI',
            lantai: 'Lantai Bawah',
            block: 19,
            no_kamar: 1,
            status_kamar: 'TERISI'
        }
    ];
}

function getMockHunianData() {
    return [
        {
            lokasi_hunian: 'MENTARI',
            lantai: 'Lantai Bawah',
            block: 19,
            no_kamar: 1,
            kapasitas: 4,
            status: 'TERISI'
        },
        {
            lokasi_hunian: 'MENTARI',
            lantai: 'Lantai Bawah',
            block: 19,
            no_kamar: 2,
            kapasitas: 4,
            status: 'TERISI'
        },
        {
            lokasi_hunian: 'MENTARI',
            lantai: 'Lantai Bawah',
            block: 19,
            no_kamar: 3,
            kapasitas: 4,
            status: 'TERISI'
        },
        {
            lokasi_hunian: 'MENTARI',
            lantai: 'Lantai Bawah',
            block: 19,
            no_kamar: 4,
            kapasitas: 4,
            status: 'KOSONG'
        }
    ];
}

// Utility functions for hunian page
function getOccupancyPercentage() {
    if (state.hunian.length === 0) return 0;
    const occupied = state.hunian.filter(h => h.status === 'TERISI').length;
    return Math.round((occupied / state.hunian.length) * 100);
}

function getOccupiedCount() {
    return state.hunian.filter(h => h.status === 'TERISI').length;
}

function getVacantCount() {
    return state.hunian.filter(h => h.status === 'KOSONG').length;
}

// Initialize on load
window.addEventListener('DOMContentLoaded', initApp);
