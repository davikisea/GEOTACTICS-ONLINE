import React, { useEffect, useState } from 'react';
import { assetLoader } from '@shared';
import { audioManager } from '@domains/game-feel';
import { GeotacticsLoadingScreen } from './GeotacticsLoadingScreen';

interface MapLoadingScreenProps {
  mapName?: string;
  onLoadingComplete: () => void;
}

export const MapLoadingScreen: React.FC<MapLoadingScreenProps> = ({
  mapName = 'Valle de los Cuarteles [Sector Alfa]',
  onLoadingComplete,
}) => {
  useEffect(() => {
    let isMounted = true;
    assetLoader.preloadCriticalAssets(() => {
      if (!isMounted) return;
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleComplete = () => {
    audioManager.initContext();
    audioManager.playSFX('unit_order');
    audioManager.startBgm('march');
    onLoadingComplete();
  };

  return (
    <div className="w-full h-full min-h-[560px] flex flex-col">
      <GeotacticsLoadingScreen
        mapName={mapName}
        onLoadingComplete={handleComplete}
        isBootScreen={false}
      />
    </div>
  );
};
