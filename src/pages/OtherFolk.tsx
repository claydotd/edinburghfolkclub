import { useState } from 'react';
import otherFolk from '../../content/other-folk.json';

type FolkEntry = (typeof otherFolk.entries)[number];

export default function OtherFolk() {
  const [selected, setSelected] = useState<string | null>(null);

  function toggleCategory(category: string) {
    setSelected((prev) => (prev === category ? null : category));
  }

  const visibleCategories = selected
    ? otherFolk.categories.filter((category) => category === selected)
    : otherFolk.categories;

  const entriesByCategory = otherFolk.entries.reduce<Record<string, FolkEntry[]>>(
    (acc, entry) => {
      (acc[entry.category] ??= []).push(entry);
      return acc;
    },
    {},
  );

  return (
    <main className="page other-folk-page">
      <header className="page-masthead">
        <h1 className="page-title">Other Folk</h1>
        <p className="page-lede">
          This is the first page of what will become several containing sometimes
          quite idiosyncratically chosen websites which may, or may not, be of
          interest. But it is hoped they may have some relevance and use to
          Edinburgh FC members and visitors just passing by.
        </p>
        <br/>
        <p>
          The nature of a lot of these websites is that they become out of date
          or are replaced. Therefore those listed here are offered on the basis
          that Edinburgh Folk Club cannot be held responsible for the content
          of, as they say, these &quot;third party&quot; sites nor for the
          possibility that they may be defunct.
        </p>
        <p>
          Please help us keep this page up to date and useful by{' '}
          <a href="/contact">passing along updates and new info</a>.
        </p>
      </header>

      <div className="other-folk-filters" role="group" aria-label="Filter by category">
        {otherFolk.categories.map((category) => {
          const isActive = selected === category;
          return (
            <button
              key={category}
              type="button"
              className={`other-folk-filter${isActive ? ' is-active' : ''}`}
              aria-pressed={isActive}
              onClick={() => toggleCategory(category)}
            >
              {category}
            </button>
          );
        })}
      </div>

      <div
        className={`other-folk-sections${selected ? ' other-folk-sections--filtered' : ''}`}
      >
        {visibleCategories.map((category) => {
          const entries = entriesByCategory[category] ?? [];
          if (entries.length === 0) return null;

          return (
            <section key={category} className="other-folk-section">
              <h2 className="other-folk-section-title">{category}</h2>
              <ul className="other-folk-list">
                {entries.map((entry) => (
                  <li
                    key={`${entry.category}-${entry.url}-${entry.name}`}
                    className="other-folk-item"
                  >
                    <h3 className="other-folk-name">
                      <a href={entry.url} target="_blank" rel="noopener noreferrer">
                        {entry.name}
                      </a>
                    </h3>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </main>
  );
}
