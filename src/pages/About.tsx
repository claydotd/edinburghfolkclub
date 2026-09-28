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

export default function About() {
  return (
    <main className="page about-story">
      <header className="about-hero">
        <p className="about-eyebrow">written for the 40th anniversary · updated 2015</p>
        <h1 className="about-title">A history of<br/>Edinburgh Folk Club</h1>
        <p className="about-lede">
          Long-time EFC member <em>Jean Bechhofer</em> shares her memories of Edinburgh
          Folk Club over the years.
        </p>
      </header>

      <AboutQuote variant="fade" delay={40}>
        <p>
          I have been a regular attender and singer at the club since 1975 and
          chaired the committee often enough to have known better, but when in
          2003, Paddy Bort asked me to dig into my memory
          box and present a history of the club, I agreed. This was very much a
          personal reminiscence of the EFC.
        </p>
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

      <Reveal variant="left" delay={80}>
        <div className="about-body">
          <p>
            Long standing members — and those with seats — will have to forgive
            me if they feel they have read it all before. Those of you who have
            become regulars in the past decade, and who are so crucial to the
            continuing existence of this club, are most welcome to read or
            remain in ignorance!
          </p>
          <p>
            Although much remains the same there are inevitably gaps in the
            roll-call of faithful members, whom we remember so fondly —
            particularly Maggie Cruickshank, Paddie Bell, Nick Keir, Bobby
            Eaglesham, Rita and Dougie Anderson, Al Burns, and Bob Bertram.
            There are also too many missing names of artists whose performances
            delighted and moved us — Davie Steele, John Watt and Michael Marra
            to name three club favourites.
          </p>
        </div>
      </Reveal>

      <AboutImage
        src="/about/about5.jpg"
        alt="Edinburgh Folk Club gathering"
        quote="The folk music 'Revival' came to prominence in Scotland over 40 years ago… By 2003 we preferred to speak of 'The Carrying Stream'."
        quotePlacement="bottom"
        reveal="zoom"
        quoteReveal="up"
      />

      <Reveal variant="right" delay={60}>
        <div className="about-body">
          <p>
            The roots of our music are still strong although some of the
            branches have, alas, died off. From a time when there were many
            small and larger clubs enabling musicians and singers to plan
            Scottish tours of up to three weeks in length, there are now many
            fewer clubs and indeed some of the best loved have fallen by the
            wayside.
          </p>
          <p>
            There was a period in the 70s when Edinburgh could boast of having
            four weekly clubs. The EFC, the Triangle, The Crown and the Police
            Folk Club (or as it was affectionately known Fuzz Folk), all
            overlapped in audience to some extent but also had their own
            regulars. The EFC alone has managed to survive for 40 years while
            overcoming various crises on the way. A welcome newcomer in the last
            decade has been The Leith Folk Club.
          </p>
          <p>
            The EFC had a varied life in its first twenty or so years, having to
            pack bags and move on far too frequently. However it has been our
            fortune to be able to stay put at The Pleasance for almost all of
            the past two decades.
          </p>
        </div>
      </Reveal>

      <Reveal variant="left" className="about-chapter-wrap">
        <h2 className="about-chapter">So how did it all start?</h2>
      </Reveal>

      <Reveal variant="scale" delay={40}>
        <div className="about-body">
          <p>
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
          </p>
        </div>
      </Reveal>

      <Reveal variant="left" delay={60}>
        <div className="about-body about-body--highlight">
          <p>
            Enter stage left Three Wise Folkies. Kenny Thomson, alas now no
            longer alive, who was a journalist with The Daily Record, a fan of
            skiffle and a well regarded song writer; Ian Green, Sergeant Green
            in those days, who had grown up around Forres and could sing a fine
            bothy ballad and was involved with Fuzz Folk and of course founder
            of Greentrax; and John Barrow, who while still a student, had
            already been putting on folk concerts for the Edinburgh
            Students&apos; Charities Appeal and Edinburgh University Yorkshire
            Society.
          </p>
          <p>
            There was a fourth member of this group, Sid Kyman, who moved away
            shortly afterwards. These founders eventually met up in Sandy
            Bell&apos;s, which had become the Mecca for folk musicians from far
            and near. John admits that it was as well he had been unable to find
            Sandy Bell&apos;s while he was an undergrad (because it was then
            officially called The Forrest Road Bar). Touring and local artists
            were always looking for small venue bookings. Folk clubs were
            thriving in other Scottish cities. The lads all felt Edinburgh could
            do with another club after the demise of the Buffs.
          </p>
        </div>
      </Reveal>

      <AboutImage
        src="/about/about6.jpg"
        alt="On the mic at the Edinburgh Folk Club"
        quote="So, in September 1973, Edinburgh Folk Club opened up in the basement of the Chaplaincy Centre in George Square."
        quotePlacement="bottom"
        reveal="left"
        quoteReveal="right"
      />

      <Reveal variant="up" delay={60}>
        <div className="about-body">
          <p>
            Kenny was Chairman, and MC, John was Secretary, and Ian, Treasurer.
            Of course the women were not left out. Lesley Barrow, June Green,
            and Hilda Scott were much involved. In the George Square years,
            sausage baps, or sandwiches were available in the kitchen during the
            interval prepared by these willing slaves. This room achieved a
            certain notoriety.
          </p>
          <p>
            The Person &apos;On the door&apos; sat at the entrance to the
            kitchen in the corridor leading to the hall, and not in the venue,
            which made it difficult to hear the music. Hence the rule that the
            only person, committee and floor-singers included, who didn&apos;t
            pay for entrance was the &apos;Door&apos;. The other access to the
            kitchen was from the back of the hall. The cognoscenti, and the
            intolerant, would escape from the hall into the kitchen from time to
            time! It was the Cool Place to be, although not exactly cool.
          </p>
        </div>
      </Reveal>

      <AboutImage src="/about/about2.webp" alt="Edinburgh Folk Club gathering" 
      quote="The club rapidly acquired a large following of floor singers and a regular crowd of members." 
      quotePlacement="bottom" 
      reveal="fade" 
      quoteReveal="left" />

      <Reveal variant="left" delay={80}>
        <div className="about-body">
          <p>
            By the time I joined the club in 1975, you had to clock in before
            7.30pm if you were after one of the six floor spots on offer. The
            room was full to capacity with 60 people, and felt quite busy with
            30. Indeed during the summer months, we often had the House Full
            sign up. At that time it was customary for singers to be given
            hospitality in the home of a willing member which frequently led to
            after-club partying till the wee small hours.
          </p>
          <p>
            It would be space-wise very difficult to list here individually all
            the established and up-and coming singers and groups who appeared at
            the EFC during the 70s. Many more Edinburgh based artists looking to
            develop a career in folk music were also starting to look for gigs.
          </p>
          <p>
            The original triumvirate pulled out gradually, Kenny because of work
            commitments, Ian ditto, although he continued to run Fuzz Folk for
            like minded enthusiastic Boys in Blue. John resigned as secretary in
            1978 to become the first director of the Edinburgh Folk Festival. By
            then the club had an active committee, and a formal constitution was
            worked out. This was necessary because the club began to look for
            funding for specific events from the likes of the Scottish Arts
            Council.
          </p>
        </div>
      </Reveal>

      <Reveal variant="scale" className="about-chapter-wrap">
        <h2 className="about-chapter">On the move</h2>
      </Reveal>

      <Reveal variant="right">
        <div className="about-body">
          <p>
            During the summers of the mid-70s the club also put on extra folk
            nights in the George Square venue. When the weather was good we used
            the garden for Singer&apos;s Nights. I recall Jock Weatherston, a
            very fine bothy ballad singer, perched on top of a backward facing
            chair, which slowly toppled to the ground while he never missed a
            note.
          </p>
          <p>
            By the late 70s it became apparent that the George Square venue was
            no longer ideal either in size or in its facilities. The Chaplaincy
            Centre was unlicensed, and located away from the centre of town —
            although rather near Sandy Bell&apos;s. The drouthier members of the
            audience would depart for Bell&apos;s at half time and often forget
            to come back! Audiences, which had often been at capacity, dropped
            in numbers. The committee of the time decided to take the plunge and
            moved the Club to the Carlton Hotel function suite.
          </p>
          <p>
            After an initial good spell, there was a brief period when numbers
            fell away again. However by 1982 the club was flourishing once more
            with an enthusiastic committee. Good presentation has always been a
            major feature in ensuring the club&apos;s success. The
            Carlton&apos;s function room had a high bandstand in one corner,
            which was not ideal. We had a very competent DIY member Tim Giles,
            who built a 4-part folding stage, which was set up in the middle of
            the long wall and which we were able to store under the offending
            bandstand.
          </p>
        </div>
      </Reveal>

      <AboutImage
        src="/about/about3.webp"
        alt="Club nights and venues across Edinburgh"
        quote="Then came the bombshell. In the Spring of '82… for the next few months, we were indeed Travelling Folk personified."
        quotePlacement="left"
        reveal="right"
        quoteReveal="left"
      />

      <Reveal variant="left" delay={60}>
        <div className="about-body">
          <p>
            The committee researched a variety of venues in Edinburgh. The club
            appeared in various places such as The Queen&apos;s Hall,
            Oscar&apos;s Disco (Dave Swarbrick rather enjoyed playing in a
            disco!), the West End Hotel, The Scottish Experience and, for the
            first time, The Pleasance, which was a student bar, not at all as it
            is now. Our loyal members followed us round town. Keeping them
            informed from week to week was a major publicity headache, but the
            press and the BBC were very accommodating. There were no e-mails,
            Facebook or website facilities available then.
          </p>
          <p>
            Quite the most successful &apos;outing&apos;, was to Theatre
            Workshop for &apos;A Duck on His Head&apos;, a theme night presented
            by Bill Caddick, Pete Bond and Tim Laycock. The venue was perfect
            since we were able to use proper stage lights and sound for a
            delightful show.
          </p>
          <p>
            When the Carlton sorted itself out we returned there, but only
            briefly. The economics of club running require the venue management
            to behave reasonably and not wish to milk a regular booking. The
            committee decided it had to leave the Carlton which was due to be
            rebuilt anyway, and we moved back to the Scottish Experience and
            then eventually again to The Pleasance Bar — then the Osborne Hotel,
            The Café Royal, and at last the &apos;new&apos; Pleasance Cabaret
            bar.
          </p>
        </div>
      </Reveal>

      <Reveal variant="right" delay={40}>
        <div className="about-body">
          <p>
            The Café Royal has the best natural acoustic of any venue we have
            used. There was PA available, but it was not always necessary
            allowing a wonderful intimacy with the audience — broken only by the
            noisy hand-drier in the ladies! The bar was in a separate attached
            room available only to our audience — and local &apos;musos&apos;
            who crept in after half time. We were able to offer The Poozies
            their first gig! And as I recall Fiddler&apos;s Bid&apos;s first
            Edinburgh gig.
          </p>
          <p>
            Fortune keeps the wheel turning though not always for the best. By
            the late 90s the booking style of the Club changed and with this
            went popularity with the public. More concerning was a period of
            mis-management with a major loss of funds. Drastic measures were
            needed. Once again a determined group of old hands, encouraged by
            founder members, stepped in and took the Club into the new century,
            increasing its membership, popularity and funds to a very
            respectable level.
          </p>
          <p>
            Indeed, according to Radio 2, EFC was Folk Club of the Year in 2002,
            and in October, a committee headed by Paddy Bort with new and
            experienced club members took over. As you are all aware, he is
            still at the helm.
          </p>
        </div>
      </Reveal>

      <Reveal variant="zoom" className="about-chapter-wrap">
        <h2 className="about-chapter">The carrying stream</h2>
      </Reveal>

      <Reveal variant="left" delay={40}>
        <div className="about-body">
          <p>
            Perhaps what has changed most over the years is the quality,
            standard and overall performance of &apos;folk&apos; music. Those
            qualities varied considerably in the earlier years within the scene.
            However looking back at the programmes of those earlier years in the
            70s and 80s you can find many singers and musicians still touring
            and delighting audiences — some of whom may even be here tonight!
          </p>
          <p>
            The biggest change has to be in the prevalence of small groups duos
            and bands whose individual talents have continued to push standards
            of performance to higher and higher levels. There are of course
            still many soloists who are welcomed at small clubs and festival
            venues and EFC tries to bring the best of these to The Pleasance.
          </p>
          <p>
            In order to remain alive the Edinburgh club has constantly had to
            review its venue, presentation, booking policy and publicity. Only
            the committed, (and maybe they ought to be), appreciate the hard
            work involved in running a successful club.
          </p>
        </div>
      </Reveal>

      <AboutQuote variant="left" delay={60}>
        Do we all know the joke about how many folkies does it take to change a
        light bulb? &ldquo;One, but four to sing about how good the old one
        was!&rdquo;
      </AboutQuote>

      <Reveal variant="right" delay={80}>
        <div className="about-body">
          <p>
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
          </p>
          <p>
            An historic aspect of the club scene which has long gone from
            Edinburgh is visits to other clubs. At the period when there were
            many more weekly folk clubs, inter-club visits were popular. Floor
            singers and musicians, and regulars would hire a bus and invade
            other like-minded souls&apos; territory if within reasonable driving
            distance. We were all a lot younger then and found it easier to get
            up the morning after.
          </p>
          <p>
            I also recall taking part in my one and only football match, EFC -v-
            The Triangle. They won by virtue of youth on their side, at least
            that&apos;s what John Barrow and I claimed. Other social events
            which came and went were the Quiz Nights, Skittles Matches and
            Christmas Nights Out at a Chinese restaurant. Such gatherings had
            their time, and are remembered with affection.
          </p>
        </div>
      </Reveal>

      <AboutImage
        src="/about/about4.webp"
        alt="Hamish Henderson and the carrying stream tradition"
        quote="Over the years there have been crises, yes, but there have also been nights, events and people to remember."
        quotePlacement="bottom"
        reveal="zoom"
        quoteReveal="scale"
      />

      <Reveal variant="left" delay={60}>
        <div className="about-body">
          <p>
            In the early years the club would celebrate its anniversaries with a
            birthday party often in fancy dress. Much ingenuity was shown by
            members in producing costumes illustrating a folk theme or song. To
            illustrate &apos;Green Grow The Rashes-O&apos;, Liz sported a
            horrendous case of green measles! Then there was the Christmas Party
            night when Santa Claus, inadequately disguised as the late Hamish
            Imlach, greeted bairns and punters alike with &apos;Ho, Bloody
            Ho!&apos;.
          </p>
          <p>
            There are very few well known and well regarded folk singers who
            have not appeared at the Club in its forty years. I have two
            personal memories of great folk singers which I can&apos;t resist
            recalling. There was the night when Archie Fisher dropped in with
            the late Stan Rogers from Canada, and we all were swept away by
            Stan&apos;s wonderful irreplaceable charm. Then at long last in
            November 2001 I arranged for Tom Paxton to sing and run a workshop
            in our club.
          </p>
          <p>
            The club&apos;s Burns Nights have never been conventional, and have
            even sometimes been &apos;Non-Burns&apos; nights focussing on what
            Burns himself might have enjoyed rather than the more conventional
            celebrations from which he might well be barred were he still
            around. At our suppers he is still the Bard. &apos;The Immortal
            Memory&apos; was, on one early occasion, proposed by dear Hamish
            Henderson.
          </p>
        </div>
      </Reveal>

      <Reveal variant="right" delay={80}>
        <div className="about-body">
          <p>
            The death of Hamish Henderson in March 2002 was a huge loss for the
            whole folk community, but particularly for Edinburgh. The Carrying
            Stream Festival which was established as a mark of respect to Hamish
            Henderson, is now a fixed event in our Autumn programme and like all
            else changes — and stays the same. The EFC committee also decided to
            celebrate his life by establishing the Hamish Henderson Lecture.
          </p>
          <p>
            In 2011 the indefatigable Paddy Bort, our present Chairperson
            rallied the EFC committee and many artists and supporters, to
            commemorate the legendary first People&apos;s Ceilidh of 1951 with a
            memorable concert held in the original setting of The Odd Fellows
            Hall. Those taking part included Flora MacNeil who sang at the
            original concert.
          </p>
          <br/>
          <AboutQuote variant="fade" delay={100}>
          Times change, standards alter. Styles in folk music continue to
            develop and change while still retaining a firm hold on the roots of
            the tradition. &apos;The Carrying Stream&apos; is indeed a more
            accurate definition now rather than &apos;The Revival&apos;. The
            Edinburgh Folk Club has moved with the times and our programme
            reflects the changes which have taken place over the years.
          </AboutQuote>

          <p>
            This tendency was spotted early in the Club&apos;s history when the
            annual Song Writing Competition was established in 1976. Every year
            anything up to 30 songs will be entered. Several well known and well
            respected singer-songwriters have carried off the cup. Nancy
            Nicolson was barred from entering after winning three years running,
            and appointed a judge instead!
          </p>
          <p>
            I am sure that my reminiscences of Wednesdays nights spent at the
            EFC over nearly forty years, will create arguments over the fact and
            fiction of our beloved institution. I did begin by saying these
            memories are highly personal. I am exceedingly proud to be one of
            its select band of life-members. The club has featured largely in my
            life and hope will continue to do so as I look forward to the 50th
            anniversary.
          </p>
        </div>
      </Reveal>

      <Reveal variant="fade" className="about-signoff-wrap">
        <p className="about-signoff">
          Jean Bechhofer
          <span>October 2013</span>
        </p>
      </Reveal>
    </main>
  );
}
