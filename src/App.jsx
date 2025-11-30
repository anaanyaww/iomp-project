import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ThemeProvider from './components/ThemeProvider';
import DashBoard from './DashBoard';
import GamesZone from './components/gameszone';
import SlideandSolve from './components/SlideandSolve';
import MazeGame from './components/MazeGame';
import TestForm from './components/TestForm';
import Memorygame from './components/Memorygame';
import VirtualFriend from './components/VirtualFriend';
import SupportFinder from './components/SupportFinder';
import DocumentChat from './components/DocumentChat'; // NEW - RAG Document Chat

const App = () => {
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/" element={<DashBoard />} />
        <Route path="/games" element={<GamesZone />} />
        <Route path="/slideandsolve" element={<SlideandSolve/>} />
        <Route path="/mazegame" element={<MazeGame/>} />
        <Route path="/testform" element={<TestForm/>} />
        <Route path="/memorygame" element={<Memorygame/>} />
        <Route path="/virtualfriend" element={<VirtualFriend />} />
        <Route path="/support-finder" element={<SupportFinder />} />
        <Route path="/document-chat" element={<DocumentChat />} /> {/* NEW - RAG Route */}
      </Routes>
    </ThemeProvider>
  );
};

export default App;