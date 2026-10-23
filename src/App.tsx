import { lazy, Suspense, type ReactNode } from 'react'
import { Outlet, Route, Routes } from 'react-router-dom'
import './App.css'
import Header from './components/Header.tsx'
import Footer from './components/Footer.tsx'
import ScrollToTop from './components/ScrollToTop.tsx'
import Home from './pages/Home.tsx'
import NotFound from './pages/NotFound.tsx'

const PastGigs = lazy(() => import('./pages/PastGigs.tsx'))
const About = lazy(() => import('./pages/About.tsx'))
const Contact = lazy(() => import('./pages/Contact.tsx'))
const Gallery = lazy(() => import('./pages/Gallery.tsx'))
const News = lazy(() => import('./pages/News.tsx'))
const NewsPost = lazy(() => import('./pages/NewsPost.tsx'))
const Terms = lazy(() => import('./pages/Terms.tsx'))
const MembersGate = lazy(() => import('./pages/members/MembersGate.tsx'))
const MembersLayout = lazy(() => import('./pages/members/MembersLayout.tsx'))
const MembersAccount = lazy(() => import('./pages/members/MembersAccount.tsx'))
const MembersDocuments = lazy(() => import('./pages/members/MembersDocuments.tsx'))
const MembersDocumentDetail = lazy(
  () => import('./pages/members/MembersDocumentDetail.tsx'),
)
const MembersTickets = lazy(() => import('./pages/members/MembersTickets.tsx'))
const RequireMember = lazy(() => import('./membership/RequireMember.tsx'))
const PlayEFC = lazy(() => import('./pages/PlayEFC.tsx'))
const AdminNewsGate = lazy(() => import('./pages/admin/AdminNewsGate.tsx'))
const AdminNewsLayout = lazy(() => import('./pages/admin/AdminNewsLayout.tsx'))
const AdminNewsList = lazy(() => import('./pages/admin/AdminNewsList.tsx'))
const AdminNewsEdit = lazy(() => import('./pages/admin/AdminNewsEdit.tsx'))
const AdminHomeBanner = lazy(() => import('./pages/admin/AdminHomeBanner.tsx'))
const AdminGigsList = lazy(() => import('./pages/admin/AdminGigsList.tsx'))
const AdminGigEdit = lazy(() => import('./pages/admin/AdminGigEdit.tsx'))
const AdminMembers = lazy(() => import('./pages/admin/AdminMembers.tsx'))
const AdminReservations = lazy(() => import('./pages/admin/AdminReservations.tsx'))
const RequireAdmin = lazy(() => import('./news/RequireAdmin.tsx'))

function RouteFallback() {
  return <p className="flyer-loading">Loading…</p>
}

function PublicShell({ children }: { children?: ReactNode }) {
  return (
    <>
      <Header />
      <Suspense fallback={<RouteFallback />}>
        {children ?? <Outlet />}
      </Suspense>
      <Footer />
    </>
  )
}

function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route
          path="/admin"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Outlet />
            </Suspense>
          }
        >
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
          <Route
            path="*"
            element={
              <PublicShell>
                <NotFound />
              </PublicShell>
            }
          />
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
            <Route path="*" element={<NotFound />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  )
}

export default App
