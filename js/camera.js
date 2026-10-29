// Mengurus kamera, hitung mundur, dan pengambilan frame.
const Camera = {
  video: null, stream: null,
  mirror: true, // true = seperti cermin (bawaan); false = hasil apa adanya (tulisan tidak terbalik)
  deviceId: null, // kamera pilihan (mis. DSLR lewat capture card / Webcam Utility); null = bawaan browser
  ASPECT: 4 / 3,  // rasio hasil foto (sama dengan kotak preview); null = ukuran asli kamera tanpa crop
  async start(videoEl) {
    this.video = videoEl;
    // PERBAIKAN (gambar gepeng/stretch): dulu width 1280 + height 960 (4:3) dipaksa. Kamera DSLR/capture card/OBS
    // mengeluarkan 16:9, sehingga driver memeras gambarnya jadi 4:3. Sekarang hanya lebar yang diminta,
    // tinggi mengikuti rasio asli kamera, lalu dipotong (crop) ke 4:3 saat memotret.
    const video = { width: { ideal: 1920 } };
    if (this.deviceId) video.deviceId = { exact: this.deviceId };
    else video.facingMode = "user";
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
    } catch (e) {
      // kamera pilihan sudah dicabut / tidak ada: kembali ke kamera bawaan
      if (this.deviceId && (e.name === "OverconstrainedError" || e.name === "NotFoundError")) {
        this.deviceId = null; return this.start(videoEl);
      }
      throw e;
    }
    videoEl.srcObject = this.stream;
    await videoEl.play();
  },
  // Daftar kamera (label baru terisi setelah izin kamera diberikan).
  async list() {
    try { return (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === "videoinput"); }
    catch { return []; }
  },
  // Matikan kamera (lampu kamera padam, hemat baterai, privasi terjaga saat mengedit).
  stop() {
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
    this.stream = null;
    if (this.video) this.video.srcObject = null;
  },
  // Ambil frame (mengikuti pengaturan mirror seperti preview), dikembalikan sebagai canvas.
  // Frame dipotong tengah ke rasio 4:3 (tanpa mengubah skala) agar hasil sama dengan preview dan tidak gepeng.
  capture() {
    const v = this.video, c = document.createElement("canvas");
    if (!v.videoWidth) throw new Error("Kamera belum siap, coba lagi sebentar lagi.");
    const vw = v.videoWidth, vh = v.videoHeight;
    let sw = vw, sh = vh;
    if (this.ASPECT && vw / vh > this.ASPECT) sw = Math.round(vh * this.ASPECT); else if (this.ASPECT) sh = Math.round(vw / this.ASPECT);
    const sx = (vw - sw) / 2, sy = (vh - sh) / 2;
    c.width = sw; c.height = sh;
    const x = c.getContext("2d");
    if (this.mirror) { x.translate(sw, 0); x.scale(-1, 1); }
    x.drawImage(v, sx, sy, sw, sh, 0, 0, sw, sh);
    return c;
  },
  countdown(seconds, onTick) {
    return new Promise(res => {
      let n = seconds; onTick(n);
      const t = setInterval(() => { n--; if (n <= 0) { clearInterval(t); onTick(0); res(); } else onTick(n); }, 1000);
    });
  }
};
