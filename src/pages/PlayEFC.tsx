import NetlifyForm from '../components/NetlifyForm';
import FileDropField from '../components/FileDropField';
import { publicUrl } from '../utils/publicUrl';

export default function PlayEFC() {
  return (
    <main className="play-efc-page">
      <header className="play-efc-hero">
        <img
          className="play-efc-hero-media"
          src={publicUrl('/images/play-efc.webp')}
          alt=""
          width={532}
          height={532}
        />
        <div className="play-efc-hero-veil" aria-hidden="true" />
        <div className="play-efc-hero-copy">
          <h1 className="play-efc-hero-title">Play at Edinburgh Folk Club</h1>
          <p className="play-efc-hero-lede">
            To be considered for a gig at Edinburgh Folk Club, please fill out
            the form below and attach the materials listed.
          </p>
        </div>
      </header>

      <section className="form-section play-efc-form">
        <NetlifyForm
          name="play-efc"
          className="site-form site-form--wide"
          encType="multipart/form-data"
        >
          {({ submitted, submitting }) =>
            submitted ? (
              <p className="form-success" role="status">
                Thank you, your application has been sent.
              </p>
            ) : (
              <>
                <label className="form-field">
                  <span>Name</span>
                  <input type="text" name="name" required autoComplete="name" />
                </label>

                <label className="form-field">
                  <span>Email</span>
                  <input
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                  />
                </label>

                <FileDropField
                  name="bio"
                  label="Brief bio (Word document)"
                  accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  acceptLabel="Word document (.doc or .docx)"
                  required
                  describedBy="bio-requirements"
                  dropHint="Drop your Word document here"
                >
                  <ul id="bio-requirements" className="form-requirements">
                    <li>One A4 sheet maximum</li>
                    <li>Word document format (.doc or .docx)</li>
                    <li>
                      &apos;Straight&apos; text only — no fancy formatting
                    </li>
                    <li>No pictures included on the sheet</li>
                    <li>12pt Times New Roman font</li>
                    <li>500 words maximum</li>
                  </ul>
                </FileDropField>

                <label className="form-field">
                  <span>Your website URL</span>
                  <input
                    type="url"
                    name="website"
                    required
                    placeholder="https://"
                    autoComplete="url"
                  />
                </label>

                <FileDropField
                  name="picture"
                  label="Hi-res picture (JPG)"
                  accept=".jpg,.jpeg,image/jpeg"
                  acceptLabel="JPG image"
                  required
                  describedBy="picture-hint"
                  dropHint="Drop your JPG picture here"
                >
                  <p id="picture-hint" className="form-hint">
                    JPG only, ideally 300 dpi.
                  </p>
                </FileDropField>

                <label className="form-field">
                  <span>
                    Links to YouTube and / or other similar sites and audio
                    link(s)
                  </span>
                  <textarea
                    name="media-links"
                    required
                    rows={5}
                    placeholder="Paste links here, one per line"
                    aria-describedby="media-links-hint"
                  />
                  <p id="media-links-hint" className="form-hint">
                    Include any YouTube, Bandcamp, SoundCloud, Spotify, or
                    similar links where we can hear your music.
                  </p>
                </label>

                <button
                  type="submit"
                  className="form-submit"
                  disabled={submitting}
                >
                  {submitting ? 'Sending…' : 'Submit application'}
                </button>
              </>
            )
          }
        </NetlifyForm>
      </section>
    </main>
  );
}
