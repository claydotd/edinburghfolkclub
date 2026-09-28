import gallery from '../../content/gallery.json';

export default function Gallery() {
  return (
    <main className="page gallery-page">
      <header className="page-masthead">
        <h1 className="page-title">Media Gallery</h1>
        <p className="page-lede">
          Moments from nights at Edinburgh Folk Club.
        </p>
      </header>
      <ul className="gallery-grid">
        {gallery.items.map((item) => (
          <li key={item.src} className="gallery-item">
            <img src={item.src} alt={item.alt} loading="lazy" />
            {item.caption ? (
              <p className="gallery-caption">{item.caption}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </main>
  );
}
