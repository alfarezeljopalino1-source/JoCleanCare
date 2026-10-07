const benefits = [
  { title: "Petugas profesional", description: "Tim yang memperhatikan detail dan kebutuhan ruangmu." },
  { title: "Jadwal jelas", description: "Tanggal, waktu, dan perkembangan pesanan bisa dipantau." },
  { title: "Pesan dengan mudah", description: "Pilih layanan, isi detail kunjungan, lalu tunggu konfirmasi." },
];

export function Benefits() {
  return <section id="keunggulan" className="home-section home-benefits">
    <div className="home-container">
      <div className="home-section-heading"><div><p className="customer-overline">Kenapa JoCleanCare</p><h2>Ruang terawat, hari lebih ringan.</h2></div></div>
      <ul className="benefit-list">{benefits.map((benefit, index) => <li key={benefit.title}><span>0{index + 1}</span><div><h3>{benefit.title}</h3><p>{benefit.description}</p></div></li>)}</ul>
    </div>
  </section>;
}
