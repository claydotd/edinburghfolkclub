import otherFolk from '../../content/other-folk.json';

export default function OtherFolk() {
  return (
    <main className="page other-folk-page">
      <header className="page-masthead">
        <h1 className="page-title">Other Folk</h1>
        <p className="page-lede">
          Kindred venues, festivals, and resources in the traditional arts.
        </p>
      </header>
      <ul className="other-folk-list">
        {otherFolk.entries.map((entry) => (
          <li key={entry.url} className="other-folk-item">
            <h2 className="other-folk-name">
              <a href={entry.url} target="_blank" rel="noopener noreferrer">
                {entry.name}
              </a>
            </h2>
            <p className="other-folk-blurb">{entry.blurb}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
