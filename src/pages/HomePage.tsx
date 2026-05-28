// src/pages/HomePage.tsx

import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FeatureCard } from '../components/FeatureCard';
import { ComingSoonModal } from '../components/ComingSoonModal';
import {
  Mic,
  Volume2,
  Languages,
  Waves,
  Sparkles
} from 'lucide-react';

interface OutletContext {
  onFeatureClick: (feature: string) => void;
}

export function HomePage() {
  const { onFeatureClick } = useOutletContext<OutletContext>();
  const [showComingSoon, setShowComingSoon] = useState(false);

  const features = [
    {
      id: 'stt',
      icon: Mic,
      title: 'Audio Transcription',
      description: 'Convert audio into accurate text using AI-powered speech recognition.',
      iconColor: 'bg-purple-500'
    },
    {
      id: 'tts',
      icon: Volume2,
      title: 'Audio Generation',
      description: 'Convert text into natural, human-like speech using AI voices.',
      iconColor: 'bg-pink-500'
    },
    {
      id: 'ttt',
      icon: Languages,
      title: 'Text Translation',
      description: 'Translate text between languages instantly with high-quality AI translations.',
      iconColor: 'bg-blue-500'
    },
    {
      id: 'sts',
      icon: Waves,
      title: 'Audio Translation',
      description: 'Translate audio from one language to another seamlessly.',
      iconColor: 'bg-indigo-500'
    },
    {
      id: 'mtf',
      icon: Sparkles,
      title: 'More Features',
      description: 'Explore upcoming AI-powered features including voice cloning, noise removal, audio enhancement and more.',
      iconColor: 'bg-amber-500'
    }
  ];

  const handleFeatureClick = (id: string) => {
    if (id === 'mtf') {
      setShowComingSoon(true);
    } else {
      onFeatureClick(id);
    }
  };

  return (
    <div className="min-h-screen pt-16">
      <div className="container mx-auto px-6 py-16 text-center">
        <h1 className="text-5xl font-bold mb-4">
          Welcome to Vachan AI Playground
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Transform your communication with cutting-edge AI-powered speech and language technologies
        </p>
      </div>

      <div className="container mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature) => (
            <FeatureCard
              key={feature.id}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              iconColor={feature.iconColor}
              onClick={() => handleFeatureClick(feature.id)}
            />
          ))}
        </div>
      </div>

      <ComingSoonModal
        isOpen={showComingSoon}
        onClose={() => setShowComingSoon(false)}
      />
    </div>
  );
}