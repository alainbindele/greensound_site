import Home from './pages/Home';
import About from './pages/About';
import Events from './pages/Events';
import Articles from './pages/Articles';
import News from './pages/News';
import Documentation from './pages/Documentation';
import AdminCollaborators from './pages/AdminCollaborators';
import AdminEvents from './pages/AdminEvents';
import AdminArticles from './pages/AdminArticles';
import AdminDocumentation from './pages/AdminDocumentation';
import AdminNews from './pages/AdminNews';
import Login from './pages/Login';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "About": About,
    "Events": Events,
    "Articles": Articles,
    "News": News,
    "Documentation": Documentation,
    "AdminCollaborators": AdminCollaborators,
    "AdminEvents": AdminEvents,
    "AdminArticles": AdminArticles,
    "AdminDocumentation": AdminDocumentation,
    "AdminNews": AdminNews,
    "Login": Login,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};