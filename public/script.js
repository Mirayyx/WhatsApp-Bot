const statusBox = document.getElementById("statusBox");
const sendBtn = document.getElementById("sendBtn");
const reloadBtn = document.getElementById("reloadBtn");
const result = document.getElementById("result");
const numberInput = document.getElementById("number");
const messageInput = document.getElementById("message");

// Fungsi untuk menampilkan pesan hasil
function displayResult(message, isError = false, isWarning = false) {
    result.textContent = message;
    
    // Pastikan elemen result terlihat
    result.classList.remove('hidden', 'bg-slate-800', 'text-slate-400', 'border-slate-700', 'bg-red-900/50', 'text-red-300', 'border-red-700', 'bg-yellow-900/50', 'text-yellow-300', 'border-yellow-700', 'bg-emerald-900/50', 'text-emerald-300', 'border-emerald-700');
    
    if (isError) {
        // Gaya untuk error
        result.classList.add('bg-red-900/50', 'text-red-300', 'border-red-700');
    } else if (isWarning) {
        // Gaya untuk warning
        result.classList.add('bg-yellow-900/50', 'text-yellow-300', 'border-yellow-700');
    } else {
        // Gaya default/sukses
        result.classList.add('bg-slate-800', 'text-slate-400', 'border-slate-700');
    }

    // Tampilkan setelah mengatur kelas
    result.classList.remove('hidden');
}


async function updateStatus() {
  try {
    const res = await fetch("/status");
    const data = await res.json();
    
    // Tentukan status dan gaya visual
    const isConnected = data.connected;
    const statusText = isConnected ? 'Online' : 'Offline';
    const statusColor = isConnected ? 'text-emerald-400' : 'text-red-400';
    const boxBg = isConnected ? 'bg-emerald-900/50' : 'bg-red-900/50';
    const boxBorder = isConnected ? 'border-emerald-700' : 'border-red-700';
    const boxTextColor = isConnected ? 'text-emerald-300' : 'text-red-300';
    const icon = isConnected ? '✅' : '🛑';
    
    // Perbarui styling statusBox
    statusBox.className = `text-center mb-5 p-3 rounded-xl text-sm border font-medium transition-all duration-300 ${boxBg} ${boxBorder} ${boxTextColor}`;

    // Perbarui konten statusBox
    statusBox.innerHTML = `
      <div class="flex flex-col sm:flex-row justify-between items-center text-left">
        <p class="mb-1 sm:mb-0"><span class="text-slate-400">📱 Nomor:</span> <b>${data.phone}</b></p>
        <p><span class="text-slate-400">🔌 Status:</span> <span class="font-bold ${statusColor}">${icon} ${statusText}</span></p>
      </div>
      <div class="mt-2 pt-2 border-t border-slate-700/50 text-xs text-slate-400">
        <p><span class="text-slate-500">🧩 Plugin:</span> ${data.plugins.join(", ") || "Tidak ada"}</p>
        <p><span class="text-slate-500">⏱️ Uptime:</span> ${data.uptime}</p>
      </div>
    `;

  } catch (error) {
    // Styling untuk gagal ambil status
    statusBox.className = `text-center mb-5 p-3 rounded-xl text-sm border font-medium bg-red-900/50 border-red-700 text-red-300`;
    statusBox.innerHTML = "<span class='text-red-400'>❌ Gagal ambil status. Cek server bot.</span>";
  }
}

// Atur interval dan panggil pertama kali (alur tidak diubah)
setInterval(updateStatus, 5000);
updateStatus();

sendBtn.onclick = async () => {
  const number = numberInput.value.trim();
  const message = messageInput.value.trim();
  
  if (!number || !message) {
      displayResult("⚠️ Lengkapi nomor & pesan!", false, true); // Warning style
      return;
  }
  
  displayResult("⏳ Mengirim...", false); // Default loading style
  
  try {
      const res = await fetch("/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number, message }),
      });
      const data = await res.json();
      
      if (data.success) {
          displayResult("✅ Pesan terkirim!", false); // Sukses style
          // Opsional: kosongkan input setelah sukses
          // numberInput.value = ''; 
          // messageInput.value = '';
      } else {
          displayResult("❌ Gagal: " + data.error, true); // Error style
      }
  } catch (error) {
       displayResult("❌ Gagal terhubung ke server. Coba lagi.", true); // Error style
  }
};

reloadBtn.onclick = async () => {
  displayResult("🔄 Reload plugin...", false); // Default loading style
  
  try {
      const res = await fetch("/reload", { method: "POST" });
      const data = await res.json();
      
      displayResult("✅ Reloaded: " + data.plugins.join(", "), false); // Sukses style
      updateStatus();
  } catch (error) {
      displayResult("❌ Gagal mereload plugin. Cek server.", true); // Error style
  }
};
