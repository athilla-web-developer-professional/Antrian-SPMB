// Data aplikasi
const appState = {
    queueList: [],
    calledQueue: [],
    currentCall: null,
    nextCall: null,
    operators: [
        { id: 1, name: "Operator 1 - Pendaftaran", status: "available", currentQueue: null },
        { id: 2, name: "Operator 2 - Verifikasi Berkas", status: "available", currentQueue: null },
        { id: 3, name: "Operator 3 - Tes Akademik", status: "available", currentQueue: null },
        { id: 4, name: "Operator 4 - Tes Wawancara", status: "available", currentQueue: null },
        { id: 5, name: "Operator 5 - Tes Kesehatan", status: "available", currentQueue: null },
        { id: 6, name: "Operator 6 - Pembayaran", status: "available", currentQueue: null },
        { id: 7, name: "Operator 7 - Pengambilan Kartu", status: "available", currentQueue: null },
        { id: 8, name: "Operator 8 - Informasi", status: "available", currentQueue: null }
    ]
};

// Inisialisasi Web Speech API
const speechSynthesis = window.speechSynthesis;

// Elemen DOM
const queueNumberInput = document.getElementById('queue-number');
const operatorSelect = document.getElementById('operator-select');
const addQueueBtn = document.getElementById('add-queue-btn');
const callQueueBtn = document.getElementById('call-queue-btn');
const resetBtn = document.getElementById('reset-btn');
const increaseBtn = document.getElementById('increase-btn');
const decreaseBtn = document.getElementById('decrease-btn');
const queueTableBody = document.getElementById('queue-table-body');
const operatorStatusGrid = document.getElementById('operator-status');
const currentCallDisplay = document.getElementById('current-call');
const nextCallDisplay = document.getElementById('next-call');
const totalQueueElement = document.getElementById('total-queue');
const remainingQueueElement = document.getElementById('remaining-queue');
const calledQueueElement = document.getElementById('called-queue');
const timeElement = document.getElementById('time');
const emptyQueueMessage = document.getElementById('empty-queue-message');
const toast = document.getElementById('toast');
const callSound = document.getElementById('call-sound');

// Inisialisasi aplikasi
function initApp() {
    // Set tahun di footer
    document.getElementById('current-year').textContent = new Date().getFullYear();
    
    // Update waktu setiap detik
    updateTime();
    setInterval(updateTime, 1000);
    
    // Render operator status
    renderOperatorStatus();
    
    // Update statistik antrian
    updateQueueStats();
    
    // Event listeners
    addQueueBtn.addEventListener('click', addQueue);
    callQueueBtn.addEventListener('click', callQueue);
    resetBtn.addEventListener('click', resetSystem);
    increaseBtn.addEventListener('click', () => adjustQueueNumber(1));
    decreaseBtn.addEventListener('click', () => adjustQueueNumber(-1));
    
    // Tunggu suara tersedia untuk Speech API
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoices;
    }
    
    // Tambah data dummy untuk demonstrasi
    addDemoData();
}

// Fungsi untuk memuat daftar suara
function loadVoices() {
    console.log("Suara tersedia:", speechSynthesis.getVoices().length);
}

// Fungsi untuk menambah data demo
function addDemoData() {
    // Tambah beberapa antrian dummy
    const demoQueues = [
        { number: 12, operatorId: 1, time: new Date() },
        { number: 13, operatorId: 3, time: new Date(Date.now() - 5 * 60000) },
        { number: 14, operatorId: 5, time: new Date(Date.now() - 10 * 60000) },
        { number: 15, operatorId: 2, time: new Date(Date.now() - 15 * 60000) }
    ];
    
    demoQueues.forEach(queue => {
        appState.queueList.push(queue);
    });
    
    // Update tampilan
    renderQueueList();
    updateQueueStats();
}

// Fungsi untuk memperbarui waktu
function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('id-ID', { hour12: false });
    timeElement.textContent = timeString;
}

// Fungsi untuk menambah nomor antrian
function addQueue() {
    const queueNumber = parseInt(queueNumberInput.value);
    const operatorId = parseInt(operatorSelect.value);
    
    if (!queueNumber || queueNumber < 1) {
        showToast("Nomor antrian tidak valid!", "error");
        return;
    }
    
    // Cek apakah nomor antrian sudah ada dalam antrian
    const existingQueue = appState.queueList.find(q => q.number === queueNumber);
    if (existingQueue) {
        showToast(`Nomor antrian ${queueNumber} sudah ada!`, "error");
        return;
    }
    
    // Tambah antrian baru
    const newQueue = {
        number: queueNumber,
        operatorId: operatorId,
        time: new Date()
    };
    
    appState.queueList.push(newQueue);
    
    // Update tampilan
    renderQueueList();
    updateQueueStats();
    
    // Tampilkan notifikasi
    showToast(`Antrian ${queueNumber} berhasil ditambahkan ke ${getOperatorName(operatorId)}`);
    
    // Reset input
    queueNumberInput.value = queueNumber + 1;
}

// Fungsi untuk memanggil antrian
function callQueue() {
    if (appState.queueList.length === 0) {
        showToast("Tidak ada antrian yang menunggu!", "error");
        return;
    }
    
    // Ambil antrian pertama
    const nextQueue = appState.queueList.shift();
    
    // Simpan sebagai antrian yang sedang dipanggil
    appState.currentCall = nextQueue;
    appState.calledQueue.push(nextQueue);
    
    // Update status operator
    const operator = appState.operators.find(op => op.id === nextQueue.operatorId);
    if (operator) {
        operator.status = "busy";
        operator.currentQueue = nextQueue.number;
    }
    
    // Tentukan antrian berikutnya
    appState.nextCall = appState.queueList.length > 0 ? appState.queueList[0] : null;
    
    // Update tampilan
    renderCurrentCall();
    renderNextCall();
    renderQueueList();
    renderOperatorStatus();
    updateQueueStats();
    
    // Putar suara panggilan
    playCallSound();
    
    // Tunggu sebentar sebelum mengucapkan panggilan
    setTimeout(() => {
        // Dapatkan nama operator untuk panggilan suara
        const operatorName = getOperatorName(nextQueue.operatorId);
        
        // Bersihkan nama operator untuk pengucapan yang lebih baik
        const cleanOperatorName = operatorName.replace('Operator', 'loket');
        
        // Ucapkan panggilan dengan bahasa Indonesia yang jelas
        speakCall(nextQueue.number, cleanOperatorName);
    }, 1000); // Tunggu 1 detik setelah suara panggilan
    
    // Tampilkan notifikasi
    showToast(`Memanggil antrian ${nextQueue.number} ke ${operator.name}`);
    
    // Set timeout untuk mengubah status operator kembali menjadi available setelah 2 menit
    setTimeout(() => {
        if (operator) {
            operator.status = "available";
            operator.currentQueue = null;
            renderOperatorStatus();
        }
    }, 120000); // 2 menit
}

// Fungsi untuk mengucapkan panggilan dengan bahasa Indonesia
function speakCall(queueNumber, operatorName) {
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
    }
    
    // Teks panggilan dalam bahasa Indonesia
    const text = `Nomor antrian ${queueNumber}, silahkan menuju ke ${operatorName}`;
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Atur pengucapan
    utterance.lang = 'id-ID';
    utterance.rate = 0.9;   // Kecepatan bicara
    utterance.pitch = 1.0;  // Nada suara
    utterance.volume = 1;    // Volume
    
    // Cari suara wanita Indonesia
    const voices = speechSynthesis.getVoices();
    
    // Prioritaskan suara wanita Indonesia
    let selectedVoice = voices.find(voice => 
        voice.lang === 'id-ID' && 
        (voice.name.toLowerCase().includes('female') || voice.name.toLowerCase().includes('perempuan'))
    );
    
    // Jika tidak ditemukan, cari suara Indonesia apapun
    if (!selectedVoice) {
        selectedVoice = voices.find(voice => voice.lang === 'id-ID');
    }
    
    // Jika masih tidak ditemukan, cari suara wanita apapun
    if (!selectedVoice) {
        selectedVoice = voices.find(voice => 
            voice.name.toLowerCase().includes('female') || 
            voice.name.toLowerCase().includes('woman')
        );
    }
    
    // Gunakan suara yang dipilih
    if (selectedVoice) {
        utterance.voice = selectedVoice;
    }
    
    // Tambah event listeners untuk debugging
    utterance.onstart = () => console.log("Mulai berbicara");
    utterance.onend = () => console.log("Selesai berbicara");
    utterance.onerror = (event) => console.error("Error pengucapan:", event);
    
    // Jalankan pengucapan
    speechSynthesis.speak(utterance);
}

// Fungsi untuk memainkan suara panggilan
function playCallSound() {
    callSound.currentTime = 0;
    callSound.play().catch(e => console.log("Autoplay prevented:", e));
}

// Fungsi untuk merender daftar antrian
function renderQueueList() {
    queueTableBody.innerHTML = '';
    
    if (appState.queueList.length === 0) {
        emptyQueueMessage.style.display = 'flex';
        return;
    }
    
    emptyQueueMessage.style.display = 'none';
    
    // Urutkan antrian berdasarkan waktu
    const sortedQueues = [...appState.queueList].sort((a, b) => a.time - b.time);
    
    sortedQueues.forEach((queue, index) => {
        const row = document.createElement('tr');
        
        // Format waktu
        const timeString = queue.time.toLocaleTimeString('id-ID', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        row.innerHTML = `
            <td class="queue-number">${queue.number}</td>
            <td class="queue-operator">${getOperatorName(queue.operatorId)}</td>
            <td class="queue-time">${timeString}</td>
            <td>
                <button class="btn-remove" onclick="removeQueue(${index})">
                    <i class="fas fa-times"></i>
                </button>
            </td>
        `;
        
        queueTableBody.appendChild(row);
    });
}

// Fungsi untuk menghapus antrian
function removeQueue(index) {
    if (index >= 0 && index < appState.queueList.length) {
        const removedQueue = appState.queueList[index];
        appState.queueList.splice(index, 1);
        
        renderQueueList();
        updateQueueStats();
        
        showToast(`Antrian ${removedQueue.number} telah dihapus`);
    }
}

// Fungsi untuk merender status operator
function renderOperatorStatus() {
    operatorStatusGrid.innerHTML = '';
    
    appState.operators.forEach(operator => {
        const operatorCard = document.createElement('div');
        operatorCard.className = `operator-card ${operator.status}`;
        
        const operatorStatusText = operator.status === "available" ? "Tersedia" : "Sedang Melayani";
        const currentQueueInfo = operator.currentQueue ? 
            `Sedang melayani antrian ${operator.currentQueue}` : 
            "Tidak sedang melayani";
        
        operatorCard.innerHTML = `
            <div class="operator-card-header">
                <div class="operator-name-card">${operator.name}</div>
                <div class="operator-status ${operator.status}">${operatorStatusText}</div>
            </div>
            <div class="operator-current">${currentQueueInfo}</div>
        `;
        
        operatorStatusGrid.appendChild(operatorCard);
    });
}

// Fungsi untuk merender panggilan saat ini
function renderCurrentCall() {
    if (!appState.currentCall) {
        currentCallDisplay.innerHTML = `
            <div class="number">-</div>
            <div class="operator-label">Silahkan menuju ke:</div>
            <div class="operator-name">-</div>
        `;
        return;
    }
    
    // Tampilkan dengan tulisan "Silahkan menuju ke:"
    currentCallDisplay.innerHTML = `
        <div class="number">${appState.currentCall.number}</div>
        <div class="operator-label">Silahkan menuju ke:</div>
        <div class="operator-name">${getOperatorName(appState.currentCall.operatorId)}</div>
    `;
    
    // Tambah animasi
    currentCallDisplay.style.animation = 'none';
    setTimeout(() => {
        currentCallDisplay.style.animation = 'pulse 1.5s';
    }, 10);
}

// Fungsi untuk merender panggilan berikutnya
function renderNextCall() {
    if (!appState.nextCall) {
        nextCallDisplay.innerHTML = `
            <span class="next-queue">-</span>
            <span class="next-operator">-</span>
        `;
        return;
    }
    
    nextCallDisplay.innerHTML = `
        <span class="next-queue">${appState.nextCall.number}</span>
        <span class="next-operator">${getOperatorName(appState.nextCall.operatorId)}</span>
    `;
}

// Fungsi untuk memperbarui statistik antrian
function updateQueueStats() {
    const total = appState.queueList.length + appState.calledQueue.length;
    const remaining = appState.queueList.length;
    const called = appState.calledQueue.length;
    
    totalQueueElement.textContent = total;
    remainingQueueElement.textContent = remaining;
    calledQueueElement.textContent = called;
    
    // Update next call jika ada
    appState.nextCall = appState.queueList.length > 0 ? appState.queueList[0] : null;
    renderNextCall();
}

// Fungsi untuk menyesuaikan nomor antrian
function adjustQueueNumber(change) {
    let currentValue = parseInt(queueNumberInput.value) || 1;
    let newValue = currentValue + change;
    
    if (newValue < 1) newValue = 1;
    
    queueNumberInput.value = newValue;
}

// Fungsi untuk mereset sistem
function resetSystem() {
    if (confirm("Apakah Anda yakin ingin mereset sistem? Semua data antrian akan dihapus.")) {
        appState.queueList = [];
        appState.calledQueue = [];
        appState.currentCall = null;
        appState.nextCall = null;
        
        // Reset operator status
        appState.operators.forEach(operator => {
            operator.status = "available";
            operator.currentQueue = null;
        });
        
        // Reset input
        queueNumberInput.value = 1;
        
        // Update tampilan
        renderQueueList();
        renderCurrentCall();
        renderNextCall();
        renderOperatorStatus();
        updateQueueStats();
        
        // Hentikan suara jika sedang berbicara
        if (speechSynthesis.speaking) {
            speechSynthesis.cancel();
        }
        
        showToast("Sistem telah direset");
    }
}

// Fungsi untuk mendapatkan nama operator berdasarkan ID
function getOperatorName(operatorId) {
    const operator = appState.operators.find(op => op.id === operatorId);
    return operator ? operator.name : "Operator tidak diketahui";
}

// Fungsi untuk menampilkan notifikasi toast
function showToast(message, type = "success") {
    const toastContent = toast.querySelector('.toast-content');
    
    // Atur ikon berdasarkan tipe
    const icon = type === "error" ? "fas fa-exclamation-circle" : "fas fa-check-circle";
    
    toastContent.innerHTML = `
        <i class="${icon}"></i>
        <span class="toast-message">${message}</span>
    `;
    
    // Tampilkan toast
    toast.classList.add('show');
    
    // Sembunyikan setelah 3 detik
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Inisialisasi aplikasi saat halaman dimuat
document.addEventListener('DOMContentLoaded', initApp);