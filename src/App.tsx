import { Outlet, Route, Routes } from 'react-router-dom'
import './App.css'
import Header from './components/Header.tsx'
import Footer from './components/Footer.tsx'
import ScrollToTop from './components/ScrollToTop.tsx'
import Home from './pages/Home.tsx'
import PastGigs from './pages/PastGigs.tsx'
import About from './pages/About.tsx'
import Contact from './pages/Contact.tsx'
import Gallery from './pages/Gallery.tsx'
import News from './pages/News.tsx'
import NewsPost from './pages/NewsPost.tsx'
import Terms from './pages/Terms.tsx'
import MembersGate from './pages/members/MembersGate.tsx'
import MembersLayout from './pages/members/MembersLayout.tsx'
import MembersAccount from './pages/members/MembersAccount.tsx'
import MembersDocuments from './pages/members/MembersDocuments.tsx'
import MembersDocumentDetail from './pages/members/MembersDocumentDetail.tsx'
import MembersTickets from './pages/members/MembersTickets.tsx'
import RequireMember from './membership/RequireMember.tsx'
import PlayEFC from './pages/PlayEFC.tsx'
import AdminNewsGate from './pages/admin/AdminNewsGate.tsx'
import AdminNewsLayout from './pages/admin/AdminNewsLayout.tsx'
import AdminNewsList from './pages/admin/AdminNewsList.tsx'
import AdminNewsEdit from './pages/admin/AdminNewsEdit.tsx'
import AdminHomeBanner from './pages/admin/AdminHomeBanner.tsx'
import AdminGigsList from './pages/admin/AdminGigsList.tsx'
import AdminGigEdit from './pages/admin/AdminGigEdit.tsx'
import AdminMembers from './pages/admin/AdminMembers.tsx'
import AdminReservations from './pages/admin/AdminReservations.tsx'
import RequireAdmin from './news/RequireAdmin.tsx'

function PublicShell() {
  return (
    <>
      <Header />
      <Outlet />
      <Footer />
    </>
  )
}

function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/admin">
          <Route index element={<AdminNewsGate />} />
          <Route element={<RequireAdmin />}>
            <Route element={<AdminNewsLayout />}>
              <Route path="list" element={<AdminNewsList />} />
              <Route path="banner" element={<AdminHomeBanner />} />
              <Route path="gigs" element={<AdminGigsList />} />
              <Route path="gigs/archive" element={<AdminGigsList archive />} />
              <Route path="members" element={<AdminMembers />} />
              <Route path="reservations" element={<AdminReservations />} />
              <Route path="gigs/new" element={<AdminGigEdit />} />
              <Route path="gigs/:id" element={<AdminGigEdit />} />
              <Route path="new" element={<AdminNewsEdit />} />
              <Route path=":id" element={<AdminNewsEdit />} />
            </Route>
          </Route>
        </Route>

        <Route element={<PublicShell />}>
          <Route path="/" element={<Home />} />
          <Route path="/past-gigs" element={<PastGigs />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/contact/play-at-efc" element={<PlayEFC />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/news" element={<News />} />
          <Route path="/news/:slug" element={<NewsPost />} />
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
        </Route>
      </Routes>
    </>
  )
}

export default App
