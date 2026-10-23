import type { ReactNode } from 'react';
import Reveal, { type RevealVariant } from '../components/Reveal';
import { publicUrl } from '../utils/publicUrl';

type QuotePlacement = 'bottom' | 'top' | 'left' | 'right' | 'center';

function AboutImage({
  src,
  alt,
  caption,
  quote,
  quotePlacement = 'bottom',
  reveal = 'scale',
  quoteReveal = 'up',
  delay = 0,
}: {
  src: string;
  alt: string;
  caption?: string;
  quote?: ReactNode;
  quotePlacement?: QuotePlacement;
  reveal?: RevealVariant;
  quoteReveal?: RevealVariant;
  delay?: number;
}) {
  if (quote) {
    return (
      <Reveal variant={reveal} delay={delay} className="about-bleed">
        <figure
          className={`about-scene about-scene--quote-${quotePlacement}`}
        >
          <div className="about-scene-media">
            <img
              src={publicUrl(src)}
              alt={alt}
              loading="lazy"
              decoding="async"
            />
          </div>
          <div className="about-scene-quote-slot">
            <Reveal variant={quoteReveal} delay={delay + 180}>
              <blockquote className="about-quote about-quote--overlay">
                {quote}
              </blockquote>
            </Reveal>
          </div>
          {caption ? <figcaption>{caption}</figcaption> : null}
        </figure>
      </Reveal>
    );
  }

  return (
    <Reveal variant={reveal} delay={delay}>
      <figure className="about-figure">
        <img src={publicUrl(src)} alt={alt} loading="lazy" decoding="async" />
        {caption ? <figcaption>{caption}</figcaption> : null}
      </figure>
    </Reveal>
  );
}

function AboutQuote({
  children,
  variant = 'up',
  delay = 0,
}: {
  children: ReactNode;
  variant?: RevealVariant;
  delay?: number;
}) {
  return (
    <Reveal variant={variant} delay={delay}>
      <blockquote className="about-quote">{children}</blockquote>
    </Reveal>
  );
}

function AboutParagraph({
  children,
  variant = 'up',
  delay = 0,
  highlight = false,
}: {
  children: ReactNode;
  variant?: RevealVariant;
  delay?: number;
  highlight?: boolean;
}) {
  return (
    <Reveal variant={variant} delay={delay} className="about-para">
      <div
        className={
          highlight ? 'about-body about-body--highlight' : 'about-body'
        }
      >
        <p>{children}</p>
      </div>
    </Reveal>
  );
}

export default function About() {
  return (
    <main className="page about-story">
      <header className="about-hero">
        <Reveal variant="fade" className="about-lede-reveal">
          <p className="about-eyebrow">written for the 40th anniversary · updated 2015</p>
        </Reveal>
        <h1 className="about-title">A history of<br/>Edinburgh Folk Club</h1>
        <Reveal variant="fade" delay={40} className="about-lede-reveal">
          <p className="about-lede">
            In 2013, long-time EFC member the late <em>Jean Bechhofer</em> shared
            her memories of Edinburgh Folk Club over the years.
          </p>
        </Reveal>
      </header>

      <AboutQuote variant="fade" delay={30}>
        <p>
          I have been a regular attender and singer at the club since 1975 and
          chaired the committee often enough to have known better, but when in
          2003, Paddy Bort asked me to dig into my memory
          box and present a history of the club, I agreed. This was very much a
          personal reminiscence of the EFC.
        </p>
      </AboutQuote>
      <AboutQuote variant="right" delay={100}>
        <p>
          Tempting as it was, I decided not to do this in ballad form, although
          I did once present my chair-person&apos;s report as a Talking Blues!
          Ten years later Paddy asked me to up-date the account.
        </p>
      </AboutQuote>
      <AboutImage
        src="/about/about1.webp"
        alt="Edinburgh Folk Club gathering"
        reveal="left"
      />

      <AboutParagraph variant="left" delay={80}>
        Long standing members — and those with seats — will have to forgive
        me if they feel they have read it all before. Those of you who have
        become regulars in the past decade, and who are so crucial to the
        continuing existence of this club, are most welcome to read or
        remain in ignorance!
      </AboutParagraph>

      <AboutImage
        src="/about/about5.webp"
        alt="Edinburgh Folk Club gathering"
        quote="The folk music 'Revival' came to prominence in Scotland over 40 years ago… By 2003 we preferred to speak of 'The Carrying Stream'."
        quotePlacement="bottom"
        reveal="zoom"
        quoteReveal="up"
      />

      <AboutParagraph variant="right" delay={60}>
        The roots of our music are still strong although some of the
        branches have, alas, died off. From a time when there were many
        small and larger clubs enabling musicians and singers to plan
        Scottish tours of up to three weeks in length, there are now many
        fewer clubs and indeed some of the best loved have fallen by the
        wayside.
      </AboutParagraph>
      <AboutParagraph variant="up" delay={100}>
        There was a period in the 70s when Edinburgh could boast of having
        four weekly clubs. The EFC, the Triangle, The Crown and the Police
        Folk Club (or as it was affectionately known Fuzz Folk), all
        overlapped in audience to some extent but also had their own
        regulars. The EFC alone has managed to survive for 40 years while
        overcoming various crises on the way. A welcome newcomer in the last
        decade has been The Leith Folk Club.
      </AboutParagraph>
      <AboutParagraph variant="fade" delay={140}>
        The EFC had a varied life in its first twenty or so years, having to pack bags and move on far too frequently.
      </AboutParagraph>

      <Reveal variant="left" className="about-chapter-wrap">
        <h2 className="about-chapter">So how did it all start?</h2>
      </Reveal>

      <AboutParagraph variant="scale" delay={40}>
        Most people in the folk scene in Edinburgh have heard of The Howff
        and The Buffs, Edinburgh&apos;s original folk clubs, which were
        active during the early 60s. By the early 70s, the Buffs&apos; folk
        club had been closed by the police because it was operating as a
        club within a club! Three of the clubs mentioned above had by then
        been established. However the Triangle was non-licensed, the Crown
        was mainly a student venue, and the Police Club membership was
        limited to the police (some of whom at least appreciated folk
        music). Independent folk concerts were also taking place from time
        to time.
      </AboutParagraph>

      <AboutParagraph variant="left" delay={60} highlight>
        Enter stage left Three Wise Folkies. Kenny Thomson, who was a journalist with The Daily Record, a fan of
        skiffle and a well regarded song writer; Ian Green, Sergeant Green
        in those days, who had grown up around Forres and could sing a fine
        bothy ballad and was involved with Fuzz Folk and of course founder
        of Greentrax; and John Barrow, who while still a student, had
        already been putting on folk concerts for the Edinburgh
        Students&apos; Charities Appeal and Edinburgh University Yorkshire
        Society.
      </AboutParagraph>
      <AboutParagraph variant="right" delay={120} highlight>
        There was a fourth member of this group, Sid Kyman, who moved away
        shortly afterwards. These founders eventually met up in Sandy
        Bell&apos;s, which had become the Mecca for folk musicians from far
        and near. John admits that it was as well he had been unable to find
        Sandy Bell&apos;s while he was an undergrad (because it was then
        officially called The Forrest Road Bar). Touring and local artists
        were always looking for small venue bookings. Folk clubs were
        thriving in other Scottish cities. The lads all felt Edinburgh could
        do with another club after the demise of the Buffs.
      </AboutParagraph>

      <AboutImage
        src="/about/about6.webp"
        alt="On the mic at the Edinburgh Folk Club"
        quote="So, in September 1973, Edinburgh Folk Club opened up in the basement of the Chaplaincy Centre in George Square."
        quotePlacement="bottom"
        reveal="left"
        quoteReveal="right"
      />

      <AboutParagraph variant="up" delay={60}>
        Kenny was Chairman, and MC, John was Secretary, and Ian, Treasurer.
        Of course the women were not left out. Lesley Barrow, June Green,
        and Hilda Scott were much involved. In the George Square years,
        sausage baps, or sandwiches were available in the kitchen during the
        interval prepared by these willing slaves. This room achieved a
        certain notoriety.
      </AboutParagraph>
      <AboutParagraph variant="fade" delay={120}>
        The Person &apos;On the door&apos; sat at the entrance to the
        kitchen in the corridor leading to the hall, and not in the venue,
        which made it difficult to hear the music. Hence the rule that the
        only person, committee and floor-singers included, who didn&apos;t
        pay for entrance was the &apos;Door&apos;. The other access to the
        kitchen was from the back of the hall. The cognoscenti, and the
        intolerant, would escape from the hall into the kitchen from time to
        time! It was the Cool Place to be, although not exactly cool.
      </AboutParagraph>

      <AboutImage src="/about/about2.webp" alt="Edinburgh Folk Club gathering" 
      quote="The club rapidly acquired a large following of floor singers and a regular crowd of members." 
      quotePlacement="bottom" 
      reveal="fade" 
      quoteReveal="left" />

      <AboutParagraph variant="left" delay={80}>
        By the time I joined the club in 1975, you had to clock in before
        7.30pm if you were after one of the six floor spots on offer. The
        room was full to capacity with 60 people, and felt quite busy with
        30. Indeed during the summer months, we often had the House Full
        sign up. At that time it was customary for singers to be given
        hospitality in the home of a willing member which frequently led to
        after-club partying till the wee small hours.
      </AboutParagraph>
      <AboutParagraph variant="right" delay={120}>
        It would be space-wise very difficult to list here individually all
        the established and up-and coming singers and groups who appeared at
        the EFC during the 70s. Many more Edinburgh based artists looking to
        develop a career in folk music were also starting to look for gigs.
      </AboutParagraph>
      <AboutParagraph variant="up" delay={160}>
        The original triumvirate pulled out gradually, Kenny because of work
        commitments, Ian ditto, although he continued to run Fuzz Folk for
        like minded enthusiastic Boys in Blue. John resigned as secretary in
        1978 to become the first director of the Edinburgh Folk Festival. By
        then the club had an active committee, and a formal constitution was
        worked out. This was necessary because the club began to look for
        funding for specific events from the likes of the Scottish Arts
        Council.
      </AboutParagraph>

      <Reveal variant="scale" className="about-chapter-wrap">
        <h2 className="about-chapter">On the move</h2>
      </Reveal>

      <AboutParagraph variant="right">
        During the summers of the mid-70s the club also put on extra folk
        nights in the George Square venue. When the weather was good we used
        the garden for Singer&apos;s Nights. I recall Jock Weatherston, a
        very fine bothy ballad singer, perched on top of a backward facing
        chair, which slowly toppled to the ground while he never missed a
        note.
      </AboutParagraph>
      <AboutParagraph variant="fade" delay={80}>
        By the late 70s it became apparent that the George Square venue was
        no longer ideal either in size or in its facilities. The Chaplaincy
        Centre was unlicensed, and located away from the centre of town —
        although rather near Sandy Bell&apos;s. The drouthier members of the
        audience would depart for Bell&apos;s at half time and often forget
        to come back! Audiences, which had often been at capacity, dropped
        in numbers. The committee of the time decided to take the plunge and
        moved the Club to the Carlton Hotel function suite.
      </AboutParagraph>
      <AboutParagraph variant="left" delay={140}>
        After an initial good spell, there was a brief period when numbers
        fell away again. However by 1982 the club was flourishing once more
        with an enthusiastic committee. Good presentation has always been a
        major feature in ensuring the club&apos;s success. The
        Carlton&apos;s function room had a high bandstand in one corner,
        which was not ideal. We had a very competent DIY member Tim Giles,
        who built a 4-part folding stage, which was set up in the middle of
        the long wall and which we were able to store under the offending
        bandstand.
      </AboutParagraph>

      <AboutImage
        src="/about/about3.webp"
        alt="Club nights and venues across Edinburgh"
        quote="Then came the bombshell. In the Spring of '82… for the next few months, we were indeed Travelling Folk personified."
        quotePlacement="left"
        reveal="right"
        quoteReveal="left"
      />

      <AboutParagraph variant="left" delay={60}>
        The committee researched a variety of venues in Edinburgh. The club
        appeared in various places such as The Queen&apos;s Hall,
        Oscar&apos;s Disco (Dave Swarbrick rather enjoyed playing in a
        disco!), the West End Hotel, The Scottish Experience and, for the
        first time, The Pleasance, which was a student bar, not at all as it
        is now. Our loyal members followed us round town. Keeping them
        informed from week to week was a major publicity headache, but the
        press and the BBC were very accommodating. There were no e-mails,
        Facebook or website facilities available then.
      </AboutParagraph>
      <AboutParagraph variant="right" delay={110}>
        Quite the most successful &apos;outing&apos;, was to Theatre
        Workshop for &apos;A Duck on His Head&apos;, a theme night presented
        by Bill Caddick, Pete Bond and Tim Laycock. The venue was perfect
        since we were able to use proper stage lights and sound for a
        delightful show.
      </AboutParagraph>
      <AboutParagraph variant="up" delay={160}>
        When the Carlton sorted itself out we returned there, but only
        briefly. The economics of club running require the venue management
        to behave reasonably and not wish to milk a regular booking. The
        committee decided it had to leave the Carlton which was due to be
        rebuilt anyway, and we moved back to the Scottish Experience and
        then eventually again to The Pleasance Bar — then the Osborne Hotel,
        The Café Royal, and at last the &apos;new&apos; Pleasance Cabaret
        bar.
      </AboutParagraph>

      <AboutParagraph variant="fade" delay={40}>
        The Café Royal has the best natural acoustic of any venue we have
        used. There was PA available, but it was not always necessary
        allowing a wonderful intimacy with the audience — broken only by the
        noisy hand-drier in the ladies! The bar was in a separate attached
        room available only to our audience — and local &apos;musos&apos;
        who crept in after half time. We were able to offer The Poozies
        their first gig! And as I recall Fiddler&apos;s Bid&apos;s first
        Edinburgh gig.
      </AboutParagraph>
      <AboutParagraph variant="left" delay={100}>
        Fortune keeps the wheel turning though not always for the best. By
        the late 90s the booking style of the Club changed and with this
        went popularity with the public. More concerning was a period of
        mis-management with a major loss of funds. Drastic measures were
        needed. Once again a determined group of old hands, encouraged by
        founder members, stepped in and took the Club into the new century,
        increasing its membership, popularity and funds to a very
        respectable level.
      </AboutParagraph>
      <AboutParagraph variant="right" delay={150}>
        Indeed, according to Radio 2, EFC was Folk Club of the Year in 2002,
        and in October, a committee headed by Paddy Bort with new and
        experienced club members took over. As you are all aware, he is
        still at the helm.
      </AboutParagraph>

      <Reveal variant="zoom" className="about-chapter-wrap">
        <h2 className="about-chapter">The carrying stream</h2>
      </Reveal>

      <AboutParagraph variant="left" delay={40}>
        Perhaps what changed most over the years was the quality, standard and overall performance
        of &apos;folk&apos; music. Those qualities varied considerably in the earlier years within the scene.
        However looking back at the programmes of those earlier years in the 70s and 80s you can find
        many singers and musicians still touring and delighting audiences.
      </AboutParagraph>
      <AboutParagraph variant="right" delay={100}>
        The biggest change has to be in the prevalence of small groups duos and bands whose individual
        talents have continued to push standards of performance to higher and higher levels.
        There are of course still many soloists who are welcomed at small clubs and festival venues
        and EFC tries to bring the best of these to The Pleasance.
      </AboutParagraph>
      <AboutParagraph variant="up" delay={150}>
        In order to remain alive the Edinburgh club has constantly had to
        review its venue, presentation, booking policy and publicity. Only
        the committed, (and maybe they ought to be), appreciate the hard
        work involved in running a successful club.
      </AboutParagraph>

      <AboutQuote variant="left" delay={60}>
        Do we all know the joke about how many folkies does it take to change a
        light bulb? &ldquo;One, but four to sing about how good the old one
        was!&rdquo;
      </AboutQuote>

      <AboutParagraph variant="right" delay={80}>
        Singers&apos; nights were very much part of the club&apos;s
        programme in the 70s and 80s. Theme Nights, which were also
        presented occasionally at that time, related to a particular idea
        such as &apos;Emigration&apos;, &apos;The Demon Drink&apos;,
        &apos;Love&apos; or &apos;A Trip round Britain&apos;. Regular floor
        singers chose appropriate songs. These were then linked by selected
        readings, poems and humorous anecdotes researched by the narrator,
        and the whole thing rehearsed as a mini-show. For the back-drop, the
        late Ian Cruickshank would create a superb paper sculpture which was
        raffled off later.
      </AboutParagraph>
      <AboutParagraph variant="fade" delay={130}>
        An historic aspect of the club scene which has long gone from
        Edinburgh is visits to other clubs. At the period when there were
        many more weekly folk clubs, inter-club visits were popular. Floor
        singers and musicians, and regulars would hire a bus and invade
        other like-minded souls&apos; territory if within reasonable driving
        distance. We were all a lot younger then and found it easier to get
        up the morning after.
      </AboutParagraph>
      <AboutParagraph variant="left" delay={180}>
        I also recall taking part in my one and only football match, EFC -v-
        The Triangle. They won by virtue of youth on their side, at least
        that&apos;s what John Barrow and I claimed. Other social events
        which came and went were the Quiz Nights, Skittles Matches and
        Christmas Nights Out at a Chinese restaurant. Such gatherings had
        their time, and are remembered with affection.
      </AboutParagraph>

      <AboutImage
        src="/about/about4.webp"
        alt="Hamish Henderson and the carrying stream tradition"
        quote="Over the years there have been crises, yes, but there have also been nights, events and people to remember."
        quotePlacement="bottom"
        reveal="zoom"
        quoteReveal="scale"
      />

      <AboutParagraph variant="left" delay={60}>
        In the early years the club would celebrate its anniversaries with a
        birthday party often in fancy dress. Much ingenuity was shown by
        members in producing costumes illustrating a folk theme or song. To
        illustrate &apos;Green Grow The Rashes-O&apos;, Liz sported a
        horrendous case of green measles! Then there was the Christmas Party
        night when Santa Claus, inadequately disguised as the late Hamish
        Imlach, greeted bairns and punters alike with &apos;Ho, Bloody
        Ho!&apos;.
      </AboutParagraph>
      <AboutParagraph variant="right" delay={120}>
        There are very few well known and well regarded folk singers who
        have not appeared at the Club in its forty years. I have two
        personal memories of great folk singers which I can&apos;t resist
        recalling. There was the night when Archie Fisher dropped in with
        the late Stan Rogers from Canada, and we all were swept away by
        Stan&apos;s wonderful irreplaceable charm. Then at long last in
        November 2001 I arranged for Tom Paxton to sing and run a workshop
        in our club.
      </AboutParagraph>
      <AboutParagraph variant="up" delay={170}>
        The club&apos;s Burns Nights have never been conventional, and have
        even sometimes been &apos;Non-Burns&apos; nights focussing on what
        Burns himself might have enjoyed rather than the more conventional
        celebrations from which he might well be barred were he still
        around. At our suppers he is still the Bard. &apos;The Immortal
        Memory&apos; was, on one early occasion, proposed by dear Hamish
        Henderson.
      </AboutParagraph>

      <AboutParagraph variant="right" delay={80}>
        The death of Hamish Henderson in March 2002 was a huge loss for the
        whole folk community, but particularly for Edinburgh. The Carrying
        Stream Festival which was established as a mark of respect to Hamish
        Henderson, is now a fixed event in our Autumn programme and like all
        else changes — and stays the same. The EFC committee also decided to
        celebrate his life by establishing the Hamish Henderson Lecture.
      </AboutParagraph>
      <AboutParagraph variant="left" delay={140}>
        In 2011 the indefatigable Paddy Bort
        rallied the EFC committee and many artists and supporters, to
        commemorate the legendary first People&apos;s Ceilidh of 1951 with a
        memorable concert held in the original setting of The Odd Fellows
        Hall. Those taking part included Flora MacNeil who sang at the
        original concert.
      </AboutParagraph>

      <AboutQuote variant="fade" delay={100}>
        Times change, standards alter. Styles in folk music continue to
        develop and change while still retaining a firm hold on the roots of
        the tradition. &apos;The Carrying Stream&apos; is indeed a more
        accurate definition now rather than &apos;The Revival&apos;. The
        Edinburgh Folk Club has moved with the times and our programme
        reflects the changes which have taken place over the years.
      </AboutQuote>

      <AboutParagraph variant="up" delay={60}>
        This tendency was spotted early in the Club&apos;s history when the
        annual Song Writing Competition was established in 1976. Every year
        anything up to 30 songs will be entered. Several well known and well
        respected singer-songwriters have carried off the cup. Nancy
        Nicolson was barred from entering after winning three years running,
        and appointed a judge instead!
      </AboutParagraph>
      <AboutParagraph variant="fade" delay={120}>
        I am sure that my reminiscences of Wednesdays nights spent at the
        EFC over nearly forty years, will create arguments over the fact and
        fiction of our beloved institution. I did begin by saying these
        memories are highly personal. I am exceedingly proud to be one of
        its select band of life-members. The club has featured largely in my
        life and hope will continue to do so as I look forward to the 50th
        anniversary.
      </AboutParagraph>

      <Reveal variant="fade" className="about-signoff-wrap">
        <p className="about-signoff">
          Jean Bechhofer
          <span>October 2013</span>
        </p>
      </Reveal>

      <div className="about-portrait-split">
        <Reveal variant="left" className="about-portrait-reveal">
          <figure className="about-portrait">
            <img
              src={publicUrl('/about/about7.jpeg')}
              alt="Paddy Bort"
              width={522}
              height={786}
              loading="lazy"
              decoding="async"
            />
          </figure>
        </Reveal>
        <div className="about-portrait-copy">
          <AboutParagraph variant="fade" delay={40}>
            When Jean was writing, Paddy (Eberhard) Bort was still with us, and his sudden death in 2017, was a severe blow to the Club. As is the nature of things, he is not the only Edinburgh folk luminary to have passed in the last fifty years, and to try to list them here would inevitably risk upsetting someone with an omission, as well as depressing us all. To our great good fortune, however, John Barrow, a mere strippling in 1975,  is very much still with us, and stepped up to Chair the Club, and to lead the successful bid to Creative Scotland that allowed for a special year in 2024/25 as we celebrated our fiftieth birthday. He has since retired (twice), but stays on as Honorary President. The then committee all retired at once at the end of the fiftieth year. Sadly, despite the best efforts of a few people, the Club then faltered under a new regime, so many of the old committee came back and, with some additions, and the vital support of Jim Welsh from Leith Folk Club, mounted a rescue.
          </AboutParagraph>
          <AboutParagraph variant="right" delay={90}>
            The Club continued its search for a venue during the last two years of Paddy’s life. The Pleasance, refurbished again and in search of more lucrative bookings became less welcoming and reliable. A move to Summerhall ensued, but it posed its own problems, not least sound “leakage” from other events in the building. Safe harbourage was finally found in the Ukrainian Community Centre in Royal Terrace.
          </AboutParagraph>
          <AboutParagraph variant="up" delay={140}>
            In the same period, although the faithful have stayed with us including a contingent from Balerno Club, EFC has constantly faced financial strain and diminished audience numbers. Although the folk scene is thriving, fewer young people see a folk club as central to following their enthusiasm. We have become used to a more modest operation, and since 2026 have met fortnightly. On occasion, however, we can still raise a full house of 80 and are set to survive and thrive into the future.
          </AboutParagraph>
        </div>
      </div>
    </main>
  );
}
