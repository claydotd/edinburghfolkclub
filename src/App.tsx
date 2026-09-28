import { Route, Routes } from 'react-router-dom'
import './App.css'
import Header from './components/Header.tsx'
import Footer from './components/Footer.tsx'
import Home from './pages/Home.tsx'
import About from './pages/About.tsx'
import Contact from './pages/Contact.tsx'
import Gallery from './pages/Gallery.tsx'
import OtherFolk from './pages/OtherFolk.tsx'
import Terms from './pages/Terms.tsx'
import MembersGate from './pages/members/MembersGate.tsx'
import MembersLayout from './pages/members/MembersLayout.tsx'
import MembersAccount from './pages/members/MembersAccount.tsx'
import MembersDocuments from './pages/members/MembersDocuments.tsx'
import MembersDocumentDetail from './pages/members/MembersDocumentDetail.tsx'
import MembersTickets from './pages/members/MembersTickets.tsx'
import RequireMember from './membership/RequireMember.tsx'
import PlayEFC from './pages/PlayEFC.tsx'

function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/contact/play-at-efc" element={<PlayEFC />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/other-folk" element={<OtherFolk />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/members">
          <Route index element={<MembersGate />} />
          <Route element={<RequireMember />}>
            <Route element={<MembersLayout />}>
              <Route path="account" element={<MembersAccount />} />
              <Route path="documents" element={<MembersDocuments />} />
              <Route
                path="documents/:slug"
                element={<MembersDocumentDetail />}
              />
              <Route path="tickets" element={<MembersTickets />} />
            </Route>
          </Route>
        </Route>
      </Routes>
      <Footer />
    </>
  )
}

export default App
