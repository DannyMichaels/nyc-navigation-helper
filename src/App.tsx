import React, { useState } from 'react';
import { useVenueStore } from './store/useVenueStore';
import AddVenueForm from './components/AddVenueForm';
import VenueList from './components/VenueList';
import CompassView from './components/CompassView';
import MapView from './components/MapView';
import TransitInfo from './components/TransitInfo';
import AIAssistant from './components/AIAssistant';
import './App.css';
import Footer from './components/Footer';
import Header from './components/Header';

const App: React.FC = () => {
  const { venues } = useVenueStore();
  const [activeTab, setActiveTab] = useState<'compass' | 'map'>('compass');

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <Header />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="flex border-b mb-4">
                <button
                  className={`px-4 py-2 ${
                    activeTab === 'compass'
                      ? 'border-b-2 border-blue-500 text-blue-500'
                      : 'text-gray-500'
                  }`}
                  onClick={() => setActiveTab('compass')}
                >
                  Compass View
                </button>
                <button
                  className={`px-4 py-2 ${
                    activeTab === 'map'
                      ? 'border-b-2 border-blue-500 text-blue-500'
                      : 'text-gray-500'
                  }`}
                  onClick={() => setActiveTab('map')}
                >
                  Map View
                </button>
              </div>

              {activeTab === 'compass' ? <CompassView /> : <MapView />}
            </div>

            {venues.length > 0 && <TransitInfo />}

            <AIAssistant />
          </div>

          <div className="space-y-6">
            <AddVenueForm />
            <VenueList />
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
};

export default App;
