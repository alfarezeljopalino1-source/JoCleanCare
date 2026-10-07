const steps = [
  { number: "01", title: "Pilih layanan", description: "Tentukan jenis pembersihan yang sesuai dengan kebutuhan ruang." },
  { number: "02", title: "Atur jadwal", description: "Pilih tanggal dan waktu yang nyaman untuk kunjungan tim." },
  { number: "03", title: "Kami yang bereskan", description: "Petugas datang sesuai jadwal dan mengerjakan layanan pilihanmu." },
];

export function HowItWorks() {
  return <section id="cara-kerja" className="home-section home-how-it-works">
    <div className="home-container">
      <div className="home-section-heading home-process-heading"><div><p className="customer-overline">Cara kerja</p><h2>Pesan tanpa proses berbelit.</h2></div><p>Semua kebutuhan tersusun rapi sejak kamu memilih layanan sampai petugas datang.</p></div>
      <ol className="process-list">{steps.map((step) => <li key={step.number}><span className="process-number">{step.number}</span><div><h3>{step.title}</h3><p>{step.description}</p></div></li>)}</ol>
    </div>
  </section>;
}
